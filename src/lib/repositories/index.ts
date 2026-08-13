/**
 * Factory de repositorios — elige local (localStorage) o Supabase (Drizzle).
 *
 * Por default usa localStorage (comportamiento actual de la app).
 * Para activar Supabase setear en .env.local:
 *   NEXT_PUBLIC_DATA_SOURCE=supabase
 *   NEXT_PUBLIC_SUPABASE_URL=https://...
 *   NEXT_PUBLIC_SUPABASE_ANON_KEY=...
 *   DATABASE_URL=postgresql://... (server-side only, para Drizzle)
 *
 * En Vercel, todas se setean via env vars del proyecto.
 *
 * Si `DATA_SOURCE=supabase` pero las env vars faltan, tira error explícito al
 * usar el repo (chequeo lazy en cada cliente).
 */
import { createReactiveLocalRepository } from "@/lib/repositories/reactive-repository";
import { createSupabaseRepository } from "@/lib/repositories/supabase-repository";
import { pedidosSupabaseRepository } from "@/lib/repositories/pedidos-supabase-repository";
import { STORAGE_KEYS } from "@/lib/storage/local-storage";
import {
  categorias,
  productos,
  ingredientes,
  recetas,
  clientes,
  movimientosStock,
  gastos,
  cierresDiarios,
} from "@/lib/db/schema";
import type {
  Categoria,
  CierreDiario,
  Cliente,
  Gasto,
  Ingrediente,
  MovimientoStock,
  Pedido,
  Producto,
  Receta,
} from "@/lib/types";
import type { Repository } from "@/lib/repositories/types";

const useSupabase =
  process.env.NEXT_PUBLIC_DATA_SOURCE === "supabase" &&
  !!process.env.NEXT_PUBLIC_SUPABASE_URL &&
  !!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (useSupabase) {
  // eslint-disable-next-line no-console
  console.info(
    "[repositories] DATA_SOURCE=supabase → usando Drizzle + Postgres",
  );
} else {
  // eslint-disable-next-line no-console
  console.info("[repositories] DATA_SOURCE=local → usando localStorage");
}

// ─────────────────────────────────────────────────────────────────────────────
// Categorías
// ─────────────────────────────────────────────────────────────────────────────
export const categoriasRepository: Repository<Categoria> = useSupabase
  ? createSupabaseRepository<Categoria, typeof categorias>(categorias, categorias.nombre)
  : createReactiveLocalRepository<Categoria>(STORAGE_KEYS.categorias);

// ─────────────────────────────────────────────────────────────────────────────
// Productos
// ─────────────────────────────────────────────────────────────────────────────
export const productosRepository: Repository<Producto> = useSupabase
  ? createSupabaseRepository<Producto, typeof productos>(productos, productos.nombre)
  : createReactiveLocalRepository<Producto>(STORAGE_KEYS.productos);

// ─────────────────────────────────────────────────────────────────────────────
// Ingredientes
// ─────────────────────────────────────────────────────────────────────────────
export const ingredientesRepository: Repository<Ingrediente> = useSupabase
  ? createSupabaseRepository<Ingrediente, typeof ingredientes>(
      ingredientes,
      ingredientes.nombre,
    )
  : createReactiveLocalRepository<Ingrediente>(STORAGE_KEYS.ingredientes);

// ─────────────────────────────────────────────────────────────────────────────
// Recetas
// ─────────────────────────────────────────────────────────────────────────────
export const recetasRepository: Repository<Receta> = useSupabase
  ? createSupabaseRepository<Receta, typeof recetas>(recetas)
  : createReactiveLocalRepository<Receta>(STORAGE_KEYS.recetas);

// ─────────────────────────────────────────────────────────────────────────────
// Clientes
// ─────────────────────────────────────────────────────────────────────────────
export const clientesRepository: Repository<Cliente> = useSupabase
  ? createSupabaseRepository<Cliente, typeof clientes>(clientes, clientes.nombre)
  : createReactiveLocalRepository<Cliente>(STORAGE_KEYS.clientes);

// ─────────────────────────────────────────────────────────────────────────────
// Pedidos — repo ESPECIAL (items embebidos desde tabla aparte)
// ─────────────────────────────────────────────────────────────────────────────
export const pedidosRepository: Repository<Pedido> = useSupabase
  ? (pedidosSupabaseRepository as Repository<Pedido>)
  : createReactiveLocalRepository<Pedido>(STORAGE_KEYS.pedidos);

// ─────────────────────────────────────────────────────────────────────────────
// Movimientos de stock
// ─────────────────────────────────────────────────────────────────────────────
export const movimientosStockRepository: Repository<MovimientoStock> = useSupabase
  ? createSupabaseRepository<MovimientoStock, typeof movimientosStock>(
      movimientosStock,
      movimientosStock.fecha,
    )
  : createReactiveLocalRepository<MovimientoStock>(STORAGE_KEYS.movimientosStock);

// ─────────────────────────────────────────────────────────────────────────────
// Gastos
// ─────────────────────────────────────────────────────────────────────────────
export const gastosRepository: Repository<Gasto> = useSupabase
  ? createSupabaseRepository<Gasto, typeof gastos>(gastos, gastos.fecha)
  : createReactiveLocalRepository<Gasto>(STORAGE_KEYS.gastos);

// ─────────────────────────────────────────────────────────────────────────────
// Cierres diarios
// ─────────────────────────────────────────────────────────────────────────────
export const cierresRepository: Repository<CierreDiario> = useSupabase
  ? createSupabaseRepository<CierreDiario, typeof cierresDiarios>(
      cierresDiarios,
      cierresDiarios.fecha,
    )
  : createReactiveLocalRepository<CierreDiario>(STORAGE_KEYS.cierres);

export const DATA_SOURCE = useSupabase ? "supabase" : "local";