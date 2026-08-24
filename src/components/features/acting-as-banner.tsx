import { X } from "lucide-react";
import { createSupabaseAdminClient } from "@/lib/supabase/server";
import { clearActingTenant } from "@/lib/auth/acting";

export async function ActingAsBanner({ actingId }: { actingId?: string | null }) {
  if (!actingId) return null;

  let tenantName = "sucursal";
  try {
    const admin = createSupabaseAdminClient();
    const { data } = await admin
      .from("tenants" as never)
      .select("name")
      .eq("id", actingId)
      .maybeSingle() as { data: { name: string } | null };

    if (data?.name) tenantName = data.name;
  } catch (err) {
    console.error("[ActingAsBanner] Error obteniendo nombre del tenant:", err);
  }

  return (
    <div className="bg-amber-950/80 border-b border-amber-500/40 text-amber-200 backdrop-blur-md">
      <div className="mx-auto flex h-9 max-w-6xl items-center justify-between gap-3 px-4 text-xs">
        <div className="flex items-center gap-2 min-w-0">
          <span className="relative flex h-2 w-2 shrink-0">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75" />
            <span className="relative inline-flex rounded-full h-2 w-2 bg-amber-500" />
          </span>
          <span className="truncate">
            <span className="font-semibold text-amber-100">Modo Act As:</span> operando como{" "}
            <strong className="font-bold text-amber-300">{tenantName}</strong>
          </span>
        </div>
        <form action={clearActingTenant} className="shrink-0">
          <button
            type="submit"
            className="inline-flex items-center gap-1 rounded-md bg-amber-500/20 px-2 py-0.5 text-[11px] font-semibold text-amber-200 hover:bg-amber-500/30 hover:text-white transition-colors"
            title="Salir del modo act as"
          >
            <X className="size-3" />
            <span>Salir</span>
          </button>
        </form>
      </div>
    </div>
  );
}
