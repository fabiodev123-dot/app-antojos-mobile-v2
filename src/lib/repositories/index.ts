import { createReactiveLocalRepository } from "@/lib/repositories/reactive-repository";
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
} from "@/lib/types";
import type { Repository } from "@/lib/repositories/types";

export const categoriasRepository: Repository<Categoria> = createReactiveLocalRepository<Categoria>(
  STORAGE_KEYS.categorias,
);

export const productosRepository: Repository<Producto> = createReactiveLocalRepository<Producto>(
  STORAGE_KEYS.productos,
);

export const ingredientesRepository: Repository<Ingrediente> = createReactiveLocalRepository<Ingrediente>(
  STORAGE_KEYS.ingredientes,
);

export const recetasRepository: Repository<Receta> = createReactiveLocalRepository<Receta>(
  STORAGE_KEYS.recetas,
);

export const clientesRepository: Repository<Cliente> = createReactiveLocalRepository<Cliente>(
  STORAGE_KEYS.clientes,
);

export const pedidosRepository: Repository<Pedido> = createReactiveLocalRepository<Pedido>(
  STORAGE_KEYS.pedidos,
);

export const movimientosStockRepository: Repository<MovimientoStock> = createReactiveLocalRepository<MovimientoStock>(
  STORAGE_KEYS.movimientosStock,
);

export const gastosRepository: Repository<Gasto> = createReactiveLocalRepository<Gasto>(
  STORAGE_KEYS.gastos,
);

export const cierresRepository: Repository<CierreDiario> = createReactiveLocalRepository<CierreDiario>(
  STORAGE_KEYS.cierres,
);