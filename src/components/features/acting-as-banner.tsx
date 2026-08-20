import { Eye, X } from "lucide-react";
import { clearActingTenant } from "@/lib/auth/acting";
import { createSupabaseAdminClient } from "@/lib/supabase/server";

export async function ActingAsBanner({ actingId }: { actingId?: string | null }) {
  if (!actingId) return null;

  const admin = createSupabaseAdminClient();
  const { data } = await admin
    .from("tenants" as never)
    .select("name")
    .eq("id", actingId)
    .maybeSingle() as { data: { name: string } | null };

  const tenantName = data?.name ?? "tenant";

  return (
    <div className="bg-amber-500/15 text-amber-900 dark:text-amber-100 border-b border-amber-500/30">
      <div className="mx-auto flex h-9 max-w-6xl items-center justify-between gap-3 px-4 text-xs">
        <div className="flex min-w-0 items-center gap-2">
          <Eye className="size-3.5 shrink-0" />
          <span className="truncate">
            <strong>Actuando como:</strong> {tenantName}
          </span>
        </div>
        <form action={clearActingTenant}>
          <button
            type="submit"
            className="inline-flex items-center gap-1 rounded-md px-2 py-0.5 font-medium hover:bg-amber-500/20"
            aria-label="Salir del modo act as"
          >
            <X className="size-3" />
            Salir
          </button>
        </form>
      </div>
    </div>
  );
}
