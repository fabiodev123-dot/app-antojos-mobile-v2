/**
 * API route genérica para CRUD de entidades planas del schema Antojos.
 *
 * Path: /api/db/{entity}
 * - GET sin query → list (filtrado por tenant si la entidad lo requiere)
 * - GET ?id=X → get one
 * - POST body → create (con tenant_id inyectado desde JWT)
 * - PATCH ?id=X body → update (idem)
 * - DELETE ?id=X → delete (filtrado por tenant)
 *
 * Soporta: categorias, productos, ingredientes, recetas, clientes,
 *          movimientos-stock, gastos, cierres (cierres_diarios).
 *
 * Para pedidos (que tienen items embebidos) ver /api/db/pedidos/route.ts.
 *
 * Multi-tenant:
 * - `ENTITIES_WITH_TENANT` (en lib/auth/session.ts) define qué entidades
 *   requieren `tenant_id`. Para esas:
 *     - Tenant user: tenantId del JWT, ignora cualquier tenantId del body.
 *     - Super admin: si pasa `tenant_id` en el body, lo usa; si no, 403.
 * - GET filtra por tenant automáticamente (excepto super admin que ve todos).
 *
 * ⚠️ AISLAMIENTO FAIL-CLOSED (fix de seguridad):
 * El scope de tenant se resuelve UNA vez con `resolveTenantScope()`. Si la
 * entidad exige tenant y el caller no tiene uno resoluble → 403, y NO se
 * ejecuta ninguna query. Antes el filtro era condicional
 * (`if (session.tenantId && ...)`) y un usuario autenticado SIN tenant caía
 * fuera de todas las ramas, dejando el query sin filtro de tenant: podía
 * leer, editar y borrar filas de cualquier tenant. Verificado empíricamente.
 *
 * Auth:
 * - requireSession() en todos los métodos. Sin sesión → 401.
 * - GETs y DELETEs de entidades CON tenant filtran por tenantId del user.
 *   Un tenant user no puede ver/borrar rows de otro tenant.
 */
import { type NextRequest, NextResponse } from "next/server";
import { and, eq } from "drizzle-orm";
import {
  categorias,
  productos,
  ingredientes,
  recetas,
  clientes,
  movimientosStock,
  gastos,
  cierresDiarios,
  ventasRapidas,
} from "@/lib/db/schema";
import { newId } from "@/lib/repositories/types";
import { ENTITIES_WITH_TENANT, requireSession } from "@/lib/auth/session";
import { resolveTenantScope } from "@/lib/auth/tenant-scope";
import { withTenantDb } from "@/lib/db/tenant-db";

// ─────────────────────────────────────────────────────────────────────────────
// Whitelist de entidades → tabla Drizzle
// ─────────────────────────────────────────────────────────────────────────────

const ENTITIES = {
  categorias,
  productos,
  ingredientes,
  recetas,
  clientes,
  "movimientos-stock": movimientosStock,
  gastos,
  cierres: cierresDiarios,
  ventas_rapidas: ventasRapidas,
} as const;

type EntityName = keyof typeof ENTITIES;

// Columnas read-only (no se pueden setear desde el body del POST/PATCH).
// `tenantId`/`tenant_id` están acá porque SIEMPRE los inyecta el server
// desde el JWT (o desde el body solo si es super admin explícitamente).
// Esto previene que un cliente malicioso cambie el tenant de un row.
const READ_ONLY: ReadonlySet<string> = new Set([
  "createdAt",
  "updatedAt",
  "id",
]);

function maybeToDate(v: unknown): unknown {
  if (typeof v !== "string") return v;
  if (/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}/.test(v)) {
    const d = new Date(v);
    return Number.isNaN(d.getTime()) ? v : d;
  }
  if (/^\d{4}-\d{2}-\d{2}$/.test(v)) {
    const d = new Date(`${v}T00:00:00Z`);
    return Number.isNaN(d.getTime()) ? v : d;
  }
  return v;
}

function getEntity(name: string) {
  if (!(name in ENTITIES)) return null;
  return ENTITIES[name as EntityName];
}

// ─────────────────────────────────────────────────────────────────────────────
// Tenant scope
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Resuelve el scope de tenant para la operación (fail-closed).
 * Devuelve el tenantId a usar, o un NextResponse de error.
 */
async function resolveScope(
  session: { tenantId: string | null; isSuperAdmin: boolean },
  requiresTenant: boolean,
  requestedTenantId?: string | null,
): Promise<{ tenantId: string | null } | { response: NextResponse }> {
  const result = await resolveTenantScope(
    session,
    requiresTenant,
    requestedTenantId ?? null,
  );
  if (!result.ok) return { response: result.response };
  return { tenantId: result.scope.tenantId };
}

/** Lee `tenant_id` / `tenantId` del body de la petición. */
function tenantIdFromBody(body: Record<string, unknown>): string | null {
  return (
    (typeof body.tenant_id === "string" && body.tenant_id) ||
    (typeof body.tenantId === "string" && body.tenantId) ||
    null
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// CRUD
// ─────────────────────────────────────────────────────────────────────────────

export async function GET(
  req: NextRequest,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  { params }: { params: Promise<any> },
) {
  const auth = await requireSession();
  if (!auth.ok) return auth.response;
  const { session } = auth;

  try {
    const { entity } = await params;
    const table = getEntity(entity);
    if (!table) {
      return NextResponse.json({ error: `Unknown entity: ${entity}` }, { status: 404 });
    }

    const id = req.nextUrl.searchParams.get("id");
    const requiresTenant = ENTITIES_WITH_TENANT.has(entity);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const t = table as any;

    // Scope fail-closed. Si la entidad exige tenant y no hay scope resoluble
    // → 403 sin tocar la base de datos.
    const filterTenant = req.nextUrl.searchParams.get("tenant_id");
    const scope = await resolveScope(session, requiresTenant, filterTenant);
    if ("response" in scope) return scope.response;

    const limit = Number(req.nextUrl.searchParams.get("limit")) || undefined;
    const offset = Number(req.nextUrl.searchParams.get("offset")) || undefined;

    // Toda la operación corre dentro de una transacción con el tenant
    // seteado en la sesión de Postgres (SET LOCAL). Así las policies RLS
    // también filtran, aunque el filtro por código de más abajo se olvidara.
    const rows = await withTenantDb(scope.tenantId, async (tx) => {
      if (id) {
        const filters = [eq(t.id, id)];
        // El filtro de tenant es OBLIGATORIO cuando la entidad lo requiere.
        if (requiresTenant && scope.tenantId) {
          filters.push(eq(t.tenantId, scope.tenantId));
        }
        return tx.select().from(t).where(and(...filters)).limit(1);
      }

      if (requiresTenant && scope.tenantId) {
        let query = tx
          .select()
          .from(t)
          .where(eq(t.tenantId, scope.tenantId))
          .$dynamic();
        if (offset) query = query.offset(offset);
        if (limit) query = query.limit(limit);
        return query;
      }

      // Entity without tenant
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      let query = tx.select().from(t as any).$dynamic();
      if (offset) query = query.offset(offset);
      if (limit) query = query.limit(limit);
      return query;
    });

    if (id) {
      const row = rows[0];
      if (!row) return NextResponse.json({ error: "Not found" }, { status: 404 });
      return NextResponse.json(row);
    }

    return NextResponse.json(rows);
  } catch (err) {
    console.error("[api/db/[entity]] GET error:", err);
    return NextResponse.json(
      { error: "Internal error", detail: err instanceof Error ? err.message : String(err) },
      { status: 500 },
    );
  }
}

export async function POST(
  req: NextRequest,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  { params }: { params: Promise<any> },
) {
  const auth = await requireSession();
  if (!auth.ok) return auth.response;
  const { session } = auth;

  const { entity } = await params;
  const table = getEntity(entity);
  if (!table) {
    return NextResponse.json({ error: `Unknown entity: ${entity}` }, { status: 404 });
  }

  const body = await req.json();
  const requiresTenant = ENTITIES_WITH_TENANT.has(entity);

  // Scope fail-closed: sin tenant resoluble → 403, no se escribe nada.
  const scope = await resolveScope(
    session,
    requiresTenant,
    tenantIdFromBody(body),
  );
  if ("response" in scope) return scope.response;

  const now = new Date();
  const data: Record<string, unknown> = {
    id: newId(),
    createdAt: now,
    updatedAt: now,
  };
  for (const [k, v] of Object.entries(body)) {
    if (!READ_ONLY.has(k)) data[k] = maybeToDate(v);
  }
  if (requiresTenant) {
    data.tenantId = scope.tenantId;
  }

  try {
    // La escritura corre dentro de una transacción con el tenant seteado:
    // las policies RLS validan el INSERT (WITH CHECK) y bloquean escribir
    // en un tenant distinto al del scope.
    await withTenantDb(scope.tenantId, async (tx) => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      await tx.insert(table as any).values(data as any);
    });
    return NextResponse.json(data, { status: 201 });
  } catch (err) {
    console.error("[api/db/[entity]] POST error:", err);
    return NextResponse.json(
      {
        error: "Internal error",
        detail: err instanceof Error ? err.message : String(err),
      },
      { status: 500 },
    );
  }
}

export async function PATCH(
  req: NextRequest,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  { params }: { params: Promise<any> },
) {
  const auth = await requireSession();
  if (!auth.ok) return auth.response;
  const { session } = auth;

  const { entity } = await params;
  const table = getEntity(entity);
  if (!table) {
    return NextResponse.json({ error: `Unknown entity: ${entity}` }, { status: 404 });
  }

  const id = req.nextUrl.searchParams.get("id");
  if (!id) {
    return NextResponse.json({ error: "Missing id query param" }, { status: 400 });
  }

  const body = await req.json();
  const requiresTenant = ENTITIES_WITH_TENANT.has(entity);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const t = table as any;

  // Scope fail-closed antes de construir el WHERE.
  const scope = await resolveScope(session, requiresTenant, null);
  if ("response" in scope) return scope.response;

  // Construir WHERE clause respetando tenant isolation.
  const whereFilters = [eq(t.id, id)];
  if (requiresTenant && scope.tenantId) {
    whereFilters.push(eq(t.tenantId, scope.tenantId));
  }

  const updates: Record<string, unknown> = { updatedAt: new Date() };
  for (const [k, v] of Object.entries(body)) {
    if (!READ_ONLY.has(k)) updates[k] = maybeToDate(v);
  }
  // Nunca dejamos que un cliente cambie tenantId via PATCH.
  delete updates.tenantId;
  delete updates.tenant_id;

  try {
    await withTenantDb(scope.tenantId, async (tx) => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      await tx.update(t).set(updates as any).where(and(...whereFilters));
    });
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("[api/db/[entity]] PATCH error:", err);
    return NextResponse.json(
      {
        error: "Internal error",
        detail: err instanceof Error ? err.message : String(err),
      },
      { status: 500 },
    );
  }
}

export async function DELETE(
  req: NextRequest,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  { params }: { params: Promise<any> },
) {
  const auth = await requireSession();
  if (!auth.ok) return auth.response;
  const { session } = auth;

  const { entity } = await params;
  const table = getEntity(entity);
  if (!table) {
    return NextResponse.json({ error: `Unknown entity: ${entity}` }, { status: 404 });
  }

  const id = req.nextUrl.searchParams.get("id");
  if (!id) {
    return NextResponse.json({ error: "Missing id query param" }, { status: 400 });
  }

  const requiresTenant = ENTITIES_WITH_TENANT.has(entity);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const t = table as any;

  // Scope fail-closed antes de construir el WHERE.
  const scope = await resolveScope(session, requiresTenant, null);
  if ("response" in scope) return scope.response;

  const whereFilters = [eq(t.id, id)];
  if (requiresTenant && scope.tenantId) {
    whereFilters.push(eq(t.tenantId, scope.tenantId));
  }

  try {
    const rowCount = await withTenantDb(scope.tenantId, async (tx) => {
      const result = await tx.delete(t).where(and(...whereFilters));
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      return (result as any)?.count ?? 0;
    });
    return NextResponse.json({ ok: rowCount > 0 });
  } catch (err) {
    console.error("[api/db/[entity]] DELETE error:", err);
    return NextResponse.json(
      {
        error: "Internal error",
        detail: err instanceof Error ? err.message : String(err),
      },
      { status: 500 },
    );
  }
}
