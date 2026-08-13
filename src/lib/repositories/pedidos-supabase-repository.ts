/**
 * Repository de Pedidos específico para Supabase.
 *
 * El frontend espera `pedido.items: PedidoItem[]` embebido, pero en la DB los
 * items viven en `pedido_items` (relación 1:N). Este repo hace el JOIN en cada
 * operación para mantener la API del frontend intacta.
 *
 * N+1 trade-off: `list()` hace 1 query por pedido para traer los items.
 * Aceptable para V1 (50-100 pedidos/día). Cuando se justifique, optimizar con
 * un JOIN + GROUP BY en una sola query.
 */
import { db } from "@/lib/db";
import { eq, inArray } from "drizzle-orm";
import { pedidos as pedidosTable, pedidoItems as pedidoItemsTable } from "@/lib/db/schema";
import { newId, nowIso } from "./types";
import type { Pedido, PedidoItem } from "@/lib/types";
import type { CreateInput, Repository, UpdateInput } from "./types";
import {
  bumpVersion,
  getSupabaseRepoVersion,
  subscribeSupabaseRepos,
  dbRowToFrontend,
  type RepositoryState,
} from "./supabase-repository";

type PedidoState = RepositoryState<Pedido>;

/**
 * Convierte un Pedido (formato frontend, timestamps como ISO string) al formato
 * que espera Drizzle para insertar (Date para timestamps with timezone).
 */
function pedidoToDb(p: Pedido): typeof pedidosTable.$inferInsert {
  return {
    id: p.id,
    numero: p.numero,
    clienteId: p.clienteId ?? null,
    nombreCliente: p.nombreCliente,
    telefonoCliente: p.telefonoCliente ?? null,
    direccionEntrega: p.direccionEntrega ?? null,
    subtotal: p.subtotal,
    envio: p.envio ?? null,
    total: p.total,
    estado: p.estado,
    canal: p.canal,
    tipoEntrega: p.tipoEntrega,
    observaciones: p.observaciones ?? null,
    fecha: p.fecha,
    hora: p.hora,
    cerradoAt: p.cerradoAt ? new Date(p.cerradoAt) : null,
    entregadoAt: p.entregadoAt ? new Date(p.entregadoAt) : null,
    createdAt: new Date(p.createdAt),
    updatedAt: new Date(p.updatedAt),
  };
}

function pedidoItemToDb(it: PedidoItem): typeof pedidoItemsTable.$inferInsert {
  return {
    id: it.id,
    pedidoId: it.pedidoId,
    productoId: it.productoId,
    nombreProducto: it.nombreProducto,
    colorProducto: it.colorProducto,
    cantidad: it.cantidad,
    precioUnitario: it.precioUnitario,
    subtotal: it.subtotal,
    imagenProducto: it.imagenProducto ?? null,
    observaciones: it.observaciones ?? null,
    createdAt: new Date(it.createdAt),
    updatedAt: new Date(it.updatedAt),
  };
}

const pedidosState: PedidoState = {
  byId: new Map(),
  order: [],
  loaded: false,
  loading: null,
};

const PEDIDO_REPO_KEY = Symbol("pedidos");

async function fetchAllPedidos(): Promise<void> {
  const rows = await db.select().from(pedidosTable).orderBy(pedidosTable.createdAt);
  if (rows.length === 0) {
    pedidosState.byId.clear();
    pedidosState.order = [];
    pedidosState.loaded = true;
    bumpVersion(PEDIDO_REPO_KEY);
    return;
  }
  // Traemos todos los items en una sola query (en vez de N+1).
  const pedidoIds = rows.map((r) => r.id);
  const allItems = await db
    .select()
    .from(pedidoItemsTable)
    .where(inArray(pedidoItemsTable.pedidoId, pedidoIds));
  const itemsByPedido = new Map<string, PedidoItem[]>();
  for (const row of allItems) {
    const item = dbRowToFrontend<PedidoItem>(row as Record<string, unknown>);
    const arr = itemsByPedido.get(item.pedidoId) ?? [];
    arr.push(item);
    itemsByPedido.set(item.pedidoId, arr);
  }
  pedidosState.byId.clear();
  pedidosState.order = [];
  for (const row of rows) {
    const pedido = dbRowToFrontend<Pedido>(row as Record<string, unknown>);
    pedido.items = itemsByPedido.get(pedido.id) ?? [];
    pedidosState.byId.set(pedido.id, pedido);
    pedidosState.order.push(pedido.id);
  }
  pedidosState.loaded = true;
  bumpVersion(PEDIDO_REPO_KEY);
}

export const pedidosSupabaseRepository: Repository<Pedido> & {
  ensureLoaded(): Promise<void>;
  getVersion(): number;
  subscribe(onChange: () => void): () => void;
} = {
  list() {
    return pedidosState.order
      .map((id) => pedidosState.byId.get(id))
      .filter((x): x is Pedido => x !== undefined);
  },

  get(id) {
    return pedidosState.byId.get(id) ?? null;
  },

  create(data) {
    const now = nowIso();
    const pedidoId = newId();
    const items: PedidoItem[] = ((data as { items?: PedidoItem[] }).items ?? []).map(
      (it) => ({
        ...it,
        id: it.id || newId(),
        pedidoId,
        createdAt: now,
        updatedAt: now,
      }),
    );
    const { items: _ignored, ...rest } = data as { items?: PedidoItem[] };
    const pedido: Pedido = {
      ...(rest as Omit<Pedido, "items" | "id" | "createdAt" | "updatedAt">),
      id: pedidoId,
      items,
      createdAt: now,
      updatedAt: now,
    };

    // Cache optimista
    pedidosState.byId.set(pedido.id, pedido);
    pedidosState.order.push(pedido.id);
    bumpVersion(PEDIDO_REPO_KEY);

    void (async () => {
      try {
        await db.transaction(async (tx) => {
          await tx.insert(pedidosTable).values(pedidoToDb(pedido));
          if (items.length > 0) {
            await tx.insert(pedidoItemsTable).values(items.map(pedidoItemToDb));
          }
        });
      } catch (err) {
        pedidosState.byId.delete(pedido.id);
        pedidosState.order = pedidosState.order.filter((x) => x !== pedido.id);
        bumpVersion(PEDIDO_REPO_KEY);
        throw err;
      }
    })();

    return pedido;
  },

  update(id, data) {
    const current = pedidosState.byId.get(id);
    if (!current) {
      throw new Error(`[pedidos-repository] update: not found: ${id}`);
    }
    const { items: _items, ...rest } = data as { items?: PedidoItem[] };
    const updated: Pedido = {
      ...current,
      ...rest,
      id: current.id,
      items: current.items,
      createdAt: current.createdAt,
      updatedAt: nowIso(),
    };
    pedidosState.byId.set(id, updated);
    bumpVersion(PEDIDO_REPO_KEY);

    void (async () => {
      try {
        await db
          .update(pedidosTable)
          .set({ ...rest, updatedAt: updated.updatedAt } as Record<string, unknown>)
          .where(eq(pedidosTable.id, id));
      } catch (err) {
        pedidosState.byId.set(id, current);
        bumpVersion(PEDIDO_REPO_KEY);
        throw err;
      }
    })();

    return updated;
  },

  delete(id) {
    const existing = pedidosState.byId.get(id);
    if (!existing) return false;
    pedidosState.byId.delete(id);
    pedidosState.order = pedidosState.order.filter((x) => x !== id);
    bumpVersion(PEDIDO_REPO_KEY);
    void (async () => {
      try {
        await db.delete(pedidosTable).where(eq(pedidosTable.id, id));
        // items se borran por CASCADE
      } catch (err) {
        pedidosState.byId.set(id, existing);
        pedidosState.order.push(id);
        bumpVersion(PEDIDO_REPO_KEY);
        throw err;
      }
    })();
    return true;
  },

  replaceAll(items) {
    pedidosState.byId.clear();
    pedidosState.order = [];
    const now = nowIso();
    const pedidosList: Pedido[] = [];
    const itemsList: PedidoItem[] = [];
    for (const p of items) {
      const itemsConPid = (p.items ?? []).map((it) => ({
        ...it,
        pedidoId: p.id,
        createdAt: it.createdAt ?? now,
        updatedAt: now,
      }));
      const pedido: Pedido = {
        ...p,
        items: itemsConPid,
        updatedAt: now,
      };
      pedidosState.byId.set(p.id, pedido);
      pedidosState.order.push(p.id);
      pedidosList.push(pedido);
      itemsList.push(...itemsConPid);
    }
    bumpVersion(PEDIDO_REPO_KEY);
    void (async () => {
      try {
        await db.transaction(async (tx) => {
          await tx.delete(pedidoItemsTable);
          await tx.delete(pedidosTable);
          if (pedidosList.length > 0) {
            await tx.insert(pedidosTable).values(pedidosList.map(pedidoToDb));
          }
          if (itemsList.length > 0) {
            await tx.insert(pedidoItemsTable).values(itemsList.map(pedidoItemToDb));
          }
        });
      } catch (err) {
        bumpVersion(PEDIDO_REPO_KEY);
        throw err;
      }
    })();
  },

  async ensureLoaded() {
    if (pedidosState.loaded) return;
    if (pedidosState.loading) return pedidosState.loading;
    pedidosState.loading = fetchAllPedidos().finally(() => {
      pedidosState.loading = null;
    });
    return pedidosState.loading;
  },

  getVersion() {
    return getSupabaseRepoVersion(PEDIDO_REPO_KEY);
  },

  subscribe(onChange) {
    return subscribeSupabaseRepos(onChange);
  },
};

export type { CreateInput, Repository, UpdateInput };