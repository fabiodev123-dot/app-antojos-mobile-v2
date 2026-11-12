# Spec: Tenant Isolation & Secure Debug Endpoint

## ADDED Requirements

### Requirement: Debug endpoint requires authentication
The system SHALL NOT expose `/api/debug/state` to unauthenticated requests.

#### Scenario: Anonymous request in production
- **GIVEN** the app runs with `NODE_ENV=production`
- **AND** the request carries no `x-debug-secret` header
- **WHEN** a client calls `GET /api/debug/state`
- **THEN** the response status is `404`
- **AND** the body contains no tenant identifiers

#### Scenario: Anonymous request without configured secret
- **GIVEN** `NODE_ENV=production`
- **AND** the env var `DEBUG_STATE_SECRET` is not defined
- **WHEN** a client calls `GET /api/debug/state`
- **THEN** the response status is `404`
- **AND** the server logs that the route is disabled due to missing configuration

#### Scenario: Correct secret but no session
- **GIVEN** the request carries the correct `x-debug-secret` header
- **AND** there is no authenticated Supabase session
- **WHEN** a client calls `GET /api/debug/state`
- **THEN** the response status is `401`

#### Scenario: Correct secret and non-super-admin session
- **GIVEN** the request carries the correct `x-debug-secret` header
- **AND** the session belongs to a user who is not in `super_admins`
- **WHEN** a client calls `GET /api/debug/state`
- **THEN** the response status is `403`

#### Scenario: Super admin with correct secret
- **GIVEN** the request carries the correct `x-debug-secret` header
- **AND** the session belongs to a user in `super_admins`
- **WHEN** a client calls `GET /api/debug/state`
- **THEN** the response status is `200`
- **AND** the payload contains tenant **counts only** (`count`), never a tenant `id`, `slug`, `name`, `status`, or `plan`

#### Scenario: Development environment
- **GIVEN** `NODE_ENV` is not `production`
- **WHEN** an unauthenticated client calls `GET /api/debug/state`
- **THEN** the response status is `401`
- **AND** the secret header is not required

### Requirement: Tenant-scoped queries fail closed
The system MUST NOT execute a tenant-scoped query when the caller has no resolvable tenant.

#### Scenario: Session without tenant, get by id
- **GIVEN** an authenticated user whose session resolves to no tenant
- **AND** the target entity requires a tenant
- **WHEN** the client calls `GET /api/db/{entity}?id=X`
- **THEN** the response status is `403`
- **AND** no row is returned

#### Scenario: Session without tenant, list
- **GIVEN** an authenticated user whose session resolves to no tenant
- **AND** the target entity requires a tenant
- **WHEN** the client calls `GET /api/db/{entity}`
- **THEN** the response status is `403`

#### Scenario: Session without tenant, update
- **GIVEN** an authenticated user whose session resolves to no tenant
- **AND** the target entity requires a tenant
- **WHEN** the client calls `PATCH /api/db/{entity}?id=X`
- **THEN** the response status is `403`
- **AND** the row is unchanged

#### Scenario: Session without tenant, delete
- **GIVEN** an authenticated user whose session resolves to no tenant
- **AND** the target entity requires a tenant
- **WHEN** the client calls `DELETE /api/db/{entity}?id=X`
- **THEN** the response status is `403`
- **AND** the row still exists

#### Scenario: Tenant user requesting another tenant's row
- **GIVEN** an authenticated user whose session resolves to tenant A
- **AND** a row exists belonging to tenant B
- **WHEN** the client calls `GET /api/db/{entity}?id={tenantB_row_id}`
- **THEN** the response status is `404`

#### Scenario: Tenant user listing
- **GIVEN** an authenticated user whose session resolves to tenant A
- **WHEN** the client calls `GET /api/db/{entity}`
- **THEN** every returned row has `tenant_id` equal to tenant A

### Requirement: Tenant identifiers are immutable and non-null
The system MUST NOT permit a row to exist without a tenant, and MUST NOT permit a tenant to be reassigned.

#### Scenario: Creating a row without tenant
- **GIVEN** an authenticated tenant user of tenant A
- **WHEN** the client posts a body that omits `tenant_id`
- **THEN** the created row has `tenant_id` equal to tenant A

#### Scenario: Client attempts to set tenant in body
- **GIVEN** an authenticated tenant user of tenant A
- **WHEN** the client posts a body containing `tenant_id` of tenant B
- **THEN** the created row has `tenant_id` equal to tenant A

#### Scenario: Client attempts to change tenant via PATCH
- **GIVEN** an authenticated tenant user of tenant A
- **WHEN** the client patches a row with `tenant_id` of tenant B
- **THEN** the row's `tenant_id` remains tenant A

#### Scenario: Row without tenant exists
- **GIVEN** a row in a domain table has `tenant_id` NULL
- **WHEN** the schema is verified
- **THEN** the `tenant_id` column is `NOT NULL`

### Requirement: Database enforces tenant isolation
The system MUST enable row level security on all domain tables with policies keyed on `tenant_id`, and the application MUST connect with a role that is subject to those policies.

#### Scenario: RLS enabled
- **GIVEN** the migration has been applied
- **WHEN** `pg_class.relrowsecurity` is inspected for every domain table
- **THEN** it is `true` for all of them

#### Scenario: Policy per table
- **GIVEN** the migration has been applied
- **WHEN** `pg_policies` is inspected
- **THEN** every domain table has at least one policy referencing `tenant_id`

#### Scenario: App connects with a restricted role
- **GIVEN** the app is running
- **WHEN** `current_user` is queried from the app's connection
- **THEN** it is not `postgres`

#### Scenario: Direct query without tenant context
- **GIVEN** the app connects with a restricted role and no tenant context is set
- **WHEN** a row from a domain table is selected
- **THEN** zero rows are returned

### Requirement: Isolation is regression-tested
The system MUST provide automated tests proving cross-tenant access is denied.

#### Scenario: Cross-tenant read attempt
- **GIVEN** two tenants with data exist in an isolated test database
- **WHEN** a session scoped to tenant A requests a tenant B row by id
- **THEN** the test asserts a `404` or empty result

#### Scenario: Cross-tenant write attempt
- **GIVEN** two tenants with data exist in an isolated test database
- **WHEN** a session scoped to tenant A patches or deletes a tenant B row
- **THEN** the test asserts the row is unchanged

#### Scenario: Suite is green
- **GIVEN** the full test suite runs
- **WHEN** `npm run verify` completes
- **THEN** the exit code is `0`
