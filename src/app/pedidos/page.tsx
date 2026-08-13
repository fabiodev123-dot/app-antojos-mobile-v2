"use client";

import { useMemo, useState } from "react";
import { Plus, Truck, Store } from "lucide-react";
import {
  categoriasRepository,
  pedidosRepository,
  productosRepository,
} from "@/lib/repositories";
import { useRepositoryList } from "@/hooks/use-repository";
import { ShellHeader } from "@/components/layout/shell-header";
import { Card, CardContent } from "@/components/ui/card";
import { ButtonLink } from "@/components/ui/button-link";
import { ColorStripe } from "@/components/features/color-badge";
import { CollapsibleSection } from "@/components/features/collapsible-section";
import { PedidoDetailDialog } from "@/components/features/pedido-detail-dialog";
import { EmptyState } from "@/components/features/empty-state";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { formatHora, formatPrecio } from "@/lib/format";
import { cn } from "@/lib/utils";
import type { EstadoPedido, Pedido, Producto } from "@/lib/types";

const ESTADOS: Array<{ value: EstadoPedido | "todos"; label: string }> = [
  { value: "todos", label: "Todos" },
  { value: "pendiente", label: "Pendientes" },
  { value: "preparando", label: "En cocina" },
  { value: "listo", label: "Listos" },
  { value: "entregado", label: "Entregados" },
];

const ESTADO_BADGE: Record<EstadoPedido, { label: string; className: string }> = {
  pendiente: { label: "Pendiente", className: "bg-warning/15 text-warning ring-1 ring-warning/30" },
  preparando: { label: "En cocina", className: "bg-info/20 text-info-foreground ring-1 ring-info/40" },
  listo: { label: "Listo", className: "bg-success/15 text-success ring-1 ring-success/30" },
  entregado: { label: "Entregado", className: "bg-muted text-muted-foreground ring-1 ring-border" },
  cancelado: { label: "Cancelado", className: "bg-destructive/15 text-destructive ring-1 ring-destructive/30" },
};

export default function PedidosPage() {
  const pedidos = useRepositoryList(pedidosRepository);
  const productos = useRepositoryList(productosRepository);
  const categoriasVisibles = useRepositoryList(categoriasRepository)
    .filter((c) => c.activo)
    .sort((a, b) => a.nombre.localeCompare(b.nombre));
  const [detailOpen, setDetailOpen] = useState(false);
  const [selected, setSelected] = useState<Pedido | null>(null);

  // Mapa productoId → categoriaId (O(1) lookup por cada item del pedido).
  const productoCategoria = useMemo(() => {
    const map = new Map<string, string>();
    for (const p of productos) {
      map.set(p.id, p.categoriaId);
    }
    return map;
  }, [productos]);

  // Mapa productoId → Producto (para nombre + emoji en el indicador).
  const productoById = useMemo(() => {
    const map = new Map<string, Producto>();
    for (const p of productos) map.set(p.id, p);
    return map;
  }, [productos]);

  const pedidosPorCategoria = useMemo(() => {
    const map = new Map<string, Pedido[]>();
    for (const cat of categoriasVisibles) map.set(cat.id, []);
    for (const p of pedidos) {
      const catsDelPedido = new Set<string>();
      for (const it of p.items) {
        const catId = productoCategoria.get(it.productoId);
        if (catId) catsDelPedido.add(catId);
      }
      for (const catId of catsDelPedido) {
        const list = map.get(catId);
        if (list) list.push(p);
      }
    }
    // Sort por número de pedido (más reciente primero)
    for (const list of map.values()) {
      list.sort((a, b) => (a.numero > b.numero ? -1 : 1));
    }
    return map;
  }, [pedidos, categoriasVisibles, productoCategoria]);

  const byEstado = (estado: EstadoPedido | "todos") => {
    if (estado === "todos") return pedidos;
    return pedidos.filter((p) => p.estado === estado);
  };

  /**
   * Para un pedido dentro del collapsible de una categoría, devuelve
   * la lista de OTRAS categorías (distintas a la actual) que también
   * tienen хотя бы 1 item de este pedido. Para mostrar el indicator
   * "también: Pizza, Empanadas" sin repetir la categoría actual.
   */
  const categoriasDelPedidoDistintasA = (
    pedido: Pedido,
    categoriaActualId: string,
  ): Array<{ id: string; nombre: string; emoji?: string }> => {
    const cats = new Set<string>();
    for (const it of pedido.items) {
      const catId = productoCategoria.get(it.productoId);
      if (catId && catId !== categoriaActualId) cats.add(catId);
    }
    return categoriasVisibles
      .filter((c) => cats.has(c.id))
      .map((c) => ({ id: c.id, nombre: c.nombre, emoji: c.emoji }));
  };

  function openDetail(p: Pedido) {
    setSelected(p);
    setDetailOpen(true);
  }

  const total = pedidos.length;

  return (
    <>
      <ShellHeader
        title="Pedidos"
        subtitle={`${total} en total`}
        right={
          <ButtonLink href="/pedidos/nuevo" size="sm">
            <Plus className="size-3.5" />
            Nuevo
          </ButtonLink>
        }
      />
      <main className="mx-auto max-w-6xl space-y-3 px-4 py-4">
        <Tabs defaultValue="todos">
          <TabsList className="w-full overflow-x-auto justify-start h-auto p-1 scrollbar-none">
            {ESTADOS.map((e) => (
              <TabsTrigger key={e.value} value={e.value} className="shrink-0">
                {e.label}
                {e.value !== "todos" ? (
                  <span className="ml-1.5 text-[10px] opacity-60 tabular-nums">{byEstado(e.value).length}</span>
                ) : null}
              </TabsTrigger>
            ))}
          </TabsList>

          {ESTADOS.map((e) => {
            const pedidosEnEstado = byEstado(e.value);
            return (
              <TabsContent key={e.value} value={e.value} className="space-y-2 mt-4">
                {pedidosEnEstado.length === 0 ? (
                  <Card className="border-dashed">
                    <CardContent className="p-0">
                      <EmptyState
                        icon="clipboard"
                        title={`Sin pedidos ${e.label.toLowerCase()}`}
                        description="Cuando lleguen pedidos van a aparecer acá"
                      />
                    </CardContent>
                  </Card>
                ) : (
                  categoriasVisibles.map((cat) => {
                    // Filtrar los pedidos que también están en esta categoría.
                    // (Map tiene TODOS los pedidos por categoría, pero solo
                    //  nos importan los que pasan el filtro de estado.)
                    const pedidosEnCategoria = (pedidosPorCategoria.get(cat.id) ?? [])
                      .filter((p) => e.value === "todos" || p.estado === e.value);

                    if (pedidosEnCategoria.length === 0) return null;

                    return (
                      <CollapsibleSection
                        key={cat.id}
                        emoji={cat.emoji}
                        title={cat.nombre}
                        count={pedidosEnCategoria.length}
                      >
                        {pedidosEnCategoria.map((p) => (
                          <PedidoRow
                            key={`${cat.id}-${p.id}`}
                            pedido={p}
                            onClick={() => openDetail(p)}
                            otrasCategorias={categoriasDelPedidoDistintasA(p, cat.id)}
                          />
                        ))}
                      </CollapsibleSection>
                    );
                  })
                )}
              </TabsContent>
            );
          })}
        </Tabs>
      </main>

      <PedidoDetailDialog key={selected?.id ?? "closed"} open={detailOpen} onOpenChange={setDetailOpen} pedido={selected} />
    </>
  );
}

interface PedidoRowProps {
  pedido: Pedido;
  onClick: () => void;
  otrasCategorias: Array<{ id: string; nombre: string; emoji?: string }>;
}

function PedidoRow({ pedido, onClick, otrasCategorias }: PedidoRowProps) {
  const badge = ESTADO_BADGE[pedido.estado];
  const firstImage = pedido.items.find((it) => it.imagenProducto)?.imagenProducto;
  return (
    <Card className="overflow-hidden p-0 card-elevated hover-lift">
      <button
        type="button"
        onClick={onClick}
        className="flex w-full items-stretch gap-3 text-left"
      >
        {firstImage ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={firstImage}
            alt=""
            aria-hidden
            loading="lazy"
            className="my-1.5 aspect-square size-16 shrink-0 self-center rounded-lg bg-muted object-cover ring-1 ring-white/15 shadow-[0_2px_8px_-2px_rgba(0,0,0,0.5)] sm:size-20"
          />
        ) : (
          <ColorStripe color={pedido.items[0]?.colorProducto ?? "gray"} className="rounded-none" />
        )}
        <CardContent className="flex-1 p-3.5">
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <span className="font-mono text-xs text-muted-foreground">#{pedido.numero}</span>
                <span className={cn("rounded-full px-2 py-0.5 text-[10px] font-medium", badge.className)}>
                  {badge.label}
                </span>
              </div>
              <p className="mt-1 font-medium truncate">{pedido.nombreCliente}</p>
              <p className="text-xs text-muted-foreground mt-0.5 flex items-center gap-1.5 flex-wrap">
                <span>{formatHora(pedido.hora)}</span>
                <span>·</span>
                <span>
                  {pedido.items.length} {pedido.items.length === 1 ? "ítem" : "ítems"}
                </span>
                <span>·</span>
                <span className="inline-flex items-center gap-1">
                  {pedido.tipoEntrega === "delivery" ? (
                    <>
                      <Truck className="size-3" /> Delivery
                    </>
                  ) : (
                    <>
                      <Store className="size-3" /> Retiro
                    </>
                  )}
                </span>
                {otrasCategorias.length > 0 ? (
                  <>
                    <span>·</span>
                    <span className="inline-flex items-center gap-1 text-[10px] text-muted-foreground/80">
                      también:
                      {otrasCategorias.slice(0, 3).map((c, i) => (
                        <span key={c.id} className="inline-flex items-center gap-0.5">
                          {i > 0 ? "," : ""} {c.emoji} {c.nombre}
                        </span>
                      ))}
                      {otrasCategorias.length > 3 ? "…" : ""}
                    </span>
                  </>
                ) : null}
              </p>
            </div>
            <div className="text-right shrink-0">
              <p className="font-heading font-semibold tabular-nums text-base">
                {formatPrecio(pedido.total)}
              </p>
              {pedido.envio && pedido.envio > 0 ? (
                <p className="text-[10px] text-muted-foreground mt-0.5 tabular-nums">
                  + {formatPrecio(pedido.envio)} envío
                </p>
              ) : null}
              <p className="text-[10px] text-muted-foreground mt-0.5">
                {pedido.canal === "whatsapp"
                  ? "📱 WSP"
                  : pedido.canal === "presencial"
                    ? "🖥️ Carga local"
                    : "📞 Tel"}
              </p>
            </div>
          </div>
          <p className="mt-2 text-xs text-muted-foreground line-clamp-1">
            {pedido.items.map((it) => `${it.cantidad}× ${it.nombreProducto}`).join(" · ")}
          </p>
        </CardContent>
      </button>
    </Card>
  );
}