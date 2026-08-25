"use client";

import { openDB, type IDBPDatabase } from "idb";
import type { ZodSchema } from "zod";

const PREFIX = "antojos:";
const DB_NAME = "antojos-local";
const DB_VERSION = 1;
const STORE_NAME = "keyval";

// ── IndexedDB singleton ──────────────────────────────────────────────────────

let dbPromise: Promise<IDBPDatabase> | null = null;

function getDb(): Promise<IDBPDatabase> {
  if (!dbPromise) {
    dbPromise = openDB(DB_NAME, DB_VERSION, {
      upgrade(db) {
        if (!db.objectStoreNames.contains(STORE_NAME)) {
          db.createObjectStore(STORE_NAME);
        }
      },
    });
  }
  return dbPromise;
}

// ── In-memory cache (sync reads) ────────────────────────────────────────────

const memCache = new Map<string, unknown>();
let initialized = false;
let initPromise: Promise<void> | null = null;

/** Carga todo de IndexedDB al Map en memoria (una sola vez). */
async function ensureInit(): Promise<void> {
  if (initialized) return;
  if (initPromise) return initPromise;
  initPromise = (async () => {
    try {
      const db = await getDb();
      const tx = db.transaction(STORE_NAME, "readonly");
      const store = tx.objectStore(STORE_NAME);
      const keys = await store.getAllKeys();
      for (const key of keys) {
        const val = await store.get(key);
        memCache.set(key as string, val);
      }
    } catch {
      // IndexedDB no disponible — fallback a solo memoria
    }
    initialized = true;
  })();
  return initPromise;
}

/** Trigger init but don't block callers. */
function warmCache(): void {
  if (!initialized && !initPromise) {
    ensureInit();
  }
}

// ── Migración desde localStorage (una vez) ───────────────────────────────────

let migrated = false;

async function migrateFromLocalStorage(): Promise<void> {
  if (migrated) return;
  if (typeof window === "undefined") return;
  try {
    const ls = window.localStorage;
    const db = await getDb();
    const tx = db.transaction(STORE_NAME, "readwrite");
    const store = tx.objectStore(STORE_NAME);
    let count = 0;
    for (let i = 0; i < ls.length; i++) {
      const rawKey = ls.key(i);
      if (!rawKey || !rawKey.startsWith(PREFIX)) continue;
      const appKey = rawKey.slice(PREFIX.length);
      if (memCache.has(appKey)) continue; // already loaded
      const val = ls.getItem(rawKey);
      if (val !== null) {
        const parsed = JSON.parse(val);
        memCache.set(appKey, parsed);
        await store.put(parsed, appKey);
        count++;
      }
    }
    if (count > 0) await tx.done;
    migrated = true;
  } catch {
    // ignore migration errors
  }
}

// ── Public API (sync reads from cache, async writes to IDB) ──────────────────

function isBrowser(): boolean {
  return typeof window !== "undefined" && typeof window.localStorage !== "undefined";
}

export function readJson<T>(key: string, fallback: T): T {
  if (!isBrowser()) return fallback;
  warmCache();
  const val = memCache.get(key);
  return (val as T) ?? fallback;
}

export function readJsonSafe<T>(key: string, schema: ZodSchema<T>, fallback: T): T {
  if (!isBrowser()) return fallback;
  warmCache();
  const val = memCache.get(key);
  if (val === undefined) return fallback;
  const result = schema.safeParse(val);
  if (!result.success) {
    console.warn(`[storage] corrupted data in "${key}", using fallback`, result.error);
    return fallback;
  }
  return result.data;
}

export function writeJson<T>(key: string, value: T): void {
  if (!isBrowser()) return;
  memCache.set(key, value);
  // Async persist to IndexedDB (fire-and-forget)
  getDb()
    .then(async (db) => {
      const tx = db.transaction(STORE_NAME, "readwrite");
      await tx.objectStore(STORE_NAME).put(value, key);
      await tx.done;
    })
    .catch(() => {
      // quota or private mode — silent
    });
}

export function removeKey(key: string): void {
  if (!isBrowser()) return;
  memCache.delete(key);
  getDb()
    .then(async (db) => {
      const tx = db.transaction(STORE_NAME, "readwrite");
      await tx.objectStore(STORE_NAME).delete(key);
      await tx.done;
    })
    .catch(() => {});
}

export function listKeys(): string[] {
  if (!isBrowser()) return [];
  warmCache();
  return Array.from(memCache.keys());
}

export function clearAll(): void {
  if (!isBrowser()) return;
  memCache.clear();
  getDb()
    .then(async (db) => {
      const tx = db.transaction(STORE_NAME, "readwrite");
      await tx.objectStore(STORE_NAME).clear();
      await tx.done;
    })
    .catch(() => {});
}

/** Inicializar storage: migrar de localStorage + cargar cache. */
export async function initStorage(): Promise<void> {
  await ensureInit();
  await migrateFromLocalStorage();
}

export const STORAGE_KEYS = {
  categorias: "categorias",
  productos: "productos",
  ingredientes: "ingredientes",
  recetas: "recetas",
  clientes: "clientes",
  pedidos: "pedidos",
  movimientosStock: "movimientos_stock",
  gastos: "gastos",
  cierres: "cierres",
  ventasRapidas: "ventas_rapidas",
  counters: "counters",
  config: "config",
  dataSource: "data_source",
  seeded: "seeded_v7",
} as const;
