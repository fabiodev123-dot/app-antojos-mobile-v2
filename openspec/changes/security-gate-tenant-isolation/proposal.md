# Proposal: Security Gate — Tenant Isolation & Debug Endpoint

## Intent

`app-antojos-mobile-v2` is multi-tenant SaaS. Today **every tenant boundary is enforced only in application code**, because `DATABASE_URL` connects as the Postgres `postgres` role (table owner), which bypasses RLS entirely. A single missing `WHERE tenant_id = ?` leaks or corrupts another tenant's data.

Two concrete defects make this exploitable today:
1. `/api/debug/state` is unauthenticated and returns tenant metadata (id, slug, name, status, plan) via the service-role client. Confirmed live: production returned `200` to an anonymous request.
2. `tenant_id` is nullable on most domain tables, and every tenant-scoped query filters with `if (session.tenantId && ...)`. A user with a session but **no tenant** falls through every branch → the query keeps only `WHERE id = $1` → **reads/updates/deletes any tenant's row**.

This change closes both, and adds a regression suite that proves isolation holds.

**Blocking dependency**: the Supabase project `zriwcsczgnjrsdjmudab` is **paused** — DNS NXDOMAIN, pooler rejects the tenant, MCP reports "Database not accessible". Live DB verification cannot run until it is resumed.

## Scope

### In Scope
- `tenant_id` fail-closed everywhere: no tenant ⇒ 403, never an unscoped query.
- Make `tenant_id` NOT NULL on all domain tables; backfill before constraining.
- Enable RLS on the 10 domain tables + policies keyed on `tenant_id`.
- Replace the owner-role `DATABASE_URL` with a non-owner role so RLS actually applies.
- Protect `/api/debug/state`: super-admin session + `DEBUG_STATE_SECRET` header in production; stop returning tenant rows.
- Vitest suite covering cross-tenant read/write attempts.
- Migration to apply `scripts/all-migrations-emergency.sql` to the resumed project.

### Out of Scope
- Renaming the brand / new identity (separate change).
- Onboarding and landing redesign (separate change).
- `middleware.ts` → `proxy.ts` migration for Next 16 (deprecation warning only, no behaviour change).
- Performance work (pagination, image optimization).

## Approach

Four layers, ordered so each is independently shippable and verifiable:

| Layer | Defends against | Mechanism |
|---|---|---|
| L1 Debug endpoint | Anonymous enumeration | Super-admin gate + secret header; no tenant rows in payload |
| L2 Fail-closed app | Session without tenant | Shared `resolveTenantScope()` helper; 403 before any query |
| L3 Schema | Rows with NULL tenant | `NOT NULL` + backfill + `tenant_id` FK to `tenants` |
| L4 RLS + role | App-layer regression | Non-owner role + `ENABLE ROW LEVEL SECURITY` + per-table policies |

L2 introduces one helper (`src/lib/auth/tenant-scope.ts`) used by every route, so the rule lives in one place instead of being re-derived in each `if`.

## Affected Areas

| Area | Impact | Description |
|---|---|---|
| `src/app/api/debug/state/route.ts` | Modified | Auth + secret gate; drop tenant rows (**done, uncommitted**) |
| `src/lib/auth/tenant-scope.ts` | New | Single source of truth for tenant resolution |
| `src/app/api/db/[entity]/route.ts` | Modified | Use helper; fail closed on GET-by-id, PATCH, DELETE |
| `src/app/api/db/pedidos/route.ts` | Modified | Same |
| `src/lib/db/index.ts` | Modified | Non-owner role + `SET LOCAL app.tenant_id` for RLS |
| `drizzle/0013_tenant_isolation_hardening.sql` | New | NOT NULL + FK + RLS policies (idempotent) |
| `src/lib/auth/tenant-scope.test.ts` | New | Unit: scope resolution matrix |
| `src/lib/auth/isolation.integration.test.ts` | New | 2 real tenants, cross-tenant attempts |

## Risks

| Risk | Likelihood | Mitigation |
|---|---|---|
| App breaks if a row has NULL `tenant_id` | Med | Backfill + audit query first; `NOT NULL` in separate migration step |
| RLS policy wrong ⇒ app sees 0 rows | Med | Policies verified against real data before enforcing; staged rollout |
| New role lacks needed grants | Med | Explicit `GRANT` list; verify with `has_table_privilege` |
| Non-owner role breaks `admin_service` (service role) | Low | Admin panel uses service role, unaffected by app role |
| Super admin loses access to all-tenant queries | Low | `acting_tenant_id` cookie + explicit `tenant_id` param path preserved |

## Rollback Plan

Each layer reverts independently:
- L1: `git revert` the route change.
- L2: helper is additive; revert call sites.
- L3: `ALTER COLUMN tenant_id DROP NOT NULL`.
- L4: `ALTER TABLE ... DISABLE ROW LEVEL SECURITY` + revert `DATABASE_URL` to owner role.

`scripts/all-migrations-emergency.sql` is idempotent, so re-running the baseline is always safe.

## Dependencies

- **Supabase project resumed** (blocked — paused, ref `zriwcsczgnjrsdjmudab`).
- Non-owner Postgres role created with `GRANT`s.
- `DEBUG_STATE_SECRET` env var set in Vercel (Production + Preview).

## Success Criteria

- [ ] Anonymous `GET /api/debug/state` → `404` in production, no tenant identifiers in any payload.
- [ ] Authenticated user **without** a tenant → `403` on every tenant-scoped GET/PATCH/DELETE; never an unscoped query.
- [ ] Tenant A cannot read, update, or delete Tenant B's row by id — proven by integration test with 2 real tenants.
- [ ] `tenant_id` is `NOT NULL` on all 10 domain tables; zero NULL rows remain.
- [ ] RLS enabled on all 10 domain tables; `pg_policies` shows a policy per table.
- [ ] App connects with a non-owner role; `current_user` is not `postgres`.
- [ ] `npm run verify` (tsc + eslint + vitest) passes.
