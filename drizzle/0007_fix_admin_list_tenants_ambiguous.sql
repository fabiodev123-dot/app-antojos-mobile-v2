-- =============================================================================
-- Migration 0007: Fix ambiguous `created_at` in admin_list_tenants_with_stats
-- =============================================================================
-- Bug: la RPC `admin_list_tenants_with_stats` (creada en 0003) tenía subqueries
-- que referenciaban `tenant_id` y `created_at` sin calificar con el alias de
-- tabla. Combinado con RETURNS TABLE que define columnas llamadas `created_at`
-- y `updated_at`, Postgres no podía resolver a qué columna se refería y tiraba
-- `column reference "created_at" is ambiguous` al ejecutarla via service_role
-- (no tira error al ejecutar la query directo sin RETURNS TABLE).
--
-- Fix: calificar todas las columnas de las subqueries con el alias de tabla
-- (`tu.tenant_id`, `p.tenant_id`, `p.fecha`, `p.created_at`).
--
-- Idempotente: usa CREATE OR REPLACE FUNCTION.
-- =============================================================================

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
    SELECT tu.tenant_id, COUNT(*) AS user_count
    FROM public.tenant_users tu
    GROUP BY tu.tenant_id
  ) uc ON uc.tenant_id = t.id
  LEFT JOIN (
    SELECT p.tenant_id, COUNT(*) AS today_orders
    FROM public.pedidos p
    WHERE p.fecha = CURRENT_DATE
    GROUP BY p.tenant_id
  ) tod ON tod.tenant_id = t.id
  LEFT JOIN (
    SELECT p.tenant_id, MAX(p.created_at) AS last_activity
    FROM public.pedidos p
    GROUP BY p.tenant_id
  ) la ON la.tenant_id = t.id
  ORDER BY t.name;
END;
$$;