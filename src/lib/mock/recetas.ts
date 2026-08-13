import type { Receta } from "@/lib/types";

export const seedRecetas: Omit<Receta, "createdAt" | "updatedAt">[] = [
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