-- =============================================================================
-- Migration 0009: device_sessions + admin RPCs
-- =============================================================================
-- Tabla para tracking de dispositivos conectados via heartbeat.
-- RLS multi-tenant (mismo patron que el resto del schema).
-- RPCs para el panel admin (service_role only).
-- =============================================================================

CREATE TABLE "public"."device_sessions" (
	"id" text PRIMARY KEY NOT NULL,
	"tenant_id" text NOT NULL,
	"user_id" text NOT NULL,
	"device_id" text NOT NULL,
	"user_agent" text,
	"platform" text,
	"app_version" text,
	"last_seen" timestamptz NOT NULL DEFAULT now(),
	"first_seen" timestamptz NOT NULL DEFAULT now(),
	"created_at" timestamptz NOT NULL DEFAULT now()
);

--> statement-breakpoint

ALTER TABLE "public"."device_sessions"
  ADD CONSTRAINT "device_sessions_tenant_id_tenants_id_fk"
  FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE CASCADE;

--> statement-breakpoint

CREATE INDEX "device_sessions_tenant_idx" ON "public"."device_sessions" USING btree ("tenant_id");
CREATE INDEX "device_sessions_last_seen_idx" ON "public"."device_sessions" USING btree ("last_seen" DESC);
CREATE INDEX "device_sessions_tenant_last_seen_idx" ON "public"."device_sessions" USING btree ("tenant_id","last_seen" DESC);

--> statement-breakpoint

ALTER TABLE "public"."device_sessions" ENABLE ROW LEVEL SECURITY;

--> statement-breakpoint

CREATE POLICY "device_sessions_tenant_isolation_select" ON "public"."device_sessions"
  AS PERMISSIVE FOR SELECT TO authenticated
  USING ((tenant_id = ((auth.jwt() -> 'app_metadata'::text) ->> 'tenant_id'::text)));

--> statement-breakpoint

CREATE POLICY "device_sessions_tenant_isolation_insert" ON "public"."device_sessions"
  AS PERMISSIVE FOR INSERT TO authenticated
  WITH CHECK ((tenant_id = ((auth.jwt() -> 'app_metadata'::text) ->> 'tenant_id'::text)));

--> statement-breakpoint

CREATE POLICY "device_sessions_tenant_isolation_update" ON "public"."device_sessions"
  AS PERMISSIVE FOR UPDATE TO authenticated
  USING ((tenant_id = ((auth.jwt() -> 'app_metadata'::text) ->> 'tenant_id'::text)))
  WITH CHECK ((tenant_id = ((auth.jwt() -> 'app_metadata'::text) ->> 'tenant_id'::text)));

--> statement-breakpoint

CREATE POLICY "device_sessions_tenant_isolation_delete" ON "public"."device_sessions"
  AS PERMISSIVE FOR DELETE TO authenticated
  USING ((tenant_id = ((auth.jwt() -> 'app_metadata'::text) ->> 'tenant_id'::text)));

--> statement-breakpoint

-- ─────────────────────────────────────────────────────────────────────────────
-- RPCs para el panel admin (service_role only)
-- ─────────────────────────────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION public.admin_active_devices_count()
RETURNS bigint
LANGUAGE plpgsql
SECURITY DEFINER
STABLE
AS $$
BEGIN
  RETURN (
    SELECT COUNT(DISTINCT device_id)
    FROM public.device_sessions
    WHERE last_seen >= NOW() - INTERVAL '5 minutes'
  );
END;
$$;

--> statement-breakpoint

CREATE OR REPLACE FUNCTION public.admin_devices_by_tenant()
RETURNS TABLE (
  tenant_id text,
  active_devices bigint,
  total_devices bigint,
  last_activity timestamptz
)
LANGUAGE plpgsql
SECURITY DEFINER
STABLE
AS $$
BEGIN
  RETURN QUERY
  SELECT
    t.id AS tenant_id,
    COUNT(DISTINCT CASE WHEN ds.last_seen >= NOW() - INTERVAL '5 minutes' THEN ds.device_id END)::bigint AS active_devices,
    COUNT(DISTINCT ds.device_id)::bigint AS total_devices,
    MAX(ds.last_seen) AS last_activity
  FROM public.tenants t
  LEFT JOIN public.device_sessions ds ON ds.tenant_id = t.id
  GROUP BY t.id
  ORDER BY t.name;
END;
$$;

--> statement-breakpoint

CREATE OR REPLACE FUNCTION public.admin_list_active_devices(p_tenant_id text DEFAULT NULL)
RETURNS TABLE (
  id text,
  tenant_id text,
  user_id text,
  device_id text,
  user_agent text,
  platform text,
  app_version text,
  last_seen timestamptz,
  first_seen timestamptz
)
LANGUAGE plpgsql
SECURITY DEFINER
STABLE
AS $$
BEGIN
  RETURN QUERY
  SELECT
    ds.id, ds.tenant_id, ds.user_id, ds.device_id,
    ds.user_agent, ds.platform, ds.app_version,
    ds.last_seen, ds.first_seen
  FROM public.device_sessions ds
  WHERE ds.last_seen >= NOW() - INTERVAL '5 minutes'
    AND (p_tenant_id IS NULL OR ds.tenant_id = p_tenant_id)
  ORDER BY ds.last_seen DESC;
END;
$$;

--> statement-breakpoint

REVOKE EXECUTE ON FUNCTION public.admin_active_devices_count() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.admin_active_devices_count() TO service_role;

REVOKE EXECUTE ON FUNCTION public.admin_devices_by_tenant() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.admin_devices_by_tenant() TO service_role;

REVOKE EXECUTE ON FUNCTION public.admin_list_active_devices(text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.admin_list_active_devices(text) TO service_role;