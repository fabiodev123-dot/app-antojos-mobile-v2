import { readJsonSafe, writeJson } from "@/lib/storage/local-storage";
import { nowIso, newId } from "@/lib/repositories/types";
import type { BaseEntity } from "@/lib/types";
import type { CreateInput, Repository, UpdateInput } from "@/lib/repositories/types";
import { z } from "zod";

export function createLocalRepository<T extends BaseEntity>(
  storageKey: string,
): Repository<T> {
  const arraySchema = z.array(z.any()) as unknown as z.ZodType<T[]>;

  function readAll(): T[] {
    return readJsonSafe<T[]>(storageKey, arraySchema, []);
  }

  function writeAll(items: T[]): void {
    writeJson(storageKey, items);
  }

  return {
    list() {
      return readAll();
    },

    get(id) {
      return readAll().find((item) => item.id === id) ?? null;
    },

    create(data) {
      const now = nowIso();
      const entity = {
        ...(data as object),
        id: newId(),
        createdAt: now,
        updatedAt: now,
      } as T;
      const items = readAll();
      items.push(entity);
      writeAll(items);
      return entity;
    },

    update(id, data) {
      const items = readAll();
      const idx = items.findIndex((item) => item.id === id);
      if (idx === -1) throw new Error(`[${storageKey}] not found: ${id}`);
      const current = items[idx];
      const updated = {
        ...current,
        ...(data as object),
        id: current.id,
        createdAt: current.createdAt,
        updatedAt: nowIso(),
      } as T;
      items[idx] = updated;
      writeAll(items);
      return updated;
    },

    delete(id) {
      const items = readAll();
      const idx = items.findIndex((item) => item.id === id);
      if (idx === -1) return false;
      items.splice(idx, 1);
      writeAll(items);
      return true;
    },

    replaceAll(items) {
      writeAll(items);
    },
  };
}

export type { CreateInput, Repository, UpdateInput };