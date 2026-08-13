"use client";

import { useMemo, useSyncExternalStore } from "react";
import { useSeed } from "@/hooks/use-seed";
import { useStorageVersion } from "@/hooks/use-storage-version";
import type { Repository } from "@/lib/repositories/types";
import type { BaseEntity } from "@/lib/types";

/**
 * Cache por repositorio + versión para que `getSnapshot` devuelva la misma
 * referencia mientras no haya cambios (lo exige useSyncExternalStore).
 */
const repoCache = new WeakMap<
  Repository<BaseEntity>,
  { version: number; data: BaseEntity[] }
>();

function subscribe(onStoreChange: () => void): () => void {
  const listeners = getListeners();
  listeners.add(onStoreChange);
  return () => {
    listeners.delete(onStoreChange);
  };
}

function getListeners(): Set<() => void> {
  const w = globalThis as unknown as { __antojos_listeners__?: Set<() => void> };
  if (!w.__antojos_listeners__) w.__antojos_listeners__ = new Set();
  return w.__antojos_listeners__;
}

/** Snapshot estable para SSR / hidratación — React exige la misma referencia entre renders. */
const EMPTY_LIST: readonly never[] = Object.freeze([]) as readonly never[];
const EMPTY_ITEM: null = null;

/**
 * Devuelve la lista actual del repositorio suscrita a los cambios.
 *
 * - Durante SSR / hidratación devuelve `[]` para matchear server.
 * - Después de hidratar, devuelve el contenido real del storage.
 * - Se re-renderiza automáticamente cuando bumpStorageVersion() corre.
 *
 * Esto evita el hydration mismatch: el primer render cliente y server
 * coinciden en `[]`, y recién después del mount aparece la data.
 */
export function useRepositoryList<T extends BaseEntity>(repository: Repository<T>): T[] {
  useSeed();
  const version = useStorageVersion();

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

  return useSyncExternalStore(subscribe, getSnapshot, () => EMPTY_LIST as unknown as T[]);
}

export function useRepositoryGet<T extends BaseEntity>(
  repository: Repository<T>,
  id: string | null | undefined,
): T | null {
  useSeed();
  const version = useStorageVersion();

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