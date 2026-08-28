@AGENTS.md

# Proyecto: Antojos Mobile v2

App de gestión de pedidos para restaurante. Stack: Next.js 15 (App Router), Supabase (Postgres), Drizzle ORM, TypeScript.

## Reglas generales

- Nunca usar `&&` en PowerShell — usar `;` o comandos separados
- Siempre correr scripts Node.js desde la raíz del proyecto (donde está `node_modules/`)
- No hacer `npm run build` salvo que se pida explícitamente
- Conventional commits: `feat:`, `fix:`, `chore:`, etc.

## Skill: Generación de imágenes de productos

> Activar cuando la tarea involucre generar imágenes de comida para el menú.

### Contexto

- Las imágenes locales viven en `imgplatos/` numeradas secuencialmente (1.jpg, 2.jpg, ..., 34.jpg)
- El campo `imagen` en la tabla `productos` de Supabase referencia `/imgplatos/NN.jpg`
- Credenciales en `.env.local` — usar `SUPABASE_SERVICE_ROLE_KEY` para writes

### Pasos obligatorios

1. **Generar imagen** con tu herramienta de imagen IA
   - Estilo: food photography profesional, fondo oscuro madera rústica, iluminación cálida restaurante, sin texto
   - Guardar en `imgplatos/` con el número siguiente disponible

2. **Actualizar Supabase** ejecutando desde la raíz del proyecto:
   ```js
   // usar node con import dinámico para ESM
   node -e "import('@supabase/supabase-js').then(async ({ createClient }) => { ... })"
   ```

3. **Git commit** con las imágenes nuevas:
   ```powershell
   git add imgplatos/
   git commit -m "feat(menu): add food images for <descripcion>"
   git push
   ```

### Tarea pendiente

Ver archivo `OPENCODE-IMAGENES-PENDIENTES.md` en la raíz del proyecto.
Contiene la lista exacta de imágenes a generar, a qué productos aplica cada una, y el script completo para actualizar la BD.
