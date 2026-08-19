-- =============================================================================
-- Migration 0005: Enable RLS on tenants + super_admins (security fix)
-- =============================================================================
-- Tables `public.tenants` and `public.super_admins` had RLS disabled,
-- exposing them to anon and authenticated roles.
--
-- service_role bypasses RLS, so the super admin panel continues to work.
-- =============================================================================

-- 1. tenants: enable RLS, allow each authenticated user to read their own tenant
ALTER TABLE public.tenants ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS tenants_select_own ON public.tenants;
CREATE POLICY tenants_select_own ON public.tenants
  AS PERMISSIVE FOR SELECT TO authenticated
  USING (id = ((auth.jwt() -> 'app_metadata'::text) ->> 'tenant_id'::text));

-- 2. super_admins: enable RLS (existing policy super_admins_read_admin targets
--    supabase_auth_admin role only — for the auth hook — so we keep it).
--    Add a new policy so each user can check whether THEY are super admin
--    (required by middleware.ts and src/lib/auth/context.ts).
ALTER TABLE public.super_admins ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS super_admins_select_own ON public.super_admins;
CREATE POLICY super_admins_select_own ON public.super_admins
  AS PERMISSIVE FOR SELECT TO authenticated
  USING (user_id = auth.uid());