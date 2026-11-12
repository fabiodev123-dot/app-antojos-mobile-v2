/**
 * Tests de integración del aislamiento de tenants.
 *
 * Verifica la DOBLE CAPA contra la base real:
 *   1. Capa de aplicación: `resolveTenantScope()` (src/lib/auth/tenant-scope.ts)
 *   2. Capa de base: RLS con el rol restringido `antojos_app`
 *
 * Requiere los fixtures de prueba. Se crean con:
 *   node scripts/setup-iso-fixtures.mjs
 *
 * Si los fixtures no están, los tests se saltan (skip) en vez de fallar,
 * para que `npm test` siga siendo usable sin base de datos.
 *
 * Variables de entorno:
 *   DATABASE_URL          → rol owner (para leer el estado real de las filas)
 *   APP_DATABASE_URL      → rol de la app (sujeto a RLS)
 */
import { describe, it, expect, beforeAll, afterAll, vi } from "vitest";
import { readFileSync } from "node:fs";
import postgres from "postgres";
import { resolveTenantScope, setTenantValidator } from "./tenant-scope";

vi.mock("server-only", () => ({}));

// ── Carga de .env.local ──────────────────────────────────────────────────────
function loadEnv(path: string) {
  try {
    for (const line of readFileSync(path, "utf8").split("\n")) {
      const m = line.match(/^\s*([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*)\s*$/);
      if (!m) continue;
      let v = m[2].trim();
      if (
        (v.startsWith('"') && v.endsWith('"')) ||
        (v.startsWith("'") && v.endsWith("'"))
      ) {
        v = v.slice(1, -1);
      }
      if (!process.env[m[1]]) process.env[m[1]] = v;
    }
  } catch {
    // sin .env.local
  }
}
loadEnv(".env.local");

const TENANT_A = "tenant_antojos";
const TENANT_B = "tenant_test_iso";
const PROD_B = "prod_test_iso_1";
const CAT_B = "cat_test_iso_1";

const owner = postgres(process.env.DATABASE_URL ?? "", {
  max: 1,
  prepare: false,
  connect_timeout: 15,
  idle_timeout: 5,
});
const app = postgres(process.env.APP_DATABASE_URL ?? "", {
  max: 1,
  prepare: false,
  connect_timeout: 15,
  idle_timeout: 5,
});

/** ¿Están los fixtures? */
async function fixturesReady(): Promise<boolean> {
  try {
    const r = await owner`
      SELECT
        (SELECT count(*)::int FROM tenants WHERE id = ${TENANT_B}) AS tenant,
        (SELECT count(*)::int FROM productos WHERE id = ${PROD_B}) AS producto
    `;
    return r[0].tenant > 0 && r[0].producto > 0;
  } catch {
    return false;
  }
}

const ready = await fixturesReady();
const desc = ready ? describe : describe.skip;

if (!ready) {
  console.warn(
    "\n[aislamiento] Fixtures no encontrados: los tests de integración se saltan.\n" +
      "               Ejecutá: node scripts/setup-iso-fixtures.mjs\n",
  );
}

describe("aislamiento de tenants — capa de base (RLS)", () => {
  let tieneRls = false;

  beforeAll(async () => {
    const r = await app`
      SELECT rolbypassrls AS bypass
      FROM pg_roles WHERE rolname = current_user
    `;
    tieneRls = r[0]?.bypass === false;
  });

  afterAll(async () => {
    // Las conexiones pueden haber quedado en mal estado si un test
    // abortó una transacción: el cierre no debe romper la suite.
    await owner.end({ timeout: 5 }).catch(() => {});
    await app.end({ timeout: 5 }).catch(() => {});
  });

  desc("con el tenant de sesión seteado", () => {
    it("sólo devuelve filas del tenant de la sesión", async () => {
      await app.begin(async (tx) => {
        await tx`SELECT set_config('app.tenant_id', ${TENANT_A}, true)`;
        const rows = await tx`
          SELECT tenant_id, count(*)::int AS n FROM productos GROUP BY tenant_id
        `;
        expect(rows.length).toBe(1);
        expect(rows[0].tenant_id).toBe(TENANT_A);
      });
    });

    it("no devuelve filas de otro tenant", async () => {
      await app.begin(async (tx) => {
        await tx`SELECT set_config('app.tenant_id', ${TENANT_A}, true)`;
        const rows = await tx`SELECT count(*)::int AS n FROM productos WHERE tenant_id = ${TENANT_B}`;
        expect(rows[0].n).toBe(0);
      });
    });

    it("el tenant de la sesión cambia el resultado", async () => {
      await app.begin(async (tx) => {
        await tx`SELECT set_config('app.tenant_id', ${TENANT_B}, true)`;
        const rows = await tx`
          SELECT tenant_id, count(*)::int AS n FROM productos GROUP BY tenant_id
        `;
        expect(rows.length).toBe(1);
        expect(rows[0].tenant_id).toBe(TENANT_B);
        expect(rows[0].n).toBe(1);
      });
    });
  });

  desc("sin tenant en la sesión (fail closed)", () => {
    it("no ve filas de ninguna tabla de dominio", async () => {
      await app.begin(async (tx) => {
        await tx`SELECT set_config('app.tenant_id', '__none__', true)`;
        for (const tabla of [
          "productos",
          "categorias",
          "clientes",
          "pedidos",
          "ingredientes",
          "recetas",
          "gastos",
        ]) {
          const r = await tx.unsafe(`SELECT count(*)::int AS n FROM "${tabla}"`);
          expect(r[0].n, `tabla ${tabla}`).toBe(0);
        }
      });
    });

    it("no ve filas si el GUC nunca se seteó", async () => {
      await app.begin(async (tx) => {
        const r = await tx`SELECT count(*)::int AS n FROM productos`;
        expect(r[0].n).toBe(0);
      });
    });
  });

  desc("el GUC no se filtra entre transacciones", () => {
    it("la transacción siguiente no hereda el tenant anterior", async () => {
      await app.begin(async (tx) => {
        await tx`SELECT set_config('app.tenant_id', ${TENANT_B}, true)`;
        const r = await tx`SELECT count(*)::int AS n FROM productos`;
        expect(r[0].n).toBe(1);
      });
      // Transacción nueva, sin setear el GUC.
      await app.begin(async (tx) => {
        const r = await tx`SELECT count(*)::int AS n FROM productos`;
        expect(r[0].n).toBe(0);
      });
    });
  });

  desc("el backstop: un query sin filtro de tenant", () => {
    it("no puede leer filas ajenas aunque el código no filtre", async () => {
      await app.begin(async (tx) => {
        await tx`SELECT set_config('app.tenant_id', ${TENANT_A}, true)`;
        // Sin WHERE tenant_id: es el error típico de un endpoint nuevo.
        const rows = await tx`
          SELECT tenant_id, count(*)::int AS n FROM productos GROUP BY tenant_id
        `;
        const ajenos = rows.filter((r) => r.tenant_id !== TENANT_A);
        expect(ajenos).toHaveLength(0);
      });
    });

    it("un UPDATE sobre fila ajena no la modifica", async () => {
      const antes = await owner`SELECT nombre FROM productos WHERE id = ${PROD_B}`;
      await app.begin(async (tx) => {
        await tx`SELECT set_config('app.tenant_id', ${TENANT_A}, true)`;
        const r = await tx`
          UPDATE productos SET nombre = 'HACK' WHERE id = ${PROD_B} RETURNING id
        `;
        // RLS oculta la fila: el UPDATE afecta 0 filas (fail-closed silencioso).
        expect(r.length).toBe(0);
      });
      const despues = await owner`SELECT nombre FROM productos WHERE id = ${PROD_B}`;
      expect(despues[0].nombre).toBe(antes[0].nombre);
    });

    it("un INSERT en otro tenant es rechazado por la base", async () => {
      // El error del INSERT aborta la transacción y deja la conexión en
      // estado inutilizable, así que se usa una conexión propia para este
      // test y no se toca la del suite.
      const conn = postgres(process.env.APP_DATABASE_URL ?? "", {
        max: 1,
        prepare: false,
        connect_timeout: 15,
        idle_timeout: 5,
      });
      try {
        let error: unknown = null;
        try {
          await conn`
            INSERT INTO productos (id, nombre, categoria_id, precio, color, stock_actual, stock_minimo, activo, tenant_id, created_at, updated_at)
            VALUES ('prod_rls_intento', 'INTENTO', ${CAT_B}, 1, 'red', 0, 0, true, ${TENANT_B}, now(), now())
          `;
        } catch (e) {
          error = e;
        }
        expect(error).not.toBeNull();
        expect(String(error)).toMatch(/row-level security/i);
      } finally {
        await conn.end({ timeout: 5 }).catch(() => {});
      }
      const r = await owner`SELECT count(*)::int AS n FROM productos WHERE id = 'prod_rls_intento'`;
      expect(r[0].n).toBe(0);
    });
  });

  it("la conexión de la app no bypasea RLS", () => {
    expect(tieneRls).toBe(true);
  });
});

describe("aislamiento de tenants — capa de aplicación", () => {
  // Conexión propia para el validador: el `afterAll` del describe anterior
  // cierra la compartida y el validador seguiría needing una conexión viva.
  const validatorConn = postgres(process.env.DATABASE_URL ?? "", {
    max: 1,
    prepare: false,
    connect_timeout: 15,
    idle_timeout: 5,
  });

  // `setTenantValidator` devuelve el validador anterior, para restaurarlo.
  const previousValidator = setTenantValidator(async (id) => {
    try {
      const r = await validatorConn`SELECT count(*)::int AS n FROM tenants WHERE id = ${id}`;
      return r[0].n > 0;
    } catch {
      return false;
    }
  });

  afterAll(async () => {
    setTenantValidator(previousValidator);
    await validatorConn.end({ timeout: 5 }).catch(() => {});
  });

  desc("usuario sin tenant", () => {
    it("recibe 403 en toda operación tenant-scoped", async () => {
      const r = await resolveTenantScope(
        { tenantId: null, isSuperAdmin: false },
        true,
      );
      expect(r.ok).toBe(false);
      if (!r.ok) expect(r.response.status).toBe(403);
    });

    it("no puede elegir un tenant propio", async () => {
      const r = await resolveTenantScope(
        { tenantId: null, isSuperAdmin: false },
        true,
        TENANT_B,
      );
      expect(r.ok).toBe(false);
    });
  });

  desc("usuario de tenant", () => {
    it("opera acotado a su tenant", async () => {
      const r = await resolveTenantScope(
        { tenantId: TENANT_A, isSuperAdmin: false },
        true,
      );
      expect(r.ok).toBe(true);
      if (r.ok) expect(r.scope.tenantId).toBe(TENANT_A);
    });

    it("ignora un tenant distinto pedido en el body", async () => {
      const r = await resolveTenantScope(
        { tenantId: TENANT_A, isSuperAdmin: false },
        true,
        TENANT_B,
      );
      expect(r.ok).toBe(true);
      if (r.ok) expect(r.scope.tenantId).toBe(TENANT_A);
    });
  });

  desc("super admin", () => {
    it("debe acotar a un tenant explícito", async () => {
      const r = await resolveTenantScope(
        { tenantId: null, isSuperAdmin: true },
        true,
      );
      expect(r.ok).toBe(false);
      if (!r.ok) expect(r.response.status).toBe(403);
    });

    it("puede operar sobre un tenant existente", async () => {
      const r = await resolveTenantScope(
        { tenantId: null, isSuperAdmin: true },
        true,
        TENANT_B,
      );
      expect(r.ok).toBe(true);
      if (r.ok) expect(r.scope.tenantId).toBe(TENANT_B);
    });

    it("rechaza un tenant inexistente", async () => {
      const r = await resolveTenantScope(
        { tenantId: null, isSuperAdmin: true },
        true,
        "tenant_inexistente",
      );
      expect(r.ok).toBe(false);
      if (!r.ok) expect(r.response.status).toBe(400);
    });
  });
});
