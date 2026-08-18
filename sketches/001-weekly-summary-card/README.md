# Variante B — Card rotisería cálida

## Design stance
Mantener la estética actual de Antojos (gradientes cálidos, paleta yellow/orange/green, vibe "rotisería con onda") pero subiendo la densidad. Cada día es una burbuja con su número adentro, alineada con la forma en que el cliente ya visualiza los productos del catálogo (color, emoji, identidad visual fuerte). El verde de ganancia es la "recompensa" del cierre semanal.

## Key choices
- **Layout:** lista vertical de 7 filas, una por día, cada una con burbuja redonda (38×38) que contiene el día de la semana y el número. Más alto y "respirado" que la Variante A.
- **Typography:** Inter para todo. Números grandes (16px) en la burbuja, 14px en el total del día, 22px en el total semanal.
- **Color:** fondo cálido (`#1a1208` marrón muy oscuro), card `#2a1d10`, borde naranja-marrón `#3d2a17`. Acentos: brand amarillo `#ffcc00` para el día actual (burbuja rellena con glow), warm naranja `#ff9a3c` para barras de progreso, success verde `#4ade80` para el total semanal. Borde superior con gradiente brand→warm.
- **Interacción:** hover ilumina la fila con un fondo elevado. Hoy tiene una franja amarilla vertical a la izquierda (sutil pero inequívoca).
- **Indicador de hoy:** burbuja amarilla rellena con glow + franja vertical + texto "hoy" en la línea de "4 pedidos".
- **Diferenciador emocional:** badge "Sem 34" en el header, subtítulo "Resumen de lunes a domingo", línea "14 pedidos cerrados" en el total — habla el idioma del cliente, no del programador.

## Trade-offs
- **Strong at:** emocionalidad, pertenencia al mundo "rotisería", claridad del día actual, hace que el cliente SIENTA que la app es suya. Más "app", menos "dashboard".
- **Weak at:** un poco más pesada visualmente, ocupa más espacio vertical. Menos densa en información pura.

## Best for
El caso de uso real: dueña de la rotisería, mira la app en su celular entre pedidos, quiere ver de un vistazo "cómo va la semana" sin sentirse en una herramienta de Excel. El "golazo" tiene que sentirse como un golazo, no como un reporte.
