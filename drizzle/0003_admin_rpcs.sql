-- =============================================================================
-- Migration 0003: Admin RPC functions (Super Admin Panel)
-- =============================================================================
-- Funciones SECURITY DEFINER que devuelven stats agregadas para el panel.
-- Solo accesibles por service_role (super admin).
-- =============================================================================

-- ─────────────────────────────────────────────────────────────────────────────
-- 1. admin_list_tenants_with_stats
-- Devuelve todos los tenants + user_count + today_orders + last_activity
-- ─────────────────────────────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION public.admin_list_tenants_with_stats()
RETURNS TABLE (
  id text,
  slug text,
  name text,
  status public.tenant_status,
  plan public.tenant_plan,
  created_at timestamptz,
  updated_at timestamptz,
  user_count bigint,
  today_orders bigint,
  last_activity timestamptz
)
LANGUAGE plpgsql
SECURITY DEFINER
STABLE
AS $$
BEGIN
  RETURN QUERY
  SELECT
    t.id,
    t.slug,
    t.name,
    t.status,
    t.plan,
    t.created_at,
    t.updated_at,
    COALESCE(uc.user_count, 0)::bigint AS user_count,
    COALESCE(tod.today_orders, 0)::bigint AS today_orders,
    la.last_activity
  FROM public.tenants t
  LEFT JOIN (
    SELECT tenant_id, COUNT(*) AS user_count
    FROM public.tenant_users
    GROUP BY tenant_id
  ) uc ON uc.tenant_id = t.id
  LEFT JOIN (
    SELECT tenant_id, COUNT(*) AS today_orders
    FROM public.pedidos
    WHERE fecha = CURRENT_DATE
    GROUP BY tenant_id
  ) tod ON tod.tenant_id = t.id
  LEFT JOIN (
    SELECT tenant_id, MAX(created_at) AS last_activity
    FROM public.pedidos
    GROUP BY tenant_id
  ) la ON la.tenant_id = t.id
  ORDER BY t.name;
END;
$$;

-- ─────────────────────────────────────────────────────────────────────────────
-- 2. admin_global_stats
-- Stats agregadas para los KPIs del panel
-- ─────────────────────────────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION public.admin_global_stats()
RETURNS TABLE (
  total_tenants bigint,
  active_tenants bigint,
  trial_tenants bigint,
  suspended_tenants bigint,
  total_users bigint,
  total_orders_today bigint,
  total_orders_this_week bigint,
  active_users_this_week bigint
)
LANGUAGE plpgsql
SECURITY DEFINER
STABLE
AS $$
BEGIN
  RETURN QUERY
  SELECT
    (SELECT COUNT(*) FROM public.tenants)::bigint AS total_tenants,
    (SELECT COUNT(*) FROM public.tenants WHERE status = 'active')::bigint AS active_tenants,
    (SELECT COUNT(*) FROM public.tenants WHERE status = 'trial')::bigint AS trial_tenants,
    (SELECT COUNT(*) FROM public.tenants WHERE status = 'suspended')::bigint AS suspended_tenants,
    (SELECT COUNT(*) FROM public.tenant_users)::bigint AS total_users,
    (SELECT COUNT(*) FROM public.pedidos WHERE fecha = CURRENT_DATE)::bigint AS total_orders_today,
    (SELECT COUNT(*) FROM public.pedidos WHERE fecha >= CURRENT_DATE - INTERVAL '6 days')::bigint AS total_orders_this_week,
    (
      SELECT COUNT(DISTINCT tenant_id)
      FROM public.pedidos
      WHERE created_at >= NOW() - INTERVAL '6 days'
    )::bigint AS active_users_this_week;
END;
$$;

-- ─────────────────────────────────────────────────────────────────────────────
-- 3. Permisos: solo service_role (que es lo que usa el super admin)
-- ─────────────────────────────────────────────────────────────────────────────

REVOKE EXECUTE ON FUNCTION public.admin_list_tenants_with_stats() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.admin_list_tenants_with_stats() TO service_role;

REVOKE EXECUTE ON FUNCTION public.admin_global_stats() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.admin_global_stats() TO service_role;
