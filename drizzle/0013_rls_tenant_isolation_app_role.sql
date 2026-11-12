-- =============================================================================
-- Migration 0013: aislamiento de tenants a nivel de base de datos (L4)
-- =============================================================================
-- PROBLEMA
-- -------
-- Las policies RLS ya existían, pero comparaban contra
--   auth.jwt() -> 'app_metadata' ->> 'tenant_id'
-- que sólo existe cuando la request pasa por PostgREST (Supabase REST).
--
-- La app (Next.js) NO usa PostgREST: conecta directo a Postgres con
-- DATABASE_URL. En esa conexión no hay JWT de Supabase Auth, así que
-- auth.jwt() devolvía NULL y las policies no aplicaban.
--
-- Peor: DATABASE_URL usaba el rol `postgres`, que es owner de las tablas y
-- tiene rolbypassrls = true → las policies NO se aplicaban para nada.
-- El aislamiento dependía al 100% del filtrado en código de aplicación.
--
-- SOLUCIÓN
-- --------
-- 1. `get_user_tenant_id()` ahora resuelve el tenant desde el GUC de
--    sesión `app.tenant_id` (seteable con SET LOCAL por transacción) y usa
--    el JWT como fallback. Así la misma función sirve para PostgREST y para
--    la conexión directa de la app.
--
--    El sentinel '__none__' significa "esta conexión no fijó tenant".
--
-- 2. Las policies de las 11 tablas de dominio pasan a usar
--    get_user_tenant_id() e incluyen al rol `antojos_app`.
--
-- 3. Se crea el rol `antojos_app` SIN BYPASSRLS con los GRANTs mínimos.
--    La app debe conectarse con este rol (ver src/lib/db/index.ts).
--
-- RESULTADO
-- ---------
-- Doble capa: el filtro por tenant vive en el código (src/lib/auth/
-- tenant-scope.ts) Y en la base. Un endpoint nuevo que olvide el filtro
-- queda frenado por la base de datos.
--
-- IDEMPOTENTE: se puede correr las veces que haga falta.
-- =============================================================================

-- ─────────────────────────────────────────────────────────────────────────────
-- 1. Función de resolución del tenant
-- ─────────────────────────────────────────────────────────────────────────────
-- Prioridad:
--   1. GUC app.tenant_id (conexión de la app, seteado por transacción)
--   2. app_metadata.tenant_id del JWT (PostgREST / Supabase Auth)
--
-- Si no hay ninguno → NULL → las policies no matchean → 0 filas (fail closed).

CREATE OR REPLACE FUNCTION public.get_user_tenant_id()
RETURNS text
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $function$
  SELECT coalesce(
    nullif(current_setting('app.tenant_id', true), '__none__'),
    nullif(current_setting('app.tenant_id', true), ''),
    (auth.jwt() -> 'app_metadata' ->> 'tenant_id')
  )
$function$;

-- ─────────────────────────────────────────────────────────────────────────────
-- 2. Rol de la app (sin BYPASSRLS)
-- ─────────────────────────────────────────────────────────────────────────────
-- El password NO va en el repo: se setea con
--   ALTER ROLE antojos_app LOGIN PASSWORD '<valor>';
-- o via la env var APP_ROLE_PASSWORD en el despliegue.
--
-- La app se conecta como `antojos_app.<PROJECT_REF>` a través del pooler
-- (Supabase exige ese formato para roles custom).

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'antojos_app') THEN
    CREATE ROLE antojos_app NOLOGIN NOSUPERUSER NOBYPASSRLS NOINHERIT;
  END IF;
  -- Garantizar que el rol nunca bypassa RLS, aunque alguien lo modifique.
  ALTER ROLE antojos_app NOSUPERUSER NOBYPASSRLS;
END $$;

-- ─────────────────────────────────────────────────────────────────────────────
-- 3. GRANTs mínimos
-- ─────────────────────────────────────────────────────────────────────────────
-- DML completo en las tablas de dominio (la app las lee y escribe).
-- SELECT en tenants/tenant_users para resolver el tenant del usuario.
-- Las funciones admin_* son SECURITY DEFINER: se ejecutan con los permisos
-- del owner, así que el rol restringido puede llamarlas sin permiso extra.

GRANT USAGE ON SCHEMA public TO antojos_app;

GRANT SELECT, INSERT, UPDATE, DELETE ON
  categorias, productos, ingredientes, recetas, ventas_rapidas,
  clientes, pedidos, pedido_items, movimientos_stock, gastos, cierres_diarios
TO antojos_app;

GRANT SELECT ON tenants, tenant_users TO antojos_app;

GRANT EXECUTE ON FUNCTION public.get_user_tenant_id() TO antojos_app;

-- ─────────────────────────────────────────────────────────────────────────────
-- 4. Policies de aislamiento por tenant (11 tablas de dominio)
-- ─────────────────────────────────────────────────────────────────────────────
-- Reemplazan las policies que leían auth.jwt() directo.
-- Ahora se resuelven vía get_user_tenant_id(), que funciona para
-- PostgREST (JWT) y para la app (GUC de sesión).

DO $$
DECLARE
  t text;
  tablas text[] := ARRAY[
    'categorias','productos','ingredientes','recetas','ventas_rapidas',
    'clientes','pedidos','pedido_items','movimientos_stock','gastos','cierres_diarios'
  ];
BEGIN
  FOREACH t IN ARRAY tablas LOOP
    -- SELECT
    EXECUTE format('DROP POLICY IF EXISTS tenant_isolation_select ON public.%I', t);
    EXECUTE format(
      'CREATE POLICY tenant_isolation_select ON public.%I
         AS PERMISSIVE FOR SELECT TO authenticated, antojos_app
         USING (tenant_id = get_user_tenant_id())', t);

    -- INSERT
    EXECUTE format('DROP POLICY IF EXISTS tenant_isolation_insert ON public.%I', t);
    EXECUTE format(
      'CREATE POLICY tenant_isolation_insert ON public.%I
         AS PERMISSIVE FOR INSERT TO authenticated, antojos_app
         WITH CHECK (tenant_id = get_user_tenant_id())', t);

    -- UPDATE
    EXECUTE format('DROP POLICY IF EXISTS tenant_isolation_update ON public.%I', t);
    EXECUTE format(
      'CREATE POLICY tenant_isolation_update ON public.%I
         AS PERMISSIVE FOR UPDATE TO authenticated, antojos_app
         USING (tenant_id = get_user_tenant_id())
         WITH CHECK (tenant_id = get_user_tenant_id())', t);

    -- DELETE
    EXECUTE format('DROP POLICY IF EXISTS tenant_isolation_delete ON public.%I', t);
    EXECUTE format(
      'CREATE POLICY tenant_isolation_delete ON public.%I
         AS PERMISSIVE FOR DELETE TO authenticated, antojos_app
         USING (tenant_id = get_user_tenant_id())', t);
  END LOOP;
END $$;

-- ─────────────────────────────────────────────────────────────────────────────
-- 5. Limpieza de policies obsoletas
-- ─────────────────────────────────────────────────────────────────────────────
-- ventas_rapidas tenía policies viejas (ventas_rapidas_tenant_isolation_*)
-- que leían auth.jwt() directo y quedaban duplicadas con las nuevas.

DROP POLICY IF EXISTS ventas_rapidas_tenant_isolation_select ON public.ventas_rapidas;
DROP POLICY IF EXISTS ventas_rapidas_tenant_isolation_insert ON public.ventas_rapidas;
DROP POLICY IF EXISTS ventas_rapidas_tenant_isolation_update ON public.ventas_rapidas;
DROP POLICY IF EXISTS ventas_rapidas_tenant_isolation_delete ON public.ventas_rapidas;

-- device_sessions mantiene su policy propia (no usa tenant_id directo).

-- ─────────────────────────────────────────────────────────────────────────────
-- 6. Verificación
-- ─────────────────────────────────────────────────────────────────────────────
-- Comprobar que las 11 tablas tienen exactamente 4 policies y que el rol
-- no bypassa RLS:
--
--   SELECT tablename, count(*) FROM pg_policies
--   WHERE schemaname='public' AND tablename IN (...) GROUP BY tablename;
--
--   SELECT rolname, rolbypassrls FROM pg_roles WHERE rolname='antojos_app';
