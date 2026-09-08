# 🧠 BRAINSTORMING — Rediseño Landing Antojos

> Fecha: 2026-09-08 · Basado en research de 8+ rotiserías argentinas + tendencias UI 2025-2026

---

## Análisis de la Landing Actual

### Lo que funciona bien ✅
- Tema oscuro con naranja eléctrico (brand identity fuerte)
- CTA de WhatsApp siempre visible
- Carta completa con imágenes reales
- Estructura clara: Hero → Carta → Cómo pedir → CTA → Footer
- Mobile-first (buena base)

### Lo que FALTA (gaps críticos) ❌
1. **Sin "hook" de conversión** — No hay nada que enganche en los primeros 3 segundos
2. **Sin prueba social** — No hay reviews, estrellas, ni "X pedidos realizados"
3. **Sin urgencia** — No hay promociones, ofertas limitadas, ni "pedido mínimo"
4. **Sin ubicación/horario** — El cliente no sabe cuándo ni dónde está
5. **Sin favicon/meta tags** — SEO y shares de WhatsApp se ven genéricos
6. **Carta como grid plano** — No hay filtros, categorías destacadas, ni "lo más pedido"
7. **CTA WhatsApp genérico** — No tiene mensaje pre-armado por categoría
8. **Sin animaciones** — La página se siente estática vs competencia
9. **Footer mínimo** — No hay info de contacto, horarios, redes sociales
10. **Sin "sticky CTA"** — En mobile, el botón de WhatsApp desaparece al scrollear

---

## 🎯 SECCIÓN 1: HEADER (Sticky Nav)

### Estado actual
Logo + "Pedí ahora" (WhatsApp). Simple pero funcional.

### Propuesta de mejora

```
┌─────────────────────────────────────────────────┐
│ 🍕 Antojos    [Horarios] [Ubicación]  [PEDIR]  │
│                 Lun-Dom 19-23hs    📍 Zona Sur  │
└─────────────────────────────────────────────────┘
```

**Cambios:**
1. **Agregar horarios en el header** — "Lun-Dom 19:00 a 23:00" (o lo que corresponda)
2. **Agregar ubicación sticky** — "📍 Zona Sur, Córdoba" (barrio/ciudad)
3. **Botón PEDIR más grande** — Pill naranja con icono de WhatsApp, que en mobile sea FAB
4. **Scroll shrink** — Al scrollear, el header se achica (h-14 → h-10) y el logo se reduce
5. **Active section highlighting** — Resaltar la sección visible en el nav

**Inspiración:**
- Avicuatro: header con horarios + 6 sucursales
- Uber Eats: address-search como hero interaction
- Pollo Stok: horarios visible + contacto ágil

---

## 🎯 SECCIÓN 2: HERO SECTION

### Estado actual
Logo grande + tagline "Si se te antojó, lo tenemos" + 2 CTAs + badges de beneficios.

### Propuesta de mejora

```
┌─────────────────────────────────────────────────┐
│                                                 │
│    [FOTO GRANDE DE PLATO CON GRADIENTE]         │
│                                                 │
│    ANTOJOS                                      │
│    "La rotisería que se te antoja"              │
│                                                 │
│    ┌─────────────────────────────────┐          │
│    │ 📍 ¿A dónde pedís? [Tu barrio ▾]│          │
│    └─────────────────────────────────┘          │
│                                                 │
│    [ PEDIR POR WHATSAPP 🟢 ]  [VER CARTA ↓]    │
│                                                 │
│    ⭐ 4.8 (120+ reseñas) · 🚀 30-45 min        │
│    🛵 Delivery · 🏪 Retiro en local             │
│                                                 │
└─────────────────────────────────────────────────┘
```

**Cambios:**
1. **Hero con imagen de fondo** — Foto de un plato icónico (hambur pizza?) con gradiente oscuro overlay
2. **Tagline más corto y memorable** — "La rotisería que se te antoja" (actual es largo)
3. **Barra de búsqueda de zona** — "¿A dónde pedís?" con autocomplete de barrios (aunque sea fake por ahora)
4. **Social proof en hero** — Estrellas + cantidad de reseñas + tiempo estimado de delivery
5. **Badge "Abierto ahora"** — Verde pulsante si está en horario, rojo si está cerrado
6. **FOTO DEL DÍA** — Featured product con precio especial en el hero

**Inspiración:**
- Uber Eats: address-search como hero CTA principal
- ShipNative: promo banner con gradiente naranja-amber
- Rotisería Flamingos: " pedido en línea" como novedad

**Animaciones:**
- Logo fade-in + slide-up (0.5s)
- Tagline stagger (0.2s delay)
- CTAs pulse animation (subtle)
- Badge "Abierto" con dot verde que pulsa

---

## 🎯 SECCIÓN 3: BENEFICIOS / TRUST BAR

### Estado actual
Badges inline: "Retiro en local", "Delivery", "Pedidos por WhatsApp", "Listo en minutos".

### Propuesta de mejora

```
┌─────────────────────────────────────────────────┐
│                                                 │
│  🚀 30-45 min    🛵 Delivery    📱 WhatsApp     │
│  Tiempo estimado  A tu puerta   Pedí al toque   │
│                                                 │
│  💳_pagás al recibir  🏪_retiro en local        │
│  Sin tarjeta           A los 10 min             │
│                                                 │
└─────────────────────────────────────────────────┘
```

**Cambios:**
1. **Iconos más grandes** — De 3.5 a 5-6 size
2. **Texto descriptivo debajo** — "Tiempo estimado", "A tu puerta", etc.
3. **Métricas con números** — "30-45 min" en vez de "Listo en minutos"
4. **Agregar "Pagás al recibir"** — Trust factor enorme para Argentina
5. **Grid de 2x3** en vez de fila inline — Más visual en mobile

---

## 🎯 SECCIÓN 4: CARTA / MENÚ

### Estado actual
Grid de 2-4 columnas con imagen + nombre + descripción + precio. Sin filtros.

### Propuesta de mejora

```
┌─────────────────────────────────────────────────┐
│  La Carta                                       │
│  Elegí tu antojo · [Todos] [Pizzas] [Alitos]... │
│                                                 │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐      │
│  │ 🔥 MÁS   │  │          │  │          │      │
│  │  PEDIDOS │  │  [FOTO]  │  │  [FOTO]  │      │
│  │──────────│  │          │  │          │      │
│  │ [FOTO]   │  │ Nombre   │  │ Nombre   │      │
│  │          │  │ Desc     │  │ Desc     │      │
│  │ Hambur   │  │ $XX.XXX  │  │ $XX.XXX  │      │
│  │ Pizza    │  │ [PEDIR]  │  │ [PEDIR]  │      │
│  │ $XX.XXX  │  │          │  │          │      │
│  └──────────┘  └──────────┘  └──────────┘      │
│                                                 │
│  [📱 Pedí selected items por WhatsApp]           │
│                                                 │
└─────────────────────────────────────────────────┘
```

**Cambios:**
1. **Sticky category tabs** — Tabs horizontales que se quedan fijos al scrollear (como ShipNative)
2. **Filtro "Los más pedidos"** — Primera categoría destacada con badge 🔥
3. **Cards mejoradas:**
   - Imagen con aspect-ratio cuadrado
   - Badge de categoría (ej: "🍕 Pizza")
   - Nombre en bold + descripción truncada
   - Precio grande y naranja
   - Botón "Pedir" que agrega a un mini-carrito
4. **Mini-carrito sticky** — Si seleccionaste items, abajo aparece "3 items · $XX.XXX · Pedir por WhatsApp"
5. **Lazy loading en imágenes** — Ya está, pero asegurar que sea smooth
6. **Skeleton loading** — Mientras carga, mostrar cards grises animadas
7. **Hover effects** — Card lift + border naranja (ya tenemos `.hover-lift`)

**Inspiración:**
- ShipNative: sticky category tabs + horizontal scroll
- La Pizza UI Kit: product cards con badges (New, Best Seller, −10%)
- Avicuatro: "Explorá por categoría" con grid visual

---

## 🎯 SECCIÓN 5: CÓMO PEDIR (Proceso)

### Estado actual
3 pasos simples: Elegí → Escribinos → Retirás/llevamos.

### Propuesta de mejora

```
┌─────────────────────────────────────────────────┐
│  ¿Cómo pedir?                                  │
│                                                 │
│  1️⃣        2️⃣        3️⃣        4️⃣             │
│  Elegí    Armá tu    Te           Disfrutá      │
│  lo que   pedido     confirmamos  tu comida     │
│  querés   x WhatsApp en minutes   🍕            │
│                                                 │
│  ──────────●──────────○──────────○─────────     │
│                                                 │
│  [PEDIR AHORA - es gratis y sin registro]       │
│                                                 │
└─────────────────────────────────────────────────┘
```

**Cambios:**
1. **4 pasos en vez de 3** — Agregar "Te confirmamos" (trust + realismo)
2. **Progress bar visual** — Línea con dots que se iluminan
3. **Iconos animados** — Cada paso con icono que aparece con stagger
4. **Micro-copy de bajo compromiso** — "Es gratis y sin registro"
5. **CTA al final del proceso** — Que el user no tenga que scrollear más

**Inspiración:**
- Avicuatro: "Cómo comprar" con 4 pasos detallados
- Rotisería Flamingos: "Confirmamos todos los pedidos manualmente"

---

## 🎯 SECCIÓN 6: TESTIMONIOS / PRUEBA SOCIAL

### Estado actual ❌ NO EXISTE

### Propuesta nueva

```
┌─────────────────────────────────────────────────┐
│  ¿Qué dicen nuestros clientes?                 │
│                                                 │
│  ⭐⭐⭐⭐⭐                                      │
│  "La mejor hambur pizza de la zona. Pedimos     │
│   todos los viernes."                          │
│   — María G., Barrio Centro                    │
│                                                 │
│  ⭐⭐⭐⭐⭐                                      │
│  "Rapidísimo el delivery y todo caliente.       │
│   10/10."                                      │
│   — Carlos R., Villa Urquiza                   │
│                                                 │
│  ⭐⭐⭐⭐⭐                                      │
│  "Las empanadas son una locura. Pido el combo   │
│   y no queda nada."                            │
│   — Luciana M., Nueva Córdoba                 │
│                                                 │
│  [Ver más reseñas en Google →]                  │
│                                                 │
└─────────────────────────────────────────────────┘
```

**Detalles:**
1. **3-5 testimonials** con estrellas, nombre y barrio
2. **Carousel en mobile** (swipe horizontal)
3. **Link a Google Reviews** si tienen, o a WhatsApp
4. **Skeleton de carga** si viene de API
5. **Opción realista:** Por ahora hardcodeados, después se pueden traer de Supabase

**Inspiración:**
- Rotisería Amalia: 4.4 estrellas + reviews reales de Google
- Pollo Stok: "Más de 10 años" como trust factor

---

## 🎯 SECCIÓN 7: PROMOCIONES / OFERTAS

### Estado actual ❌ NO EXISTE

### Propuesta nueva

```
┌─────────────────────────────────────────────────┐
│  🔥 Promos de la semana                        │
│                                                 │
│  ┌─────────────────┐  ┌─────────────────┐      │
│  │ COMBO FAMILIAR  │  │ LUNES 2x1       │      │
│  │ Hambur Pizza +  │  │ En empanadas    │      │
│  │ 6 empanadas     │  │ todo el lunes   │      │
│  │ $XX.XXX         │  │ $XX.XXX         │      │
│  │ [PEDIR ESTE]    │  │ [PEDIR ESTE]    │      │
│  └─────────────────┘  └─────────────────┘      │
│                                                 │
│  ⏰ Válido hasta el Domingo                     │
│                                                 │
└─────────────────────────────────────────────────┘
```

**Detalles:**
1. **2-3 promos destacadas** con imagen o gradiente de fondo
2. **Badge "🔥 Popular"** o "⚡ 2x1"
3. **Timer de expiración** — "Válido hasta el Domingo" crea urgencia
4. **CTA directo a WhatsApp** con mensaje pre-armado: "Quiero el Combo Familiar"
5. **Por ahora hardcodeadas** — Se pueden editar en un archivo de config

---

## 🎯 SECCIÓN 8: CTA FINAL (WhatsApp)

### Estado actual
"¿Se te antojó algo?" + 2 botones WhatsApp con números.

### Propuesta de mejora

```
┌─────────────────────────────────────────────────┐
│                                                 │
│  [FOTO DE PLATO DE FONDO + GRADIENTE]           │
│                                                 │
│  ¿Se te antojó algo?                           │
│  Escribinos y armamos tu pedido en minutos      │
│                                                 │
│  ┌─────────────────────────────────────┐        │
│  │ 💬 Armá tu pedido por WhatsApp      │        │
│  │ "¡Hola Antojos! Quiero hacer un    │        │
│  │  pedido 🍕"                         │        │
│  └─────────────────────────────────────┘        │
│                                                 │
│  📞 También podés llamar                        │
│  • 370 408-7573                                 │
│  • 370 464-9473                                 │
│                                                 │
│  📍 [Dirección del local]                       │
│  🕐 Lun-Dom 19:00 - 23:00                       │
│                                                 │
└─────────────────────────────────────────────────┘
```

**Cambios:**
1. **Preview del mensaje de WhatsApp** — Que el user vea qué va a recibir
2. **Fondo con imagen** — Mismo estilo que el hero (gradiente + foto)
3. **Dirección y horarios** — Info que falta en la landing actual
4. **Un solo CTA grande** — En vez de 2 números, uno solo que sea el principal
5. **Secondary: llamar** — Los números como opción alternativa

---

## 🎯 SECCIÓN 9: FOOTER

### Estado actual
Logo + "Antojos — Rotisería · Pedidos por WhatsApp" + link al login.

### Propuesta de mejora

```
┌─────────────────────────────────────────────────┐
│  🍕 ANTOJOS                                     │
│  La rotisería que se te antoja                  │
│                                                 │
│  Horarios          Contacto        Seguinos     │
│  Lun-Dom           📱 370 408-7573  📷 Instagram│
│  19:00 - 23:00     📱 370 464-9473  📘 Facebook │
│                    💬 WhatsApp                   │
│                                                 │
│  ¿Sos del equipo? Ingresá al panel →           │
│                                                 │
│  © 2026 Antojos · Hecho con ❤️ en Córdoba       │
│                                                 │
└─────────────────────────────────────────────────┘
```

**Cambios:**
1. **Grid de 3 columnas** — Horarios / Contacto / Redes
2. **Dirección completa** — Si tienen local físico
3. **Redes sociales** — Instagram, Facebook (aunque sean links a wa.me por ahora)
4. **Copyright + ubicación** — "Hecho con ❤️ en Córdoba"
5. **Link al panel admin** — Para el equipo

---

## 🎯 ELEMENTOS GLOBALES

### Sticky CTA Bar (Mobile)
```
┌─────────────────────────────────────────────────┐
│  [📱 PEDIR POR WHATSAPP - $XX.XXX tu pedido]    │
└─────────────────────────────────────────────────┘
```
- Aparece después de scrollear 300px
- Se va al fondo de la pantalla
- En desktop: no mostrar (el header ya tiene el CTA)

### Favicon + Meta Tags
- Favicon: el logo-mark.png que ya existe
- OG Image: foto de un plato icónico
- Theme color: #FF6600
- Description: "Rotisería Antojos — Hambur pizzas, alitos, milanesas y más. Pedí por WhatsApp: retiro en local o delivery."

### Smooth Scroll
- Ya está con `scroll-behavior: smooth`
- Agregar `scroll-mt-20` a las secciones para que el header no tape

### Skeleton Loading
- Para la carta, mostrar 8-12 cards grises animadas mientras carga

### Empty States
- Si no hay productos: "Ups, no encontramos lo que buscás"
- Si no hay promo: Ocultar la sección entirely

---

## 📋 PLAN DE IMPLEMENTACIÓN PRIORIZADO

### Fase 1: Impacto Inmediato (1-2h)
1. ✅ Header sticky con horarios + ubicación
2. ✅ Hero con foto de fondo + "Abierto ahora"
3. ✅ Trust bar mejorada (métricas + "pagás al recibir")
4. ✅ Favicon + meta tags + OG image

### Fase 2: Conversión (2-3h)
5. ✅ Sticky category tabs en la carta
6. ✅ Cards mejoradas (badges, hover, "Pedir" button)
7. ✅ Mini-carrito sticky
8. ✅ CTA final con preview de WhatsApp

### Fase 3: Social Proof (1-2h)
9. ✅ Sección de testimonios
10. ✅ Sección de promociones
11. ✅ "Abierto ahora" badge con lógica real

### Fase 4: Polish (1-2h)
12. ✅ Animaciones (hero rise, stagger, scroll reveal)
13. ✅ Skeleton loading
14. ✅ Footer completo
15. ✅ Sticky CTA bar mobile

---

## 🎨 DESIGN SYSTEM SUGERIDO

### Colores (ya existentes, confirmar)
- Brand: `#FF6600` (naranja eléctrico)
- Brand FG: `#FFFFFF`
- Secondary: `#FFCC00` (amarillo vivo)
- Background: `#121212`
- Surface: `#000000`

### Tipografía (ya existente)
- Headings: Geist (bold)
- Body: Geist (regular)
- Mono: Geist Mono

### Spacing
- Section padding: `py-16 sm:py-24`
- Container max-width: `max-w-5xl`
- Card gap: `gap-3 sm:gap-4`

### Border Radius
- Cards: `rounded-2xl`
- Buttons: `rounded-full` (pill)
- Images: `rounded-xl`

### Animations
- `hero-rise`: slide-up + fade-in (0.5s)
- `stagger-children`: delay progresivo (0.1s por hijo)
- `hover-lift`: translateY(-2px) + border-glow
- `pulse-green`: para "Abierto ahora"

---

## 🔗 REFERENCIAS

| Sitio | Qué copiar |
|-------|-----------|
| Avicuatro.com.ar | Header con horarios, "Cómo comprar" 4 pasos, FAQ, sucursales |
| PolloStok.com.ar | Carta de especialidades, promociones destacadas, servicios |
| Rotisería Flamingos | Pedidos en línea como novedad, confirmación manual |
| ShipNative template | Sticky tabs, dark glassmorphic nav, promo banner |
| Uber Eats landing | Address-search como hero CTA, photography-as-canvas |
| La Pizza UI Kit | Product cards con badges, design system completo |
| QuickBite (contra.com) | Dark mode + orange accents, "high-energy" feel |
