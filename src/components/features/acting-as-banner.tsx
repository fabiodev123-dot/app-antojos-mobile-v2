import { Eye } from "lucide-react";
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
      <div className="mx-auto flex h-9 max-w-6xl items-center gap-2 px-4 text-xs">
        <Eye className="size-3.5 shrink-0" />
        <span className="truncate">
          <strong>Modo act as:</strong> estás operando como{" "}
          <strong>{tenantName}</strong>. Para salir usá el menú de usuario arriba a la derecha.
        </span>
      </div>
    </div>
  );
}
