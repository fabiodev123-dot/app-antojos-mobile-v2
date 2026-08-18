/**
 * Factory de repositorios — elige local (localStorage) o Supabase (API routes).
 *
 * Por default usa localStorage (comportamiento actual de la app).
 * Para activar Supabase setear en Vercel:
 *   NEXT_PUBLIC_DATA_SOURCE=supabase
 *   NEXT_PUBLIC_SUPABASE_URL=https://...
 *   NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=... (o NEXT_PUBLIC_SUPABASE_ANON_KEY)
 *   DATABASE_URL=postgresql://... (server-side only, para Drizzle en API routes)
 *
 * El repo de Supabase usa fetch a `/api/db/{entity}` — NO importa `postgres`
 * ni `db` directo. Por eso es seguro en el bundle del cliente.
 */
import { createReactiveLocalRepository } from "@/lib/repositories/reactive-repository";
import { createSupabaseRepository } from "@/lib/repositories/supabase-repository";
import { pedidosSupabaseRepository } from "@/lib/repositories/pedidos-supabase-repository";
import { STORAGE_KEYS } from "@/lib/storage/local-storage";
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
  VentaRapida,
} from "@/lib/types";
import type { Repository } from "@/lib/repositories/types";

const useSupabase =
  process.env.NEXT_PUBLIC_DATA_SOURCE === "supabase" &&
  !!process.env.NEXT_PUBLIC_SUPABASE_URL &&
  !!(process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ??
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);

if (useSupabase) {
  console.info(
    "[repositories] DATA_SOURCE=supabase → usando fetch a /api/db/*",
  );
} else {
  console.info("[repositories] DATA_SOURCE=local → usando localStorage");
}

// ─────────────────────────────────────────────────────────────────────────────
// Categorías
// ─────────────────────────────────────────────────────────────────────────────
export const categoriasRepository: Repository<Categoria> = useSupabase
  ? createSupabaseRepository<Categoria>("categorias", "nombre")
  : createReactiveLocalRepository<Categoria>(STORAGE_KEYS.categorias);

// ─────────────────────────────────────────────────────────────────────────────
// Productos
// ─────────────────────────────────────────────────────────────────────────────
export const productosRepository: Repository<Producto> = useSupabase
  ? createSupabaseRepository<Producto>("productos", "nombre")
  : createReactiveLocalRepository<Producto>(STORAGE_KEYS.productos);

// ─────────────────────────────────────────────────────────────────────────────
// Ingredientes
// ─────────────────────────────────────────────────────────────────────────────
export const ingredientesRepository: Repository<Ingrediente> = useSupabase
  ? createSupabaseRepository<Ingrediente>("ingredientes", "nombre")
  : createReactiveLocalRepository<Ingrediente>(STORAGE_KEYS.ingredientes);

// ─────────────────────────────────────────────────────────────────────────────
// Recetas
// ─────────────────────────────────────────────────────────────────────────────
export const recetasRepository: Repository<Receta> = useSupabase
  ? createSupabaseRepository<Receta>("recetas", "createdAt")
  : createReactiveLocalRepository<Receta>(STORAGE_KEYS.recetas);

// ─────────────────────────────────────────────────────────────────────────────
// Clientes
// ─────────────────────────────────────────────────────────────────────────────
export const clientesRepository: Repository<Cliente> = useSupabase
  ? createSupabaseRepository<Cliente>("clientes", "nombre")
  : createReactiveLocalRepository<Cliente>(STORAGE_KEYS.clientes);

// ─────────────────────────────────────────────────────────────────────────────
// Pedidos — repo ESPECIAL (items embebidos)
// ─────────────────────────────────────────────────────────────────────────────
export const pedidosRepository: Repository<Pedido> = useSupabase
  ? (pedidosSupabaseRepository as Repository<Pedido>)
  : createReactiveLocalRepository<Pedido>(STORAGE_KEYS.pedidos);

// ─────────────────────────────────────────────────────────────────────────────
// Movimientos de stock
// ─────────────────────────────────────────────────────────────────────────────
export const movimientosStockRepository: Repository<MovimientoStock> = useSupabase
  ? createSupabaseRepository<MovimientoStock>("movimientos-stock", "fecha")
  : createReactiveLocalRepository<MovimientoStock>(STORAGE_KEYS.movimientosStock);

// ─────────────────────────────────────────────────────────────────────────────
// Gastos
// ─────────────────────────────────────────────────────────────────────────────
export const gastosRepository: Repository<Gasto> = useSupabase
  ? createSupabaseRepository<Gasto>("gastos", "fecha")
  : createReactiveLocalRepository<Gasto>(STORAGE_KEYS.gastos);

// ─────────────────────────────────────────────────────────────────────────────
// Cierres diarios
// ─────────────────────────────────────────────────────────────────────────────
export const cierresRepository: Repository<CierreDiario> = useSupabase
  ? createSupabaseRepository<CierreDiario>("cierres", "fecha")
  : createReactiveLocalRepository<CierreDiario>(STORAGE_KEYS.cierres);

// ─────────────────────────────────────────────────────────────────────────────
// Ventas rápidas (anotaciones simples de monto sin cliente/items)
// ─────────────────────────────────────────────────────────────────────────────
export const ventasRapidasRepository: Repository<VentaRapida> = useSupabase
  ? createSupabaseRepository<VentaRapida>("ventas-rapidas", "fecha")
  : createReactiveLocalRepository<VentaRapida>(STORAGE_KEYS.ventasRapidas);

export const DATA_SOURCE = useSupabase ? "supabase" : "local";