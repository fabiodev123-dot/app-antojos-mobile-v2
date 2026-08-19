-- =============================================================================
-- Migration 0006: Admin Revenue RPCs (sums pedidos + ventas_rapidas)
-- =============================================================================
-- SECURITY DEFINER functions exposed only to service_role.
-- Devuelven revenue agregado por período (today / 7d / 30d / total),
-- separando lo que viene de pedidos (entregado/listo) vs ventas_rapidas.
-- =============================================================================

-- ─────────────────────────────────────────────────────────────────────────────
-- 1. admin_global_revenue — suma TODOS los tenants
-- ─────────────────────────────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION public.admin_global_revenue()
RETURNS TABLE (
  revenue_today numeric,
  revenue_7d numeric,
  revenue_30d numeric,
  revenue_total numeric,
  ventas_rapidas_today numeric,
  ventas_rapidas_7d numeric,
  ventas_rapidas_30d numeric,
  ventas_rapidas_total numeric
)
LANGUAGE plpgsql
SECURITY DEFINER
STABLE
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
  FROM public.pedidos p
  WHERE p.estado IN ('entregado', 'listo');
END;
$$;

-- ─────────────────────────────────────────────────────────────────────────────
-- 2. admin_tenant_revenue — suma UN tenant específico
-- ─────────────────────────────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION public.admin_tenant_revenue(p_tenant_id text)
RETURNS TABLE (
  revenue_today numeric,
  revenue_7d numeric,
  revenue_30d numeric,
  revenue_total numeric,
  ventas_rapidas_today numeric,
  ventas_rapidas_7d numeric,
  ventas_rapidas_30d numeric,
  ventas_rapidas_total numeric
)
LANGUAGE plpgsql
SECURITY DEFINER
STABLE
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
  FROM public.pedidos p
  WHERE p.tenant_id = p_tenant_id AND p.estado IN ('entregado', 'listo');
END;
$$;

-- ─────────────────────────────────────────────────────────────────────────────
-- 3. Permisos — solo service_role
-- ─────────────────────────────────────────────────────────────────────────────

REVOKE EXECUTE ON FUNCTION public.admin_global_revenue() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.admin_global_revenue() TO service_role;

REVOKE EXECUTE ON FUNCTION public.admin_tenant_revenue(text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.admin_tenant_revenue(text) TO service_role;