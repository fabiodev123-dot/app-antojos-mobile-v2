"use client";

import { useEffect, useMemo, useSyncExternalStore } from "react";
import { useSeed } from "@/hooks/use-seed";
import { useStorageVersion } from "@/hooks/use-storage-version";
import type { ReactiveRepository, Repository } from "@/lib/repositories/types";
import type { BaseEntity } from "@/lib/types";

/**
 * Cache por repositorio + versión para que `getSnapshot` devuelva la misma
 * referencia mientras no haya cambios (lo exige useSyncExternalStore).
 *
 * Soporta dos backends:
 *
 * 1. **Local** (sin `subscribe`/`getVersion`): reactivo via el bus global
 *    `useStorageVersion()`. Es el comportamiento legacy.
 *
 * 2. **Reactivo** (Supabase, REST, etc.): cada repo tiene su propio bus
 *    via `subscribe()` + `getVersion()`. El hook dispara `ensureLoaded()`
 *    en mount para hidratar el cache async.
 */
const repoCache = new WeakMap<
  Repository<BaseEntity>,
  { version: number; data: BaseEntity[] }
>();

/** Snapshot estable para SSR / hidratación. */
const EMPTY_LIST: readonly never[] = Object.freeze([]) as readonly never[];
const EMPTY_ITEM: null = null;

function isReactive<T extends BaseEntity>(
  repository: Repository<T>,
): repository is ReactiveRepository<T> {
  return (
    typeof (repository as ReactiveRepository<T>).subscribe === "function" &&
    typeof (repository as ReactiveRepository<T>).getVersion === "function"
  );
}

export function useRepositoryList<T extends BaseEntity>(repository: Repository<T>): T[] {
  useSeed();
  const storageVersion = useStorageVersion();
  const reactive = isReactive(repository);
  const supabaseVersion = reactive ? repository.getVersion!() : 0;

  // Disparar fetch inicial si el repo es reactivo y todavía no cargó.
  useEffect(() => {
    if (!reactive) return;
    void repository.ensureLoaded!();
  }, [repository, reactive]);

  const version = reactive ? supabaseVersion : storageVersion;

  // eslint-disable-next-line react-hooks/preserve-manual-memoization -- useMemo retorna closures condicionales, React Compiler no puede preservarlas automáticamente.
  const subscribe = useMemo(() => {
    if (!reactive) {
      // Local: subscribe al bus global de storage
      return (onStoreChange: () => void) => {
        const listeners = getListeners();
        listeners.add(onStoreChange);
        return () => {
          listeners.delete(onStoreChange);
        };
      };
    }
    return (onStoreChange: () => void) => repository.subscribe!(onStoreChange);
  }, [repository, reactive]);

  const getSnapshot = useMemo(() => {
    return () => {
      const cached = repoCache.get(repository as Repository<BaseEntity>);
      if (cached && cached.version === version) {
        return cached.data as T[];
      }
      const data = repository.list();
      repoCache.set(repository as Repository<BaseEntity>, { version, data });
      return data;
    };
  }, [repository, version]);

  return useSyncExternalStore(
    subscribe,
    getSnapshot,
    () => EMPTY_LIST as unknown as T[],
  );
}

export function useRepositoryGet<T extends BaseEntity>(
  repository: Repository<T>,
  id: string | null | undefined,
): T | null {
  useSeed();
  const storageVersion = useStorageVersion();
  const reactive = isReactive(repository);
  const supabaseVersion = reactive ? repository.getVersion!() : 0;

  useEffect(() => {
    if (!reactive) return;
    void repository.ensureLoaded!();
  }, [repository, reactive]);

  const version = reactive ? supabaseVersion : storageVersion;

  // eslint-disable-next-line react-hooks/preserve-manual-memoization -- useMemo retorna closures condicionales, React Compiler no puede preservarlas automáticamente.
  const subscribe = useMemo(() => {
    if (!reactive) {
      return (onStoreChange: () => void) => {
        const listeners = getListeners();
        listeners.add(onStoreChange);
        return () => {
          listeners.delete(onStoreChange);
        };
      };
    }
    return (onStoreChange: () => void) => repository.subscribe!(onStoreChange);
  }, [repository, reactive]);

  const getSnapshot = useMemo(() => {
    return () => {
      if (!id) return null;
      const cached = repoCache.get(repository as Repository<BaseEntity>);
      if (cached && cached.version === version) {
        return (cached.data as T[]).find((item) => item.id === id) ?? null;
      }
      const data = repository.list();
      repoCache.set(repository as Repository<BaseEntity>, { version, data });
      return data.find((item) => item.id === id) ?? null;
    };
  }, [repository, id, version]);

  return useSyncExternalStore(subscribe, getSnapshot, () => EMPTY_ITEM);
}

// Local listeners — patrón legacy del reactive-repository (storage version bus).
function getListeners(): Set<() => void> {
  const w = globalThis as unknown as { __antojos_listeners__?: Set<() => void> };
  if (!w.__antojos_listeners__) w.__antojos_listeners__ = new Set();
  return w.__antojos_listeners__;
}