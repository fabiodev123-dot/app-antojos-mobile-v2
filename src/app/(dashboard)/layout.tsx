import type React from "react";
import { AppShell } from "@/components/layout/app-shell";
import { ActingAsBanner } from "@/components/features/acting-as-banner";
import {
  getCurrentSuperAdminOrNull,
  getCurrentUserOrNull,
} from "@/lib/auth/context";
import { getTenantsWithStats } from "@/lib/services/admin-service";
import { TenantSelector } from "@/components/features/tenant-selector";
import { UserMenu } from "@/components/layout/user-menu";
import { cookies } from "next/headers";
import { createSupabaseServerClient } from "@/lib/supabase/server";

/**
 * Layout para páginas autenticadas (pedidos, productos, etc.).
 * Maneja auth context, tenant selector, y AppShell con BottomNav.
 */
export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  let user: { id: string; email: string } | null = null;
  let superAdmin: {
    id: string;
    email: string;
    isSuperAdmin: true;
    createdAt: string;
  } | null = null;
  let actingId: string | null = null;
  let tenants: Array<{ id: string; name: string }> = [];
  let actingTenantName: string | null = null;
  let userRole: string | null = null;

  try {
    user = await getCurrentUserOrNull();
    superAdmin = await getCurrentSuperAdminOrNull();
    const cookieStore = await cookies();
    actingId = superAdmin
      ? cookieStore.get("acting_tenant_id")?.value ?? null
      : null;

    if (superAdmin) {
      try {
        const stats = await getTenantsWithStats();
        tenants = stats.map((t) => ({ id: t.id, name: t.name }));
      } catch (err) {
        console.error(
          "[dashboard-layout] Error al obtener tenants para super admin:",
          err,
        );
      }
    }

    if (user) {
      const supabase = await createSupabaseServerClient();
      if (superAdmin) {
        userRole = "super admin";
      }

      if (actingId) {
        const { data: tenant } = await supabase
          .from("tenants" as never)
          .select("name")
          .eq("id", actingId)
          .maybeSingle() as { data: { name: string } | null };
        actingTenantName = tenant?.name ?? null;

        const { data: tu } = await supabase
          .from("tenant_users" as never)
          .select("role")
          .eq("tenant_id", actingId)
          .eq("user_id", user.id)
          .maybeSingle() as { data: { role: string } | null };
        if (tu?.role) userRole = tu.role;
      } else {
        const { data: tu } = await supabase
          .from("tenant_users" as never)
          .select("role, tenant_id")
          .eq("user_id", user.id)
          .limit(1)
          .maybeSingle() as {
          data: { role: string; tenant_id: string } | null;
        };
        if (tu) {
          userRole = tu.role;
          const { data: tenant } = await supabase
            .from("tenants" as never)
            .select("name")
            .eq("id", tu.tenant_id)
            .maybeSingle() as { data: { name: string } | null };
          actingTenantName = tenant?.name ?? null;
        }
      }
    }
  } catch (err) {
    console.error(
      "[dashboard-layout] Error en el contexto de autenticación/base de datos:",
      err,
    );
  }

  const topBar = (
    <>
      <ActingAsBanner actingId={actingId} />
      {user ? (
        <div className="border-b border-white/[0.08] bg-zinc-950/90 backdrop-blur-xl relative z-50">
          <div className="mx-auto flex h-11 max-w-6xl items-center justify-between gap-3 px-4">
            <div className="flex items-center gap-2 min-w-0">
              <span className="inline-flex items-center gap-1.5 rounded-full bg-brand/15 px-2.5 py-0.5 text-[11px] font-bold text-brand border border-brand/30 tracking-tight">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src="/logo-mark.png"
                  alt=""
                  className="size-3.5 rounded-sm"
                />
                Antojos
              </span>
              {actingTenantName ? (
                <span className="hidden sm:inline-flex items-center text-xs text-zinc-400 truncate">
                  <span className="mx-1.5 opacity-30">/</span>
                  <span className="font-medium text-zinc-200 truncate">
                    {actingTenantName}
                  </span>
                </span>
              ) : null}
            </div>
            <div className="flex items-center gap-2 shrink-0">
              {superAdmin && tenants.length > 0 ? (
                <TenantSelector
                  tenants={tenants}
                  activeActingId={actingId}
                />
              ) : null}
              <UserMenu
                email={user.email}
                actingTenantName={actingTenantName}
                userRole={userRole}
              />
            </div>
          </div>
        </div>
      ) : null}
    </>
  );

  return (
    <AppShell topBar={topBar}>{children}</AppShell>
  );
}
