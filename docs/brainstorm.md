# Brainstorm inicial — Antojos

> Sesión de descubrimiento con el dueño del proyecto. 2026-08-07. Acá queda el registro crudo de lo que se habló y las decisiones que se tomaron.

---

## Lo que me plantearon al principio

> *"Necesito que hagas un espacio de memoria diferente para desarrollar esta app — Antojos, una app para una rotisería, en la cual me pidieron que haga un prototipo, que conectara al WhatsApp para controlar pedidos, stocks, clientes y ingredientes, que la aplicación pueda reconocer los platos por colores, y que dé un aviso cuando esté faltante de stock, si querés mandar un resumen de toda la venta por email, gerando un pdf o excel también podemos hacerlo por wsp, registro al final de la noche que gastaste y que invertiste. Los platos con colores te doy un ejemplo: un sándwich de miga viene con muchos sabores — ejemplo: rojo = jamón y queso, verde = milanesa, lila = verdura."*

---

## Preguntas que hice y respuestas

| # | Pregunta | Respuesta |
|---|---|---|
| 1 | ¿Quién va a usar la app? | **La rotisería Antojos** — un señor y una señora, dueños directos. Administran desde el celular. |
| 2 | ¿Tienen WhatsApp Business dedicado? | **Sí, ya lo tienen.** |
| 3 | ¿Los clientes ya piden por WhatsApp? | **Sí**, los clientes ya piden por WSP. |
| 4 | ¿Cómo funciona el sistema de colores? | **Cada sabor = su color.** No por categoría. |
| 5 | ¿Multi-local? | **Un solo local** por ahora. |
| 6 | ¿Delivery o solo retiro? | **Ambos** — delivery y retiro. |
| 7 | ¿Presupuesto? | **Free tiers** por ahora (Vercel + Supabase + Meta Cloud API). Margen para después. |
| 8 | ¿Cuántos productos? | **~50**. |
| 9 | ¿Qué sistema reemplazamos? | **Lápiz y papel.** |
| 10 | ¿Puedo arrancar con localStorage antes de Supabase? | **Sí** — primero prototipo con localStorage y mocks. |

---

## Decisiones tomadas en esta sesión

### 1. Stack: Next.js 16 (NO React Native)

**Por qué:** El uso primario es en celular pero con visión ocasional en PC. Web responsive cubre ambos sin código duplicado. React Native suma complejidad (App Store, certificados) sin valor agregado real para este caso. Los clientes piden por WhatsApp directamente — no necesitan app.

### 2. Datos: localStorage primero, Supabase después

**Por qué:** Cero costo, iteración rápida, los dueños pueden probar sin crear cuentas. Arquitectura con repositorio abstracto → swap a Supabase sin tocar UI.

### 3. Colores por producto, no por categoría

**Por qué:** El dueño dijo *"cada sabor = su color"*. Si fuera por categoría, todos los sandwiches de miga serían iguales. La gracia del sistema es diferenciar visualmente cada variante.

### 4. Mobile-first con bottom-nav

**Por qué:** Los dueños administran desde el celular. La nav inferior está a 1 tap del pulgar, es familiar para cualquiera que use WhatsApp.

### 5. Stack final

```
Next.js 16 (App Router, Turbopack)
+ TypeScript
+ Tailwind CSS v4
+ shadcn/ui (base-nova)
+ lucide-react (iconos)
+ localStorage (estado)
+ useSyncExternalStore (reactividad)
```

---

## Features confirmados para V1

| Feature | Estado |
|---|---|
| Catálogo de productos con colores por sabor | ✅ En V1 |
| Pedidos (alta, estados, listado) | ✅ En V1 |
| Stock de ingredientes + alertas | ✅ En V1 |
| Clientes con historial | ✅ En V1 |
| Recetas (qué ingredientes componen cada producto) | ✅ En V1 |
| Gastos del día categorizados | ✅ En V1 |
| Cierre diario con balance | ✅ En V1 |
| Envío de cierre por email | 🚧 Botón placeholder (V1.1) |
| Envío de cierre por WhatsApp | 🚧 Botón placeholder (V1.1) |
| Descarga PDF/Excel | 🚧 Botón placeholder (V1.1) |
| Integración WhatsApp Business API (webhook) | 📅 V2 |
| Multi-local | 📅 V3 |

---

## Próximos pasos

1. ~~Generar el proyecto Next.js~~ ✅
2. ~~Inicializar shadcn/ui~~ ✅
3. ~~Definir modelos de datos~~ ✅
4. ~~Crear mock data realista~~ ✅
5. ~~Construir el shell + bottom-nav~~ ✅
6. ~~Pantalla de inicio (dashboard)~~ ✅
7. ~~Pantalla de pedidos (lista + nuevo)~~ ✅
8. ~~Pantalla de productos (carta con colores)~~ ✅
9. ~~Pantalla de ingredientes (stock con alertas)~~ ✅
10. ~~Pantalla de clientes~~ ✅
11. ~~Pantalla de cierre~~ ✅
12. ~~Documentación en `.memory/` y `docs/`~~ ✅
13. 🟢 **Empezar a usar la app con el señor y la señora** ← acá estamos
14. Decidir si pasar a Supabase o seguir con localStorage
15. Implementar generación real de PDF/Excel
16. Implementar envío por email / WSP
17. Integrar WhatsApp Business API