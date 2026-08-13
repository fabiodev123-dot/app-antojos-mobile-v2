"use client";

import { Suspense, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { ArrowLeft, Plus, Minus, Search, X } from "lucide-react";
import {
  categoriasRepository,
  productosRepository,
} from "@/lib/repositories";
import { createPedido } from "@/lib/services/pedido-service";
import { nextPedidoNumero } from "@/lib/repositories/counters";
import { useRepositoryList } from "@/hooks/use-repository";
import { ShellHeader } from "@/components/layout/shell-header";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ButtonLink } from "@/components/ui/button-link";
import { Input } from "@/components/ui/input";
import { CategoryChips } from "@/components/features/category-chips";
import { PlatoCard } from "@/components/features/plato-card";
import { PedidoParser } from "@/components/features/pedido-parser";
import {
  ConfirmarPedidoModal,
  type ConfirmarItem,
} from "@/components/features/confirmar-pedido-modal";
import { formatPrecio, hoy } from "@/lib/format";
import { toast } from "sonner";
import type { ColorPlato, PedidoItem, Producto, TipoEntrega } from "@/lib/types";
import { nowIso, newId } from "@/lib/repositories/types";

interface CartItem {
  productoId: string;
  nombreProducto: string;
  colorProducto: ColorPlato;
  precioUnitario: number;
  imagenProducto?: string;
  cantidad: number;
}

export default function NuevoPedidoPage() {
  return (
    <Suspense fallback={null}>
      <NuevoPedidoPageInner />
    </Suspense>
  );
}

function NuevoPedidoPageInner() {
  const router = useRouter();
  const categorias = useRepositoryList(categoriasRepository);
  const productos = useRepositoryList(productosRepository);
  const searchParams = useSearchParams();
  const mode = searchParams.get("mode"); // "wsp" | "rapido" | null

  const [categoriaActiva, setCategoriaActiva] = useState<string>("todas");
  const [busqueda, setBusqueda] = useState("");
  const [cart, setCart] = useState<CartItem[]>([]);
  const [nombreCliente, setNombreCliente] = useState<string>("");
  const [creando, setCreando] = useState(false);

  // Estado del modal de confirmación
  const [modalOpen, setModalOpen] = useState(false);
  const [modalOrigen, setModalOrigen] = useState<"carrito" | "parser" | null>(null);
  const [parserItems, setParserItems] = useState<ConfirmarItem[]>([]);
  const [parserNombre, setParserNombre] = useState("");
  const [parserObservaciones, setParserObservaciones] = useState("");
  const [tipoEntrega, setTipoEntrega] = useState<TipoEntrega>("retiro");
  const [telefono, setTelefono] = useState("");
  const [direccion, setDireccion] = useState("");
  const [costoDelivery, setCostoDelivery] = useState("");

  const categoriasVisibles = categorias.filter((c) => c.activo);
  const busquedaNorm = busqueda.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").trim();
  // Stem muy básico: si termina en "s" la sacamos para que "empanadas" matchee "empanada".
  const busquedaStem = busquedaNorm.endsWith("s") && busquedaNorm.length > 3 ? busquedaNorm.slice(0, -1) : busquedaNorm;
  const productosFiltrados = productos
    .filter((p) => p.activo)
    .filter((p) => categoriaActiva === "todas" || p.categoriaId === categoriaActiva)
    .filter((p) => {
      if (!busquedaNorm) return true;
      const nombreNorm = p.nombre.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
      // Match por substring contra el nombre exacto O su stem (sin "s" final).
      return nombreNorm.includes(busquedaNorm) || nombreNorm.includes(busquedaStem);
    });

  function addToCart(producto: Producto) {
    setCart((prev) => {
      const existing = prev.find((c) => c.productoId === producto.id);
      if (existing) {
        return prev.map((c) =>
          c.productoId === producto.id ? { ...c, cantidad: c.cantidad + 1 } : c,
        );
      }
      return [
        ...prev,
        {
          productoId: producto.id,
          nombreProducto: producto.nombre,
          colorProducto: producto.color,
          precioUnitario: producto.precio,
          imagenProducto: producto.imagen,
          cantidad: 1,
        },
      ];
    });
  }

  function parserAccept(
    items: Array<{ producto: Producto; cantidad: number }>,
    nombreDetectado: string,
  ) {
    setCart((prev) => {
      const next = [...prev];
      for (const { producto, cantidad } of items) {
        const idx = next.findIndex((c) => c.productoId === producto.id);
        if (idx >= 0) {
          next[idx] = { ...next[idx], cantidad: next[idx].cantidad + cantidad };
        } else {
          next.push({
            productoId: producto.id,
            nombreProducto: producto.nombre,
            colorProducto: producto.color,
            precioUnitario: producto.precio,
            imagenProducto: producto.imagen,
            cantidad,
          });
        }
      }
      return next;
    });
    if (nombreDetectado) {
      setNombreCliente(nombreDetectado);
      toast.success(`Cliente "${nombreDetectado}" detectado del mensaje`);
    } else {
      toast.success(`${items.length} producto${items.length === 1 ? "" : "s"} cargado${items.length === 1 ? "" : "s"}`);
    }
    setBusqueda("");
  }

  /**
   * El parser pidió confirmar: abrimos el modal compartido pre-llenado con los
   * items detectados y la modalidad inferida del texto.
   */
  function parserRequestConfirm(data: {
    items: Array<{ producto: Producto; cantidad: number }>;
    nombreCliente: string;
    observaciones: string;
    tipoEntregaDetectado: TipoEntrega | null;
  }) {
    if (data.items.length === 0) {
      toast.error("No hay productos para confirmar");
      return;
    }
    const confirmarItems: ConfirmarItem[] = data.items.map((c, i) => ({
      id: `parser-${c.producto.id}-${i}`,
      nombre: c.producto.nombre,
      precioUnitario: c.producto.precio,
      cantidad: c.cantidad,
      imagen: c.producto.imagen,
      productoId: c.producto.id,
      colorProducto: c.producto.color,
    }));
    setParserItems(confirmarItems);
    setParserNombre(data.nombreCliente);
    setParserObservaciones(data.observaciones);
    if (data.tipoEntregaDetectado) setTipoEntrega(data.tipoEntregaDetectado);
    setModalOrigen("parser");
    setModalOpen(true);
  }

  /** El usuario tocó "Confirmar pedido" en la barra flotante → abre el modal. */
  function abrirConfirmCarrito() {
    if (cart.length === 0) {
      toast.error("Agregá al menos un producto");
      return;
    }
    setParserItems([]); // limpiar residuos del parser
    setModalOrigen("carrito");
    setModalOpen(true);
  }

  function updateQty(productoId: string, delta: number) {
    setCart((prev) =>
      prev
        .map((c) => (c.productoId === productoId ? { ...c, cantidad: c.cantidad + delta } : c))
        .filter((c) => c.cantidad > 0),
    );
  }

  const total = cart.reduce((sum, c) => sum + c.precioUnitario * c.cantidad, 0);

  /** Crea el pedido a partir de los datos del modal compartido. */
  async function ejecutarConfirmacion(data: {
    tipoEntrega: TipoEntrega;
    nombreCliente: string;
    telefono?: string;
    direccion?: string;
    costoDelivery?: number;
  }) {
    if (creando) return;
    setCreando(true);
    try {
      // Resolver items según origen
      let pedidoItems: PedidoItem[];
      let subtotalPedido: number;
      let observacionesPedido: string | undefined;

      if (modalOrigen === "carrito") {
        const createdAt = nowIso();
        pedidoItems = cart.map((c) => ({
          id: newId("pedi"),
          pedidoId: "", // se completa abajo
          productoId: c.productoId,
          nombreProducto: c.nombreProducto,
          colorProducto: c.colorProducto,
          cantidad: c.cantidad,
          precioUnitario: c.precioUnitario,
          subtotal: c.precioUnitario * c.cantidad,
          imagenProducto: c.imagenProducto,
          createdAt,
          updatedAt: createdAt,
        }));
        subtotalPedido = total;
        observacionesPedido = undefined;
      } else {
        // Parser
        const createdAt = nowIso();
        pedidoItems = parserItems.map((c) => ({
          id: newId("pedi"),
          pedidoId: "",
          productoId: c.productoId ?? "",
          nombreProducto: c.nombre,
          colorProducto: c.colorProducto ?? "gray",
          cantidad: c.cantidad,
          precioUnitario: c.precioUnitario,
          subtotal: c.precioUnitario * c.cantidad,
          imagenProducto: c.imagen,
          createdAt,
          updatedAt: createdAt,
        }));
        subtotalPedido = parserItems.reduce(
          (sum, i) => sum + i.precioUnitario * i.cantidad,
          0,
        );
        observacionesPedido = parserObservaciones.trim() || undefined;
      }

      const envio = data.costoDelivery ?? 0;
      const totalPedido = subtotalPedido + envio;

      const numero = nextPedidoNumero();
      const pedidoId = newId("ped");
      const itemsConPedidoId = pedidoItems.map((it) => ({
        ...it,
        pedidoId,
      }));
      const hora = new Date().toTimeString().slice(0, 5);

      const canal = modalOrigen === "parser" ? "whatsapp" : "presencial";
      // Prioridad: nombre que el usuario tipeó en el modal > nombre detectado del parser > nombre del carrito > "Pedido Rápido".
      const nombreDesdeModal = data.nombreCliente?.trim();
      const clienteFinal =
        nombreDesdeModal ||
        (modalOrigen === "parser" ? parserNombre.trim() : nombreCliente.trim()) ||
        "Pedido Rápido";

      createPedido({
        numero,
        nombreCliente: clienteFinal,
        telefonoCliente: data.telefono,
        direccionEntrega:
          data.tipoEntrega === "delivery" ? data.direccion : undefined,
        items: itemsConPedidoId,
        subtotal: subtotalPedido,
        envio: envio > 0 ? envio : undefined,
        total: totalPedido,
        estado: "pendiente",
        canal,
        tipoEntrega: data.tipoEntrega,
        observaciones: observacionesPedido,
        fecha: hoy(),
        hora,
      });

      toast.success(`Pedido #${numero} creado`);
      setModalOpen(false);

      // Limpiar estado según origen
      if (modalOrigen === "carrito") {
        setCart([]);
        setNombreCliente("");
      } else {
        setParserItems([]);
        setParserNombre("");
        setParserObservaciones("");
      }
      setTelefono("");
      setDireccion("");
      setCostoDelivery("");
      router.push("/pedidos");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Error al crear el pedido");
    } finally {
      setCreando(false);
    }
  }

  return (
    <>
      <ShellHeader
        title="Nuevo pedido"
        right={
          <ButtonLink href="/pedidos" size="sm" variant="ghost">
            <ArrowLeft className="size-3.5" />
            Volver
          </ButtonLink>
        }
      />
      <main className="mx-auto max-w-6xl px-4 py-4 space-y-4 pb-32">
        <PedidoParser
          productos={productos.filter((p) => p.activo)}
          categorias={categoriasVisibles.map((c) => ({ id: c.id, nombre: c.nombre, emoji: c.emoji }))}
          onAccept={parserAccept}
          onRequestConfirm={parserRequestConfirm}
          defaultOpen={mode === "wsp"}
        />

        <CategoryChips
          categorias={categoriasVisibles.map((c) => ({
            id: c.id,
            nombre: c.nombre,
            emoji: c.emoji,
          }))}
          activa={categoriaActiva}
          onChange={setCategoriaActiva}
        />

        <div className="relative">
          <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={busqueda}
            onChange={(e) => setBusqueda(e.target.value)}
            placeholder="Buscar producto..."
            className="pl-9 pr-9"
          />
          {busqueda ? (
            <button
              type="button"
              onClick={() => setBusqueda("")}
              className="absolute right-2 top-1/2 -translate-y-1/2 flex h-6 w-6 items-center justify-center rounded-md text-muted-foreground hover:bg-muted hover:text-foreground"
              aria-label="Limpiar búsqueda"
            >
              ×
            </button>
          ) : null}
        </div>

        <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
          {productosFiltrados.length === 0 ? (
            <div className="col-span-full rounded-xl border border-dashed border-border bg-card/30 p-6 text-center">
              <p className="text-sm text-muted-foreground">
                {busqueda
                  ? `Ningún producto matchea \u201C${busqueda}\u201D`
                  : "No hay productos en esta categoría"}
              </p>
              {busqueda ? (
                <button
                  type="button"
                  onClick={() => setBusqueda("")}
                  className="mt-2 text-xs text-brand hover:underline"
                >
                  Limpiar búsqueda
                </button>
              ) : null}
            </div>
          ) : null}
          {productosFiltrados.map((p) => {
            const inCart = cart.find((c) => c.productoId === p.id);
            return (
              <PlatoCard
                key={p.id}
                producto={p}
                trailing={
                  inCart ? (
                    <div className="flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
                      <Button
                        size="icon-xs"
                        variant="outline"
                        onClick={() => updateQty(p.id, -1)}
                      >
                        <Minus className="size-3" />
                      </Button>
                      <span className="w-6 text-center font-mono text-sm">{inCart.cantidad}</span>
                      <Button size="icon-xs" onClick={() => updateQty(p.id, +1)}>
                        <Plus className="size-3" />
                      </Button>
                    </div>
                  ) : (
                    <Button size="sm" onClick={() => addToCart(p)}>
                      <Plus className="size-3" />
                    </Button>
                  )
                }
              />
            );
          })}
        </div>

        <Card className="overflow-hidden p-0">
          <CardContent className="p-3">
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2 text-sm min-w-0">
                <span className="text-muted-foreground shrink-0">Cliente:</span>
                {nombreCliente ? (
                  <span className="flex min-w-0 items-center gap-1.5">
                    <span className="font-medium truncate">{nombreCliente}</span>
                    <button
                      type="button"
                      onClick={() => setNombreCliente("")}
                      className="shrink-0 inline-flex h-5 w-5 items-center justify-center rounded-md text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
                      aria-label="Quitar cliente"
                    >
                      <X className="size-3" />
                    </button>
                  </span>
                ) : (
                  <span className="text-muted-foreground italic">Pedido Rápido</span>
                )}
              </div>
              {nombreCliente ? (
                <span className="text-[10px] uppercase tracking-wider text-muted-foreground shrink-0">
                  detectado
                </span>
              ) : null}
            </div>
          </CardContent>
        </Card>
      </main>

      {cart.length > 0 ? (
        <div className="fixed inset-x-0 bottom-[calc(4.5rem+env(safe-area-inset-bottom))] z-40 border-t border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/80">
          <div className="mx-auto flex w-full max-w-6xl items-center justify-between gap-2 p-3">
            <div className="min-w-0">
              <p className="text-xs text-muted-foreground">
                {cart.reduce((sum, c) => sum + c.cantidad, 0)} ítems
                {nombreCliente ? (
                  <>
                    <span className="mx-1">·</span>
                    <span className="text-secondary-foreground font-medium">
                      {nombreCliente}
                    </span>
                  </>
                ) : null}
              </p>
              <p className="font-heading text-xl font-bold tabular-nums leading-tight">
                {formatPrecio(total)}
              </p>
            </div>
            <Button
              onClick={abrirConfirmCarrito}
              size="lg"
              className="shrink-0 rounded-full bg-gradient-to-br from-brand to-secondary px-4 py-2.5 font-bold shadow-lg text-primary-foreground hover:brightness-110 brand-glow border-0"
            >
              Confirmar pedido
            </Button>
          </div>
        </div>
      ) : null}

<ConfirmarPedidoModal
        open={modalOpen}
        onOpenChange={(open) => {
          if (!open && creando) return;
          setModalOpen(open);
        }}
        items={
          modalOrigen === "parser"
            ? parserItems
            : cart.map((c) => ({
                id: c.productoId,
                nombre: c.nombreProducto,
                precioUnitario: c.precioUnitario,
                cantidad: c.cantidad,
                imagen: c.imagenProducto,
                productoId: c.productoId,
                colorProducto: c.colorProducto,
              }))
        }
        nombreCliente={modalOrigen === "parser" ? parserNombre : nombreCliente}
        onNombreClienteChange={(v) => {
          if (modalOrigen === "parser") setParserNombre(v);
          else setNombreCliente(v);
        }}
        tipoEntrega={tipoEntrega}
        onTipoEntregaChange={setTipoEntrega}
        telefono={telefono}
        onTelefonoChange={setTelefono}
        direccion={direccion}
        onDireccionChange={setDireccion}
        costoDelivery={costoDelivery}
        onCostoDeliveryChange={setCostoDelivery}
        submitting={creando}
        onConfirm={ejecutarConfirmacion}
      />
    </>
  );
}