import Link from "next/link";
import { LogOut, Shield } from "lucide-react";
import { logoutAction } from "@/app/login/actions";
import { requireSuperAdmin } from "@/lib/auth/context";
import { getTenantsWithStats, getGlobalStats } from "@/lib/services/admin-service";
import { AdminDashboardClient } from "./dashboard-client";

export default async function AdminPage() {
  const ctx = await requireSuperAdmin();

  // Fetch en paralelo (server-side, no se envía al cliente)
  const [stats, tenants] = await Promise.all([
    getGlobalStats(),
    getTenantsWithStats(),
  ]);

  return (
    <main className="bg-background min-h-svh">
      {/* HEADER */}
      <header className="bg-card/50 border-b backdrop-blur-xl">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-3">
          <div className="flex items-center gap-3">
            <div className="bg-primary/10 text-primary flex h-9 w-9 items-center justify-center rounded-lg">
              <Shield className="size-4" />
            </div>
            <div>
              <h1 className="text-sm font-semibold">Antojos Platform</h1>
              <p className="text-muted-foreground text-xs">Super admin panel</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <div className="hidden text-right sm:block">
              <p className="text-sm font-medium">{ctx.email}</p>
              <p className="text-muted-foreground text-xs">Super admin</p>
            </div>
            <form action={logoutAction}>
              <button
                type="submit"
                className="text-muted-foreground hover:text-foreground inline-flex items-center gap-1.5 text-sm underline"
                aria-label="Cerrar sesión"
              >
                <LogOut className="size-3.5" />
                Salir
              </button>
            </form>
          </div>
        </div>
      </header>

      {/* CONTENT */}
      <div className="mx-auto max-w-7xl px-4 py-6">
        <AdminDashboardClient stats={stats} tenants={tenants} />
      </div>
    </main>
  );
}
