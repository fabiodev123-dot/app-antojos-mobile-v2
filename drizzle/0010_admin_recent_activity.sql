-- =============================================================================
-- Migration 0010: admin_recent_activity RPC (combined event feed)
-- =============================================================================
-- SECURITY DEFINER. Unifica pedidos cerrados + ventas_rapidas en un feed
-- ordenado por timestamp, con tipo, tenant, descripción y monto.
-- =============================================================================

CREATE OR REPLACE FUNCTION public.admin_recent_activity(p_limit int DEFAULT 10)
RETURNS TABLE (
  ts timestamptz,
  event_type text,
  tenant_id text,
  description text,
  amount numeric
)
LANGUAGE plpgsql
SECURITY DEFINER
STABLE
AS $$
BEGIN
  RETURN QUERY
  WITH combined AS (
    SELECT
      p.created_at AS ts,
      'pedido'::text AS event_type,
      p.tenant_id,
      ('Pedido #' || p.numero || ' · ' || p.nombre_cliente)::text AS description,
      p.total AS amount
    FROM public.pedidos p
    WHERE p.estado IN ('entregado', 'listo')
    UNION ALL
    SELECT
      vr.created_at AS ts,
      'venta_rapida'::text AS event_type,
      vr.tenant_id,
      ('Venta rápida' || CASE WHEN vr.nota IS NOT NULL THEN ' · ' || vr.nota ELSE '' END)::text AS description,
      vr.monto AS amount
    FROM public.ventas_rapidas vr
  )
  SELECT c.ts, c.event_type, c.tenant_id, c.description, c.amount
  FROM combined c
  ORDER BY c.ts DESC
  LIMIT p_limit;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.admin_recent_activity(int) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.admin_recent_activity(int) TO service_role;