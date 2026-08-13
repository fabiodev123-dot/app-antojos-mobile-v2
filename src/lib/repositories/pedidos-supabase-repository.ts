/**
 * Repository de Pedidos específico para Supabase.
 *
 * El frontend espera `pedido.items: PedidoItem[]` embebido, pero la API route
 * `/api/db/pedidos` ya devuelve los items juntos. Este repo solo cachea y
 * expone la estructura que el frontend espera.
 */
import { newId, nowIso } from "./types";
import type { Pedido, PedidoItem } from "@/lib/types";
import type { Repository } from "./types";
import {
  bumpVersion,
  getSupabaseRepoVersion,
  subscribeSupabaseRepos,
  dbRowToFrontend,
  type RepositoryState,
} from "./supabase-repository";

type PedidoState = RepositoryState<Pedido>;

const pedidosState: PedidoState = {
  byId: new Map(),
  order: [],
  loaded: false,
  loading: null,
};

const PEDIDO_REPO_KEY = Symbol("pedidos");

async function apiGet<T>(id?: string): Promise<T> {
  const url = id ? `/api/db/pedidos?id=${encodeURIComponent(id)}` : "/api/db/pedidos";
  const res = await fetch(url, { credentials: "same-origin" });
  if (!res.ok) throw new Error(`[pedidos-repo] GET ${id ?? "list"} failed: ${res.status}`);
  return res.json() as Promise<T>;
}

async function apiPost<T>(body: unknown): Promise<T> {
  const res = await fetch("/api/db/pedidos", {
    method: "POST",
    headers: { "content-type": "application/json" },
    credentials: "same-origin",
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error(`[pedidos-repo] POST failed: ${res.status}`);
  return res.json() as Promise<T>;
}

async function apiPatch(id: string, body: unknown): Promise<void> {
  const res = await fetch(`/api/db/pedidos?id=${encodeURIComponent(id)}`, {
    method: "PATCH",
    headers: { "content-type": "application/json" },
    credentials: "same-origin",
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error(`[pedidos-repo] PATCH ${id} failed: ${res.status}`);
}

async function apiDelete(id: string): Promise<void> {
  const res = await fetch(`/api/db/pedidos?id=${encodeURIComponent(id)}`, {
    method: "DELETE",
    credentials: "same-origin",
  });
  if (!res.ok) throw new Error(`[pedidos-repo] DELETE ${id} failed: ${res.status}`);
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
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { items: _ignored, ...rest } = data as { items?: PedidoItem[] };
    const pedido: Pedido = {
      ...(rest as Omit<Pedido, "items" | "id" | "createdAt" | "updatedAt">),
      id: pedidoId,
      items,
      createdAt: now,
      updatedAt: now,
    };

    pedidosState.byId.set(pedido.id, pedido);
    pedidosState.order.push(pedido.id);
    bumpVersion(PEDIDO_REPO_KEY);

    void (async () => {
      try {
        await apiPost({ ...rest, items });
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
      throw new Error(`[pedidos-repo] update: not found: ${id}`);
    }
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
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
        await apiPatch(id, rest);
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
        await apiDelete(id);
      } catch (err) {
        pedidosState.byId.set(id, existing);
        pedidosState.order.push(id);
        bumpVersion(PEDIDO_REPO_KEY);
        throw err;
      }
    })();
    return true;
  },

  replaceAll() {
    throw new Error(
      "[pedidos-repo] replaceAll no soportado en client. Usar seed-server-side.",
    );
  },

  async ensureLoaded() {
    if (pedidosState.loaded) return;
    if (pedidosState.loading) return pedidosState.loading;
    pedidosState.loading = (async () => {
      const rows = await apiGet<Array<Record<string, unknown>>>();
      pedidosState.byId.clear();
      pedidosState.order = [];
      for (const row of rows) {
        const pedido = dbRowToFrontend<Pedido>(row);
        pedido.items = ((pedido.items as PedidoItem[] | undefined) ?? []).map((it) =>
          dbRowToFrontend<PedidoItem>(it as unknown as Record<string, unknown>),
        );
        pedidosState.byId.set(pedido.id, pedido);
        pedidosState.order.push(pedido.id);
      }
      pedidosState.loaded = true;
      bumpVersion(PEDIDO_REPO_KEY);
    })().finally(() => {
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