import { requireSuperAdmin } from "@/lib/auth/context";
import { getTenantsWithStats, getGlobalStats, getGlobalRevenue, getRevenueTrend } from "@/lib/services/admin-service";
import { AdminDashboardClient } from "./dashboard-client";

export default async function AdminPage() {
  await requireSuperAdmin();

  const [stats, tenants, revenue, trend] = await Promise.all([
    getTenantsWithStats(),
    getGlobalStats(),
    getGlobalRevenue(),
    getRevenueTrend(30),
  ]);

  return (
    <AdminDashboardClient
      stats={stats}
      tenants={tenants}
      revenue={revenue}
      trend={trend}
    />
  );
}