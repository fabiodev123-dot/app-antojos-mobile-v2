# Backend Plan — app-antojos-mobile-v2

## Estado Actual de la DB

### Usuarios auth.users
| email | user_id | Estado |
|-------|---------|--------|
| admin@antojos.com | 6ad54dff-5c0d-4ca9-9ae4-8e154de44f06 | ✅ super_admin |
| rayin123@admin.com | 80ac844c-3a25-440d-ab2f-f3a537cb3c5b | ✅ tenant_user (admin de Antojos) |
| rayin@admin.com | e4f3c905-7cee-49e2-af97-f2b23c99cc7e | ❌ **NO vinculado a ningún tenant** |

### Tenants
| id | slug | name |
|----|------|------|
| tenant_antojos | antojos | Antojos |

### RLS Policies
- Todas las tablas de dominio tienen RLS habilitado con `tenant_isolation_*` policies
- Policies usan `auth.jwt() -> 'app_metadata' ->> 'tenant_id'`
- **Problema**: `custom_access_token_hook` no está configurado → el JWT no tiene `app_metadata.tenant_id` → RLS no funciona → la app depende del filtrado manual en API routes

### Schema Drizzle vs DB (drift)
| Tabla | Drizzle | DB | Impacto |
|-------|---------|----|---------|
| `super_admins` | `id uuid` PK | `id text` + `user_id uuid` | ⚠️ Drizzle schema incorrecto |
| `tenant_users.role` | `tenant_user_role` (admin, operador) | `tenant_role` (owner, admin, operador) | ⚠️ Enum mismatch |
| `categorias` | sin `tenant_id` | con `tenant_id` FK | ⚠️ Drizzle no lo sabe |
| `recetas` | sin `tenant_id` | con `tenant_id` FK | ⚠️ Drizzle no lo sabe |
| `clientes` | sin `tenant_id` | con `tenant_id` FK | ⚠️ Drizzle no lo sabe |
| `gastos` | sin `tenant_id` | con `tenant_id` FK | ⚠️ Drizzle no lo sabe |
| `cierres_diarios` | sin `tenant_id` | con `tenant_id` FK | ⚠️ Drizzle no lo sabe |
| `pedido_items` | sin `tenant_id` | con `tenant_id` FK | ⚠️ Drizzle no lo sabe |

---

## Tareas del Backend

### Tarea 1: Vincular rayin@admin.com al tenant Antojos
**Prioridad**: CRÍTICA (el user lo pidió)
**Archivos**: Ninguno (SQL directo via MCP)

```sql
INSERT INTO public.tenant_users (id, tenant_id, user_id, role)
VALUES (
  'tu_' || encode(gen_random_bytes(6), 'hex'),
  'tenant_antojos',
  'e4f3c905-7cee-49e2-af97-f2b23c99cc7e',
  'admin'
)
ON CONFLICT (tenant_id, user_id) DO NOTHING;
```

**Nota**: Esto le da rol `admin` al tenant Antojos. Si se necesita que también sea super_admin, hacer un INSERT separado en `super_admins`.

---

### Tarea 2: Configurar custom_access_token_hook para JWT
**Prioridad**: ALTA (sin esto, RLS no funciona)
**Archivos**: Ninguno (Supabase Dashboard → Auth → Hooks)

El hook debe inyectar `app_metadata.tenant_id` en el JWT basándose en la membresía del user en `tenant_users`. Sin esto, las RLS policies bloquean todo porque `auth.jwt() -> 'app_metadata' ->> 'tenant_id'` es NULL.

**Opción A** (recomendada): Edge Function como custom_access_token_hook
```sql
-- La función busca el tenant_id del user en tenant_users
-- y lo inyecta en app_metadata del JWT
```

**Opción B**: Trigger en `auth.users` que setea `raw_app_meta_data` al crear/actualizar.
- Más simple pero menos flexible

---

### Tarea 3: Sync schema Drizzle con la DB real
**Prioridad**: MEDIA
**Archivos**: `src/lib/db/schema.ts`, `drizzle/0012_*.sql`

Corregir el schema de Drizzle para reflejar el estado real de la DB:

1. **`super_admins`**: Cambiar PK a `text` + agregar columna `user_id uuid`
2. **`tenant_users.role`**: Cambiar enum a `tenant_role` (agregar `owner`)
3. **Agregar `tenantId`** a tablas que lo tienen en DB pero no en Drizzle:
   - `categorias`, `recetas`, `clientes`, `gastos`, `cierresDiarios`, `pedidoItems`
4. **Crear migración SQL** `0012_sync_schema_drift.sql` que aplique los cambios

---

### Tarea 4: Verificar/Arreglar RLS policies
**Prioridad**: MEDIA
**Archivos**: Ninguno (SQL via MCP)

Verificar que las policies existentes sean correctas para el multi-tenant. Issues encontrados:
- `tenants_select_own` solo permite ver TU tenant (ok para tenant_users, MAL para super_admins que necesitan ver todos)
- `super_admins_read_admin` es `qual: true` (cualquier authenticated user puede ver super_admins — puede ser un leak)
- Falta policy de INSERT/UPDATE/DELETE en `tenants` (solo service_role puede modificar)
- Falta policy de service_role bypass en todas las tablas (para que el admin client funcione)

---

### Tarea 5: Verify DATABASE_URL y SERVICE_ROLE_KEY
**Prioridad**: BLOQUEANTE
**Archivos**: `.env.local`, Vercel dashboard

El usuario configuró `.env.local` con placeholders. Verificar que:
1. `DATABASE_URL` usa port **6543** (pooler, transaction mode) — NO 5432
2. `SUPABASE_SERVICE_ROLE_KEY` es la key correcta del proyecto
3. En Vercel, las mismas variables están seteadas

---

## Orden de Ejecución

1. **Tarea 1** (vincular rayin@admin.com) → SQL inmediato, sin dependencias
2. **Tarea 5** (verificar env vars) → Sin cambios de código
3. **Tarea 3** (sync schema Drizzle) → Requiere archivo nuevo + migración
4. **Tarea 2** (access token hook) → Requiere Edge Function
5. **Tarea 4** (RLS audit) → Post-deploy,低 priority

---

## Notas para Ejecución

- **NO hacer commit** sin pedir al usuario
- **NO correr build** (regla del proyecto)
- **Conventional commits** obligatorios
- Cada tarea es un commit separado
- Usar `supabase_apply_migration` para migraciones SQL
- El usuario habla rioplatense (voseo)
