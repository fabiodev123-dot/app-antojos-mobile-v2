# Tasks: Security Gate — Tenant Isolation & Debug Endpoint

## Phase 0 — Unblock (BLOCKING, requires user action)

- [ ] **0.1** Resume the Supabase project `zriwcsczgnjrsdjmudab` (paused; DNS NXDOMAIN + pooler rejects tenant). Verify: DNS resolves, `psql` connects, MCP `list_tables` succeeds.
- [ ] **0.2** Apply the baseline schema to the resumed project: run `scripts/all-migrations-emergency.sql` (idempotent). Verify: `tenants`, `pedidos`, `productos` etc. exist.
- [ ] **0.3** Seed two test tenants with distinct data (tenant A and tenant B) so isolation tests can run. Verify: `SELECT count(*) FROM tenants` ≥ 2.
- [ ] **0.4** Set `DEBUG_STATE_SECRET` env var in Vercel (Production + Preview).

> **Note**: Phase 0 cannot start until 0.1. Do not proceed to Phase 2+ verification without a live DB.

## Phase 1 — L1: Debug endpoint (DONE, pending commit)

- [x] **1.1** Require super-admin session on `/api/debug/state` → 401 without session, 403 for non-super-admin.
- [x] **1.2** Require `x-debug-secret` header in production when `DEBUG_STATE_SECRET` is set → 404 otherwise. Constant-time comparison.
- [x] **1.3** Remove tenant rows from the payload: report `count` only, no `id`/`slug`/`name`/`status`/`plan`.
- [x] **1.4** Remove `appMetadata` from the session payload (may carry cross-tenant data).
- [ ] **1.5** Verify: anonymous request → 404/401; authenticated non-admin → 403; super admin → 200 with counts only.
- [ ] **1.6** Update `PROMPT-FRONTEND.md` and the `src/middleware.ts` header comment, which still document `/api/debug/*` as public.

## Phase 2 — L2: Fail-closed app layer

- [ ] **2.1** Create `src/lib/auth/tenant-scope.ts` exporting a single `resolveTenantScope()` that returns a discriminated union: `{ ok: true, tenantId, isSuperAdmin }` | `{ ok: false, response }`. It SHALL return 403 when the entity requires a tenant and no tenant can be resolved.
- [ ] **2.2** Unit-test `resolveTenantScope()` — matrix of (hasTenant × isSuperAdmin × entityRequiresTenant). File: `src/lib/auth/tenant-scope.test.ts`.
- [ ] **2.3** Apply the helper in `src/app/api/db/[entity]/route.ts` for GET (list + by-id), PATCH and DELETE. Remove the `if (session.tenantId && !session.isSuperAdmin)` pattern.
- [ ] **2.4** Apply the helper in `src/app/api/db/pedidos/route.ts` for GET (list + by-id), PATCH and DELETE.
- [ ] **2.5** Audit every remaining route under `src/app/api/**` for the same pattern (grep for `session.tenantId &&`).
- [ ] **2.6** Verify: a session without a tenant gets 403 on all tenant-scoped routes; `npm run verify` passes.

## Phase 3 — L3: Schema hardening

- [ ] **3.1** Audit for NULL `tenant_id` on all 10 domain tables. Produce a report before changing anything.
- [ ] **3.2** Backfill any NULL `tenant_id` to the owning tenant (or archive the orphan rows — decide with the user).
- [ ] **3.3** Write `drizzle/0013_tenant_isolation_hardening.sql` (idempotent): add `tenant_id` FK to `tenants(id)`, then `SET NOT NULL` on all 10 tables.
- [ ] **3.4** Apply the migration to the test DB, then verify zero NULL rows remain.

## Phase 4 — L4: RLS + restricted role

- [ ] **4.1** Create a non-owner Postgres role (e.g. `antojos_app`) with only the required `GRANT`s.
- [ ] **4.2** Write the RLS policies for the 10 domain tables, keyed on `tenant_id = current_setting('app.tenant_id', true)`.
- [ ] **4.3** In `src/lib/db/index.ts`, set the tenant context per transaction (`SET LOCAL app.tenant_id = ...`).
- [ ] **4.4** Point `DATABASE_URL` at the new role in `.env.local`; keep the owner URL documented for migrations.
- [ ] **4.5** Verify: `current_user` ≠ `postgres`; a query with no tenant context returns 0 rows; the admin panel still works (it uses the service role).
- [ ] **4.6** Roll out to Vercel: set `DATABASE_URL` to the restricted role.

## Phase 5 — Isolation tests

- [ ] **5.1** Write `src/lib/auth/isolation.integration.test.ts` — 2 tenants, cross-tenant read/write/delete attempts.
- [ ] **5.2** Tests MUST use an isolated DB (branch de Supabase o DB local), never production.
- [ ] **5.3** Run the full suite: `npm run verify`.

## Phase 6 — Close-out

- [ ] **6.1** Re-check Supabase security advisors after the migration (`get_advisors({type:"security"})`) — expect no missing-RLS lints.
- [ ] **6.2** Update `docs/architecture.md` with the isolation model (app layer vs RLS vs role).
- [ ] **6.3** Remove the temporary `scripts/inspect-schema.mjs` or promote it to a documented diagnostic tool.
- [ ] **6.4** Archive the change: `openspec/changes/archive/security-gate-tenant-isolation/`.
