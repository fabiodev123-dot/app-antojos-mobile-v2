import type { Pedido, PedidoItem, CierreDiario, Gasto } from "@/lib/types";

const today = new Date();
const yesterday = new Date(today.getTime() - 24 * 60 * 60 * 1000);
const yesterdayIso = yesterday.toISOString();
const yesterdayDate = yesterday.toISOString().slice(0, 10);

function makeItem(
  pedidoId: string,
  id: string,
  productoId: string,
  nombreProducto: string,
  colorProducto: PedidoItem["colorProducto"],
  cantidad: number,
  precioUnitario: number,
): PedidoItem {
  const now = yesterdayIso;
  return {
    id,
    pedidoId,
    productoId,
    nombreProducto,
    colorProducto,
    cantidad,
    precioUnitario,
    subtotal: cantidad * precioUnitario,
    createdAt: now,
    updatedAt: now,
  };
}

export const seedPedidos: Pedido[] = [
  {
    id: "ped_001",
    numero: 1,
    clienteId: "cli_001",
    nombreCliente: "María González",
    telefonoCliente: "+54 11 5555-1234",
    direccionEntrega: "Av. Rivadavia 1234, CABA",
    items: [
      makeItem("ped_001", "pedi_001", "prod_miga_jq", "Miga Jamón y Queso", "red", 2, 2500),
      makeItem("ped_001", "pedi_002", "prod_beb_gaseosa_500", "Gaseosa 500ml", "blue", 1, 1400),
    ],
    subtotal: 6400,
    total: 6400,
    estado: "entregado",
    canal: "whatsapp",
    tipoEntrega: "retiro",
    fecha: yesterdayDate,
    hora: "13:00",
    cerradoAt: yesterdayIso,
    entregadoAt: yesterdayIso,
    createdAt: yesterdayIso,
    updatedAt: yesterdayIso,
  },
  {
    id: "ped_002",
    numero: 2,
    clienteId: "cli_003",
    nombreCliente: "Lucía Fernández",
    telefonoCliente: "+54 11 5555-9012",
    direccionEntrega: "Av. Santa Fe 3345, Piso 5A",
    items: [
      makeItem("ped_002", "pedi_003", "prod_pizza_jyq", "Pizza Jamón y Queso", "red", 1, 6500),
      makeItem("ped_002", "pedi_004", "prod_postre_flan", "Flan con Dulce de Leche", "pink", 2, 2200),
      makeItem("ped_002", "pedi_005", "prod_beb_agua", "Agua Mineral 500ml", "blue", 2, 1100),
    ],
    subtotal: 13100,
    total: 13100,
    estado: "entregado",
    canal: "whatsapp",
    tipoEntrega: "delivery",
    fecha: yesterdayDate,
    hora: "20:30",
    cerradoAt: yesterdayIso,
    entregadoAt: yesterdayIso,
    createdAt: yesterdayIso,
    updatedAt: yesterdayIso,
  },
  {
    id: "ped_003",
    numero: 3,
    nombreCliente: "Cliente Mostrador",
    items: [
      makeItem("ped_003", "pedi_006", "prod_miga_especial", "Miga Especial Antojos", "rose", 1, 3600),
    ],
    subtotal: 3600,
    total: 3600,
    estado: "preparando",
    canal: "presencial",
    tipoEntrega: "retiro",
    fecha: today.toISOString().slice(0, 10),
    hora: "12:45",
    createdAt: today.toISOString(),
    updatedAt: today.toISOString(),
  },
  {
    id: "ped_004",
    numero: 4,
    clienteId: "cli_006",
    nombreCliente: "Diego Romero",
    telefonoCliente: "+54 11 5555-2345",
    direccionEntrega: "Tucumán 1500, 4A",
    items: [
      makeItem("ped_004", "pedi_007", "prod_mila_napolitana_carne", "Milanesa Napolitana Carne", "red", 2, 8400),
      makeItem("ped_004", "pedi_008", "prod_beb_cerveza", "Cerveza 1L", "blue", 2, 3400),
    ],
    subtotal: 23600,
    total: 23600,
    estado: "pendiente",
    canal: "whatsapp",
    tipoEntrega: "delivery",
    observaciones: "Timbre 4A — llamar al llegar",
    fecha: today.toISOString().slice(0, 10),
    hora: "20:00",
    createdAt: today.toISOString(),
    updatedAt: today.toISOString(),
  },
];

export const seedGastos: Gasto[] = [
  { id: "gas_001", fecha: yesterdayDate, categoria: "insumos", monto: 45000, descripcion: "Compra pan, jamón y queso (proveedor Don Pepe)", createdAt: yesterdayIso, updatedAt: yesterdayIso },
  { id: "gas_002", fecha: yesterdayDate, categoria: "servicios_publicos", monto: 18500, descripcion: "Luz y gas del local", createdAt: yesterdayIso, updatedAt: yesterdayIso },
  { id: "gas_003", fecha: yesterdayDate, categoria: "transporte", monto: 4500, descripcion: "Nafta para deliverys", createdAt: yesterdayIso, updatedAt: yesterdayIso },
];

export const seedCierre: CierreDiario = {
  id: "cie_001",
  fecha: yesterdayDate,
  totalVentas: 19500,
  cantidadPedidos: 2,
  totalGastos: 68000,
  balance: -48500,
  notas: "Día flojo de ventas — muchos gastos",
  enviadoEmail: false,
  enviadoWsp: false,
  createdAt: yesterdayIso,
  updatedAt: yesterdayIso,
};