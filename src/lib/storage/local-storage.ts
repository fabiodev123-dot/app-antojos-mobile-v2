"use client";

import type { ZodSchema } from "zod";

const PREFIX = "antojos:";

function isBrowser(): boolean {
  return typeof window !== "undefined" && typeof window.localStorage !== "undefined";
}

export function readJson<T>(key: string, fallback: T): T {
  if (!isBrowser()) return fallback;
  try {
    const raw = window.localStorage.getItem(PREFIX + key);
    if (raw === null) return fallback;
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

export function readJsonSafe<T>(key: string, schema: ZodSchema<T>, fallback: T): T {
  if (!isBrowser()) return fallback;
  try {
    const raw = window.localStorage.getItem(PREFIX + key);
    if (raw === null) return fallback;
    const parsed = JSON.parse(raw);
    const result = schema.safeParse(parsed);
    if (!result.success) {
      console.warn(`[storage] corrupted data in "${key}", using fallback`, result.error);
      return fallback;
    }
    return result.data;
  } catch {
    return fallback;
  }
}

export function writeJson<T>(key: string, value: T): void {
  if (!isBrowser()) return;
  try {
    window.localStorage.setItem(PREFIX + key, JSON.stringify(value));
  } catch {
    // quota exceeded o private mode — silencioso por ahora
  }
}

export function removeKey(key: string): void {
  if (!isBrowser()) return;
  window.localStorage.removeItem(PREFIX + key);
}

export function listKeys(): string[] {
  if (!isBrowser()) return [];
  const keys: string[] = [];
  for (let i = 0; i < window.localStorage.length; i++) {
    const k = window.localStorage.key(i);
    if (k && k.startsWith(PREFIX)) keys.push(k.slice(PREFIX.length));
  }
  return keys;
}

export function clearAll(): void {
  if (!isBrowser()) return;
  const keys = listKeys();
  keys.forEach((k) => removeKey(k));
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
  counters: "counters",
  config: "config",
  seeded: "seeded_v7",
} as const;