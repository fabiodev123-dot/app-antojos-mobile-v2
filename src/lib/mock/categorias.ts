import type { Categoria } from "@/lib/types";

export const seedCategorias: Omit<Categoria, "createdAt" | "updatedAt">[] = [
  { id: "cat_alitos", nombre: "Alitos", emoji: "🍗", colorDefault: "orange", activo: true },
  { id: "cat_hambur_pizza", nombre: "Hambur Pizza", emoji: "🍕", colorDefault: "red", activo: true },
  { id: "cat_empanadas", nombre: "Empanadas", emoji: "🥟", colorDefault: "amber", activo: true },
  { id: "cat_tortas", nombre: "Tortas y Sándwiches", emoji: "🥪", colorDefault: "beige", activo: true },
  { id: "cat_hamburguesas", nombre: "Hamburguesas", emoji: "🍔", colorDefault: "amber", activo: true },
  { id: "cat_pizzas", nombre: "Pizzas", emoji: "🍕", colorDefault: "red", activo: true },
  { id: "cat_combos", nombre: "Combos", emoji: "🍟", colorDefault: "orange", activo: true },
  { id: "cat_helados", nombre: "Helados", emoji: "🍦", colorDefault: "pink", activo: true },
];