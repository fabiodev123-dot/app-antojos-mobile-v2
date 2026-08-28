# 📋 INSTRUCCIÓN PARA OPENCODE — Imágenes pendientes del menú

## Contexto

Se cargaron todos los productos del menú físico de Antojos en Supabase.
La sesión anterior generó 6 imágenes con IA pero se agotó el cupo del modelo.
**Tu tarea es generar las imágenes faltantes y subirlas a la BD.**

## Stack

- Next.js 15 (App Router)
- Supabase (Postgres + Storage)
- Imágenes locales en `/imgplatos/` (numeradas 1.jpg a 34.jpg)
- Las imágenes se referencian como `/imgplatos/XX.jpg` en el campo `imagen` de la tabla `productos`

## Credenciales Supabase

```
SUPABASE_URL=https://zriwcsczgnjrsdjmudab.supabase.co
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InpyaXdjc2N6Z25qcnNkam11ZGFiIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4NjYwNTcxNCwiZXhwIjoyMTAyMTgxNzE0fQ.8i8Rfjam7gXoYhv19-XLbnK2xx2S5jJ9n-5tj4ElRZg
```

## Imágenes que FALTAN generar

Generar cada imagen con IA (estilo: food photography profesional, fondo oscuro de madera rústica, iluminación cálida de restaurante, sin texto) y guardarla en `imgplatos/` con el número siguiente disponible (próximo es **35.jpg**).

| Archivo destino | Descripción del plato | Productos a los que aplica en BD |
|----------------|----------------------|----------------------------------|
| `35.jpg` | Pizza mozzarella clásica argentina, mitad de pizza con queso derretido abundante | `prod_pizza_muzz_huevo`, `prod_pizza_muzzarella` |
| `36.jpg` | Pizza milanesa argentina, con tiras de milanesa y mozzarella encima | `prod_pizza_milan` |
| `37.jpg` | Pizza de choclo con granos de maíz y queso | `prod_pizza_choclo`, `prod_pizza_queso_cremoso` |
| `38.jpg` | Pizza napolitana con rodajas de tomate fresco, ajo y albahaca | `prod_pizza_napolitana` |
| `39.jpg` | Pizza fugazzeta argentina, masa gruesa con cebolla caramelizada y mozzarella | `prod_pizza_fugazzeta` |
| `40.jpg` | Pizza con salchicha/chorizo alemán y mozzarella fundida | `prod_pizza_alemana`, `prod_pizza_salchicha` |
| `41.jpg` | Pizza especial con múltiples ingredientes: jamón, morrón, aceitunas, mozzarella | `prod_pizza_especial` |
| `42.jpg` | Pizza mozzarella con jamón encima | `prod_pizza_muzz_jamon`, `prod_pizza_muzz_jamon_huevo` |
| `43.jpg` | Lomopizza: pizza con lomo de res en tiras, morrones y queso | `prod_lomopizza_media_simple`, `prod_lomopizza_media_completa`, `prod_lomopizza_completa_simple`, `prod_lomopizza_completa` |
| `44.jpg` | Sándwich de milanesa de carne empanada, con lechuga y tomate en pan artesanal | `prod_sandw_milanesa_carne_especial`, `prod_sandw_milanesa_carne_completo`, `prod_mila_carne` |
| `45.jpg` | Sándwich de milanesa de pollo empanado, con mayonesa y lechuga | `prod_sandw_milanesa_pollo_especial`, `prod_sandw_milanesa_pollo_completo`, `prod_mila_pollo` |
| `46.jpg` | Papas fritas a caballo: papas con dos huevos fritos encima | `prod_papas_caballo` |
| `47.jpg` | Papas fritas con salchicha cortada, mostaza y ketchup | `prod_papas_salchicha` |
| `48.jpg` | Alito de carne (costillas pequeñas de res asadas) | `prod_alito_carne` |
| `49.jpg` | Triple de miga completo: sándwich triple con lechuga, tomate, jamón, queso y huevo | `prod_triple_completo`, `prod_triple_huevo_queso` |
| `50.jpg` | Triple de miga con milanesa y queso | `prod_triple_milan_queso` |
| `51.jpg` | Triple de miga de atún con lechuga y tomate | `prod_triple_atun` |

## Tarea paso a paso

1. **Generar cada imagen** con tu herramienta de generación de imágenes
2. **Guardar en** `c:\Users\Usuario\Downloads\app-antojos-mobile-v2\imgplatos\` con el nombre indicado (35.jpg, 36.jpg, etc.)
3. **Actualizar la BD** ejecutando este script Node.js (correrlo desde la raíz del proyecto para tener acceso a node_modules):

```js
// Ejecutar con: node update_images.mjs
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  'https://zriwcsczgnjrsdjmudab.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InpyaXdjc2N6Z25qcnNkam11ZGFiIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4NjYwNTcxNCwiZXhwIjoyMTAyMTgxNzE0fQ.8i8Rfjam7gXoYhv19-XLbnK2xx2S5jJ9n-5tj4ElRZg'
);

// COMPLETAR ESTE MAPA con los productos que corresponden a cada imagen generada:
const updates = [
  { id: 'prod_pizza_muzz_huevo',    imagen: '/imgplatos/35.jpg' },
  { id: 'prod_pizza_muzzarella',    imagen: '/imgplatos/35.jpg' },
  { id: 'prod_pizza_milan',         imagen: '/imgplatos/36.jpg' },
  { id: 'prod_pizza_choclo',        imagen: '/imgplatos/37.jpg' },
  { id: 'prod_pizza_queso_cremoso', imagen: '/imgplatos/37.jpg' },
  { id: 'prod_pizza_napolitana',    imagen: '/imgplatos/38.jpg' },
  { id: 'prod_pizza_fugazzeta',     imagen: '/imgplatos/39.jpg' },
  { id: 'prod_pizza_alemana',       imagen: '/imgplatos/40.jpg' },
  { id: 'prod_pizza_salchicha',     imagen: '/imgplatos/40.jpg' },
  { id: 'prod_pizza_especial',      imagen: '/imgplatos/41.jpg' },
  { id: 'prod_pizza_muzz_jamon',    imagen: '/imgplatos/42.jpg' },
  { id: 'prod_pizza_muzz_jamon_huevo', imagen: '/imgplatos/42.jpg' },
  { id: 'prod_lomopizza_media_simple',   imagen: '/imgplatos/43.jpg' },
  { id: 'prod_lomopizza_media_completa', imagen: '/imgplatos/43.jpg' },
  { id: 'prod_lomopizza_completa_simple',imagen: '/imgplatos/43.jpg' },
  { id: 'prod_lomopizza_completa',       imagen: '/imgplatos/43.jpg' },
  { id: 'prod_sandw_milanesa_carne_especial', imagen: '/imgplatos/44.jpg' },
  { id: 'prod_sandw_milanesa_carne_completo', imagen: '/imgplatos/44.jpg' },
  { id: 'prod_mila_carne',               imagen: '/imgplatos/44.jpg' },
  { id: 'prod_sandw_milanesa_pollo_especial', imagen: '/imgplatos/45.jpg' },
  { id: 'prod_sandw_milanesa_pollo_completo', imagen: '/imgplatos/45.jpg' },
  { id: 'prod_mila_pollo',               imagen: '/imgplatos/45.jpg' },
  { id: 'prod_papas_caballo',            imagen: '/imgplatos/46.jpg' },
  { id: 'prod_papas_salchicha',          imagen: '/imgplatos/47.jpg' },
  { id: 'prod_alito_carne',              imagen: '/imgplatos/48.jpg' },
  { id: 'prod_triple_completo',          imagen: '/imgplatos/49.jpg' },
  { id: 'prod_triple_huevo_queso',       imagen: '/imgplatos/49.jpg' },
  { id: 'prod_triple_milan_queso',       imagen: '/imgplatos/50.jpg' },
  { id: 'prod_triple_atun',             imagen: '/imgplatos/51.jpg' },
];

const N = new Date().toISOString();
let ok = 0, err = 0;
for (const { id, imagen } of updates) {
  const { error } = await supabase.from('productos').update({ imagen, updated_at: N }).eq('id', id);
  if (error) { console.error('ERROR', id, error.message); err++; }
  else { ok++; process.stdout.write('.'); }
}
console.log('\nActualizados:', ok, '/ Errores:', err);
```

4. **Hacer git commit** con las imágenes nuevas:
```bash
git add imgplatos/
git commit -m "feat(menu): add remaining ai-generated food images"
git push
```

## Nota importante

- Correr siempre los scripts Node.js **desde la raíz del proyecto** (`c:\Users\Usuario\Downloads\app-antojos-mobile-v2`) para que encuentre `node_modules/@supabase/supabase-js`
- La tabla es `productos`, campo `imagen`, formato `/imgplatos/NN.jpg`
- No modificar ningún archivo de código fuente, solo generar imágenes y actualizar BD
