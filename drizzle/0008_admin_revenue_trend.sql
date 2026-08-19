-- =============================================================================
-- Migration 0008: admin_revenue_trend RPC (daily series for last N days)
-- =============================================================================
-- SECURITY DEFINER. Genera una serie diaria con totales de pedidos
-- (entregado/listo) y ventas_rapidas, left-joinada a un calendario de N
-- días para que días sin ventas aparezcan como 0.
-- =============================================================================

CREATE OR REPLACE FUNCTION public.admin_revenue_trend(p_days int DEFAULT 30)
RETURNS TABLE (
  fecha date,
  pedidos_total numeric,
  ventas_rapidas_total numeric
)
LANGUAGE plpgsql
SECURITY DEFINER
STABLE
AS $$
DECLARE
  v_start_date date;
BEGIN
  v_start_date := CURRENT_DATE - (p_days - 1);

  RETURN QUERY
  WITH dates AS (
    SELECT generate_series(v_start_date, CURRENT_DATE, '1 day'::interval)::date AS fecha
  ),
  pedidos_agg AS (
    SELECT p.fecha, COALESCE(SUM(p.total), 0)::numeric AS pedidos_total
    FROM public.pedidos p
    WHERE p.fecha >= v_start_date
      AND p.estado IN ('entregado', 'listo')
    GROUP BY p.fecha
  ),
  ventas_rapidas_agg AS (
    SELECT vr.fecha, COALESCE(SUM(vr.monto), 0)::numeric AS ventas_rapidas_total
    FROM public.ventas_rapidas vr
    WHERE vr.fecha >= v_start_date
    GROUP BY vr.fecha
  )
  SELECT
    d.fecha,
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