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

export async function GET(req: NextRequest) {
  // Esta ruta es estática (/api/db/pedidos), no tiene segmentos dinámicos.
  // No destructuramos `params` porque viene como `undefined` en Next.js 16 +
  // Turbopack cuando el path es 100% estático, y eso tira "Cannot destructure
  // property 'entity' of undefined".

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

export async function POST(req: NextRequest) {
  // Esta ruta es estática, no destructuramos params (ver GET más arriba).

  const body = await req.json();
  const { items = [], ...pedidoFields } = body;
  const now = new Date();
  const pedidoId = newId();

  // El body viene con timestamps como ISO strings (formato del frontend).
  // Drizzle espera Date objects para columnas timestamptz — convertimos acá.
  const pedidoRow = {
    ...pedidoFields,
    id: pedidoId,
    createdAt: now,
    updatedAt: now,
    cerradoAt: pedidoFields.cerradoAt ? new Date(pedidoFields.cerradoAt) : null,
    entregadoAt: pedidoFields.entregadoAt ? new Date(pedidoFields.entregadoAt) : null,
  };

  const itemsRows = items.map((it: Record<string, unknown>) => ({
    ...it,
    id: it.id ?? newId(),
    pedidoId,
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
  // Esta ruta es estática, no destructuramos params (ver GET más arriba).

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

export async function DELETE(req: NextRequest) {
  // Esta ruta es estática, no destructuramos params (ver GET más arriba).

  const id = req.nextUrl.searchParams.get("id");
  if (!id) {
    return NextResponse.json({ error: "Missing id query param" }, { status: 400 });
  }

  await db.delete(pedidosTable).where(eq(pedidosTable.id, id));
  return NextResponse.json({ ok: true });
}