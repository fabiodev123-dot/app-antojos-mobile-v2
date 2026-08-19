-- =============================================================================
-- Migration 0004: ventas_rapidas (Quick Cash Sales)
-- =============================================================================-- Tabla para registrar ventas rápidas (anotar plata sin armar pedido).-- Replica el patron de `gastos`: fecha + monto + nota + tenant_id + RLS.-- =============================================================================

CREATE TABLE "public"."ventas_rapidas" (
	"id" text PRIMARY KEY NOT NULL,
	"fecha" date NOT NULL,
	"hora" text NOT NULL,
	"monto" numeric(10, 2) NOT NULL,
	"nota" text,
	"tenant_id" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint

ALTER TABLE "public"."ventas_rapidas" ADD CONSTRAINT "ventas_rapidas_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE CASCADE;
--> statement-breakpoint

CREATE INDEX "ventas_rapidas_tenant_fecha_idx" ON "public"."ventas_rapidas" USING btree ("tenant_id","fecha");
--> statement-breakpoint

CREATE INDEX "ventas_rapidas_tenant_created_at_idx" ON "public"."ventas_rapidas" USING btree ("tenant_id","created_at" DESC);
--> statement-breakpoint

ALTER TABLE "public"."ventas_rapidas" ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint

CREATE POLICY "ventas_rapidas_tenant_isolation_select" ON "public"."ventas_rapidas" AS PERMISSIVE FOR SELECT TO authenticated USING ((tenant_id = ((auth.jwt() -> 'app_metadata'::text) ->> 'tenant_id'::text)));
--> statement-breakpoint

CREATE POLICY "ventas_rapidas_tenant_isolation_insert" ON "public"."ventas_rapidas" AS PERMISSIVE FOR INSERT TO authenticated WITH CHECK ((tenant_id = ((auth.jwt() -> 'app_metadata'::text) ->> 'tenant_id'::text)));
--> statement-breakpoint

CREATE POLICY "ventas_rapidas_tenant_isolation_update" ON "public"."ventas_rapidas" AS PERMISSIVE FOR UPDATE TO authenticated USING ((tenant_id = ((auth.jwt() -> 'app_metadata'::text) ->> 'tenant_id'::text))) WITH CHECK ((tenant_id = ((auth.jwt() -> 'app_metadata'::text) ->> 'tenant_id'::text)));
--> statement-breakpoint

CREATE POLICY "ventas_rapidas_tenant_isolation_delete" ON "public"."ventas_rapidas" AS PERMISSIVE FOR DELETE TO authenticated USING ((tenant_id = ((auth.jwt() -> 'app_metadata'::text) ->> 'tenant_id'::text)));