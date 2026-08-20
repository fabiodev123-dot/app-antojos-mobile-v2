import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { AppShell } from "@/components/layout/app-shell";
import { ActingAsBanner } from "@/components/features/acting-as-banner";
import { getCurrentSuperAdminOrNull, getCurrentUserOrNull } from "@/lib/auth/context";
import { getTenantsWithStats } from "@/lib/services/admin-service";
import { TenantSelector } from "@/components/features/tenant-selector";
import { UserMenu } from "@/components/layout/user-menu";
import { cookies } from "next/headers";
import { createSupabaseServerClient } from "@/lib/supabase/server";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: {
    default: "Antojos — Rotisería",
    template: "%s · Antojos",
  },
  description: "Panel de gestión para la rotisería Antojos: pedidos, stock, clientes y cierre diario.",
};

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: dark)", color: "#FF6600" },
    { color: "#FF6600" },
  ],
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
};

export default async function RootLayout({ children }: LayoutProps<"/">) {
  const user = await getCurrentUserOrNull();
  const superAdmin = await getCurrentSuperAdminOrNull();
  const cookieStore = await cookies();
  const actingId = superAdmin
    ? cookieStore.get("acting_tenant_id")?.value ?? null
    : null;
  const tenants = superAdmin
    ? (await getTenantsWithStats()).map((t) => ({ id: t.id, name: t.name }))
    : [];

  let actingTenantName: string | null = null;
  let userRole: string | null = null;
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
        .maybeSingle() as { data: { role: string; tenant_id: string } | null };
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

  const topBar = (
    <>
      <ActingAsBanner actingId={actingId} />
      {superAdmin && tenants.length > 0 ? (
        <div className="border-b border-border bg-background/85 backdrop-blur-xl">
          <div className="mx-auto flex h-10 max-w-6xl items-center justify-end gap-2 px-4">
            <TenantSelector tenants={tenants} activeActingId={actingId} />
            <UserMenu
              email={user?.email ?? null}
              actingTenantName={actingTenantName}
              userRole={userRole}
            />
          </div>
        </div>
      ) : user ? (
        <div className="border-b border-border bg-background/85 backdrop-blur-xl">
          <div className="mx-auto flex h-10 max-w-6xl items-center justify-end gap-2 px-4">
            <UserMenu
              email={user.email}
              actingTenantName={actingTenantName}
              userRole={userRole}
            />
          </div>
        </div>
      ) : null}
    </>
  );

  return (
    <html
      lang="es-AR"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col bg-background text-foreground">
        <AppShell topBar={topBar}>{children}</AppShell>
      </body>
    </html>
  );
}