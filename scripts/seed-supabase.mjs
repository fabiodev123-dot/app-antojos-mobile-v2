/**
 * Seed inicial de Antojos a Supabase.
 *
 * USO:
 *   DATABASE_URL='postgresql://...' node scripts/seed-supabase.mjs
 *
 * Inserta 8 categorías, 28 ingredientes, 30 productos, 35 recetas y 8 clientes.
 * Idempotente: ON CONFLICT (id) DO UPDATE.
 *
 * Recomendable correr una sola vez y borrar el archivo después.
 */
import postgres from "postgres";

const now = new Date().toISOString();

// ─────────────────────────────────────────────────────────────────────────────
// DATA — copia de src/lib/mock/*.ts
// ─────────────────────────────────────────────────────────────────────────────

const categorias = [
  { id: "cat_alitos", nombre: "Alitos", emoji: "🍗", colorDefault: "orange", activo: true },
  { id: "cat_hambur_pizza", nombre: "Hambur Pizza", emoji: "🍕", colorDefault: "red", activo: true },
  { id: "cat_empanadas", nombre: "Empanadas", emoji: "🥟", colorDefault: "amber", activo: true },
  { id: "cat_tortas", nombre: "Tortas y Sándwiches", emoji: "🥪", colorDefault: "beige", activo: true },
  { id: "cat_hamburguesas", nombre: "Hamburguesas", emoji: "🍔", colorDefault: "amber", activo: true },
  { id: "cat_pizzas", nombre: "Pizzas", emoji: "🍕", colorDefault: "red", activo: true },
  { id: "cat_combos", nombre: "Combos", emoji: "🍟", colorDefault: "orange", activo: true },
  { id: "cat_helados", nombre: "Helados", emoji: "🍦", colorDefault: "pink", activo: true },
];

const ingredientes = [
  { id: "ing_pan_miga", nombre: "Pan de miga", unidad: "unidad", stockActual: 240, stockMinimo: 60, costoUnitario: 180, activo: true },
  { id: "ing_jamon_cocido", nombre: "Jamón cocido", unidad: "kg", stockActual: 3.5, stockMinimo: 1.5, costoUnitario: 8500, activo: true },
  { id: "ing_jamon_crudo", nombre: "Jamón crudo", unidad: "kg", stockActual: 1.8, stockMinimo: 0.8, costoUnitario: 16500, activo: true },
  { id: "ing_queso_tybo", nombre: "Queso tybo", unidad: "kg", stockActual: 2.8, stockMinimo: 1.2, costoUnitario: 7200, activo: true },
  { id: "ing_queso_muzzarella", nombre: "Queso muzzarella", unidad: "kg", stockActual: 4.2, stockMinimo: 2, costoUnitario: 6800, activo: true },
  { id: "ing_queso_crema", nombre: "Queso crema", unidad: "kg", stockActual: 1.2, stockMinimo: 0.5, costoUnitario: 5400, activo: true },
  { id: "ing_milanesa_carne", nombre: "Milanesa de carne", unidad: "unidad", stockActual: 35, stockMinimo: 15, costoUnitario: 2400, activo: true },
  { id: "ing_milanesa_pollo", nombre: "Milanesa de pollo", unidad: "unidad", stockActual: 22, stockMinimo: 12, costoUnitario: 2100, activo: true },
  { id: "ing_milanesa_soja", nombre: "Milanesa de soja", unidad: "unidad", stockActual: 18, stockMinimo: 8, costoUnitario: 1600, activo: true },
  { id: "ing_huevo", nombre: "Huevo", unidad: "unidad", stockActual: 180, stockMinimo: 60, costoUnitario: 220, activo: true },
  { id: "ing_lechuga", nombre: "Lechuga", unidad: "unidad", stockActual: 12, stockMinimo: 4, costoUnitario: 850, activo: true },
  { id: "ing_tomate", nombre: "Tomate", unidad: "kg", stockActual: 4.5, stockMinimo: 2, costoUnitario: 1800, activo: true },
  { id: "ing_cebolla", nombre: "Cebolla", unidad: "kg", stockActual: 3.2, stockMinimo: 1.5, costoUnitario: 900, activo: true },
  { id: "ing_zanahoria", nombre: "Zanahoria", unidad: "kg", stockActual: 2.4, stockMinimo: 1, costoUnitario: 1100, activo: true },
  { id: "ing_papa", nombre: "Papa", unidad: "kg", stockActual: 12, stockMinimo: 5, costoUnitario: 650, activo: true },
  { id: "ing_prepizza", nombre: "Prepizza", unidad: "unidad", stockActual: 24, stockMinimo: 10, costoUnitario: 480, activo: true },
  { id: "ing_salsa_tomate", nombre: "Salsa de tomate", unidad: "l", stockActual: 5, stockMinimo: 2, costoUnitario: 1200, activo: true },
  { id: "ing_atun", nombre: "Atún en lata", unidad: "unidad", stockActual: 18, stockMinimo: 8, costoUnitario: 1850, activo: true },
  { id: "ing_aceitunas", nombre: "Aceitunas", unidad: "kg", stockActual: 1.5, stockMinimo: 0.5, costoUnitario: 4200, activo: true },
  { id: "ing_harina", nombre: "Harina 000", unidad: "kg", stockActual: 15, stockMinimo: 5, costoUnitario: 980, activo: true },
  { id: "ing_aceite", nombre: "Aceite girasol", unidad: "l", stockActual: 8, stockMinimo: 3, costoUnitario: 1900, activo: true },
  { id: "ing_gaseosa", nombre: "Gaseosa 1.5L", unidad: "unidad", stockActual: 36, stockMinimo: 12, costoUnitario: 1450, activo: true },
  { id: "ing_agua", nombre: "Agua mineral 500ml", unidad: "unidad", stockActual: 48, stockMinimo: 20, costoUnitario: 520, activo: true },
  { id: "ing_cerveza", nombre: "Cerveza 1L", unidad: "unidad", stockActual: 24, stockMinimo: 10, costoUnitario: 2100, activo: true },
  { id: "ing_dulce_leche", nombre: "Dulce de leche", unidad: "kg", stockActual: 1.8, stockMinimo: 0.5, costoUnitario: 4800, activo: true },
  { id: "ing_crema", nombre: "Crema de leche", unidad: "l", stockActual: 3, stockMinimo: 1, costoUnitario: 2900, activo: true },
  { id: "ing_chocolate", nombre: "Chocolate cobertura", unidad: "kg", stockActual: 1.2, stockMinimo: 0.5, costoUnitario: 8400, activo: true },
  { id: "ing_anana", nombre: "Ananá", unidad: "unidad", stockActual: 4, stockMinimo: 2, costoUnitario: 2400, activo: true },
];

const productos = [
  { id: "prod_alitos_completos_a", nombre: "Alitos Completos", descripcion: "Alitas de pollo fritas, doradas y crocantes", categoriaId: "cat_alitos", precio: 16000, color: "orange", emoji: "🍗", stockActual: 20, stockMinimo: 6, activo: true, imagen: "/imgplatos/1.jpg" },
  { id: "prod_alitos_completos_b", nombre: "Alitos Completos", descripcion: "Porción grande de alitas de pollo", categoriaId: "cat_alitos", precio: 16000, color: "orange", emoji: "🍗", stockActual: 20, stockMinimo: 6, activo: true, imagen: "/imgplatos/24.jpg" },
  { id: "prod_hambur_pizza_chica", nombre: "Hambur Pizza Completa", descripcion: "Pizza con carne, jamón, queso y huevo", categoriaId: "cat_hambur_pizza", precio: 30000, color: "red", emoji: "🍕", stockActual: 10, stockMinimo: 3, activo: true, imagen: "/imgplatos/2.jpg" },
  { id: "prod_hambur_pizza_8porciones", nombre: "Hambur Pizza Completa (8 porciones)", descripcion: "Carne picada 900g, mozzarella 800g, lechuga, tomate, jamón, huevo. Rinde 8 porciones", categoriaId: "cat_hambur_pizza", precio: 27000, color: "red", emoji: "🍕", stockActual: 8, stockMinimo: 2, activo: true, imagen: "/imgplatos/3.jpg" },
  { id: "prod_hambur_pizza_alt1", nombre: "Hambur Pizza Completa", descripcion: "Variante con extra queso y huevo", categoriaId: "cat_hambur_pizza", precio: 30000, color: "red", emoji: "🍗", stockActual: 8, stockMinimo: 2, activo: true, imagen: "/imgplatos/4.jpg" },
  { id: "prod_hambur_pizza_calabreza_arriba", nombre: "Hambur Pizza Calabreza Arriba", descripcion: "Hambur pizza con longaniza calabreza encima", categoriaId: "cat_hambur_pizza", precio: 30000, color: "red", emoji: "🍕", stockActual: 8, stockMinimo: 2, activo: true, imagen: "/imgplatos/25.jpg" },
  { id: "prod_hambur_pizza_jyq_calabreza", nombre: "Hambur Pizza Jamón y Calabreza", descripcion: "Mitad jamón, mitad calabreza", categoriaId: "cat_hambur_pizza", precio: 10000, color: "red", emoji: "🍕", stockActual: 8, stockMinimo: 3, activo: true, imagen: "/imgplatos/21.jpg" },
  { id: "prod_hambur_pizza_jyq_calabreza_b", nombre: "Hambur Pizza Jamón y Calabreza", descripcion: "Variante con distribución diferente", categoriaId: "cat_hambur_pizza", precio: 10000, color: "red", emoji: "🍕", stockActual: 8, stockMinimo: 3, activo: true, imagen: "/imgplatos/22.jpg" },
  { id: "prod_hambur_pizza_alt2", nombre: "Hambur Pizza Completa", descripcion: "Variante de hambur pizza completa", categoriaId: "cat_hambur_pizza", precio: 30000, color: "red", emoji: "🍕", stockActual: 8, stockMinimo: 2, activo: true, imagen: "/imgplatos/19.jpg" },
  { id: "prod_media_hambur_pizza", nombre: "Media Hambur Pizza Completa", descripcion: "Media pizza con hamburguesa y toppings", categoriaId: "cat_hambur_pizza", precio: 16000, color: "red", emoji: "🍕", stockActual: 8, stockMinimo: 3, activo: true, imagen: "/imgplatos/23.jpg" },
  { id: "prod_media_hambur_pizza_jyq", nombre: "Media Hambur Pizza Jamón Arriba", descripcion: "Media pizza con jamón encima", categoriaId: "cat_hambur_pizza", precio: 16000, color: "red", emoji: "🍕", stockActual: 8, stockMinimo: 3, activo: true, imagen: "/imgplatos/27.jpg" },
  { id: "prod_emp_frita_carne", nombre: "Empanada Frita de Carne", descripcion: "Empanada frita hojaldrada con salsa", categoriaId: "cat_empanadas", precio: 1500, color: "amber", emoji: "🥟", stockActual: 50, stockMinimo: 20, activo: true, imagen: "/imgplatos/5.jpg" },
  { id: "prod_emp_frita_jyq", nombre: "Empanada Frita Jamón y Mozzarella", descripcion: "Empanada frita hojaldrada con salsa", categoriaId: "cat_empanadas", precio: 1500, color: "red", emoji: "🥟", stockActual: 40, stockMinimo: 15, activo: true, imagen: "/imgplatos/5.jpg" },
  { id: "prod_emp_frita_muzz_huevo", nombre: "Empanada Frita Mozzarella y Huevo", descripcion: "Empanada frita hojaldrada con salsa", categoriaId: "cat_empanadas", precio: 1500, color: "yellow", emoji: "🥟", stockActual: 30, stockMinimo: 12, activo: true, imagen: "/imgplatos/5.jpg" },
  { id: "prod_emp_frita_caprese", nombre: "Empanada Frita Caprese", descripcion: "Empanada frita hojaldrada con salsa", categoriaId: "cat_empanadas", precio: 1500, color: "green", emoji: "🥟", stockActual: 25, stockMinimo: 10, activo: true, imagen: "/imgplatos/5.jpg" },
  { id: "prod_emp_frita_milan_muzz", nombre: "Empanada Frita Milanesa y Mozzarella", descripcion: "Empanada frita hojaldrada con salsa", categoriaId: "cat_empanadas", precio: 1500, color: "orange", emoji: "🥟", stockActual: 20, stockMinimo: 8, activo: true, imagen: "/imgplatos/5.jpg" },
  { id: "prod_empanada_generica", nombre: "Empanada", descripcion: "Empanada clásica", categoriaId: "cat_empanadas", precio: 1500, color: "amber", emoji: "🥟", stockActual: 20, stockMinimo: 10, activo: true, imagen: "/imgplatos/28.jpg" },
  { id: "prod_empanadas_horno_carne", nombre: "Empanadas al Horno de Carne", descripcion: "Empanadas al horno de carne cortada a cuchillo", categoriaId: "cat_empanadas", precio: 1500, color: "amber", emoji: "🥟", stockActual: 30, stockMinimo: 12, activo: true, imagen: "/imgplatos/20.jpg" },
  { id: "prod_torta_miga_picada", nombre: "Torta de Miga con Picada", descripcion: "Torta de miga rellena con picada de fiambres y aderezos", categoriaId: "cat_tortas", precio: 12000, color: "beige", emoji: "🥪", stockActual: 10, stockMinimo: 3, activo: true, imagen: "/imgplatos/6.jpg" },
  { id: "prod_triples_jyq", nombre: "Triples de JyQ", descripcion: "Triples de miga de jamón y queso", categoriaId: "cat_tortas", precio: 9000, color: "red", emoji: "🥪", stockActual: 15, stockMinimo: 5, activo: true, imagen: "/imgplatos/13.jpg" },
  { id: "prod_triples_jyq_b", nombre: "Triples de Miga JyQ", descripcion: "Triples de miga con jamón y queso", categoriaId: "cat_tortas", precio: 9000, color: "red", emoji: "🥪", stockActual: 15, stockMinimo: 5, activo: true, imagen: "/imgplatos/18.jpg" },
  { id: "prod_triples_verdura", nombre: "Triples de Verdura", descripcion: "Jamón, queso, lechuga, tomate, mayonesa casera", categoriaId: "cat_tortas", precio: 10000, color: "green", emoji: "🥪", stockActual: 12, stockMinimo: 4, activo: true, imagen: "/imgplatos/15.jpg" },
  { id: "prod_burger_doble_todo", nombre: "Burgers Doble Todo", descripcion: "Pan de hamburguesa, 100% carne, mayonesa casera, lechuga, tomate, jamón, huevo, queso mozzarella", categoriaId: "cat_hamburguesas", precio: 6000, color: "amber", emoji: "🍔", stockActual: 20, stockMinimo: 8, activo: true, imagen: "/imgplatos/9.jpg" },
  { id: "prod_burger_doble_todo_b", nombre: "Burgers Doble Todo", descripcion: "Variante con presentación completa", categoriaId: "cat_hamburguesas", precio: 6000, color: "amber", emoji: "🍔", stockActual: 18, stockMinimo: 8, activo: true, imagen: "/imgplatos/10.jpg" },
  { id: "prod_burger", nombre: "Burgers", descripcion: "Hamburguesa clásica", categoriaId: "cat_hamburguesas", precio: 5000, color: "amber", emoji: "🍔", stockActual: 15, stockMinimo: 5, activo: true, imagen: "/imgplatos/12.jpg" },
  { id: "prod_burgers_completa_caseras", nombre: "Burgers Completa Caseras", descripcion: "Pan, mayonesa casera, lechuga, tomate, 2 medallones 100% carne, doble huevo, doble jamón, queso mozzarella", categoriaId: "cat_hamburguesas", precio: 11000, color: "amber", emoji: "🍔", stockActual: 12, stockMinimo: 4, activo: true, imagen: "/imgplatos/14.jpg" },
  { id: "prod_burgers_completa_caseras_b", nombre: "Burgers Completa Caseras", descripcion: "Variante con papas fritas", categoriaId: "cat_hamburguesas", precio: 11000, color: "amber", emoji: "🍔", stockActual: 10, stockMinimo: 4, activo: true, imagen: "/imgplatos/17.jpg" },
  { id: "prod_pizza_completa", nombre: "Pizza Completa", descripcion: "Mozzarella, huevo, jamón, orégano, aceitunas, salsa chimichurri", categoriaId: "cat_pizzas", precio: 10000, color: "red", emoji: "🍕", stockActual: 12, stockMinimo: 4, activo: true, imagen: "/imgplatos/7.jpg" },
  { id: "prod_pizza_calabreza", nombre: "Pizza con Calabreza", descripcion: "Mozzarella, jamón, huevo, bastón de calabreza, chimichurri", categoriaId: "cat_pizzas", precio: 10000, color: "amber", emoji: "🍕", stockActual: 10, stockMinimo: 3, activo: true, imagen: "/imgplatos/11.jpg" },
  { id: "prod_pizza_mixta", nombre: "Pizza 1/2 Calabreza 1/2 Salchicha Alemana", descripcion: "Mitad calabreza y mitad salchicha alemana con aceitunas", categoriaId: "cat_pizzas", precio: 10000, color: "amber", emoji: "🍕", stockActual: 8, stockMinimo: 3, activo: true, imagen: "/imgplatos/26.jpg" },
  { id: "prod_combo", nombre: "Combo: 2 Sandwiches + Burger + Papas", descripcion: "2 sándwiches completos de carne o pollo + 1 burgers doble todo + 3 porciones de papas fritas", categoriaId: "cat_combos", precio: 37000, color: "orange", emoji: "🍟", stockActual: 8, stockMinimo: 2, activo: true, imagen: "/imgplatos/8.jpg" },
  { id: "prod_helados_grido", nombre: "Variedades en Helados Grido", descripcion: "Tortas heladas, familiares, escocés y más", categoriaId: "cat_helados", precio: 100000, color: "pink", emoji: "🍦", stockActual: 5, stockMinimo: 2, activo: true, imagen: "/imgplatos/16.jpg" },
];

const recetas = [
  { id: "rec_001", productoId: "prod_miga_jq", ingredienteId: "ing_pan_miga", cantidad: 6 },
  { id: "rec_002", productoId: "prod_miga_jq", ingredienteId: "ing_jamon_cocido", cantidad: 0.08 },
  { id: "rec_003", productoId: "prod_miga_jq", ingredienteId: "ing_queso_tybo", cantidad: 0.06 },
  { id: "rec_010", productoId: "prod_miga_jqCrudo", ingredienteId: "ing_pan_miga", cantidad: 6 },
  { id: "rec_011", productoId: "prod_miga_jqCrudo", ingredienteId: "ing_jamon_crudo", cantidad: 0.06 },
  { id: "rec_012", productoId: "prod_miga_jqCrudo", ingredienteId: "ing_queso_tybo", cantidad: 0.06 },
  { id: "rec_020", productoId: "prod_miga_milanesa", ingredienteId: "ing_pan_miga", cantidad: 6 },
  { id: "rec_021", productoId: "prod_miga_milanesa", ingredienteId: "ing_milanesa_carne", cantidad: 0.5 },
  { id: "rec_022", productoId: "prod_miga_milanesa", ingredienteId: "ing_queso_tybo", cantidad: 0.04 },
  { id: "rec_030", productoId: "prod_miga_pollo", ingredienteId: "ing_pan_miga", cantidad: 6 },
  { id: "rec_031", productoId: "prod_miga_pollo", ingredienteId: "ing_milanesa_pollo", cantidad: 0.4 },
  { id: "rec_040", productoId: "prod_miga_verdura", ingredienteId: "ing_pan_miga", cantidad: 6 },
  { id: "rec_041", productoId: "prod_miga_verdura", ingredienteId: "ing_lechuga", cantidad: 0.05 },
  { id: "rec_042", productoId: "prod_miga_verdura", ingredienteId: "ing_tomate", cantidad: 0.06 },
  { id: "rec_043", productoId: "prod_miga_verdura", ingredienteId: "ing_huevo", cantidad: 1 },
  { id: "rec_044", productoId: "prod_miga_verdura", ingredienteId: "ing_queso_crema", cantidad: 0.04 },
  { id: "rec_050", productoId: "prod_mila_carne", ingredienteId: "ing_milanesa_carne", cantidad: 1 },
  { id: "rec_051", productoId: "prod_mila_carne", ingredienteId: "ing_papa", cantidad: 0.25 },
  { id: "rec_052", productoId: "prod_mila_carne", ingredienteId: "ing_aceite", cantidad: 0.05 },
  { id: "rec_060", productoId: "prod_mila_pollo", ingredienteId: "ing_milanesa_pollo", cantidad: 1 },
  { id: "rec_061", productoId: "prod_mila_pollo", ingredienteId: "ing_papa", cantidad: 0.25 },
  { id: "rec_070", productoId: "prod_pizza_muzzarella", ingredienteId: "ing_prepizza", cantidad: 1 },
  { id: "rec_071", productoId: "prod_pizza_muzzarella", ingredienteId: "ing_salsa_tomate", cantidad: 0.1 },
  { id: "rec_072", productoId: "prod_pizza_muzzarella", ingredienteId: "ing_queso_muzzarella", cantidad: 0.2 },
  { id: "rec_080", productoId: "prod_pizza_jyq", ingredienteId: "ing_prepizza", cantidad: 1 },
  { id: "rec_081", productoId: "prod_pizza_jyq", ingredienteId: "ing_salsa_tomate", cantidad: 0.1 },
  { id: "rec_082", productoId: "prod_pizza_jyq", ingredienteId: "ing_queso_muzzarella", cantidad: 0.22 },
  { id: "rec_083", productoId: "prod_pizza_jyq", ingredienteId: "ing_jamon_cocido", cantidad: 0.06 },
  { id: "rec_090", productoId: "prod_emp_carne", ingredienteId: "ing_harina", cantidad: 0.05 },
  { id: "rec_091", productoId: "prod_emp_carne", ingredienteId: "ing_cebolla", cantidad: 0.02 },
  { id: "rec_100", productoId: "prod_tarta_jyq", ingredienteId: "ing_harina", cantidad: 0.1 },
  { id: "rec_101", productoId: "prod_tarta_jyq", ingredienteId: "ing_jamon_cocido", cantidad: 0.08 },
  { id: "rec_102", productoId: "prod_tarta_jyq", ingredienteId: "ing_queso_tybo", cantidad: 0.08 },
  { id: "rec_103", productoId: "prod_tarta_jyq", ingredienteId: "ing_huevo", cantidad: 1 },
  { id: "rec_110", productoId: "prod_ens_mixta", ingredienteId: "ing_lechuga", cantidad: 0.15 },
  { id: "rec_111", productoId: "prod_ens_mixta", ingredienteId: "ing_tomate", cantidad: 0.1 },
  { id: "rec_112", productoId: "prod_ens_mixta", ingredienteId: "ing_cebolla", cantidad: 0.04 },
  { id: "rec_113", productoId: "prod_ens_mixta", ingredienteId: "ing_huevo", cantidad: 1 },
  { id: "rec_120", productoId: "prod_postre_flan", ingredienteId: "ing_huevo", cantidad: 2 },
  { id: "rec_121", productoId: "prod_postre_flan", ingredienteId: "ing_dulce_leche", cantidad: 0.08 },
  { id: "rec_122", productoId: "prod_postre_flan", ingredienteId: "ing_crema", cantidad: 0.1 },
  { id: "rec_130", productoId: "prod_postre_brownie", ingredienteId: "ing_harina", cantidad: 0.08 },
  { id: "rec_131", productoId: "prod_postre_brownie", ingredienteId: "ing_chocolate", cantidad: 0.05 },
  { id: "rec_132", productoId: "prod_postre_brownie", ingredienteId: "ing_huevo", cantidad: 1 },
  { id: "rec_133", productoId: "prod_postre_brownie", ingredienteId: "ing_crema", cantidad: 0.05 },
];

const clientes = [
  { id: "cli_001", nombre: "María González", telefono: "+54 11 5555-1234", direccion: "Av. Rivadavia 1234, CABA", email: "maria.g@example.com", notas: "Siempre retira a las 13hs", totalPedidos: 14, ultimaCompra: "2026-08-06" },
  { id: "cli_002", nombre: "Carlos Pérez", telefono: "+54 11 5555-5678", direccion: "San Martín 456, Piso 2B", email: "", notas: "", totalPedidos: 6, ultimaCompra: "2026-08-05" },
  { id: "cli_003", nombre: "Lucía Fernández", telefono: "+54 11 5555-9012", direccion: "", email: "lucia.f@example.com", notas: "Delivery todos los jueves", totalPedidos: 22, ultimaCompra: "2026-08-04" },
  { id: "cli_004", nombre: "Roberto Silva", telefono: "+54 11 5555-3456", direccion: "Belgrano 789", email: "", notas: "Prefiere milanesa napolitana", totalPedidos: 9, ultimaCompra: "2026-08-03" },
  { id: "cli_005", nombre: "Ana Martínez", telefono: "+54 11 5555-7890", direccion: "Corrientes 2345", email: "ana.m@example.com", notas: "", totalPedidos: 3, ultimaCompra: null },
  { id: "cli_006", nombre: "Diego Romero", telefono: "+54 11 5555-2345", direccion: "Tucumán 1500, 4A", email: "", notas: "Pide por wsp a último momento", totalPedidos: 18, ultimaCompra: "2026-08-06" },
  { id: "cli_007", nombre: "Patricia López", telefono: "+54 11 5555-6789", direccion: "", email: "patri.lopez@example.com", notas: "Vegetariana", totalPedidos: 11, ultimaCompra: "2026-08-02" },
  { id: "cli_008", nombre: "Fernando Castro", telefono: "+54 11 5555-1111", direccion: "Mitre 678", email: "", notas: "Empresarial — factura A", totalPedidos: 27, ultimaCompra: "2026-08-06" },
];

// ─────────────────────────────────────────────────────────────────────────────
// MAIN
// ─────────────────────────────────────────────────────────────────────────────

const DATABASE_URL = process.env.DATABASE_URL;
if (!DATABASE_URL) {
  console.error("ERROR: DATABASE_URL no está definida.");
  console.error("Uso: DATABASE_URL='postgresql://...' node scripts/seed-supabase.mjs");
  process.exit(1);
}

const masked = DATABASE_URL.replace(/(:)([^:@]+)(@)/, "$1***$3");
console.log(`[seed] Conectando a ${masked}...`);

const sql = postgres(DATABASE_URL, { max: 1, prepare: false });

async function insertCategorias() {
  for (const c of categorias) {
    await sql`
      INSERT INTO categorias (id, nombre, emoji, "colorDefault", activo, "createdAt", "updatedAt")
      VALUES (${c.id}, ${c.nombre}, ${c.emoji}, ${c.colorDefault}, ${c.activo}, ${now}, ${now})
      ON CONFLICT (id) DO UPDATE SET
        nombre = EXCLUDED.nombre,
        emoji = EXCLUDED.emoji,
        "colorDefault" = EXCLUDED."colorDefault",
        activo = EXCLUDED.activo,
        "updatedAt" = EXCLUDED."updatedAt"
    `;
  }
  console.log(`  ✓ ${categorias.length} categorías`);
}

async function insertIngredientes() {
  for (const i of ingredientes) {
    await sql`
      INSERT INTO ingredientes (id, nombre, unidad, "stockActual", "stockMinimo", "costoUnitario", activo, "createdAt", "updatedAt")
      VALUES (${i.id}, ${i.nombre}, ${i.unidad}, ${i.stockActual}, ${i.stockMinimo}, ${i.costoUnitario}, ${i.activo}, ${now}, ${now})
      ON CONFLICT (id) DO UPDATE SET
        nombre = EXCLUDED.nombre,
        "stockActual" = EXCLUDED."stockActual",
        "stockMinimo" = EXCLUDED."stockMinimo",
        "updatedAt" = EXCLUDED."updatedAt"
    `;
  }
  console.log(`  ✓ ${ingredientes.length} ingredientes`);
}

async function insertProductos() {
  for (const p of productos) {
    await sql`
      INSERT INTO productos (id, nombre, descripcion, "categoriaId", precio, color, emoji, imagen, "stockActual", "stockMinimo", activo, "createdAt", "updatedAt")
      VALUES (${p.id}, ${p.nombre}, ${p.descripcion}, ${p.categoriaId}, ${p.precio}, ${p.color}, ${p.emoji}, ${p.imagen}, ${p.stockActual}, ${p.stockMinimo}, ${p.activo}, ${now}, ${now})
      ON CONFLICT (id) DO UPDATE SET
        nombre = EXCLUDED.nombre,
        precio = EXCLUDED.precio,
        "stockActual" = EXCLUDED."stockActual",
        "updatedAt" = EXCLUDED."updatedAt"
    `;
  }
  console.log(`  ✓ ${productos.length} productos`);
}

async function insertRecetas() {
  for (const r of recetas) {
    await sql`
      INSERT INTO recetas (id, "productoId", "ingredienteId", cantidad, "createdAt", "updatedAt")
      VALUES (${r.id}, ${r.productoId}, ${r.ingredienteId}, ${r.cantidad}, ${now}, ${now})
      ON CONFLICT (id) DO UPDATE SET
        cantidad = EXCLUDED.cantidad,
        "updatedAt" = EXCLUDED."updatedAt"
    `;
  }
  console.log(`  ✓ ${recetas.length} recetas`);
}

async function insertClientes() {
  for (const c of clientes) {
    await sql`
      INSERT INTO clientes (id, nombre, telefono, direccion, email, notas, "totalPedidos", "ultimaCompra", "createdAt", "updatedAt")
      VALUES (${c.id}, ${c.nombre}, ${c.telefono}, ${c.direccion}, ${c.email}, ${c.notas}, ${c.totalPedidos}, ${c.ultimaCompra}, ${now}, ${now})
      ON CONFLICT (id) DO UPDATE SET
        nombre = EXCLUDED.nombre,
        telefono = EXCLUDED.telefono,
        "totalPedidos" = EXCLUDED."totalPedidos",
        "updatedAt" = EXCLUDED."updatedAt"
    `;
  }
  console.log(`  ✓ ${clientes.length} clientes`);
}

async function main() {
  await insertCategorias();
  await insertIngredientes();
  await insertProductos();
  await insertRecetas();
  await insertClientes();
  console.log("\n[seed] ✓ Listo. Seed aplicado a Supabase.");
}

main()
  .catch((err) => {
    console.error("[seed] ERROR:", err);
    process.exit(1);
  })
  .finally(async () => {
    await sql.end();
  });