-- =============================================================================
-- Migration 0011: admin_audit_log (super admin actions log)
-- =============================================================================
-- Registra cada acción que hace el super admin desde el panel.
-- Usado por el ActivityFeed del Monitor Maestro.
-- RLS: service_role full access (el panel usa service_role).
-- =============================================================================

CREATE TABLE "public"."admin_audit_log" (
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

--> statement-breakpoint

CREATE INDEX "admin_audit_log_created_at_idx" ON "public"."admin_audit_log" USING btree ("created_at" DESC);

--> statement-breakpoint

ALTER TABLE "public"."admin_audit_log" ENABLE ROW LEVEL SECURITY;

--> statement-breakpoint

CREATE POLICY "admin_audit_log_service_role_all" ON "public"."admin_audit_log"
  AS PERMISSIVE FOR ALL TO service_role USING (true) WITH CHECK (true);

--> statement-breakpoint

-- ─────────────────────────────────────────────────────────────────────────────
-- RPC: recent audit log for the activity feed
-- ─────────────────────────────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION public.admin_audit_log_recent(p_limit int DEFAULT 20)
RETURNS TABLE (
  id text,
  super_admin_email text,
  action text,
  target_type text,
  target_id text,
  target_label text,
  metadata jsonb,
  created_at timestamptz
)
LANGUAGE plpgsql
SECURITY DEFINER
STABLE
AS $$
BEGIN
  RETURN QUERY
  SELECT
    l.id, l.super_admin_email, l.action,
    l.target_type, l.target_id, l.target_label, l.metadata, l.created_at
  FROM public.admin_audit_log l
  ORDER BY l.created_at DESC
  LIMIT p_limit;
END;
$$;

--> statement-breakpoint

REVOKE EXECUTE ON FUNCTION public.admin_audit_log_recent(int) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.admin_audit_log_recent(int) TO service_role;