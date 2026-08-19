import { requireSuperAdmin } from "@/lib/auth/context";
import {
  getTenantsWithStats,
  getGlobalStats,
  getGlobalRevenue,
  getRevenueTrend,
  getActiveDevicesCount,
  getDevicesByTenant,
  listActiveDevices,
  getRecentActivity,
  buildAlerts,
} from "@/lib/services/admin-service";
import { AdminDashboardClient } from "./dashboard-client";

export default async function AdminPage() {
  await requireSuperAdmin();

  const results = await Promise.allSettled([
    getTenantsWithStats(),
    getGlobalStats(),
    getGlobalRevenue(),
    getRevenueTrend(30),
    getActiveDevicesCount(),
    getDevicesByTenant(),
    listActiveDevices(),
    getRecentActivity(12),
  ]);

  const [
    tenantsR,
    statsR,
    revenueR,
    trendR,
    activeDevicesCountR,
    devicesByTenantR,
    activeDevicesR,
    activityR,
  ] = results;

  const tenants = tenantsR.status === "fulfilled" ? tenantsR.value : [];
  const activeDevicesCount = activeDevicesCountR.status === "fulfilled" ? activeDevicesCountR.value : 0;
  const activity = activityR.status === "fulfilled" ? activityR.value : [];
  const alerts = buildAlerts(tenants, activeDevicesCount);

  return (
    <AdminDashboardClient
      stats={statsR.status === "fulfilled" ? statsR.value : {
        totalTenants: 0,
        activeTenants: 0,
        trialTenants: 0,
        suspendedTenants: 0,
        totalUsers: 0,
        totalOrdersToday: 0,
        totalOrdersThisWeek: 0,
        totalActiveUsersThisWeek: 0,
      }}
      tenants={tenants}
      revenue={revenueR.status === "fulfilled" ? revenueR.value : {
        pedidos: { today: 0, last7d: 0, last30d: 0, total: 0 },
        ventasRapidas: { today: 0, last7d: 0, last30d: 0, total: 0 },
      }}
      trend={trendR.status === "fulfilled" ? trendR.value : []}
      activeDevicesCount={activeDevicesCount}
      devicesByTenant={devicesByTenantR.status === "fulfilled" ? devicesByTenantR.value : []}
      activeDevices={activeDevicesR.status === "fulfilled" ? activeDevicesR.value : []}
      alerts={alerts}
      activity={activity}
    />
  );
}