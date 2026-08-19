import "server-only";
import { createSupabaseAdminClient } from "@/lib/supabase/server";

/**
 * Servicio para el panel super admin.
 * Usa SUPABASE_SERVICE_ROLE_KEY (bypasa RLS) — NUNCA importar desde cliente.
 *
 * Las queries son agregadas (1 SQL por fetch) para evitar N+1.
 */

export type TenantStatus = "active" | "suspended" | "trial";
export type TenantPlan = "free" | "basic" | "pro";

export type TenantWithStats = {
  id: string;
  slug: string;
  name: string;
  status: TenantStatus;
  plan: TenantPlan;
  createdAt: string;
  updatedAt: string;
  userCount: number;
  todayOrders: number;
  lastActivity: string | null;
};

/**
 * Lista todos los tenants con stats agregadas.
 * 1 query que joinea tenants + tenant_users + pedidos.
 */
export async function getTenantsWithStats(): Promise<TenantWithStats[]> {
  const admin = createSupabaseAdminClient();

  // Query agregada. Devuelve tenants + métricas.
  const { data, error } = await admin.rpc("admin_list_tenants_with_stats");

  if (error) {
    throw new Error(`getTenantsWithStats failed: ${error.message}`);
  }

  return (data ?? []).map((row: Record<string, unknown>) => ({
    id: String(row.id),
    slug: String(row.slug),
    name: String(row.name),
    status: row.status as TenantStatus,
    plan: row.plan as TenantPlan,
    createdAt: String(row.created_at),
    updatedAt: String(row.updated_at),
    userCount: Number(row.user_count ?? 0),
    todayOrders: Number(row.today_orders ?? 0),
    lastActivity: row.last_activity ? String(row.last_activity) : null,
  }));
}

/**
 * Stats globales para los KPIs.
 */
export type GlobalStats = {
  totalTenants: number;
  activeTenants: number;
  trialTenants: number;
  suspendedTenants: number;
  totalUsers: number;
  totalOrdersToday: number;
  totalOrdersThisWeek: number;
  totalActiveUsersThisWeek: number;
};

export async function getGlobalStats(): Promise<GlobalStats> {
  const admin = createSupabaseAdminClient();

  const { data, error } = await admin.rpc("admin_global_stats");

  if (error) {
    throw new Error(`getGlobalStats failed: ${error.message}`);
  }

  const row = data?.[0] ?? {};
  return {
    totalTenants: Number(row.total_tenants ?? 0),
    activeTenants: Number(row.active_tenants ?? 0),
    trialTenants: Number(row.trial_tenants ?? 0),
    suspendedTenants: Number(row.suspended_tenants ?? 0),
    totalUsers: Number(row.total_users ?? 0),
    totalOrdersToday: Number(row.total_orders_today ?? 0),
    totalOrdersThisWeek: Number(row.total_orders_this_week ?? 0),
    totalActiveUsersThisWeek: Number(row.active_users_this_week ?? 0),
  };
}

/**
 * Detalle de un tenant con usuarios, pedidos recientes, y serie diaria.
 */
export type TenantDetail = TenantWithStats & {
  users: TenantUser[];
  recentOrders: RecentOrder[];
  ordersByDay: OrdersByDay[];
};

export type TenantUser = {
  userId: string;
  email: string;
  role: string;
  createdAt: string;
};

export type RecentOrder = {
  id: string;
  numero: number;
  nombreCliente: string;
  estado: string;
  total: number;
  fecha: string;
  createdAt: string;
};

export type OrdersByDay = {
  fecha: string;
  total: number;
  cantidad: number;
};

export async function getTenantDetail(tenantId: string): Promise<TenantDetail | null> {
  const admin = createSupabaseAdminClient();

  // Resolver users via auth + tenant_users
  const { data: tenantUsers, error: tuError } = await admin
    .from("tenant_users")
    .select("user_id, role, created_at")
    .eq("tenant_id", tenantId)
    .order("created_at", { ascending: false });

  if (tuError) {
    throw new Error(`getTenantDetail tenant_users failed: ${tuError.message}`);
  }

  // Buscar emails por user_id via auth.admin
  const userIds = (tenantUsers ?? []).map((tu) => tu.user_id);
  const users: TenantUser[] = [];

  for (const uid of userIds) {
    const { data: authUser } = await admin.auth.admin.getUserById(uid);
    users.push({
      userId: uid,
      email: authUser?.user?.email ?? "(sin email)",
      role: (tenantUsers?.find((tu) => tu.user_id === uid)?.role as string) ?? "operador",
      createdAt: (tenantUsers?.find((tu) => tu.user_id === uid)?.created_at as string) ?? "",
    });
  }

  // Recent orders (last 20)
  const { data: orders, error: ordersError } = await admin
    .from("pedidos")
    .select("id, numero, nombre_cliente, estado, total, fecha, created_at")
    .eq("tenant_id", tenantId)
    .order("created_at", { ascending: false })
    .limit(20);

  if (ordersError) {
    throw new Error(`getTenantDetail pedidos failed: ${ordersError.message}`);
  }

  const recentOrders: RecentOrder[] = (orders ?? []).map((o) => ({
    id: String(o.id),
    numero: Number(o.numero),
    nombreCliente: String(o.nombre_cliente),
    estado: String(o.estado),
    total: Number(o.total),
    fecha: String(o.fecha),
    createdAt: String(o.created_at),
  }));

  // Orders by day (last 30 days)
  const ordersByDay = await getOrdersByDay(tenantId, 30);

  // Stats básicos del tenant
  const allTenants = await getTenantsWithStats();
  const tenantStats = allTenants.find((t) => t.id === tenantId);

  if (!tenantStats) return null;

  return {
    ...tenantStats,
    users,
    recentOrders,
    ordersByDay,
  };
}

async function getOrdersByDay(tenantId: string, days: number): Promise<OrdersByDay[]> {
  const admin = createSupabaseAdminClient();
  const since = new Date();
  since.setDate(since.getDate() - days);

  const { data, error } = await admin
    .from("pedidos")
    .select("fecha, total")
    .eq("tenant_id", tenantId)
    .gte("fecha", since.toISOString().split("T")[0]);

  if (error) {
    throw new Error(`getOrdersByDay failed: ${error.message}`);
  }

  // Agrupar por fecha
  const byDay = new Map<string, { total: number; cantidad: number }>();
  for (const row of data ?? []) {
    const fecha = String(row.fecha);
    const prev = byDay.get(fecha) ?? { total: 0, cantidad: 0 };
    byDay.set(fecha, {
      total: prev.total + Number(row.total),
      cantidad: prev.cantidad + 1,
    });
  }

  return Array.from(byDay.entries())
    .map(([fecha, agg]) => ({ fecha, total: agg.total, cantidad: agg.cantidad }))
    .sort((a, b) => a.fecha.localeCompare(b.fecha));
}

export type RevenueBreakdown = {
  today: number;
  last7d: number;
  last30d: number;
  total: number;
};

export type Revenue = {
  pedidos: RevenueBreakdown;
  ventasRapidas: RevenueBreakdown;
};

export async function getGlobalRevenue(): Promise<Revenue> {
  const admin = createSupabaseAdminClient();

  const { data, error } = await admin.rpc("admin_global_revenue");

  if (error) {
    throw new Error(`getGlobalRevenue failed: ${error.message}`);
  }

  const row = data?.[0] ?? {};
  return {
    pedidos: {
      today: Number(row.revenue_today ?? 0),
      last7d: Number(row.revenue_7d ?? 0),
      last30d: Number(row.revenue_30d ?? 0),
      total: Number(row.revenue_total ?? 0),
    },
    ventasRapidas: {
      today: Number(row.ventas_rapidas_today ?? 0),
      last7d: Number(row.ventas_rapidas_7d ?? 0),
      last30d: Number(row.ventas_rapidas_30d ?? 0),
      total: Number(row.ventas_rapidas_total ?? 0),
    },
  };
}

export async function getTenantRevenue(tenantId: string): Promise<Revenue> {
  const admin = createSupabaseAdminClient();

  const { data, error } = await admin.rpc(
    "admin_tenant_revenue" as never,
    { p_tenant_id: tenantId } as never,
  );

  if (error) {
    throw new Error(`getTenantRevenue failed: ${error.message}`);
  }

  const row = data?.[0] ?? {};
  return {
    pedidos: {
      today: Number(row.revenue_today ?? 0),
      last7d: Number(row.revenue_7d ?? 0),
      last30d: Number(row.revenue_30d ?? 0),
      total: Number(row.revenue_total ?? 0),
    },
    ventasRapidas: {
      today: Number(row.ventas_rapidas_today ?? 0),
      last7d: Number(row.ventas_rapidas_7d ?? 0),
      last30d: Number(row.ventas_rapidas_30d ?? 0),
      total: Number(row.ventas_rapidas_total ?? 0),
    },
  };
}
