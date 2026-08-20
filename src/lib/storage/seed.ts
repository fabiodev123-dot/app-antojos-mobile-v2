import {
  categoriasRepository,
  cierresRepository,
  clientesRepository,
  gastosRepository,
  ingredientesRepository,
  movimientosStockRepository,
  pedidosRepository,
  productosRepository,
  recetasRepository,
} from "@/lib/repositories";
import { setCounters } from "@/lib/repositories/counters";
import { readJson, writeJson, STORAGE_KEYS } from "@/lib/storage/local-storage";
import type { BaseEntity } from "@/lib/types";
import { seedCategorias } from "@/lib/mock/categorias";
import { seedIngredientes } from "@/lib/mock/ingredientes";
import { seedProductos } from "@/lib/mock/productos";
import { seedRecetas } from "@/lib/mock/recetas";
import { seedClientes } from "@/lib/mock/clientes";
import { seedCierre, seedGastos, seedPedidos } from "@/lib/mock/pedidos";

function stamp<T extends BaseEntity>(items: Array<Omit<T, "createdAt" | "updatedAt">>): T[] {
  const now = new Date().toISOString();
  return items.map((item) => ({
    ...item,
    createdAt: now,
    updatedAt: now,
  } as T));
}

export function ensureSeeded(): void {
  if (typeof window === "undefined") return;
  if (readJson<string>(STORAGE_KEYS.dataSource, "") === "supabase") return;

  const seeded = readJson<boolean>(STORAGE_KEYS.seeded, false);
  if (seeded) return;

  categoriasRepository.replaceAll(stamp(seedCategorias));
  ingredientesRepository.replaceAll(stamp(seedIngredientes));
  productosRepository.replaceAll(stamp(seedProductos));
  recetasRepository.replaceAll(stamp(seedRecetas));
  clientesRepository.replaceAll(stamp(seedClientes));
  gastosRepository.replaceAll(seedGastos);
  pedidosRepository.replaceAll(seedPedidos);
  cierresRepository.replaceAll([seedCierre]);
  movimientosStockRepository.replaceAll([]);

  setCounters({ pedidoNumero: 5 });

  writeJson(STORAGE_KEYS.seeded, true);
}

export function resetSeed(): void {
  if (typeof window === "undefined") return;
  const keys = Object.values(STORAGE_KEYS);
  keys.forEach((k) => window.localStorage.removeItem("antojos:" + k));
  ensureSeeded();
}