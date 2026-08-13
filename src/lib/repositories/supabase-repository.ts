/**
 * Repository de Supabase — implementación con cache local + fetch async.
 *
 * Estrategia: stale-while-revalidate
 * - Mantiene cache en memoria (`Map<id, T>`) que sirve los snapshots síncronos.
 * - Al primer acceso dispara un fetch async a `/api/db/{entity}` que hidrata el cache.
 * - Las mutaciones (`create/update/delete`) son async (fetch en background) pero
 *   actualizan el cache local optimistamente — UI ve la entidad YA.
 * - Si la mutación falla, rollback del cache + re-render.
 *
 * IMPORTANTE: este repo NO importa `postgres` ni `db` — solo fetch a las API
 * routes que SÍ son server-side. Esto mantiene el bundle del cliente libre de
 * módulos Node (fs/net/tls).
 */
import { newId, nowIso } from "./types";
import type { BaseEntity } from "@/lib/types";
import type {
  CreateInput,
  Repository,
  UpdateInput,
} from "./types";

// ─────────────────────────────────────────────────────────────────────────────
// BUS DE VERSIONES (idéntico al patrón del reactive-repository local).
// ─────────────────────────────────────────────────────────────────────────────

declare global {
  // eslint-disable-next-line no-var
  var __antojos_supabase_versions__: Map<unknown, number> | undefined;
  // eslint-disable-next-line no-var
  var __antojos_supabase_listeners__: Set<() => void> | undefined;
}

function versions(): Map<unknown, number> {
  if (!globalThis.__antojos_supabase_versions__) {
    globalThis.__antojos_supabase_versions__ = new Map();
  }
  return globalThis.__antojos_supabase_versions__;
}

function listeners(): Set<() => void> {
  if (!globalThis.__antojos_supabase_listeners__) {
    globalThis.__antojos_supabase_listeners__ = new Set();
  }
  return globalThis.__antojos_supabase_listeners__;
}

export function bumpVersion(repo: unknown): void {
  versions().set(repo, (versions().get(repo) ?? 0) + 1);
  listeners().forEach((l) => l());
}

export function getSupabaseRepoVersion(repo: unknown): number {
  return versions().get(repo) ?? 0;
}

export function subscribeSupabaseRepos(onChange: () => void): () => void {
  listeners().add(onChange);
  return () => {
    listeners().delete(onChange);
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// MAPPERS
// ─────────────────────────────────────────────────────────────────────────────

export interface RepositoryState<T extends BaseEntity> {
  byId: Map<string, T>;
  order: string[];
  loaded: boolean;
  loading: Promise<void> | null;
}

const states = new WeakMap<object, RepositoryState<BaseEntity>>();

function getState<T extends BaseEntity>(repo: object): RepositoryState<T> {
  let s = states.get(repo);
  if (!s) {
    s = {
      byId: new Map(),
      order: [],
      loaded: false,
      loading: null,
    };
    states.set(repo, s);
  }
  return s as RepositoryState<T>;
}

export function dbRowToFrontend<T extends BaseEntity>(row: Record<string, unknown>): T {
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(row)) {
    if (typeof v === "string" && /^\d{4}-\d{2}-\d{2}T/.test(v)) {
      // ISO date string — mantener como string
      out[k] = v;
    } else if (v === null) {
      out[k] = undefined;
    } else {
      out[k] = v;
    }
  }
  return out as T;
}

// ─────────────────────────────────────────────────────────────────────────────
// FETCH HELPERS
// ─────────────────────────────────────────────────────────────────────────────

async function apiGet<T>(entity: string, id?: string): Promise<T> {
  const url = id
    ? `/api/db/${entity}?id=${encodeURIComponent(id)}`
    : `/api/db/${entity}`;
  const res = await fetch(url, { credentials: "same-origin" });
  if (!res.ok) throw new Error(`[supabase-repo] GET ${entity} ${id ?? "list"} failed: ${res.status}`);
  return res.json() as Promise<T>;
}

async function apiPost<T>(entity: string, body: unknown): Promise<T> {
  const res = await fetch(`/api/db/${entity}`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    credentials: "same-origin",
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error(`[supabase-repo] POST ${entity} failed: ${res.status}`);
  return res.json() as Promise<T>;
}

async function apiPatch(entity: string, id: string, body: unknown): Promise<void> {
  const res = await fetch(`/api/db/${entity}?id=${encodeURIComponent(id)}`, {
    method: "PATCH",
    headers: { "content-type": "application/json" },
    credentials: "same-origin",
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error(`[supabase-repo] PATCH ${entity} ${id} failed: ${res.status}`);
}

async function apiDelete(entity: string, id: string): Promise<void> {
  const res = await fetch(`/api/db/${entity}?id=${encodeURIComponent(id)}`, {
    method: "DELETE",
    credentials: "same-origin",
  });
  if (!res.ok) throw new Error(`[supabase-repo] DELETE ${entity} ${id} failed: ${res.status}`);
}

// ─────────────────────────────────────────────────────────────────────────────
// REPOSITORY GENÉRICO
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Crea un repository de Supabase con cache local + fetch a API routes.
 *
 * @param entity — nombre de la entidad (path segment de la API route), ej "productos"
 * @param orderByKey — campo del objeto por el cual ordenar (default: "createdAt")
 */
export function createSupabaseRepository<
  T extends BaseEntity,
>(
  entity: string,
  orderByKey: keyof T = "createdAt" as keyof T,
): Repository<T> & {
  ensureLoaded(): Promise<void>;
  getVersion(): number;
  subscribe(onChange: () => void): () => void;
} {
  const REPO_KEY = { entity } as const;
  const state = getState<T>(REPO_KEY);

  function sortOrder(): void {
    state.order.sort((a, b) => {
      const aa = state.byId.get(a);
      const bb = state.byId.get(b);
      if (!aa || !bb) return 0;
      const va = (aa as Record<string, unknown>)[orderByKey as string];
      const vb = (bb as Record<string, unknown>)[orderByKey as string];
      return String(va ?? "").localeCompare(String(vb ?? ""));
    });
  }

  async function fetchAll(): Promise<void> {
    const rows = await apiGet<Array<Record<string, unknown>>>(entity);
    state.byId.clear();
    state.order = [];
    for (const row of rows) {
      const entityRow = dbRowToFrontend<T>(row);
      state.byId.set(entityRow.id, entityRow);
      state.order.push(entityRow.id);
    }
    sortOrder();
    state.loaded = true;
    bumpVersion(REPO_KEY);
  }

  async function ensureLoaded(): Promise<void> {
    if (state.loaded) return;
    if (state.loading) return state.loading;
    state.loading = fetchAll().finally(() => {
      state.loading = null;
    });
    return state.loading;
  }

  return {
    list() {
      return state.order
        .map((id) => state.byId.get(id))
        .filter((x): x is T => x !== undefined);
    },

    get(id) {
      return state.byId.get(id) ?? null;
    },

    create(data) {
      const now = nowIso();
      const entityRow = {
        ...(data as object),
        id: newId(),
        createdAt: now,
        updatedAt: now,
      } as T;
      state.byId.set(entityRow.id, entityRow);
      state.order.push(entityRow.id);
      sortOrder();
      bumpVersion(REPO_KEY);
      void (async () => {
        try {
          await apiPost(entity, data);
        } catch (err) {
          state.byId.delete(entityRow.id);
          state.order = state.order.filter((x) => x !== entityRow.id);
          bumpVersion(REPO_KEY);
          throw err;
        }
      })();
      return entityRow;
    },

    update(id, data) {
      const current = state.byId.get(id);
      if (!current) {
        throw new Error(
          `[supabase-repository] update: entity not found in cache: ${id}`,
        );
      }
      const updated = {
        ...current,
        ...(data as object),
        id: current.id,
        createdAt: current.createdAt,
        updatedAt: nowIso(),
      } as T;
      state.byId.set(id, updated);
      sortOrder();
      bumpVersion(REPO_KEY);
      void (async () => {
        try {
          await apiPatch(entity, id, data);
        } catch (err) {
          state.byId.set(id, current);
          sortOrder();
          bumpVersion(REPO_KEY);
          throw err;
        }
      })();
      return updated;
    },

    delete(id) {
      const existing = state.byId.get(id);
      if (!existing) return false;
      state.byId.delete(id);
      state.order = state.order.filter((x) => x !== id);
      bumpVersion(REPO_KEY);
      void (async () => {
        try {
          await apiDelete(entity, id);
        } catch (err) {
          state.byId.set(id, existing);
          state.order.push(id);
          sortOrder();
          bumpVersion(REPO_KEY);
          throw err;
        }
      })();
      return true;
    },

    replaceAll(items) {
      // No soportado en API genérica; usar replaceAll solo en seed inicial
      // desde server-side. Para client, este método no debería llamarse.
      throw new Error(
        "[supabase-repository] replaceAll no soportado en API genérica. Usar seed-server-side.",
      );
    },

    ensureLoaded,
    getVersion() {
      return getSupabaseRepoVersion(REPO_KEY);
    },

    subscribe(onChange) {
      return subscribeSupabaseRepos(onChange);
    },
  };
}