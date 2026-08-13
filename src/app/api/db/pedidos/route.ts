/**
 * API route específica para pedidos (1:N con pedido_items).
 *
 * Path: /api/db/pedidos
 * - GET sin query → list (cada pedido con items embebidos)
 * - GET ?id=X → get one (con items)
 * - POST body → create pedido + items (transacción)
 * - PATCH ?id=X body → update pedido (NO items — el frontend los maneja aparte)
 * - DELETE ?id=X → delete (cascade a items)
 *
 * Items endpoint separado: /api/db/pedidos/items?pedidoId=X
 */
import { type NextRequest, NextResponse } from "next/server";
import { eq, inArray } from "drizzle-orm";
import { db } from "@/lib/db";
import { pedidos as pedidosTable, pedidoItems as pedidoItemsTable } from "@/lib/db/schema";
import { newId, nowIso } from "@/lib/repositories/types";

export async function GET(
  req: NextRequest,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  { params }: { params: Promise<any> },
) {
  // entity debe ser "pedidos" — si no, 404
  const { entity } = await params;
  if (entity !== "pedidos") {
    return NextResponse.json({ error: `Unknown entity: ${entity}` }, { status: 404 });
  }

  const id = req.nextUrl.searchParams.get("id");
  if (id) {
    const pedidoRows = await db.select().from(pedidosTable).where(eq(pedidosTable.id, id)).limit(1);
    const pedido = pedidoRows[0];
    if (!pedido) return NextResponse.json({ error: "Not found" }, { status: 404 });
    const items = await db.select().from(pedidoItemsTable).where(eq(pedidoItemsTable.pedidoId, id));
    return NextResponse.json({ ...pedido, items });
  }

  // List con items embebidos
  const allPedidos = await db.select().from(pedidosTable);
  if (allPedidos.length === 0) return NextResponse.json([]);
  const ids = allPedidos.map((p) => p.id);
  const allItems = await db
    .select()
    .from(pedidoItemsTable)
    .where(inArray(pedidoItemsTable.pedidoId, ids));
  const itemsByPedido = new Map<string, unknown[]>();
  for (const item of allItems) {
    const arr = (itemsByPedido.get(item.pedidoId) as unknown[] | undefined) ?? [];
    arr.push(item);
    itemsByPedido.set(item.pedidoId, arr);
  }
  return NextResponse.json(
    allPedidos.map((p) => ({ ...p, items: itemsByPedido.get(p.id) ?? [] })),
  );
}

export async function POST(
  req: NextRequest,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  { params }: { params: Promise<any> },
) {
  const { entity } = await params;
  if (entity !== "pedidos") {
    return NextResponse.json({ error: `Unknown entity: ${entity}` }, { status: 404 });
  }

  const body = await req.json();
  const { items = [], ...pedidoFields } = body;
  const now = nowIso();
  const pedidoId = newId();

  const pedidoRow = {
    ...pedidoFields,
    id: pedidoId,
    createdAt: now,
    updatedAt: now,
  };

  const itemsRows = items.map((it: Record<string, unknown>) => ({
    ...it,
    id: it.id ?? newId(),
    pedidoId,
    createdAt: now,
    updatedAt: now,
  }));

  await db.transaction(async (tx) => {
    await tx.insert(pedidosTable).values(pedidoRow as typeof pedidosTable.$inferInsert);
    if (itemsRows.length > 0) {
      await tx.insert(pedidoItemsTable).values(itemsRows as (typeof pedidoItemsTable.$inferInsert)[]);
    }
  });

  return NextResponse.json({ ...pedidoRow, items: itemsRows }, { status: 201 });
}

export async function PATCH(
  req: NextRequest,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  { params }: { params: Promise<any> },
) {
  const { entity } = await params;
  if (entity !== "pedidos") {
    return NextResponse.json({ error: `Unknown entity: ${entity}` }, { status: 404 });
  }

  const id = req.nextUrl.searchParams.get("id");
  if (!id) {
    return NextResponse.json({ error: "Missing id query param" }, { status: 400 });
  }

  const body = await req.json();
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const { items: _ignored, ...pedidoFields } = body;
  const updates = { ...pedidoFields, updatedAt: nowIso() };

  await db
    .update(pedidosTable)
    .set(updates as typeof pedidosTable.$inferInsert)
    .where(eq(pedidosTable.id, id));

  return NextResponse.json({ ok: true });
}

export async function DELETE(
  req: NextRequest,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  { params }: { params: Promise<any> },
) {
  const { entity } = await params;
  if (entity !== "pedidos") {
    return NextResponse.json({ error: `Unknown entity: ${entity}` }, { status: 404 });
  }

  const id = req.nextUrl.searchParams.get("id");
  if (!id) {
    return NextResponse.json({ error: "Missing id query param" }, { status: 400 });
  }

  await db.delete(pedidosTable).where(eq(pedidosTable.id, id));
  return NextResponse.json({ ok: true });
}