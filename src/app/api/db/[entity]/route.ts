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
 *     - Super admin: si pasa `tenant_id` en el body, lo usa; si no, 400.
 * - GET filtra por tenant automáticamente (excepto super admin que ve todos).
 *
 * Auth:
 * - requireSession() en todos los métodos. Sin sesión → 401.
 * - GETs y DELETEs de entidades CON tenant filtran por tenantId del user.
 *   Un tenant user no puede ver/borrar rows de otro tenant.
 */
import { type NextRequest, NextResponse } from "next/server";
import { and, eq } from "drizzle-orm";
import { db } from "@/lib/db";
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
// Tenant helpers
// ─────────────────────────────────────────────────────────────────────────────

type TenantContext = {
  tenantId: string | null;
  isSuperAdmin: boolean;
};

/**
 * Resuelve el tenantId que se debe usar para escribir una fila.
 * - Tenant user → su tenantId del JWT (ignora cualquier tenantId del body).
 * - Super admin → tenant_id explícito del body (snake_case o camelCase).
 * - Si la entidad requiere tenant y no se puede resolver → 400.
 */
function resolveTenantForWrite(
  ctx: TenantContext,
  requiresTenant: boolean,
  body: Record<string, unknown>,
): { tenantId: string } | { error: NextResponse } {
  if (!requiresTenant) return { tenantId: "" };

  if (ctx.tenantId) {
    return { tenantId: ctx.tenantId };
  }

  if (ctx.isSuperAdmin) {
    const fromBody =
      (typeof body.tenant_id === "string" && body.tenant_id) ||
      (typeof body.tenantId === "string" && body.tenantId) ||
      null;
    if (fromBody) {
      return { tenantId: fromBody };
    }
    return {
      error: NextResponse.json(
        {
          ok: false,
          error:
            "Esta entidad requiere tenant_id. Super admins deben pasarlo explícitamente en el body (tenant_id o tenantId).",
        },
        { status: 400 },
      ),
    };
  }

  return {
    error: NextResponse.json(
      {
        ok: false,
        error:
          "Sin tenant en JWT. Esta entidad requiere un usuario asociado a un tenant.",
      },
      { status: 403 },
    ),
  };
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

    if (id) {
      const filters = [eq(t.id, id)];
      if (requiresTenant && session.tenantId && !session.isSuperAdmin) {
        filters.push(eq(t.tenantId, session.tenantId));
      } else if (requiresTenant && session.isSuperAdmin) {
        const filterTenant = req.nextUrl.searchParams.get("tenant_id");
        if (filterTenant) filters.push(eq(t.tenantId, filterTenant));
      }
      const rows = await db.select().from(t).where(and(...filters)).limit(1);
      const row = rows[0];
      if (!row) return NextResponse.json({ error: "Not found" }, { status: 404 });
      return NextResponse.json(row);
    }

    if (requiresTenant && session.tenantId && !session.isSuperAdmin) {
      const rows = await db.select().from(t).where(eq(t.tenantId, session.tenantId));
      return NextResponse.json(rows);
    }
    if (requiresTenant && session.isSuperAdmin) {
      const filterTenant = req.nextUrl.searchParams.get("tenant_id");
      if (filterTenant) {
        const rows = await db.select().from(t).where(eq(t.tenantId, filterTenant));
        return NextResponse.json(rows);
      }
      // Super admin sin filtro: ve todos los tenants.
      const rows = await db.select().from(t);
      return NextResponse.json(rows);
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const rows = await db.select().from(t as any);
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
  const tenant = resolveTenantForWrite(
    { tenantId: session.tenantId, isSuperAdmin: session.isSuperAdmin },
    requiresTenant,
    body,
  );
  if ("error" in tenant) return tenant.error;

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
    data.tenantId = tenant.tenantId;
  }

  try {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await db.insert(table as any).values(data as any);
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

  // Construir WHERE clause respetando tenant isolation.
  const whereFilters = [eq(t.id, id)];
  if (requiresTenant && session.tenantId && !session.isSuperAdmin) {
    whereFilters.push(eq(t.tenantId, session.tenantId));
  }

  const updates: Record<string, unknown> = { updatedAt: new Date() };
  for (const [k, v] of Object.entries(body)) {
    if (!READ_ONLY.has(k)) updates[k] = maybeToDate(v);
  }
  // Nunca dejamos que un cliente cambie tenantId via PATCH.
  delete updates.tenantId;
  delete updates.tenant_id;

  try {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await db.update(t).set(updates as any).where(and(...whereFilters));
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
  const whereFilters = [eq(t.id, id)];
  if (requiresTenant && session.tenantId && !session.isSuperAdmin) {
    whereFilters.push(eq(t.tenantId, session.tenantId));
  }

  try {
    const result = await db.delete(t).where(and(...whereFilters));
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const rowCount = (result as any)?.count ?? 0;
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
