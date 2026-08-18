# Variante A — Vercel-style minimal

## Design stance
Máquina de información densa pero escaneable. Tipografía monospace para números (coherencia con la realidad de que el cliente mira montos, no palabras). Acento amarillo solo para marcar el día actual y las barras de progreso. El resto, jerarquía por tamaño y color de gris.

## Key choices
- **Layout:** lista vertical de 7 filas, una por día, divididas por hairlines de 1px. Total semanal separado en footer.
- **Typography:** Geist Sans para labels, Geist Mono para números. Tabular-nums para alineación decimal.
- **Color:** fondo negro (`#0a0a0a`), card gris muy oscuro (`#141414`), bordes `#1f1f1f`. Acento amarillo `#ffcc00` SOLO en (a) icono "Esta semana", (b) día actual, (c) barras de progreso. Verde `#00d68f` SOLO para el total semanal (ganancia).
- **Interacción:** hover en cada fila ilumina el fondo sutilmente. Click no implementado (read-only). Barras de progreso aparecen con width relativo al máximo de la semana.
- **Indicador de hoy:** ring amarillo + fondo amarillento muy sutil (`#1a1a00`). Día de la semana arriba del número, en amarillo cuando es hoy.

## Trade-offs
- **Strong at:** densidad de información, lectura rápida de "cómo viene la semana", sensación profesional/herramienta.
- **Weak at:** emocionalidad, "app de rotisería con onda". Es más dashboard que producto. El cliente podría sentirlo frío.

## Best for
Usuarios que ya están familiarizados con herramientas (el dueño que mira el Shopify, el contador, etc.). Gente que prefiere escanear números rápido en vez de mirar algo "lindo".
