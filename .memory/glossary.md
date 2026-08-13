# Glosario del dominio rotisería

> Términos que vas a ver en código, UI y mock data. Algunos son argentosismos, otros son jerga del rubro.

---

## Productos

| Término | Significado |
|---|---|
| **Sándwich de miga** | Sandwiches de pan fino sin corteza, en capas. Antojos tiene muchos sabores, cada uno con su color. |
| **Milanesa** | Filete de carne/pollo/soja empanado y frito. Puede ser "a la napolitana" (con jamón, queso y salsa) o "a caballo" (con 2 huevos fritos encima). |
| **Napolitana** | Preparación con jamón, queso muzza y salsa de tomate. Se aplica a milanesas o pizzas. |
| **Prepizza** | Base de pizza cruda (masa estirada) lista para agregar toppings y hornear. |
| **Muzza** | Queso muzzarella (apócope coloquial). |
| **Fugazza** | Pizza con cebolla caramelizada, muzza y aceite de oliva. Sin salsa de tomate. |
| **Tarta** | Puede ser dulce o salada. Antojos vende saladas: jamón y queso, verdura, pollo. |
| **Bocatín / Boquita** | (no usado en este proyecto) Sandwiches más pequeños. |
| **Chocotorta** | Postre argentino clásico de galletitas, queso crema y dulce de leche. |

## Preparación

| Término | Significado |
|---|---|
| **Stock / Stock bajo** | Cantidad disponible de un ingrediente. "Stock bajo" = por debajo del mínimo. |
| **Receta** | Lista de ingredientes + cantidades que componen un producto. Ej: "Milanesa Napolitana" lleva milanesa de carne + jamón cocido + muzza + papa. |
| **Merma** | Pérdida de mercadería (se rompió, se venció, se quemó). Se registra como movimiento de stock. |

## Pedidos

| Término | Significado |
|---|---|
| **Retiro** | El cliente viene al local a buscar el pedido. |
| **Delivery** | Se lleva al cliente. |
| **Mostrador** | Pedido generado directamente en el local, no por WhatsApp ni teléfono. Se usa `canal: "presencial"` y `nombreCliente: "Cliente Mostrador"`. |
| **WSP** | WhatsApp. |
| **Pendiente** | Pedido recibido, aún no se empezó a preparar. |
| **En cocina** | Se está cocinando. |
| **Listo** | Cocinado, esperando entrega/retiro. |
| **Entregado** | El cliente lo recibió. |
| **Cerrado** | Estado administrativo — el pedido ya no cuenta como "abierto". |

## Unidades de stock

| Unidad | Uso |
|---|---|
| `kg` | Carnes, quesos, harina, azúcar, verduras por peso. |
| `g` | Para fracciones pequeñas (no usado todavía — usar `kg` con decimales). |
| `l` | Líquidos (aceite, salsa, crema). |
| `ml` | Para fracciones pequeñas (no usado). |
| `unidad` | Huevos, panes, prepizzas, latas de atún, botellas. |
| `paquete` | (Reservado para futuro — paquetes de galletitas, packs de cerveza, etc.) |

## Estados de pedido

Ver `src/lib/types/index.ts` para `EstadoPedido`:
`pendiente → preparando → listo → entregado → cancelado`

## Colores (categoría visual)

| Color | Uso en Antojos |
|---|---|
| 🔴 Rojo | Jamón y queso, napolitanas, pizzas clásicas |
| 🌸 Rosa | Jamón crudo, chocotorta, postres |
| 🟢 Verde | Milanesas, ensaladas (general) |
| 🟣 Lila/Púrpura | Verduras, ensaladas, atún (a veces) |
| 🟡 Amarillo | Huevo, flan, ananá grillada |
| 🟠 Naranja | Pollo, tango, naranjas |
| 🟤 Marrón | Carne, chocolate, guisos |
| 🔵 Azul | Atún, todas las bebidas |
| 🟫 Beige | Sándwiches de miga (default), anchoas |
| ⚪ Gris | Queso y tomate (clásico) |

---

## Argentinismos del código

| Término | Significado en código |
|---|---|
| `wsp` | Variable booleana `wspHabilitado: boolean` en config. |
| `mostrador` | Canal `presencial`. |
| `roti` | Abreviatura coloquial de "rotisería" — sólo en comentarios internos, no en UI. |