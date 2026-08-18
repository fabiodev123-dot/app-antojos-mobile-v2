-- =============================================================================
-- Migration 0001: Multi-tenant foundation (tenants, tenant_users, super_admins)
-- =============================================================================
-- Crea la base del multi-tenant SaaS: enums, tabla de tenants, junction table
-- tenant_users (vincula auth.users con tenants), y tabla super_admins.
--
-- La columna tenant_id en las tablas de dominio (pedidos, productos, etc.) se
-- agrega en 0002 — esta migración solo crea el scaffolding.
-- =============================================================================

-- ─────────────────────────────────────────────────────────────────────────────
-- 1. Enums
-- ─────────────────────────────────────────────────────────────────────────────

CREATE TYPE "public"."tenant_status" AS ENUM('active', 'trial', 'suspended');--> statement-breakpoint

CREATE TYPE "public"."tenant_plan" AS ENUM('free', 'basic', 'pro');--> statement-breakpoint

CREATE TYPE "public"."tenant_user_role" AS ENUM('admin', 'operador');--> statement-breakpoint

-- ─────────────────────────────────────────────────────────────────────────────
-- 2. Tenants
-- Una fila por negocio (rotisería, en este caso Antojos).
-- ─────────────────────────────────────────────────────────────────────────────

CREATE TABLE "tenants" (
	"id" text PRIMARY KEY NOT NULL,
	"slug" text NOT NULL UNIQUE,
	"name" text NOT NULL,
	"status" "tenant_status" DEFAULT 'trial' NOT NULL,
	"plan" "tenant_plan" DEFAULT 'free' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);--> statement-breakpoint

CREATE INDEX "tenants_slug_idx" ON "tenants" USING btree ("slug");--> statement-breakpoint
CREATE INDEX "tenants_status_idx" ON "tenants" USING btree ("status");--> statement-breakpoint

-- ─────────────────────────────────────────────────────────────────────────────
-- 3. Super admins
-- Vincula auth.users con permisos globales (acceden a /admin).
-- Separado de tenant_users porque un super admin NO es miembro de un tenant.
-- ─────────────────────────────────────────────────────────────────────────────

CREATE TABLE "super_admins" (
	"id" uuid PRIMARY KEY NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "super_admins_id_auth_users_id_fk" FOREIGN KEY ("id") REFERENCES "auth"."users"("id") ON DELETE cascade ON UPDATE no action
);--> statement-breakpoint

-- ─────────────────────────────────────────────────────────────────────────────
-- 4. Tenant users
-- Junction: qué auth.users pertenece a qué tenant y con qué rol.
-- UNIQUE (tenant_id, user_id) previene duplicados.
-- ─────────────────────────────────────────────────────────────────────────────

CREATE TABLE "tenant_users" (
	"id" text PRIMARY KEY NOT NULL,
	"tenant_id" text NOT NULL,
	"user_id" uuid NOT NULL,
	"role" "tenant_user_role" DEFAULT 'operador' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "tenant_users_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE cascade ON UPDATE no action,
	CONSTRAINT "tenant_users_user_id_auth_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE cascade ON UPDATE no action
);--> statement-breakpoint

CREATE UNIQUE INDEX "tenant_users_tenant_user_unq" ON "tenant_users" USING btree ("tenant_id","user_id");--> statement-breakpoint
CREATE INDEX "tenant_users_user_idx" ON "tenant_users" USING btree ("user_id");--> statement-breakpoint

-- ─────────────────────────────────────────────────────────────────────────────
-- 5. updated_at trigger helper
-- Función genérica para mantener updated_at fresco en cualquier tabla.
-- ─────────────────────────────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;--> statement-breakpoint

CREATE TRIGGER "tenants_set_updated_at"
BEFORE UPDATE ON "public"."tenants"
FOR EACH ROW
EXECUTE FUNCTION public.set_updated_at();--> statement-breakpoint

CREATE TRIGGER "tenant_users_set_updated_at"
BEFORE UPDATE ON "public"."tenant_users"
FOR EACH ROW
EXECUTE FUNCTION public.set_updated_at();--> statement-breakpoint

-- ─────────────────────────────────────────────────────────────────────────────
-- 6. RLS — Tenants, super_admins, tenant_users
-- Por ahora dejamos RLS deshabilitado en estas tablas porque el admin panel
-- usa service_role key (bypasa RLS) y el flujo de auth aún está en construcción.
-- Habilitar RLS cuando esté lista la fase 2 con RLS policies por tenant.
-- =============================================================================

ALTER TABLE "public"."tenants" DISABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "public"."super_admins" DISABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "public"."tenant_users" DISABLE ROW LEVEL SECURITY;
