-- =============================================================================
-- ALL MIGRATIONS — emergency consolidated SQL
-- Generated from drizzle/0001..0011
-- Run this in Supabase Studio → SQL Editor → New query
-- Idempotent: tablas usan IF NOT EXISTS, funciones CREATE OR REPLACE
-- =============================================================================

-- =============================================================================
-- 0001: tenants + tenant_users + super_admins (foundation)
-- =============================================================================
CREATE TYPE "public"."tenant_status" AS ENUM('active', 'trial', 'suspended');
CREATE TYPE "public"."tenant_plan" AS ENUM('free', 'basic', 'pro');
CREATE TYPE "public"."tenant_user_role" AS ENUM('admin', 'operador');

CREATE TABLE IF NOT EXISTS "tenants" (
  "id" text PRIMARY KEY NOT NULL,
  "slug" text NOT NULL UNIQUE,
  "name" text NOT NULL,
  "status" "tenant_status" DEFAULT 'trial' NOT NULL,
  "plan" "tenant_plan" DEFAULT 'free' NOT NULL,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
CREATE INDEX IF NOT EXISTS "tenants_slug_idx" ON "tenants" ("slug");
CREATE INDEX IF NOT EXISTS "tenants_status_idx" ON "tenants" ("status");

CREATE TABLE IF NOT EXISTS "super_admins" (
  "id" uuid PRIMARY KEY NOT NULL,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  CONSTRAINT "super_admins_id_auth_users_id_fk" FOREIGN KEY ("id") REFERENCES "auth"."users"("id") ON DELETE cascade
);

CREATE TABLE IF NOT EXISTS "tenant_users" (
  "id" text PRIMARY KEY NOT NULL,
  "tenant_id" text NOT NULL,
  "user_id" uuid NOT NULL,
  "role" "tenant_user_role" DEFAULT 'operador' NOT NULL,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "updated_at" timestamp with time zone DEFAULT now() NOT NULL,
  CONSTRAINT "tenant_users_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE cascade,
  CONSTRAINT "tenant_users_user_id_auth_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE cascade
);
CREATE UNIQUE INDEX IF NOT EXISTS "tenant_users_tenant_user_unq" ON "tenant_users" ("tenant_id","user_id");
CREATE INDEX IF NOT EXISTS "tenant_users_user_idx" ON "tenant_users" ("user_id");

CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS "tenants_set_updated_at" ON "public"."tenants";
CREATE TRIGGER "tenants_set_updated_at" BEFORE UPDATE ON "public"."tenants" FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
DROP TRIGGER IF EXISTS "tenant_users_set_updated_at" ON "public"."tenant_users";
CREATE TRIGGER "tenant_users_set_updated_at" BEFORE UPDATE ON "public"."tenant_users" FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

ALTER TABLE "public"."tenants" DISABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."super_admins" DISABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."tenant_users" DISABLE ROW LEVEL SECURITY;

-- =============================================================================
-- 0002: tenant_id en pedidos
-- =============================================================================
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'pedidos' AND column_name = 'tenant_id'
  ) THEN
    ALTER TABLE "public"."pedidos" ADD COLUMN "tenant_id" text;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'pedidos_tenant_id_tenants_id_fk'
  ) THEN
    ALTER TABLE "public"."pedidos" ADD CONSTRAINT "pedidos_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE set null;
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS "pedidos_tenant_id_idx" ON "public"."pedidos" ("tenant_id");

DROP TRIGGER IF EXISTS "pedidos_set_updated_at" ON "public"."pedidos";
CREATE TRIGGER "pedidos_set_updated_at" BEFORE UPDATE ON "public"."pedidos" FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- =============================================================================
-- 0003: Admin RPCs (admin_list_tenants_with_stats, admin_global_stats)
-- =============================================================================
CREATE OR REPLACE FUNCTION public.admin_list_tenants_with_stats()
RETURNS TABLE (
  id text, slug text, name text,
  status public.tenant_status, plan public.tenant_plan,
  created_at timestamptz, updated_at timestamptz,
  user_count bigint, today_orders bigint, last_activity timestamptz
)
LANGUAGE plpgsql SECURITY DEFINER STABLE
AS $$
BEGIN
  RETURN QUERY
  SELECT
    t.id, t.slug, t.name, t.status, t.plan,
    t.created_at, t.updated_at,
    COALESCE(uc.user_count, 0)::bigint,
    COALESCE(tod.today_orders, 0)::bigint,
    la.last_activity
  FROM public.tenants t
  LEFT JOIN (SELECT tenant_id, COUNT(*) AS user_count FROM public.tenant_users GROUP BY tenant_id) uc ON uc.tenant_id = t.id
  LEFT JOIN (SELECT tenant_id, COUNT(*) AS today_orders FROM public.pedidos WHERE fecha = CURRENT_DATE GROUP BY tenant_id) tod ON tod.tenant_id = t.id
  LEFT JOIN (SELECT tenant_id, MAX(created_at) AS last_activity FROM public.pedidos GROUP BY tenant_id) la ON la.tenant_id = t.id
  ORDER BY t.name;
END;
$$;

CREATE OR REPLACE FUNCTION public.admin_global_stats()
RETURNS TABLE (
  total_tenants bigint, active_tenants bigint, trial_tenants bigint, suspended_tenants bigint,
  total_users bigint, total_orders_today bigint, total_orders_this_week bigint, active_users_this_week bigint
)
LANGUAGE plpgsql SECURITY DEFINER STABLE
AS $$
BEGIN
  RETURN QUERY
  SELECT
    (SELECT COUNT(*) FROM public.tenants)::bigint,
    (SELECT COUNT(*) FROM public.tenants WHERE status = 'active')::bigint,
    (SELECT COUNT(*) FROM public.tenants WHERE status = 'trial')::bigint,
    (SELECT COUNT(*) FROM public.tenants WHERE status = 'suspended')::bigint,
    (SELECT COUNT(*) FROM public.tenant_users)::bigint,
    (SELECT COUNT(*) FROM public.pedidos WHERE fecha = CURRENT_DATE)::bigint,
    (SELECT COUNT(*) FROM public.pedidos WHERE fecha >= CURRENT_DATE - INTERVAL '6 days')::bigint,
    (SELECT COUNT(DISTINCT tenant_id) FROM public.pedidos WHERE created_at >= NOW() - INTERVAL '6 days')::bigint;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.admin_list_tenants_with_stats() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.admin_list_tenants_with_stats() TO service_role;
REVOKE EXECUTE ON FUNCTION public.admin_global_stats() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.admin_global_stats() TO service_role;

-- =============================================================================
-- 0004: ventas_rapidas
-- =============================================================================
CREATE TABLE IF NOT EXISTS "public"."ventas_rapidas" (
  "id" text PRIMARY KEY NOT NULL,
  "fecha" date NOT NULL,
  "hora" text NOT NULL,
  "monto" numeric(10, 2) NOT NULL,
  "nota" text,
  "tenant_id" text NOT NULL,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "updated_at" timestamp with time zone DEFAULT now() NOT NULL
);

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'ventas_rapidas_tenant_id_tenants_id_fk'
  ) THEN
    ALTER TABLE "public"."ventas_rapidas" ADD CONSTRAINT "ventas_rapidas_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE CASCADE;
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS "ventas_rapidas_tenant_fecha_idx" ON "public"."ventas_rapidas" ("tenant_id","fecha");
CREATE INDEX IF NOT EXISTS "ventas_rapidas_tenant_created_at_idx" ON "public"."ventas_rapidas" ("tenant_id","created_at" DESC);

ALTER TABLE "public"."ventas_rapidas" ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "ventas_rapidas_tenant_isolation_select" ON "public"."ventas_rapidas";
CREATE POLICY "ventas_rapidas_tenant_isolation_select" ON "public"."ventas_rapidas" AS PERMISSIVE FOR SELECT TO authenticated USING ((tenant_id = ((auth.jwt() -> 'app_metadata'::text) ->> 'tenant_id'::text)));
DROP POLICY IF EXISTS "ventas_rapidas_tenant_isolation_insert" ON "public"."ventas_rapidas";
CREATE POLICY "ventas_rapidas_tenant_isolation_insert" ON "public"."ventas_rapidas" AS PERMISSIVE FOR INSERT TO authenticated WITH CHECK ((tenant_id = ((auth.jwt() -> 'app_metadata'::text) ->> 'tenant_id'::text)));
DROP POLICY IF EXISTS "ventas_rapidas_tenant_isolation_update" ON "public"."ventas_rapidas";
CREATE POLICY "ventas_rapidas_tenant_isolation_update" ON "public"."ventas_rapidas" AS PERMISSIVE FOR UPDATE TO authenticated USING ((tenant_id = ((auth.jwt() -> 'app_metadata'::text) ->> 'tenant_id'::text))) WITH CHECK ((tenant_id = ((auth.jwt() -> 'app_metadata'::text) ->> 'tenant_id'::text)));
DROP POLICY IF EXISTS "ventas_rapidas_tenant_isolation_delete" ON "public"."ventas_rapidas";
CREATE POLICY "ventas_rapidas_tenant_isolation_delete" ON "public"."ventas_rapidas" AS PERMISSIVE FOR DELETE TO authenticated USING ((tenant_id = ((auth.jwt() -> 'app_metadata'::text) ->> 'tenant_id'::text)));

-- =============================================================================
-- 0005: Enable RLS on tenants + super_admins
-- =============================================================================
ALTER TABLE public.tenants ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS tenants_select_own ON public.tenants;
CREATE POLICY tenants_select_own ON public.tenants AS PERMISSIVE FOR SELECT TO authenticated USING (id = ((auth.jwt() -> 'app_metadata'::text) ->> 'tenant_id'::text));

ALTER TABLE public.super_admins ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS super_admins_select_own ON public.super_admins;
CREATE POLICY super_admins_select_own ON public.super_admins AS PERMISSIVE FOR SELECT TO authenticated USING (user_id = auth.uid());

-- =============================================================================
-- 0006: Admin revenue RPCs
-- =============================================================================
CREATE OR REPLACE FUNCTION public.admin_global_revenue()
RETURNS TABLE (
  revenue_today numeric, revenue_7d numeric, revenue_30d numeric, revenue_total numeric,
  ventas_rapidas_today numeric, ventas_rapidas_7d numeric, ventas_rapidas_30d numeric, ventas_rapidas_total numeric
)
LANGUAGE plpgsql SECURITY DEFINER STABLE
AS $$
BEGIN
  RETURN QUERY
  SELECT
    COALESCE(SUM(CASE WHEN p.fecha = CURRENT_DATE THEN p.total ELSE 0 END), 0)::numeric,
    COALESCE(SUM(CASE WHEN p.fecha >= CURRENT_DATE - INTERVAL '6 days' THEN p.total ELSE 0 END), 0)::numeric,
    COALESCE(SUM(CASE WHEN p.fecha >= CURRENT_DATE - INTERVAL '29 days' THEN p.total ELSE 0 END), 0)::numeric,
    COALESCE(SUM(p.total), 0)::numeric,
    COALESCE((SELECT SUM(monto) FROM public.ventas_rapidas WHERE fecha = CURRENT_DATE), 0)::numeric,
    COALESCE((SELECT SUM(monto) FROM public.ventas_rapidas WHERE fecha >= CURRENT_DATE - INTERVAL '6 days'), 0)::numeric,
    COALESCE((SELECT SUM(monto) FROM public.ventas_rapidas WHERE fecha >= CURRENT_DATE - INTERVAL '29 days'), 0)::numeric,
    COALESCE((SELECT SUM(monto) FROM public.ventas_rapidas), 0)::numeric
  FROM public.pedidos p WHERE p.estado IN ('entregado', 'listo');
END;
$$;

CREATE OR REPLACE FUNCTION public.admin_tenant_revenue(p_tenant_id text)
RETURNS TABLE (
  revenue_today numeric, revenue_7d numeric, revenue_30d numeric, revenue_total numeric,
  ventas_rapidas_today numeric, ventas_rapidas_7d numeric, ventas_rapidas_30d numeric, ventas_rapidas_total numeric
)
LANGUAGE plpgsql SECURITY DEFINER STABLE
AS $$
BEGIN
  RETURN QUERY
  SELECT
    COALESCE(SUM(CASE WHEN p.fecha = CURRENT_DATE THEN p.total ELSE 0 END), 0)::numeric,
    COALESCE(SUM(CASE WHEN p.fecha >= CURRENT_DATE - INTERVAL '6 days' THEN p.total ELSE 0 END), 0)::numeric,
    COALESCE(SUM(CASE WHEN p.fecha >= CURRENT_DATE - INTERVAL '29 days' THEN p.total ELSE 0 END), 0)::numeric,
    COALESCE(SUM(p.total), 0)::numeric,
    COALESCE((SELECT SUM(monto) FROM public.ventas_rapidas WHERE tenant_id = p_tenant_id AND fecha = CURRENT_DATE), 0)::numeric,
    COALESCE((SELECT SUM(monto) FROM public.ventas_rapidas WHERE tenant_id = p_tenant_id AND fecha >= CURRENT_DATE - INTERVAL '6 days'), 0)::numeric,
    COALESCE((SELECT SUM(monto) FROM public.ventas_rapidas WHERE tenant_id = p_tenant_id AND fecha >= CURRENT_DATE - INTERVAL '29 days'), 0)::numeric,
    COALESCE((SELECT SUM(monto) FROM public.ventas_rapidas WHERE tenant_id = p_tenant_id), 0)::numeric
  FROM public.pedidos p WHERE p.tenant_id = p_tenant_id AND p.estado IN ('entregado', 'listo');
END;
$$;

REVOKE EXECUTE ON FUNCTION public.admin_global_revenue() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.admin_global_revenue() TO service_role;
REVOKE EXECUTE ON FUNCTION public.admin_tenant_revenue(text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.admin_tenant_revenue(text) TO service_role;

-- =============================================================================
-- 0008: admin_revenue_trend
-- =============================================================================
CREATE OR REPLACE FUNCTION public.admin_revenue_trend(p_days int DEFAULT 30)
RETURNS TABLE (fecha date, pedidos_total numeric, ventas_rapidas_total numeric)
LANGUAGE plpgsql SECURITY DEFINER STABLE
AS $$
DECLARE v_start_date date;
BEGIN
  v_start_date := CURRENT_DATE - (p_days - 1);
  RETURN QUERY
  WITH dates AS (
    SELECT generate_series(v_start_date, CURRENT_DATE, '1 day'::interval)::date AS fecha
  ),
  pedidos_agg AS (
    SELECT p.fecha, COALESCE(SUM(p.total), 0)::numeric AS pedidos_total
    FROM public.pedidos p WHERE p.fecha >= v_start_date AND p.estado IN ('entregado', 'listo')
    GROUP BY p.fecha
  ),
  ventas_rapidas_agg AS (
    SELECT vr.fecha, COALESCE(SUM(vr.monto), 0)::numeric AS ventas_rapidas_total
    FROM public.ventas_rapidas vr WHERE vr.fecha >= v_start_date
    GROUP BY vr.fecha
  )
  SELECT d.fecha,
    COALESCE(pa.pedidos_total, 0)::numeric,
    COALESCE(vra.ventas_rapidas_total, 0)::numeric
  FROM dates d
  LEFT JOIN pedidos_agg pa ON pa.fecha = d.fecha
  LEFT JOIN ventas_rapidas_agg vra ON vra.fecha = d.fecha
  ORDER BY d.fecha;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.admin_revenue_trend(int) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.admin_revenue_trend(int) TO service_role;

-- =============================================================================
-- 0009: device_sessions + admin RPCs
-- =============================================================================
CREATE TABLE IF NOT EXISTS "public"."device_sessions" (
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

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'device_sessions_tenant_id_tenants_id_fk'
  ) THEN
    ALTER TABLE "public"."device_sessions" ADD CONSTRAINT "device_sessions_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE CASCADE;
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS "device_sessions_tenant_idx" ON "public"."device_sessions" ("tenant_id");
CREATE INDEX IF NOT EXISTS "device_sessions_last_seen_idx" ON "public"."device_sessions" ("last_seen" DESC);
CREATE INDEX IF NOT EXISTS "device_sessions_tenant_last_seen_idx" ON "public"."device_sessions" ("tenant_id","last_seen" DESC);

ALTER TABLE "public"."device_sessions" ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "device_sessions_tenant_isolation_select" ON "public"."device_sessions";
CREATE POLICY "device_sessions_tenant_isolation_select" ON "public"."device_sessions" AS PERMISSIVE FOR SELECT TO authenticated USING ((tenant_id = ((auth.jwt() -> 'app_metadata'::text) ->> 'tenant_id'::text)));
DROP POLICY IF EXISTS "device_sessions_tenant_isolation_insert" ON "public"."device_sessions";
CREATE POLICY "device_sessions_tenant_isolation_insert" ON "public"."device_sessions" AS PERMISSIVE FOR INSERT TO authenticated WITH CHECK ((tenant_id = ((auth.jwt() -> 'app_metadata'::text) ->> 'tenant_id'::text)));
DROP POLICY IF EXISTS "device_sessions_tenant_isolation_update" ON "public"."device_sessions";
CREATE POLICY "device_sessions_tenant_isolation_update" ON "public"."device_sessions" AS PERMISSIVE FOR UPDATE TO authenticated USING ((tenant_id = ((auth.jwt() -> 'app_metadata'::text) ->> 'tenant_id'::text))) WITH CHECK ((tenant_id = ((auth.jwt() -> 'app_metadata'::text) ->> 'tenant_id'::text)));
DROP POLICY IF EXISTS "device_sessions_tenant_isolation_delete" ON "public"."device_sessions";
CREATE POLICY "device_sessions_tenant_isolation_delete" ON "public"."device_sessions" AS PERMISSIVE FOR DELETE TO authenticated USING ((tenant_id = ((auth.jwt() -> 'app_metadata'::text) ->> 'tenant_id'::text)));

CREATE OR REPLACE FUNCTION public.admin_active_devices_count() RETURNS bigint
LANGUAGE plpgsql SECURITY DEFINER STABLE
AS $$
BEGIN
  RETURN (SELECT COUNT(DISTINCT device_id) FROM public.device_sessions WHERE last_seen >= NOW() - INTERVAL '5 minutes');
END;
$$;

CREATE OR REPLACE FUNCTION public.admin_devices_by_tenant()
RETURNS TABLE (tenant_id text, active_devices bigint, total_devices bigint, last_activity timestamptz)
LANGUAGE plpgsql SECURITY DEFINER STABLE
AS $$
BEGIN
  RETURN QUERY
  SELECT t.id AS tenant_id,
    COUNT(DISTINCT CASE WHEN ds.last_seen >= NOW() - INTERVAL '5 minutes' THEN ds.device_id END)::bigint AS active_devices,
    COUNT(DISTINCT ds.device_id)::bigint AS total_devices,
    MAX(ds.last_seen) AS last_activity
  FROM public.tenants t
  LEFT JOIN public.device_sessions ds ON ds.tenant_id = t.id
  GROUP BY t.id ORDER BY t.name;
END;
$$;

CREATE OR REPLACE FUNCTION public.admin_list_active_devices(p_tenant_id text DEFAULT NULL)
RETURNS TABLE (id text, tenant_id text, user_id text, device_id text, user_agent text, platform text, app_version text, last_seen timestamptz, first_seen timestamptz)
LANGUAGE plpgsql SECURITY DEFINER STABLE
AS $$
BEGIN
  RETURN QUERY
  SELECT ds.id, ds.tenant_id, ds.user_id, ds.device_id, ds.user_agent, ds.platform, ds.app_version, ds.last_seen, ds.first_seen
  FROM public.device_sessions ds
  WHERE ds.last_seen >= NOW() - INTERVAL '5 minutes' AND (p_tenant_id IS NULL OR ds.tenant_id = p_tenant_id)
  ORDER BY ds.last_seen DESC;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.admin_active_devices_count() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.admin_active_devices_count() TO service_role;
REVOKE EXECUTE ON FUNCTION public.admin_devices_by_tenant() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.admin_devices_by_tenant() TO service_role;
REVOKE EXECUTE ON FUNCTION public.admin_list_active_devices(text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.admin_list_active_devices(text) TO service_role;

-- =============================================================================
-- 0010: admin_recent_activity
-- =============================================================================
CREATE OR REPLACE FUNCTION public.admin_recent_activity(p_limit int DEFAULT 10)
RETURNS TABLE (ts timestamptz, event_type text, tenant_id text, description text, amount numeric)
LANGUAGE plpgsql SECURITY DEFINER STABLE
AS $$
BEGIN
  RETURN QUERY
  WITH combined AS (
    SELECT p.created_at AS ts, 'pedido'::text AS event_type, p.tenant_id,
      ('Pedido #' || p.numero || ' · ' || p.nombre_cliente)::text AS description,
      p.total AS amount
    FROM public.pedidos p WHERE p.estado IN ('entregado', 'listo')
    UNION ALL
    SELECT vr.created_at AS ts, 'venta_rapida'::text AS event_type, vr.tenant_id,
      ('Venta rápida' || CASE WHEN vr.nota IS NOT NULL THEN ' · ' || vr.nota ELSE '' END)::text AS description,
      vr.monto AS amount
    FROM public.ventas_rapidas vr
  )
  SELECT c.ts, c.event_type, c.tenant_id, c.description, c.amount
  FROM combined c ORDER BY c.ts DESC LIMIT p_limit;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.admin_recent_activity(int) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.admin_recent_activity(int) TO service_role;

-- =============================================================================
-- 0011: admin_audit_log + admin_audit_log_recent
-- =============================================================================
CREATE TABLE IF NOT EXISTS "public"."admin_audit_log" (
  "id" text PRIMARY KEY NOT NULL,
  "super_admin_id" text NOT NULL,
  "super_admin_email" text NOT NULL,
  "action" text NOT NULL,
  "target_type" text NOT NULL,
  "target_id" text,
  "target_label" text,
  "metadata" jsonb,
  "created_at" timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS "admin_audit_log_created_at_idx" ON "public"."admin_audit_log" ("created_at" DESC);

ALTER TABLE "public"."admin_audit_log" ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "admin_audit_log_service_role_all" ON "public"."admin_audit_log";
CREATE POLICY "admin_audit_log_service_role_all" ON "public"."admin_audit_log" AS PERMISSIVE FOR ALL TO service_role USING (true) WITH CHECK (true);

CREATE OR REPLACE FUNCTION public.admin_audit_log_recent(p_limit int DEFAULT 20)
RETURNS TABLE (id text, super_admin_email text, action text, target_type text, target_id text, target_label text, metadata jsonb, created_at timestamptz)
LANGUAGE plpgsql SECURITY DEFINER STABLE
AS $$
BEGIN
  RETURN QUERY
  SELECT l.id, l.super_admin_email, l.action, l.target_type, l.target_id, l.target_label, l.metadata, l.created_at
  FROM public.admin_audit_log l ORDER BY l.created_at DESC LIMIT p_limit;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.admin_audit_log_recent(int) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.admin_audit_log_recent(int) TO service_role;

-- =============================================================================
-- DONE. All migrations applied.
-- =============================================================================
