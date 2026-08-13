# Sistema de colores

> Cómo y por qué cada producto tiene su propio color. La lógica visual central de Antojos.

---

## Principio

> **El color NO vive en la categoría — vive en el producto.**

El dueño necesita reconocer cada sabor/variante de un vistazo. Si los colores vivieran en la categoría, todos los sandwiches de miga serían iguales — y se pierde la diferenciación visual.

### Ejemplo

```
Categoría: Sándwiches de Miga (color default: beige — sólo decorativo)
├── Miga Jamón y Queso      →  🔴 red
├── Miga Jamón Crudo y Queso → 🌸 pink
├── Miga de Milanesa         → 🟢 green
├── Miga de Pollo            → 🟠 orange
├── Miga de Verdura          → 🟣 purple
├── Miga de Huevo y Queso    → 🟡 yellow
├── Miga de Atún             → 🔵 blue
├── Miga Queso y Tomate      → ⚪ gray
├── Miga Especial Antojos    → 🌹 rose
└── Miga Roquefort y Jamón   → 🟢 teal
```

---

## Paleta

Definida en `src/lib/types/index.ts` → `COLOR_PLATO_HEX`.

| Color | Uso típico | Tailwind |
|---|---|---|
| `red` | Jamón y queso, napolitanas | `bg-red-500`, `ring-red-500/40` |
| `pink` | Jamón crudo, postres | `bg-pink-500` |
| `rose` | Especiales de la casa | `bg-rose-500` |
| `green` | Milanesas, ensaladas verdes | `bg-green-500` |
| `purple` | Verduras, berenjena | `bg-purple-500` |
| `yellow` | Huevo, flan, maíz | `bg-yellow-500` |
| `orange` | Pollo, citrus | `bg-orange-500` |
| `amber` | Calabresa, fugazza, carne | `bg-amber-700` |
| `teal` | Roquefort, espinaca | `bg-teal-500` |
| `blue` | Atún, todas las bebidas | `bg-blue-500` |
| `beige` | Sándwiches de miga (default), anchoas | `bg-stone-400` |
| `gray` | Queso y tomate, clásico neutro | `bg-gray-400` |

---

## Cómo se aplica en UI

Tres componentes principales:

### 1. `<ColorStripe color="red" />`
Una barra vertical de color en el borde izquierdo del card. **Es el indicador primario** — el dueño lo ve de reojo y sabe qué plato es.

```
┌──┬────────────────────────────┐
│  │ Miga Jamón y Queso    $2500│
│  │ Clásico de jamón...       │
└──┴────────────────────────────┘
   ▲
   ColorStripe rojo
```

### 2. `<ColorDot color="green" />`
Puntito de color inline, usado en listas compactas, badges, líneas de pedido.

### 3. `<ColorBadge color="purple" />`
Pill con el color como texto + dot. Usado en tags, filtros.

---

## Convenciones de uso

| Componente | Cuándo usarlo |
|---|---|
| `ColorStripe` | En cards de producto, cards de pedido, cards de ingrediente. SIEMPRE a la izquierda. |
| `ColorDot` | En líneas inline (item de pedido, línea de resumen), badges pequeños. |
| `ColorBadge` | En filtros, chips, tags seleccionables. |

**Regla:** en una pantalla nunca se repite el mismo color de Stripe para productos distintos. Si pasa, hay un error en el seed.

---

## Cómo agregar un nuevo producto

```ts
{
  id: "prod_miga_xyz",
  nombre: "Miga XYZ",
  categoriaId: "cat_miga",
  precio: 3000,
  color: "teal",      // ← acá va el color. Elegir uno que NO esté usado mucho.
  emoji: "🥪",
  activo: true,
  // ...
}
```

**Criterio de elección del color:**
1. ¿Qué sabor es? → buscar el color en la tabla de arriba.
2. ¿Ya hay otro producto con ese color? → si sí, elegir uno cercano (pink vs rose, amber vs orange).
3. ¿Es un producto "especial de la casa"? → rose.

---

## Próximas mejoras visuales

- [ ] Permitir override del color del producto sobre el default de la categoría.
- [ ] Selector visual de color al crear/editar producto (ahora se elige del enum).
- [ ] Modo alto contraste (los dueños son mayores, los colores brillantes pueden cansar).
- [ ] Soporte para daltónicos (verificar contraste mínimo WCAG AA).