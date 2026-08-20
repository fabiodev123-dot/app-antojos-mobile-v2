import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { AppShell } from "@/components/layout/app-shell";
import { ActingAsBanner } from "@/components/features/acting-as-banner";
import { getCurrentSuperAdminOrNull } from "@/lib/auth/context";
import { getTenantsWithStats } from "@/lib/services/admin-service";
import { TenantSelector } from "@/components/features/tenant-selector";
import { cookies } from "next/headers";

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
  const superAdmin = await getCurrentSuperAdminOrNull();
  const actingId = superAdmin
    ? (await cookies()).get("acting_tenant_id")?.value ?? null
    : null;
  const tenants = superAdmin
    ? (await getTenantsWithStats()).map((t) => ({ id: t.id, name: t.name }))
    : [];

  const topBar = (
    <>
      <ActingAsBanner />
      {superAdmin && tenants.length > 0 ? (
        <div className="border-b border-border bg-background/85 backdrop-blur-xl">
          <div className="mx-auto flex h-10 max-w-6xl items-center justify-end gap-2 px-4">
            <TenantSelector tenants={tenants} activeActingId={actingId} />
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