/**
 * API route específica para pedidos (1:N con pedido_items).
 *
 * Path: /api/db/pedidos
 * - GET sin query → list (cada pedido con items embebidos, filtrado por tenant)
 * - GET ?id=X → get one (con items)
 * - POST body → create pedido + items (transacción, tenantId inyectado)
 * - PATCH ?id=X body → update pedido (NO items — el frontend los maneja aparte)
 * - DELETE ?id=X → delete (cascade a items)
 *
 * Items endpoint separado: /api/db/pedidos/items?pedidoId=X (TODO: agregar si se necesita).
 *
 * Multi-tenant:
 * - `pedidos` requiere tenant_id (definido en ENTITIES_WITH_TENANT).
 * - Tenant user → su tenantId del JWT.
 * - Super admin → debe pasar `tenant_id` en el body.
 * - GET filtra por tenant (excepto super admin).
 *
 * ⚠️ AISLAMIENTO FAIL-CLOSED (fix de seguridad):
 * El scope se resuelve con `resolveTenantScope()`. Si la operación exige
 * tenant y el caller no tiene uno resoluble → 403 sin tocar la base. Antes
 * el filtro era condicional y un usuario autenticado SIN tenant quedaba
 * con queries sin filtro de tenant (lectura/edición/borrado cross-tenant).
 */
import { type NextRequest, NextResponse } from "next/server";
import { and, eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { pedidos as pedidosTable, pedidoItems as pedidoItemsTable } from "@/lib/db/schema";
import { newId } from "@/lib/repositories/types";
import { requireSession } from "@/lib/auth/session";
import { resolveTenantScope } from "@/lib/auth/tenant-scope";

/** Resuelve el scope fail-closed. Devuelve el tenantId o un error. */
async function resolveScope(
  session: { tenantId: string | null; isSuperAdmin: boolean },
  requestedTenantId?: string | null,
  mode: "read" | "write" = "read",
): Promise<{ tenantId: string | null } | { response: NextResponse }> {
  const result = await resolveTenantScope(
    session,
    true,
    requestedTenantId ?? null,
    mode,
  );
  if (!result.ok) return { response: result.response };
  return { tenantId: result.scope.tenantId };
}

export async function GET(req: NextRequest) {
  const auth = await requireSession();
  if (!auth.ok) return auth.response;
  const { session } = auth;

  const id = req.nextUrl.searchParams.get("id");
  const filterTenant = req.nextUrl.searchParams.get("tenant_id");

  // Scope fail-closed: sin tenant resoluble → 403 sin tocar la base.
  const scope = await resolveScope(session, filterTenant);
  if ("response" in scope) return scope.response;

  if (id) {
    const filters = [eq(pedidosTable.id, id)];
    if (scope.tenantId) {
      filters.push(eq(pedidosTable.tenantId, scope.tenantId));
    }

    // Un solo query con LEFT JOIN: pedido + items
    const rows = await db
      .select({
        id: pedidosTable.id,
        numero: pedidosTable.numero,
        clienteId: pedidosTable.clienteId,
        nombreCliente: pedidosTable.nombreCliente,
        telefonoCliente: pedidosTable.telefonoCliente,
        direccionEntrega: pedidosTable.direccionEntrega,
        subtotal: pedidosTable.subtotal,
        envio: pedidosTable.envio,
        total: pedidosTable.total,
        estado: pedidosTable.estado,
        canal: pedidosTable.canal,
        tipoEntrega: pedidosTable.tipoEntrega,
        observaciones: pedidosTable.observaciones,
        fecha: pedidosTable.fecha,
        hora: pedidosTable.hora,
        cerradoAt: pedidosTable.cerradoAt,
        entregadoAt: pedidosTable.entregadoAt,
        tenantId: pedidosTable.tenantId,
        createdAt: pedidosTable.createdAt,
        updatedAt: pedidosTable.updatedAt,
        itemId: pedidoItemsTable.id,
        itemProductoId: pedidoItemsTable.productoId,
        itemNombreProducto: pedidoItemsTable.nombreProducto,
        itemCantidad: pedidoItemsTable.cantidad,
        itemPrecioUnitario: pedidoItemsTable.precioUnitario,
        itemSubtotal: pedidoItemsTable.subtotal,
        itemObservaciones: pedidoItemsTable.observaciones,
        itemTenantId: pedidoItemsTable.tenantId,
        itemCreatedAt: pedidoItemsTable.createdAt,
        itemUpdatedAt: pedidoItemsTable.updatedAt,
      })
      .from(pedidosTable)
      .leftJoin(pedidoItemsTable, eq(pedidosTable.id, pedidoItemsTable.pedidoId))
      .where(and(...filters));

    if (rows.length === 0) return NextResponse.json({ error: "Not found" }, { status: 404 });

    // Reconstruir pedido con items embebidos desde las filas del JOIN
    const first = rows[0];
    const items = rows
      .filter((r) => r.itemId !== null)
      .map((r) => ({
        id: r.itemId,
        pedidoId: first.id,
        productoId: r.itemProductoId,
        nombre: r.itemNombreProducto,
        cantidad: r.itemCantidad,
        precioUnitario: r.itemPrecioUnitario,
        subtotal: r.itemSubtotal,
        observaciones: r.itemObservaciones,
        tenantId: r.itemTenantId,
        createdAt: r.itemCreatedAt,
        updatedAt: r.itemUpdatedAt,
      }));

    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { itemId, itemProductoId, itemNombreProducto, itemCantidad, itemPrecioUnitario, itemSubtotal, itemObservaciones, itemTenantId, itemCreatedAt, itemUpdatedAt, ...pedido } = first;
    return NextResponse.json({ ...pedido, items });
  }

  // ── List con un solo query + LEFT JOIN ──────────────────────────────────────
  const limit = Number(req.nextUrl.searchParams.get("limit")) || undefined;
  const offset = Number(req.nextUrl.searchParams.get("offset")) || undefined;

  const tenantFilters = [];
  if (scope.tenantId) {
    tenantFilters.push(eq(pedidosTable.tenantId, scope.tenantId));
  }

  const whereClause = tenantFilters.length > 0 ? and(...tenantFilters) : undefined;

  let query = db
    .select({
      id: pedidosTable.id,
      numero: pedidosTable.numero,
      clienteId: pedidosTable.clienteId,
      nombreCliente: pedidosTable.nombreCliente,
      telefonoCliente: pedidosTable.telefonoCliente,
      direccionEntrega: pedidosTable.direccionEntrega,
      subtotal: pedidosTable.subtotal,
      envio: pedidosTable.envio,
      total: pedidosTable.total,
      estado: pedidosTable.estado,
      canal: pedidosTable.canal,
      tipoEntrega: pedidosTable.tipoEntrega,
      observaciones: pedidosTable.observaciones,
      fecha: pedidosTable.fecha,
      hora: pedidosTable.hora,
      cerradoAt: pedidosTable.cerradoAt,
      entregadoAt: pedidosTable.entregadoAt,
      tenantId: pedidosTable.tenantId,
      createdAt: pedidosTable.createdAt,
      updatedAt: pedidosTable.updatedAt,
      itemId: pedidoItemsTable.id,
      itemProductoId: pedidoItemsTable.productoId,
      itemNombreProducto: pedidoItemsTable.nombreProducto,
      itemCantidad: pedidoItemsTable.cantidad,
      itemPrecioUnitario: pedidoItemsTable.precioUnitario,
      itemSubtotal: pedidoItemsTable.subtotal,
      itemObservaciones: pedidoItemsTable.observaciones,
      itemTenantId: pedidoItemsTable.tenantId,
      itemCreatedAt: pedidoItemsTable.createdAt,
      itemUpdatedAt: pedidoItemsTable.updatedAt,
    })
    .from(pedidosTable)
    .leftJoin(pedidoItemsTable, eq(pedidosTable.id, pedidoItemsTable.pedidoId))
    .$dynamic();

  if (whereClause) query = query.where(whereClause);
  if (offset) query = query.offset(offset);
  if (limit) query = query.limit(limit);

  const rows = await query;

  // Agrupar por pedido
  const pedidoMap = new Map<string, Record<string, unknown>>();
  for (const row of rows) {
    if (!pedidoMap.has(row.id)) {
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      const { itemId, itemProductoId, itemNombreProducto, itemCantidad, itemPrecioUnitario, itemSubtotal, itemObservaciones, itemTenantId, itemCreatedAt, itemUpdatedAt, ...pedido } = row;
      pedidoMap.set(row.id, { ...pedido, items: [] });
    }
    if (row.itemId) {
      const pedido = pedidoMap.get(row.id)!;
      (pedido.items as unknown[]).push({
        id: row.itemId,
        pedidoId: row.id,
        productoId: row.itemProductoId,
        nombre: row.itemNombreProducto,
        cantidad: row.itemCantidad,
        precioUnitario: row.itemPrecioUnitario,
        subtotal: row.itemSubtotal,
        observaciones: row.itemObservaciones,
        tenantId: row.itemTenantId,
        createdAt: row.itemCreatedAt,
        updatedAt: row.itemUpdatedAt,
      });
    }
  }

  return NextResponse.json(Array.from(pedidoMap.values()));
}

export async function POST(req: NextRequest) {
  const auth = await requireSession();
  if (!auth.ok) return auth.response;
  const { session } = auth;

  const body = await req.json();
  const { items = [], ...pedidoFields } = body;
  const now = new Date();
  const pedidoId = newId();

  // Scope fail-closed: sin tenant resoluble → 403, no se escribe nada.
  const requestedTenant =
    (typeof body.tenant_id === "string" && body.tenant_id) ||
    (typeof body.tenantId === "string" && body.tenantId) ||
    null;
  const scope = await resolveScope(session, requestedTenant, "write");
  if ("response" in scope) return scope.response;
  const tenantId = scope.tenantId;

  // El body viene con timestamps como ISO strings (formato del frontend).
  // Drizzle espera Date objects para columnas timestamptz — convertimos acá.
  const pedidoRow = {
    ...pedidoFields,
    id: pedidoId,
    tenantId,
    createdAt: now,
    updatedAt: now,
    cerradoAt: pedidoFields.cerradoAt ? new Date(pedidoFields.cerradoAt) : null,
    entregadoAt: pedidoFields.entregadoAt ? new Date(pedidoFields.entregadoAt) : null,
  };
  // Nunca dejamos que el body pise el tenantId.
  delete (pedidoRow as Record<string, unknown>).tenant_id;

  const itemsRows = items.map((it: Record<string, unknown>) => ({
    ...it,
    id: it.id ?? newId(),
    pedidoId,
    tenantId,
    createdAt: it.createdAt ? new Date(it.createdAt as string) : now,
    updatedAt: it.updatedAt ? new Date(it.updatedAt as string) : now,
  }));

  await db.transaction(async (tx) => {
    await tx.insert(pedidosTable).values(pedidoRow as typeof pedidosTable.$inferInsert);
    if (itemsRows.length > 0) {
      await tx.insert(pedidoItemsTable).values(itemsRows as (typeof pedidoItemsTable.$inferInsert)[]);
    }
  });

  return NextResponse.json({ ...pedidoRow, items: itemsRows }, { status: 201 });
}

export async function PATCH(req: NextRequest) {
  const auth = await requireSession();
  if (!auth.ok) return auth.response;
  const { session } = auth;

  const id = req.nextUrl.searchParams.get("id");
  if (!id) {
    return NextResponse.json({ error: "Missing id query param" }, { status: 400 });
  }

  const body = await req.json();
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const { items: _ignored, tenantId: _t, tenant_id: _t2, ...pedidoFields } = body;
  const sanitized: Record<string, unknown> = { updatedAt: new Date() };
  for (const [k, v] of Object.entries(pedidoFields)) {
    sanitized[k] = maybeToDate(v);
  }
  const updates = sanitized;

  // Scope fail-closed antes de construir el WHERE.
  const scope = await resolveScope(session, null, "write");
  if ("response" in scope) return scope.response;

  const filters = [eq(pedidosTable.id, id)];
  if (scope.tenantId) {
    filters.push(eq(pedidosTable.tenantId, scope.tenantId));
  }

  await db
    .update(pedidosTable)
    .set(updates as typeof pedidosTable.$inferInsert)
    .where(and(...filters));

  return NextResponse.json({ ok: true });
}

export async function DELETE(req: NextRequest) {
  const auth = await requireSession();
  if (!auth.ok) return auth.response;
  const { session } = auth;

  const id = req.nextUrl.searchParams.get("id");
  if (!id) {
    return NextResponse.json({ error: "Missing id query param" }, { status: 400 });
  }

  // Scope fail-closed antes de construir el WHERE.
  const scope = await resolveScope(session, null, "write");
  if ("response" in scope) return scope.response;

  const filters = [eq(pedidosTable.id, id)];
  if (scope.tenantId) {
    filters.push(eq(pedidosTable.tenantId, scope.tenantId));
  }

  await db.delete(pedidosTable).where(and(...filters));
  return NextResponse.json({ ok: true });
}

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
