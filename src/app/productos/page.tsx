"use client";

import { useMemo, useState } from "react";
import {
  Plus,
  Pencil,
  AlertTriangle,
  ImageOff,
  Sparkles,
  Search,
  X,
  Check,
  ChevronsDownUp,
  ChevronsUpDown,
} from "lucide-react";
import { categoriasRepository, productosRepository } from "@/lib/repositories";
import { useRepositoryList } from "@/hooks/use-repository";
import { ShellHeader } from "@/components/layout/shell-header";
import { PlatoCard } from "@/components/features/plato-card";
import { ProductoFormDialog } from "@/components/features/producto-form-dialog";
import { CollapsibleSection } from "@/components/features/collapsible-section";
import { EmptyState } from "@/components/features/empty-state";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import type { Producto } from "@/lib/types";

type FiltroStock = "todos" | "bajo" | "sinImagen";

export default function ProductosPage() {
  const categorias = useRepositoryList(categoriasRepository);
  const productos = useRepositoryList(productosRepository);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<Producto | null>(null);
  const [categoriaPreCreacion, setCategoriaPreCreacion] = useState<string | null>(null);
  const [busqueda, setBusqueda] = useState("");
  const [filtroStock, setFiltroStock] = useState<FiltroStock>("todos");
  /** Mapa de IDs de productos editados en los últimos 5 segundos. */
  const [recienEditados, setRecienEditados] = useState<Set<string>>(new Set());
  /**
   * Estado de apertura por categoría (key = categoriaId).
   * Cada sección es independiente: un click individual solo afecta ESA key,
   * nunca a las demás. Los botones "Expandir/Colapsar todas" reescriben
   * el Map completo con un solo valor.
   *
   * Si una categoría no tiene entrada en el Map, se considera abierta
   * (default `true`) — coherente con el defaultOpen del CollapsibleSection.
   */
  const [abiertasPorCategoria, setAbiertasPorCategoria] = useState<
    Record<string, boolean>
  >({});

  const activas = categorias.filter((c) => c.activo);
  const productosActivos = productos.filter((p) => p.activo);

  const busquedaNorm = busqueda.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").trim();
  const productosFiltrados = useMemo(() => {
    let lista = productosActivos;
    if (busquedaNorm) {
      lista = lista.filter((p) =>
        p.nombre.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").includes(busquedaNorm),
      );
    }
    if (filtroStock === "bajo") {
      lista = lista.filter((p) => p.stockActual <= p.stockMinimo);
    } else if (filtroStock === "sinImagen") {
      lista = lista.filter((p) => !p.imagen);
    }
    return lista;
  }, [productosActivos, busquedaNorm, filtroStock]);

  const stockBajo = productosActivos.filter(
    (p) => p.stockActual <= p.stockMinimo,
  );
  const sinImagen = productosActivos.filter((p) => !p.imagen);

  function openNew(categoriaId?: string) {
    setCategoriaPreCreacion(categoriaId ?? null);
    setEditing(null);
    setDialogOpen(true);
  }

  function openEdit(producto: Producto) {
    setCategoriaPreCreacion(null);
    setEditing(producto);
    setDialogOpen(true);
  }

  function marcarRecienEditado(id: string) {
    setRecienEditados((prev) => new Set(prev).add(id));
    setTimeout(() => {
      setRecienEditados((prev) => {
        const next = new Set(prev);
        next.delete(id);
        return next;
      });
    }, 5000);
  }

  // ── Toggles de secciones (cada categoría es independiente) ────────────────
  function toggleCategoria(catId: string, next: boolean) {
    setAbiertasPorCategoria((prev) => ({ ...prev, [catId]: next }));
  }

  function expandirTodas() {
    const todas: Record<string, boolean> = {};
    activas.forEach((c) => {
      todas[c.id] = true;
    });
    setAbiertasPorCategoria(todas);
  }

  function colapsarTodas() {
    const todas: Record<string, boolean> = {};
    activas.forEach((c) => {
      todas[c.id] = false;
    });
    setAbiertasPorCategoria(todas);
  }

  // ── Handlers de edición inline ─────────────────────────────────────────────
  function changeNombre(producto: Producto, value: string) {
    if (!value || value === producto.nombre) return;
    productosRepository.update(producto.id, { nombre: value });
    marcarRecienEditado(producto.id);
    toast.success(`Nombre actualizado a "${value}"`);
  }

  function changePrecio(producto: Producto, value: number) {
    if (value < 0 || value === producto.precio) return;
    productosRepository.update(producto.id, { precio: value });
    marcarRecienEditado(producto.id);
    toast.success(`Precio actualizado a $${value.toLocaleString("es-AR")}`);
  }

  function changeStock(producto: Producto, delta: number) {
    const next = Math.max(0, producto.stockActual + delta);
    if (next === producto.stockActual) return;
    productosRepository.update(producto.id, { stockActual: next });
    marcarRecienEditado(producto.id);
  }

  return (
    <>
      <ShellHeader
        title="Productos"
        subtitle={`${productosActivos.length} en carta`}
        right={
          <Button size="sm" onClick={() => openNew()} className="shrink-0">
            <Plus className="size-3.5" />
            Nuevo
          </Button>
        }
      />

      <main className="mx-auto max-w-6xl px-4 py-3 space-y-3">
        {/* ── Estado vacío global ─────────────────────────────────────────── */}
        {productosActivos.length === 0 ? (
          <Card className="border-dashed">
            <CardContent className="p-0">
              <EmptyState
                icon="package"
                title="No hay productos en la carta"
                description="Sumá tu primer producto con el botón + arriba"
              />
            </CardContent>
          </Card>
        ) : null}

        {/* ── Toolbar de búsqueda + filtros ────────────────────────────────── */}
        {productosActivos.length > 0 ? (
          <div className="space-y-2">
            <div className="relative">
              <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={busqueda}
                onChange={(e) => setBusqueda(e.target.value)}
                placeholder="Buscar producto por nombre…"
                className="pl-9 pr-9"
              />
              {busqueda ? (
                <button
                  type="button"
                  onClick={() => setBusqueda("")}
                  className="absolute right-2 top-1/2 -translate-y-1/2 flex h-6 w-6 items-center justify-center rounded-md text-muted-foreground hover:bg-muted hover:text-foreground"
                  aria-label="Limpiar búsqueda"
                >
                  <X className="size-3.5" />
                </button>
              ) : null}
            </div>

            <div className="flex flex-wrap items-center gap-1.5">
              <FilterChip
                active={filtroStock === "todos"}
                onClick={() => setFiltroStock("todos")}
                label={`Todos (${productosActivos.length})`}
              />
              <FilterChip
                active={filtroStock === "bajo"}
                onClick={() => setFiltroStock("bajo")}
                label={`Stock bajo (${stockBajo.length})`}
                tone="warning"
                disabled={stockBajo.length === 0}
              />
              <FilterChip
                active={filtroStock === "sinImagen"}
                onClick={() => setFiltroStock("sinImagen")}
                label={`Sin imagen (${sinImagen.length})`}
                disabled={sinImagen.length === 0}
              />

              {activas.length > 1 ? (
                <div className="ml-auto flex items-center gap-1">
                  <IconAction
                    onClick={expandirTodas}
                    icon={<ChevronsDownUp className="size-3.5" />}
                    label="Expandir todas"
                  />
                  <IconAction
                    onClick={colapsarTodas}
                    icon={<ChevronsUpDown className="size-3.5" />}
                    label="Colapsar todas"
                  />
                </div>
              ) : null}
            </div>
          </div>
        ) : null}

        {/* ── Card destacado: Stock bajo (solo si no hay filtro activo) ────── */}
        {filtroStock === "todos" && stockBajo.length > 0 ? (
          <Card className="overflow-hidden p-0 border-warning/30 card-elevated">
            <CardHeader className="border-b border-warning/20 bg-gradient-to-r from-warning/10 to-transparent p-3.5">
              <CardTitle className="flex items-center gap-2 text-sm font-medium text-warning">
                <AlertTriangle className="size-4" />
                Stock bajo ({stockBajo.length})
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 p-3 pt-3">
              {stockBajo.map((p) => (
                <PlatoCard
                  key={p.id}
                  producto={p}
                  showStock
                  admin={{
                    onNombreChange: (v) => changeNombre(p, v),
                    onPrecioChange: (v) => changePrecio(p, v),
                    onStockChange: (d) => changeStock(p, d),
                  }}
                  trailing={
                    <div className="flex items-center gap-1">
                      {recienEditados.has(p.id) ? (
                        <span
                          className="inline-flex h-7 items-center gap-1 rounded-md bg-success/15 px-1.5 text-[10px] font-medium text-success"
                          aria-label="Recién editado"
                        >
                          <Check className="size-3" />
                        </span>
                      ) : null}
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          openEdit(p);
                        }}
                        className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
                        aria-label={`Editar ${p.nombre} completo`}
                        title="Editar completo"
                      >
                        <Pencil className="size-3.5" />
                      </button>
                    </div>
                  }
                />
              ))}
            </CardContent>
          </Card>
        ) : null}

        {/* ── Sin imagen ──────────────────────────────────────────────────── */}
        {filtroStock === "todos" && sinImagen.length > 0 ? (
          <Card className="overflow-hidden p-0 card-elevated">
            <CardContent className="flex items-center gap-2 px-3 py-2 text-xs text-muted-foreground">
              <ImageOff className="size-3.5 shrink-0" />
              <span className="flex-1">
                {sinImagen.length} platos sin imagen. Editá uno y agregale una
                desde el ícono{" "}
                <Pencil className="inline size-3" /> al lado del nombre.
              </span>
            </CardContent>
          </Card>
        ) : null}

        {/* ── Listado por categoría ────────────────────────────────────────── */}
        {activas.map((cat) => {
          const items = productosFiltrados.filter((p) => p.categoriaId === cat.id);
          if (items.length === 0) return null;
          return (
            <CollapsibleSection
              key={cat.id}
              title={cat.nombre}
              count={items.length}
              emoji={cat.emoji}
              open={abiertasPorCategoria[cat.id] ?? true}
              onOpenChange={(next) => toggleCategoria(cat.id, next)}
              trailing={
                <button
                  type="button"
                  onClick={() => openNew(cat.id)}
                  className="inline-flex h-7 items-center gap-1 rounded-md border border-border bg-background/60 px-2 text-xs font-medium text-muted-foreground transition-colors hover:border-brand/60 hover:bg-brand/10 hover:text-brand"
                  title={`Agregar plato a ${cat.nombre}`}
                  aria-label={`Agregar plato a ${cat.nombre}`}
                >
                  <Plus className="size-3" />
                  Agregar
                </button>
              }
            >
              {items.map((p) => (
                <PlatoCard
                  key={p.id}
                  producto={p}
                  showStock
                  admin={{
                    onNombreChange: (v) => changeNombre(p, v),
                    onPrecioChange: (v) => changePrecio(p, v),
                    onStockChange: (d) => changeStock(p, d),
                  }}
                  trailing={
                    <div className="flex items-center gap-1">
                      {recienEditados.has(p.id) ? (
                        <span
                          className="inline-flex h-7 items-center gap-1 rounded-md bg-success/15 px-1.5 text-[10px] font-medium text-success"
                          aria-label="Recién editado"
                        >
                          <Check className="size-3" />
                        </span>
                      ) : null}
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          openEdit(p);
                        }}
                        className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
                        aria-label={`Editar ${p.nombre} completo`}
                        title="Editar completo"
                      >
                        <Pencil className="size-3.5" />
                      </button>
                    </div>
                  }
                />
              ))}
            </CollapsibleSection>
          );
        })}

        {/* ── Estado vacío cuando hay búsqueda/filtro sin resultados ─────── */}
        {productosActivos.length > 0 && productosFiltrados.length === 0 ? (
          <Card className="border-dashed">
            <CardContent className="py-8 text-center">
              <p className="text-sm text-muted-foreground">
                {busqueda
                  ? `Ningún producto matchea "${busqueda}"`
                  : "No hay productos con este filtro"}
              </p>
              <button
                type="button"
                onClick={() => {
                  setBusqueda("");
                  setFiltroStock("todos");
                }}
                className="mt-2 text-xs text-brand hover:underline"
              >
                Limpiar filtros
              </button>
            </CardContent>
          </Card>
        ) : null}

        {/* ── Tip de ayuda (al final, separado del listado) ────────────────── */}
        {productosActivos.length > 0 ? (
          <p className="flex items-start gap-1.5 rounded-md border border-dashed border-brand/30 bg-brand/5 px-2.5 py-2 text-[11px] leading-relaxed text-muted-foreground">
            <Sparkles className="mt-0.5 size-3 shrink-0 text-brand" />
            <span>
              <span className="font-medium text-foreground">Edición rápida:</span>{" "}
              tocá el <span className="font-medium text-foreground">nombre</span>, el{" "}
              <span className="font-medium text-foreground">precio</span> o usá{" "}
              <span className="font-mono">−/+</span> en el stock.{" "}
              <span className="font-medium text-foreground">Enter</span> guarda,{" "}
              <span className="font-medium text-foreground">Esc</span> cancela.
              Para todo lo demás, usá el ícono{" "}
              <Pencil className="inline size-3" />.
            </span>
          </p>
        ) : null}
      </main>

      <ProductoFormDialog
        key={editing?.id ?? `new-${categoriaPreCreacion ?? "any"}`}
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        producto={editing}
        defaultCategoriaId={categoriaPreCreacion ?? undefined}
      />
    </>
  );
}

function FilterChip({
  active,
  onClick,
  label,
  tone = "default",
  disabled = false,
}: {
  active: boolean;
  onClick: () => void;
  label: string;
  tone?: "default" | "warning";
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      aria-pressed={active}
      className={cn(
        "inline-flex h-7 items-center gap-1.5 rounded-full border px-2.5 text-xs font-medium transition-colors",
        active
          ? tone === "warning"
            ? "border-warning/60 bg-warning/15 text-warning"
            : "border-brand/60 bg-brand/15 text-brand"
          : "border-border bg-background text-muted-foreground hover:bg-muted hover:text-foreground",
        disabled && "opacity-40 cursor-not-allowed",
      )}
    >
      {label}
    </button>
  );
}

function IconAction({
  onClick,
  icon,
  label,
}: {
  onClick: () => void;
  icon: React.ReactNode;
  label: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      title={label}
      aria-label={label}
      className="inline-flex h-7 w-7 items-center justify-center rounded-md border border-border bg-background text-muted-foreground transition-colors hover:border-brand/60 hover:bg-brand/10 hover:text-brand"
    >
      {icon}
    </button>
  );
}