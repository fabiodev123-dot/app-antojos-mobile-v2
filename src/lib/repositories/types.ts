import type { BaseEntity } from "@/lib/types";

export type CreateInput<T> = Omit<T, keyof BaseEntity>;
export type UpdateInput<T> = Partial<CreateInput<T>>;

export interface Repository<T extends BaseEntity> {
  list(): T[];
  get(id: string): T | null;
  create(data: CreateInput<T>): T;
  update(id: string, data: UpdateInput<T>): T;
  delete(id: string): boolean;
  replaceAll(items: T[]): void;
}

/**
 * Extensión opcional del Repository para backends async (Supabase, REST, etc).
 * Si el repo la implementa, `useRepositoryList` la usa para:
 * - Disparar `ensureLoaded()` en mount (primer fetch async)
 * - Suscribirse a cambios via `subscribe()` + `getVersion()` (reactividad)
 *
 * Si el repo NO la implementa, el hook asume que el repo es sync y completamente
 * reactivo por sí mismo (caso localStorage, que ya tiene su propio bus).
 */
export interface ReactiveRepository<T extends BaseEntity> extends Repository<T> {
  ensureLoaded?(): Promise<void>;
  subscribe?(onChange: () => void): () => void;
  getVersion?(): number;
}

export function newId(prefix?: string): string {
  const rand =
    typeof crypto !== "undefined" && typeof crypto.randomUUID === "function"
      ? crypto.randomUUID().replace(/-/g, "").slice(0, 12)
      : Math.random().toString(36).slice(2, 14);
  return prefix ? `${prefix}_${rand}` : rand;
}

export function nowIso(): string {
  return new Date().toISOString();
}