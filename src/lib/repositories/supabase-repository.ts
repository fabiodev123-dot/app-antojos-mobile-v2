/**
 * Repository de Supabase — implementación con cache local + fetch async.
 *
 * Estrategia: stale-while-revalidate
 * - Mantiene un cache en memoria (Map<id, T>) que actúa como fuente de verdad
 *   para los snapshots síncronos (`list()`, `get()`).
 * - Al primer acceso dispara un fetch async que hidrata el cache desde la DB.
 * - Las mutaciones (`create/update/delete`) son async pero actualizan el cache
 *   local optimistamente antes de hacer round-trip a la DB.
 * - El hook `useRepositoryList` llama `ensureLoaded()` en mount para disparar
 *   la carga inicial si todavía no se hizo.
 *
 * Esto preserva la API SÍNCRONA del repo (CRÍTICO — el frontend asume sync
 * por el `useSyncExternalStore` con snapshot sync) mientras permite Supabase
 * async por debajo.
 *
 * Para tablas con relaciones 1:N (pedidos) hay un repo específico.
 */
import { db } from "@/lib/db";
import { eq } from "drizzle-orm";
import { newId, nowIso } from "./types";
import type { CreateInput, Repository, UpdateInput } from "./types";
import type { BaseEntity } from "@/lib/types";

// ─────────────────────────────────────────────────────────────────────────────
// BUS DE VERSIONES — patrón idéntico al reactive-repository.ts (localStorage).
// Permite que useSyncExternalStore detecte cambios y re-renderice.
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

/** Versión de un repo (para useSyncExternalStore cache). */
export function getSupabaseRepoVersion(repo: unknown): number {
  return versions().get(repo) ?? 0;
}

/** Subscribe a cambios de cualquier repo Supabase. */
export function subscribeSupabaseRepos(onChange: () => void): () => void {
  listeners().add(onChange);
  return () => {
    listeners().delete(onChange);
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// MAPPERS
// ─────────────────────────────────────────────────────────────────────────────

export function dbRowToFrontend<T extends BaseEntity>(row: Record<string, unknown>): T {
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(row)) {
    if (v instanceof Date) {
      out[k] = v.toISOString();
    } else if (v === null) {
      out[k] = undefined;
    } else {
      out[k] = v;
    }
  }
  return out as T;
}

// ─────────────────────────────────────────────────────────────────────────────
// REPOSITORY GENÉRICO
// ─────────────────────────────────────────────────────────────────────────────

export interface RepositoryState<T extends BaseEntity> {
  byId: Map<string, T>;
  order: string[]; // ids en orden de insertion (createdAt asc)
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

/**
 * Crea un repository de Supabase con cache local + fetch async.
 *
 * @param table — tabla Drizzle (pgTable result)
 * @param orderByColumn — columna Drizzle para ordenar el resultado (default: createdAt asc)
 */
export function createSupabaseRepository<
  T extends BaseEntity,
  TTable extends { id: unknown; createdAt: unknown },
>(
  table: TTable,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  orderByColumn?: any,
): Repository<T> & {
  /** Dispara el fetch inicial si todavía no se cargó. Idempotente. */
  ensureLoaded(): Promise<void>;
  /** Trae la versión actual (para useSyncExternalStore). */
  getVersion(): number;
} {
  const state = getState<T>(table);

  async function fetchAll(): Promise<void> {
    const rows = await db
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      .select()
      .from(table as any)
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      .orderBy(orderByColumn ?? (table as any).createdAt);
    state.byId.clear();
    state.order = [];
    for (const row of rows) {
      const entity = dbRowToFrontend<T>(row as Record<string, unknown>);
      state.byId.set(entity.id, entity);
      state.order.push(entity.id);
    }
    state.loaded = true;
    bumpVersion(table);
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
      // Sync — devuelve lo que haya en cache (puede ser [] antes del primer fetch).
      return state.order
        .map((id) => state.byId.get(id))
        .filter((x): x is T => x !== undefined);
    },

    get(id) {
      return state.byId.get(id) ?? null;
    },

    create(data) {
      const now = nowIso();
      const entity = {
        ...(data as object),
        id: newId(),
        createdAt: now,
        updatedAt: now,
      } as T;
      // Update cache optimistamente (sync) — UI ve la entidad YA.
      state.byId.set(entity.id, entity);
      state.order.push(entity.id);
      bumpVersion(table);
      // Persist async. Si falla, removemos del cache (rollback optimista).
      void (async () => {
        try {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          await db.insert(table as any).values(entity as any);
        } catch (err) {
          state.byId.delete(entity.id);
          state.order = state.order.filter((x) => x !== entity.id);
          bumpVersion(table);
          throw err;
        }
      })();
      return entity;
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
      bumpVersion(table);
      void (async () => {
        try {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          await db
            .update(table as any)
            .set({ ...(data as object), updatedAt: updated.updatedAt } as Record<
              string,
              unknown
            >)
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            .where(eq((table as any).id, id));
        } catch (err) {
          state.byId.set(id, current); // rollback
          bumpVersion(table);
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
      bumpVersion(table);
      void (async () => {
        try {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          await db.delete(table as any).where(eq((table as any).id, id));
        } catch (err) {
          // rollback
          state.byId.set(id, existing);
          state.order.push(id);
          bumpVersion(table);
          throw err;
        }
      })();
      return true;
    },

    replaceAll(items) {
      // Sync wipe
      state.byId.clear();
      state.order = [];
      const now = nowIso();
      const rows = items.map((item) => ({
        ...item,
        createdAt: item.createdAt ?? now,
        updatedAt: now,
      }));
      for (const r of rows) {
        state.byId.set(r.id, r);
        state.order.push(r.id);
      }
      bumpVersion(table);
      // Async persist
      void (async () => {
        try {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          await db.delete(table as any);
          if (rows.length > 0) {
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            await db.insert(table as any).values(rows as any[]);
          }
        } catch (err) {
          bumpVersion(table); // re-render para que UI sepa que algo falló
          throw err;
        }
      })();
    },

    ensureLoaded,
    getVersion() {
      return versions().get(table) ?? 0;
    },
  };
}