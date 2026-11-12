# Tasks: Security Gate — Tenant Isolation & Debug Endpoint

## Phase 0 — Unblock (DONE)

- [x] **0.1** Supabase project resumed. Verified: DNS resolves, pooler accepts the tenant, MCP lists 30 tables.
- [x] **0.2** Baseline schema already applied (migrations up to `032_unified_missing_tables`, 25/08). No re-apply needed.
- [x] **0.3** Test tenants seeded: `tenant_test_iso` (1 categoria, 1 producto, 1 cliente) + 3 test users (`test_iso_sin_tenant@`, `test_iso_tenant_a@`, `test_iso_superadmin@`, password `TestIso123!pass`).
- [ ] **0.4** Set `DEBUG_STATE_SECRET` env var in Vercel (Production + Preview). El valor NO se documenta en el repo..

## Phase 1 — L1: Debug endpoint (DONE)

- [x] **1.1** Super-admin session required → 401 without session, 403 for non-super-admin.
- [x] **1.2** `x-debug-secret` header required in production, constant-time comparison → 404 otherwise.
- [x] **1.3** Tenant rows removed from payload: `count` only.
- [x] **1.4** `appMetadata` removed from the session payload.
- [x] **1.5** Verified: anonymous → 404/401; non-admin → 403; super admin → 200 with counts only.
- [x] **1.6** `PROMPT-FRONTEND.md` and the `src/middleware.ts` header updated.

## Phase 2 — L2: Fail-closed app layer (DONE)

- [x] **2.1** Created `src/lib/auth/tenant-scope.ts` with `resolveTenantScope()` — discriminated union, `read`/`write` modes, injectable tenant validator (`setTenantValidator`).
- [x] **2.2** Unit tests: `src/lib/auth/tenant-scope.test.ts` — 16 tests covering the full matrix.
- [x] **2.3** Applied in `src/app/api/db/[entity]/route.ts` (GET, POST, PATCH, DELETE).
- [x] **2.4** Applied in `src/app/api/db/pedidos/route.ts` (GET, POST, PATCH, DELETE).
- [x] **2.5** Audited all of `src/app/api/**`: no remaining `session.tenantId &&` filter patterns. Admin panel uses `requireSuperAdmin()` + service role (unaffected).
- [x] **2.6** Verified end-to-end against the running app:
  - user without tenant → 403 on GET/POST/PATCH/DELETE of tenant-scoped entities
  - tenant A cannot read/update/delete tenant B rows
  - tenant A cannot create rows in tenant B (body `tenant_id` ignored)
  - super admin retains global read access (panel /admin unbroken)
- [x] **2.7** Regression scripts: `scripts/test-isolation.mjs`, `scripts/test-isolation-app.mjs`, `scripts/test-isolation-write.mjs`, `scripts/test-superadmin.mjs`, `scripts/create-iso-user.mjs`, `scripts/create-iso-superadmin.mjs`.

> **Regresión detectada y corregida**: la primera versión del fix exigía `tenant_id` al super admin también en lectura, lo que rompía el panel `/admin`. Se separó en modos `read` (global permitido) y `write` (tenant explícito obligatorio).

## Phase 3 — L3: Schema hardening (ALREADY DONE upstream)

- [x] **3.1** Auditado: `tenant_id` es `NOT NULL` en las 24 tablas que lo tienen (migración `032_unified_missing_tables`, 25/08).
- [x] **3.2** Cero filas con `tenant_id` NULL (verificado en las 11 tablas de dominio).
- [x] **3.3** No migration needed — `drizzle/0013` no aplica. La migración `032` ya está en producción.
- [x] **3.4** Verificado por query directa contra la base.

## Phase 4 — L4: RLS + restricted role (DONE)

- [x] **4.1** Rol `antojos_app` creado sin `BYPASSRLS` ni `SUPERUSER`, con GRANTs mínimos (DML en las 11 tablas de dominio, SELECT en `tenants`/`tenant_users`).
- [x] **4.2** `get_user_tenant_id()` reescrita: resuelve el tenant desde el GUC de sesión `app.tenant_id` (sentinel `__none__`) con fallback a `auth.jwt()`. Las policies de las 11 tablas de dominio ahora la usan e incluyen al rol `antojos_app`.
- [x] **4.3** `src/lib/db/tenant-db.ts` con `withTenantDb()`: cada operación tenant-scoped corre en una transacción con `SET LOCAL app.tenant_id`. `SET LOCAL` (y no `SET`) es obligatorio: el pool reutiliza conexiones y un `SET` global filtraría el tenant al siguiente request.
- [x] **4.4** `src/lib/db/index.ts` usa `APP_DATABASE_URL` (rol restringido) con fallback a `DATABASE_URL` (owner). Dos env vars permiten rollback instantáneo sin deploy.
- [x] **4.5** Verificado: `current_user = antojos_app`, `bypassrls = false`. El panel `/admin` sigue funcionando (service role, RPCs con `EXECUTE` concedido).
- [ ] **4.6** Rollout a Vercel: setear `APP_DATABASE_URL` con el rol `antojos_app` (el password lo carga el usuario; no se commitea).

> **Cambio de comportamiento (L4)**: el super admin ya no puede leer globalmente vía `/api/db/*`; debe acotar a un tenant (`tenant_id` explícito o `acting_tenant_id`). El acceso global vive en el panel `/admin`, que usa el service role por otra vía. Es coherente con que la conexión de la app esté sujeta a RLS: una lectura sin tenant no puede "ver todo" porque la base la frena igual.

> **Backstop verificado** (`scripts/test-rls-backstop.mjs`): un query SIN filtro `WHERE tenant_id` — el error más común en un endpoint nuevo — sigue sin poder leer datos ajenos. Sin tenant en la sesión, toda tabla de dominio devuelve 0 filas. Un UPDATE sobre fila ajena afecta 0 filas y no la modifica. El GUC queda limpio entre transacciones (pool safety).

## Phase 5 — Unify tenant source of truth (RESOLVED — no action needed)

- [x] **5.1** Se evaluó la divergencia entre las dos fuentes de verdad:
  - `app_metadata.tenant_id` (JWT) — la usan la app (`src/lib/auth/session.ts`) y `get_user_tenant_id()` (RLS).
  - `tenant_users.tenant_id` — la usa la app como fallback (`session.ts:130-137`).
- [x] **5.2** `rayin@antojos.com` tiene tenant en `tenant_users` pero **NO** en el JWT.
- [x] **5.3** **Verificado empíricamente: NO rompe nada.** La app resuelve el tenant por fallback y lo inyecta explícitamente en el GUC de la sesión (`withTenantDb(scope.tenantId, ...)`), así que RLS recibe el tenant correcto aunque el JWT no lo tenga.
  - `scripts/test-user-impact.mjs` → "ningun usuario existente queda sin acceso": los 3 usuarios de `tenant_antojos` ven sus 97 productos con RLS activo.
- [x] **5.4** Conclusión: la divergencia no requiere migración ni trigger. `get_user_tenant_id()` con fallback al JWT cubre el caso PostgREST; la app cubre el resto vía GUC.
- [x] **5.5** Se evaluó el impacto de cada usuario sobre el dashboard: ninguno queda sin acceso.

## Phase 6 — Isolation tests (DONE)

- [x] **6.1** Suite vitest de integración: `src/lib/auth/isolation.integration.test.ts` con 17 tests que cubren las dos capas (RLS + `resolveTenantScope`).
- [x] **6.2** Los tests se **saltan** si los fixtures no están, para que `npm test` siga siendo usable sin base de datos. Verificado: sin fixtures → 16 skip + 1 pass.
- [x] **6.3** `scripts/setup-iso-fixtures.mjs` crea los fixtures de forma idempotente (tenant + 3 usuarios). `scripts/cleanup-iso-fixtures.mjs` los borra — verificado que funciona.
- [x] **6.4** Scripts npm: `test:iso:setup`, `test:iso:cleanup`, `test:iso:role`, `test:iso:backstop`, `test:iso:impact`.

> **Gotcha**: un error de RLS aborta la transacción y deja la conexión muerta (`CONNECTION_ENDED`). El test que espera un INSERT fallido usa una conexión propia, y los `afterAll` cierran con `.catch(() => {})` para no romper la suite.

## Phase 7 — Close-out

- [ ] **7.1** Higiene de advisors: fijar `search_path` en las 13 funciones `SECURITY DEFINER` restantes y `REVOKE EXECUTE` de `anon` a `get_plan_catalog()`. (Ambos son WARN de bajo riesgo: `get_plan_catalog` sólo devuelve el catálogo de planes, dato público de marketing.)
- [ ] **7.2** Update `docs/architecture.md` con el modelo de aislamiento (capa app + RLS + rol).
- [ ] **7.3** Limpiar fixtures de la base antes de entregar: `npm run test:iso:cleanup`.
- [ ] **7.4** Archivar el cambio: `openspec/changes/archive/security-gate-tenant-isolation/`.

## Phase 8 — Deploy (PENDING del usuario)

- [ ] **8.1** Vercel → `APP_DATABASE_URL` = `postgresql://antojos_app.<PROJECT_REF>:<PASSWORD>@aws-0-us-west-2.pooler.supabase.com:6543/postgres`
- [ ] **8.2** Vercel → `DEBUG_STATE_SECRET` = valor generado en la sesión.
- [ ] **8.3** Push a `main` → Vercel redespliega con las dos capas activas.
- [ ] **8.4** Verificar en producción: `GET /api/debug/state` anónimo → 404; `/admin` → 200 con sesión de super admin.

