import { requireSuperAdmin } from "@/lib/auth/context";
import { getTenantsWithStats, getGlobalStats, getGlobalRevenue } from "@/lib/services/admin-service";
import { AdminDashboardClient } from "./dashboard-client";

export default async function AdminPage() {
  await requireSuperAdmin();

  const [stats, tenants, revenue] = await Promise.all([
    getGlobalStats(),
    getTenantsWithStats(),
    getGlobalRevenue(),
  ]);

  return <AdminDashboardClient stats={stats} tenants={tenants} revenue={revenue} />;
}