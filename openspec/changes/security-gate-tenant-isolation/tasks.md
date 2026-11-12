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

## Phase 4 — L4: RLS + restricted role (PENDING — the real remaining gap)

- [ ] **4.1** Create a non-owner Postgres role (`antojos_app`) with only the required `GRANT`s.
- [ ] **4.2** Policies already exist and are correct (4 per domain table). Verify they work for the restricted role.
- [ ] **4.3** In `src/lib/db/index.ts`, set the tenant context per transaction (`SET LOCAL app.tenant_id = ...`).
- [ ] **4.4** Repoint `DATABASE_URL` at the new role.
- [ ] **4.5** Verify `current_user` ≠ `postgres` and the admin panel still works.
- [ ] **4.6** Roll out to Vercel.

> **Estado actual**: `DATABASE_URL` conecta con el rol `postgres` (`rolbypassrls = true`), por lo que **las policies RLS no se aplican a la conexión de la app**. La app se apoya 100% en el filtrado por código (ya corregido). La DB sí está protegida para el rol `authenticated` (verificado: usuario sin tenant ve 0 filas vía PostgREST).

## Phase 5 — Unify tenant source of truth (PENDING)

- [ ] **5.1** Hoy hay dos fuentes de verdad que **no coinciden**:
  - `app_metadata.tenant_id` (JWT) — la usan la app (`src/lib/auth/session.ts`) y `get_user_tenant_id()` (RLS).
  - `tenant_users.tenant_id` — la usa la app como fallback (`session.ts:130-137`).
- [ ] **5.2** `rayin@antojos.com` tiene tenant en `tenant_users` pero **NO** en el JWT → RLS le devolvería 0 filas si la app dejara de bypasear RLS.
- [ ] **5.3** `rayin123@admin.com` y `rayin@admin.com` tienen ambos → coherentes.
- [ ] **5.4** Decidir: hacer que `get_user_tenant_id()` consulte `tenant_users` como fallback, o sincronizar `app_metadata.tenant_id` vía trigger en cada alta de `tenant_users`.

## Phase 6 — Isolation tests (PENDING — formalize)

- [ ] **6.1** Convert the ad-hoc `scripts/test-isolation*.mjs` into a proper vitest integration suite.
- [ ] **6.2** The suite needs an isolated DB (Supabase branch). Current scripts run against the real project with disposable fixtures.

## Phase 7 — Close-out

- [ ] **7.1** Re-check Supabase security advisors after any migration.
- [ ] **7.2** Update `docs/architecture.md` with the isolation model (app layer vs RLS vs role).
- [ ] **7.3** Clean up test fixtures: delete `tenant_test_iso` and the 3 test users.
- [ ] **7.4** Archive the change: `openspec/changes/archive/security-gate-tenant-isolation/`.

