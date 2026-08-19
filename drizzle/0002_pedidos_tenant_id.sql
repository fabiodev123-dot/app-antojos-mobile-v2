-- =============================================================================
-- Migration 0002: tenant_id en pedidos (mínimo para que el admin funcione)
-- =============================================================================
-- El admin panel y las RPCs 0003 filtran pedidos por tenant_id. Sin esta
-- columna, las queries del dashboard fallan con "column does not exist".
--
-- Por ahora solo se migra `pedidos` (lo que el super admin RPC necesita).
-- Las otras 9 tablas (categorias, cierres_diarios, clientes, gastos,
-- ingredientes, movimientos_stock, pedido_items, productos, recetas) se
-- migran cuando se implemente multi-tenant routing real (Fase 2 del SaaS).
-- =============================================================================

-- ─────────────────────────────────────────────────────────────────────────────
-- 1. Columna tenant_id en pedidos (idempotente)
-- ─────────────────────────────────────────────────────────────────────────────

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'pedidos'
      AND column_name = 'tenant_id'
  ) THEN
    ALTER TABLE "public"."pedidos"
      ADD COLUMN "tenant_id" text;
  END IF;
END $$;--> statement-breakpoint

-- ─────────────────────────────────────────────────────────────────────────────
-- 2. FK a tenants (idempotente via check)
-- ─────────────────────────────────────────────────────────────────────────────

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'pedidos_tenant_id_tenants_id_fk'
  ) THEN
    ALTER TABLE "public"."pedidos"
      ADD CONSTRAINT "pedidos_tenant_id_tenants_id_fk"
      FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id")
      ON DELETE set null ON UPDATE no action;
  END IF;
END $$;--> statement-breakpoint

-- ─────────────────────────────────────────────────────────────────────────────
-- 3. Índice para que los queries del admin no escaneen toda la tabla
-- ─────────────────────────────────────────────────────────────────────────────

CREATE INDEX IF NOT EXISTS "pedidos_tenant_id_idx"
  ON "public"."pedidos" USING btree ("tenant_id");--> statement-breakpoint

-- ─────────────────────────────────────────────────────────────────────────────
-- 4. Trigger updated_at en pedidos (idempotente)
-- ─────────────────────────────────────────────────────────────────────────────

DROP TRIGGER IF EXISTS "pedidos_set_updated_at" ON "public"."pedidos";--> statement-breakpoint

CREATE TRIGGER "pedidos_set_updated_at"
BEFORE UPDATE ON "public"."pedidos"
FOR EACH ROW
EXECUTE FUNCTION public.set_updated_at();
