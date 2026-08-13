/**
 * API route genérica para CRUD de entidades planas del schema Antojos.
 *
 * Path: /api/db/{entity}
 * - GET sin query → list
 * - GET ?id=X → get one
 * - POST body → create
 * - PATCH ?id=X body → update
 * - DELETE ?id=X → delete
 *
 * Soporta: categorias, productos, ingredientes, recetas, clientes,
 *          movimientos-stock, gastos, cierres (cierres_diarios).
 *
 * Para pedidos (que tienen items embebidos) ver /api/db/pedidos/route.ts.
 *
 * Por seguridad:
 * - El cliente NO importa postgres-js directo. Hace fetch a este endpoint.
 * - El handler valida el nombre de la entidad contra whitelist.
 * - Solo accesible desde el propio dominio (no auth por ahora — single-user).
 */
import { type NextRequest, NextResponse } from "next/server";
import { eq } from "drizzle-orm";
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
} from "@/lib/db/schema";
import { newId, nowIso } from "@/lib/repositories/types";

// ─────────────────────────────────────────────────────────────────────────────
// Whitelist de entidades → tabla Drizzle + columnas permitidas
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
} as const;

type EntityName = keyof typeof ENTITIES;

// Columnas read-only (no se pueden setear desde el body del POST).
const READ_ONLY: ReadonlySet<string> = new Set(["createdAt", "updatedAt", "id"]);

function getEntity(name: string) {
  if (!(name in ENTITIES)) return null;
  return ENTITIES[name as EntityName];
}

// ─────────────────────────────────────────────────────────────────────────────
// CRUD
// ─────────────────────────────────────────────────────────────────────────────

export async function GET(
  req: NextRequest,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  { params }: { params: Promise<any> },
) {
  const { entity } = await params;
  const table = getEntity(entity);
  if (!table) {
    return NextResponse.json({ error: `Unknown entity: ${entity}` }, { status: 404 });
  }

  const id = req.nextUrl.searchParams.get("id");
  if (id) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const rows = await db.select().from(table as any).where(eq((table as any).id, id)).limit(1);
    const row = rows[0];
    if (!row) return NextResponse.json({ error: "Not found" }, { status: 404 });
    return NextResponse.json(row);
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const rows = await db.select().from(table as any);
  return NextResponse.json(rows);
}

export async function POST(
  req: NextRequest,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  { params }: { params: Promise<any> },
) {
  const { entity } = await params;
  const table = getEntity(entity);
  if (!table) {
    return NextResponse.json({ error: `Unknown entity: ${entity}` }, { status: 404 });
  }

  const body = await req.json();
  const now = nowIso();

  // Filtrar columnas read-only.
  const data: Record<string, unknown> = { id: newId(), createdAt: now, updatedAt: now };
  for (const [k, v] of Object.entries(body)) {
    if (!READ_ONLY.has(k)) data[k] = v;
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  await db.insert(table as any).values(data as any);
  return NextResponse.json(data, { status: 201 });
}

export async function PATCH(
  req: NextRequest,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  { params }: { params: Promise<any> },
) {
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
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const updates: Record<string, unknown> = { updatedAt: nowIso() };
  for (const [k, v] of Object.entries(body)) {
    if (!READ_ONLY.has(k)) updates[k] = v;
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  await db.update(table as any).set(updates as any).where(eq((table as any).id, id));
  return NextResponse.json({ ok: true });
}

export async function DELETE(
  req: NextRequest,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  { params }: { params: Promise<any> },
) {
  const { entity } = await params;
  const table = getEntity(entity);
  if (!table) {
    return NextResponse.json({ error: `Unknown entity: ${entity}` }, { status: 404 });
  }

  const id = req.nextUrl.searchParams.get("id");
  if (!id) {
    return NextResponse.json({ error: "Missing id query param" }, { status: 400 });
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const result = await db.delete(table as any).where(eq((table as any).id, id));
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const rowCount = (result as any)?.count ?? 0;
  return NextResponse.json({ ok: rowCount > 0 });
}