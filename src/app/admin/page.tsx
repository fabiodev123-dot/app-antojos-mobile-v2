import { requireSuperAdmin } from "@/lib/auth/context";
import {
  getTenantsWithStats,
  getGlobalStats,
  getGlobalRevenue,
  getRevenueTrend,
  getActiveDevicesCount,
  getDevicesByTenant,
  listActiveDevices,
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
  ]);

  const [
    tenantsR,
    statsR,
    revenueR,
    trendR,
    activeDevicesCountR,
    devicesByTenantR,
    activeDevicesR,
  ] = results;

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
      tenants={tenantsR.status === "fulfilled" ? tenantsR.value : []}
      revenue={revenueR.status === "fulfilled" ? revenueR.value : {
        pedidos: { today: 0, last7d: 0, last30d: 0, total: 0 },
        ventasRapidas: { today: 0, last7d: 0, last30d: 0, total: 0 },
      }}
      trend={trendR.status === "fulfilled" ? trendR.value : []}
      activeDevicesCount={activeDevicesCountR.status === "fulfilled" ? activeDevicesCountR.value : 0}
      devicesByTenant={devicesByTenantR.status === "fulfilled" ? devicesByTenantR.value : []}
      activeDevices={activeDevicesR.status === "fulfilled" ? activeDevicesR.value : []}
    />
  );
}