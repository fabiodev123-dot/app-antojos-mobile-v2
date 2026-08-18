export type ColorPlato =
  | "red"
  | "green"
  | "purple"
  | "yellow"
  | "orange"
  | "amber"
  | "pink"
  | "blue"
  | "beige"
  | "gray"
  | "teal"
  | "rose";

export const COLOR_PLATO_VALUES = [
  "red",
  "green",
  "purple",
  "yellow",
  "orange",
  "amber",
  "pink",
  "blue",
  "beige",
  "gray",
  "teal",
  "rose",
] as const satisfies readonly ColorPlato[];

export const COLOR_PLATO_HEX: Record<ColorPlato, { bg: string; ring: string; text: string; dot: string; label: string }> = {
  red: { bg: "bg-red-500", ring: "ring-red-500/40", text: "text-red-700 dark:text-red-300", dot: "bg-red-500", label: "Rojo" },
  green: { bg: "bg-green-500", ring: "ring-green-500/40", text: "text-green-700 dark:text-green-300", dot: "bg-green-500", label: "Verde" },
  purple: { bg: "bg-purple-500", ring: "ring-purple-500/40", text: "text-purple-700 dark:text-purple-300", dot: "bg-purple-500", label: "Lila" },
  yellow: { bg: "bg-yellow-500", ring: "ring-yellow-500/40", text: "text-yellow-700 dark:text-yellow-300", dot: "bg-yellow-500", label: "Amarillo" },
  orange: { bg: "bg-orange-500", ring: "ring-orange-500/40", text: "text-orange-700 dark:text-orange-300", dot: "bg-orange-500", label: "Naranja" },
  amber: { bg: "bg-amber-700", ring: "ring-amber-700/40", text: "text-amber-800 dark:text-amber-300", dot: "bg-amber-700", label: "Marrón" },
  pink: { bg: "bg-pink-500", ring: "ring-pink-500/40", text: "text-pink-700 dark:text-pink-300", dot: "bg-pink-500", label: "Rosa" },
  blue: { bg: "bg-blue-500", ring: "ring-blue-500/40", text: "text-blue-700 dark:text-blue-300", dot: "bg-blue-500", label: "Azul" },
  beige: { bg: "bg-stone-400", ring: "ring-stone-400/40", text: "text-stone-700 dark:text-stone-300", dot: "bg-stone-400", label: "Beige" },
  gray: { bg: "bg-gray-400", ring: "ring-gray-400/40", text: "text-gray-700 dark:text-gray-300", dot: "bg-gray-400", label: "Gris" },
  teal: { bg: "bg-teal-500", ring: "ring-teal-500/40", text: "text-teal-700 dark:text-teal-300", dot: "bg-teal-500", label: "Verde azulado" },
  rose: { bg: "bg-rose-500", ring: "ring-rose-500/40", text: "text-rose-700 dark:text-rose-300", dot: "bg-rose-500", label: "Rosado" },
};

export type EstadoPedido =
  | "pendiente"
  | "preparando"
  | "listo"
  | "entregado"
  | "cancelado";

export type CanalPedido = "whatsapp" | "presencial" | "telefono";

export type TipoEntrega = "retiro" | "delivery";

export type UnidadMedida = "kg" | "g" | "l" | "ml" | "unidad" | "paquete";

export type TipoMovimientoStock =
  | "entrada"
  | "salida"
  | "ajuste"
  | "merma"
  | "venta";

export type CategoriaGasto =
  | "insumos"
  | "servicios"
  | "sueldos"
  | "alquiler"
  | "servicios_publicos"
  | "transporte"
  | "marketing"
  | "otros";

export interface BaseEntity {
  id: string;
  createdAt: string;
  updatedAt: string;
}

export interface Categoria extends BaseEntity {
  nombre: string;
  emoji?: string;
  colorDefault: ColorPlato;
  activo: boolean;
}

export interface Producto extends BaseEntity {
  nombre: string;
  descripcion?: string;
  categoriaId: string;
  precio: number;
  color: ColorPlato;
  emoji?: string;
  /** Path público a la imagen del plato (ej: "/imgplatos/1.jpg"). Opcional. */
  imagen?: string;
  /** Unidades pre-hechas disponibles para vender. Decrementa al vender. */
  stockActual: number;
  /** Cuando stockActual <= stockMinimo, el producto aparece en alertas. */
  stockMinimo: number;
  activo: boolean;
}

export interface Ingrediente extends BaseEntity {
  nombre: string;
  unidad: UnidadMedida;
  stockActual: number;
  stockMinimo: number;
  costoUnitario?: number;
  activo: boolean;
}

export interface Receta extends BaseEntity {
  productoId: string;
  ingredienteId: string;
  cantidad: number;
}

export interface Cliente extends BaseEntity {
  nombre: string;
  telefono: string;
  direccion?: string;
  email?: string;
  notas?: string;
  totalPedidos: number;
  ultimaCompra?: string;
}

export interface PedidoItem extends BaseEntity {
  pedidoId: string;
  productoId: string;
  nombreProducto: string;
  colorProducto: ColorPlato;
  cantidad: number;
  precioUnitario: number;
  subtotal: number;
  /** Snapshot del path de imagen al momento del pedido. */
  imagenProducto?: string;
  observaciones?: string;
}

export interface Pedido extends BaseEntity {
  numero: number;
  clienteId?: string;
  nombreCliente: string;
  telefonoCliente?: string;
  direccionEntrega?: string;
  items: PedidoItem[];
  subtotal: number;
  /** Costo de envío en pesos, solo aplica a pedidos delivery. */
  envio?: number;
  total: number;
  estado: EstadoPedido;
  canal: CanalPedido;
  tipoEntrega: TipoEntrega;
  observaciones?: string;
  fecha: string;
  hora: string;
  cerradoAt?: string;
  entregadoAt?: string;
}

export interface MovimientoStock extends BaseEntity {
  ingredienteId: string;
  tipo: TipoMovimientoStock;
  cantidad: number;
  motivo?: string;
  pedidoId?: string;
  fecha: string;
}

export interface Gasto extends BaseEntity {
  fecha: string;
  categoria: CategoriaGasto;
  monto: number;
  descripcion: string;
}

export interface CierreDiario extends BaseEntity {
  fecha: string;
  totalVentas: number;
  cantidadPedidos: number;
  totalGastos: number;
  balance: number;
  notas?: string;
  enviadoEmail: boolean;
  enviadoWsp: boolean;
}

/**
 * Venta rápida — anotación simple sin cliente, sin items, sin carrito.
 *
 * Caso de uso: el dueño de la rotisería vende en la noche y solo quiere
 * anotar "vendí $X" en 5 segundos. Esto NO es un pedido (no genera stock,
 * no descuenta ingredientes, no aparece en /pedidos). Es solo un registro
 * monetario que alimenta el cierre diario y el resumen semanal.
 *
 * En el cierre diario, `VentaRapida.monto` cuenta como venta.
 * En el dashboard/WeeklySummary, suma junto a los pedidos entregados/listos.
 */
export interface VentaRapida extends BaseEntity {
  /** ISO YYYY-MM-DD. Se autocompleta con `hoy()` al crear. */
  fecha: string;
  /** HH:MM (24h). Se autocompleta con la hora actual. */
  hora: string;
  /** Monto en ARS enteros (sin centavos, como el resto de la app). */
  monto: number;
  /** Nota libre opcional. Ej: "sin delivery", "mostrador", etc. */
  nota?: string;
}