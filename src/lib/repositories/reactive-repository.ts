import { createLocalRepository } from "@/lib/repositories/local-repository";
import { bumpStorageVersion } from "@/hooks/use-storage-version";
import type { BaseEntity } from "@/lib/types";
import type { CreateInput, Repository, UpdateInput } from "@/lib/repositories/types";

export function createReactiveLocalRepository<T extends BaseEntity>(
  storageKey: string,
): Repository<T> {
  const base = createLocalRepository<T>(storageKey);

  function commit<TOut>(value: TOut): TOut {
    bumpStorageVersion();
    return value;
  }

  return {
    list() {
      return base.list();
    },
    get(id) {
      return base.get(id);
    },
    create(data) {
      return commit(base.create(data));
    },
    update(id, data) {
      return commit(base.update(id, data));
    },
    delete(id) {
      const ok = base.delete(id);
      if (ok) commit(base.list()[0] ?? ({} as T));
      return ok;
    },
    replaceAll(items) {
      base.replaceAll(items);
      commit(items[0] ?? ({} as T));
    },
  };
}

export type { CreateInput, Repository, UpdateInput };