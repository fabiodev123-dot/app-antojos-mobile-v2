-- =============================================================================
-- Migration 0012: Sync Drizzle schema with actual DB state
-- =============================================================================
-- Adds tenant_id columns and indexes to tables that had them in the DB
-- but were missing from the Drizzle schema.
--
-- NOTE: All rows already have tenant_id set (verified via audit).
-- No data backfill needed.
-- =============================================================================

-- 1. Add tenant_id indexes (columns already exist in DB)
CREATE INDEX IF NOT EXISTS "categorias_tenant_idx" ON "categorias" USING btree ("tenant_id");
CREATE INDEX IF NOT EXISTS "productos_tenant_idx" ON "productos" USING btree ("tenant_id");
CREATE INDEX IF NOT EXISTS "ingredientes_tenant_idx" ON "ingredientes" USING btree ("tenant_id");
CREATE INDEX IF NOT EXISTS "recetas_tenant_idx" ON "recetas" USING btree ("tenant_id");
CREATE INDEX IF NOT EXISTS "clientes_tenant_idx" ON "clientes" USING btree ("tenant_id");
CREATE INDEX IF NOT EXISTS "gastos_tenant_idx" ON "gastos" USING btree ("tenant_id");
CREATE INDEX IF NOT EXISTS "cierres_tenant_idx" ON "cierres_diarios" USING btree ("tenant_id");
