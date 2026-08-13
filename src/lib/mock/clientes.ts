import type { Cliente } from "@/lib/types";

export const seedClientes: Omit<Cliente, "createdAt" | "updatedAt">[] = [
  { id: "cli_001", nombre: "María González", telefono: "+54 11 5555-1234", direccion: "Av. Rivadavia 1234, CABA", email: "maria.g@example.com", notas: "Siempre retira a las 13hs", totalPedidos: 14, ultimaCompra: "2026-08-06T13:15:00.000Z" },
  { id: "cli_002", nombre: "Carlos Pérez", telefono: "+54 11 5555-5678", direccion: "San Martín 456, Piso 2B", email: "", notas: "", totalPedidos: 6, ultimaCompra: "2026-08-05T20:30:00.000Z" },
  { id: "cli_003", nombre: "Lucía Fernández", telefono: "+54 11 5555-9012", direccion: "", email: "lucia.f@example.com", notas: "Delivery todos los jueves", totalPedidos: 22, ultimaCompra: "2026-08-04T19:45:00.000Z" },
  { id: "cli_004", nombre: "Roberto Silva", telefono: "+54 11 5555-3456", direccion: "Belgrano 789", email: "", notas: "Prefiere milanesa napolitana", totalPedidos: 9, ultimaCompra: "2026-08-03T12:00:00.000Z" },
  { id: "cli_005", nombre: "Ana Martínez", telefono: "+54 11 5555-7890", direccion: "Corrientes 2345", email: "ana.m@example.com", notas: "", totalPedidos: 3 },
  { id: "cli_006", nombre: "Diego Romero", telefono: "+54 11 5555-2345", direccion: "Tucumán 1500, 4A", email: "", notas: "Pide por wsp a último momento", totalPedidos: 18, ultimaCompra: "2026-08-06T22:00:00.000Z" },
  { id: "cli_007", nombre: "Patricia López", telefono: "+54 11 5555-6789", direccion: "", email: "patri.lopez@example.com", notas: "Vegetariana", totalPedidos: 11, ultimaCompra: "2026-08-02T13:20:00.000Z" },
  { id: "cli_008", nombre: "Fernando Castro", telefono: "+54 11 5555-1111", direccion: "Mitre 678", email: "", notas: "Empresarial — factura A", totalPedidos: 27, ultimaCompra: "2026-08-06T21:15:00.000Z" },
];