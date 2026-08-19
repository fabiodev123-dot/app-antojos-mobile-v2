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

  const [
    stats,
    tenants,
    revenue,
    trend,
    activeDevicesCount,
    devicesByTenant,
    activeDevices,
  ] = await Promise.all([
    getTenantsWithStats(),
    getGlobalStats(),
    getGlobalRevenue(),
    getRevenueTrend(30),
    getActiveDevicesCount(),
    getDevicesByTenant(),
    listActiveDevices(),
  ]);

  return (
    <AdminDashboardClient
      stats={stats}
      tenants={tenants}
      revenue={revenue}
      trend={trend}
      activeDevicesCount={activeDevicesCount}
      devicesByTenant={devicesByTenant}
      activeDevices={activeDevices}
    />
  );
}