import { requireSuperAdmin } from "@/lib/auth/context";
import { AdminTopbar } from "@/components/layout/admin-topbar";
import { AdminSidebar } from "@/components/layout/admin-sidebar";

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const ctx = await requireSuperAdmin();
  const user = { id: ctx.id, email: ctx.email };

  return (
    <div className="bg-background flex min-h-svh">
      <AdminSidebar user={user} />
      <div className="flex min-w-0 flex-1 flex-col">
        <AdminTopbar user={user} />
        <main className="flex-1 px-4 py-4 lg:px-6 lg:py-6">
          <div className="mx-auto max-w-7xl">{children}</div>
        </main>
      </div>
    </div>
  );
}