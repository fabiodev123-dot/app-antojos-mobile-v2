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