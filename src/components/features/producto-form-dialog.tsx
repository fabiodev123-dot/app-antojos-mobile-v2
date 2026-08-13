"use client";

import { useMemo, useState } from "react";
import { Save, Trash2, Loader2 } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ColorPicker } from "@/components/features/color-picker";
import { ImageUploader } from "@/components/features/image-uploader";
import { categoriasRepository, productosRepository } from "@/lib/repositories";
import { useRepositoryList } from "@/hooks/use-repository";
import {
  COLOR_PLATO_HEX,
  type ColorPlato,
  type Producto,
} from "@/lib/types";
import {
  productoCreateSchema,
  productoFormSchema,
  type FieldErrors,
  zodToFieldErrors,
} from "@/lib/schemas";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

interface ProductoFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  producto?: Producto | null;
  /**
   * Categoría preseleccionada al crear un producto nuevo (cuando se abre
   * desde el botón "+ Agregar" de una categoría específica).
   */
  defaultCategoriaId?: string;
}

const EMOJI_SUGERIDOS = ["🥪", "🍖", "🍕", "🥟", "🥧", "🥗", "🍲", "🥤", "🍺", "🍷", "🍮", "🍰", "🍨", "🍫", "🍍", "💧", ""];

function buildInitial(producto: Producto | null | undefined, firstCategoriaId: string) {
  if (producto) {
    return {
      nombre: producto.nombre,
      descripcion: producto.descripcion ?? "",
      categoriaId: producto.categoriaId,
      precio: producto.precio.toString(),
      color: producto.color,
      emoji: producto.emoji ?? "",
      imagen: producto.imagen ?? "",
      stockActual: producto.stockActual.toString(),
      stockMinimo: producto.stockMinimo.toString(),
      activo: producto.activo,
    };
  }
  return {
    nombre: "",
    descripcion: "",
    categoriaId: firstCategoriaId,
    precio: "",
    color: "red" as ColorPlato,
    emoji: "",
    imagen: "",
    stockActual: "0",
    stockMinimo: "0",
    activo: true,
  };
}

/**
 * Header de sección con línea y label uppercase. Reutilizable en el modal.
 */
function SectionHeader({
  children,
  hint,
}: {
  children: React.ReactNode;
  hint?: string;
}) {
  return (
    <div className="flex items-baseline justify-between gap-2 border-b border-border/60 pb-1.5">
      <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-medium">
        {children}
      </p>
      {hint ? (
        <p className="text-[10px] text-muted-foreground/70">{hint}</p>
      ) : null}
    </div>
  );
}

export function ProductoFormDialog({ open, onOpenChange, producto, defaultCategoriaId }: ProductoFormDialogProps) {
  const categorias = useRepositoryList(categoriasRepository);
  const isEditing = !!producto;
  const initialCategoriaId =
    producto?.categoriaId ?? defaultCategoriaId ?? categorias[0]?.id ?? "";
  const [state, setState] = useState(() => buildInitial(producto, initialCategoriaId));
  const [errors, setErrors] = useState<FieldErrors>({});
  const [saving, setSaving] = useState(false);

  // Preview derivado en vivo para mostrar al usuario cómo va a quedar.
  const previewCategoria = useMemo(
    () => categorias.find((c) => c.id === state.categoriaId),
    [categorias, state.categoriaId],
  );

  const precioNum = Number(state.precio);
  const stockNum = Number(state.stockActual);

  function handleSave() {
    const formResult = productoFormSchema.safeParse(state);
    const formErrors = formResult.success ? {} : zodToFieldErrors(formResult.error);
    if (!formResult.success) {
      setErrors(formErrors);
      return;
    }

    if (!Number.isFinite(precioNum) || precioNum <= 0) {
      setErrors({ ...formErrors, precio: "Precio mayor a 0" });
      return;
    }

    const createResult = productoCreateSchema.safeParse({
      ...formResult.data,
      precio: precioNum,
    });
    if (!createResult.success) {
      setErrors(zodToFieldErrors(createResult.error));
      return;
    }

    setSaving(true);
    try {
      if (isEditing && producto) {
        productosRepository.update(producto.id, createResult.data);
        toast.success(`"${createResult.data.nombre}" actualizado`);
      } else {
        productosRepository.create(createResult.data);
        toast.success(`"${createResult.data.nombre}" creado`);
      }
      onOpenChange(false);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Error al guardar");
    } finally {
      setSaving(false);
    }
  }

  function handleDelete() {
    if (!producto) return;
    if (!confirm(`¿Eliminar "${producto.nombre}"? Esta acción no se puede deshacer.`)) return;
    productosRepository.delete(producto.id);
    toast.success(`"${producto.nombre}" eliminado`);
    onOpenChange(false);
  }

  // Validaciones live (para feedback visual antes de submit)
  const liveErrors: FieldErrors = {};
  if (state.nombre.trim().length === 0) liveErrors.nombre = "Requerido";
  if (state.categoriaId === "") liveErrors.categoriaId = "Elegí una categoría";
  if (state.precio !== "" && (!Number.isFinite(precioNum) || precioNum <= 0))
    liveErrors.precio = "Precio mayor a 0";
  if (state.stockActual !== "" && (!Number.isFinite(stockNum) || stockNum < 0))
    liveErrors.stockActual = "Número ≥ 0";
  if (state.stockMinimo !== "" && (!Number.isFinite(Number(state.stockMinimo)) || Number(state.stockMinimo) < 0))
    liveErrors.stockMinimo = "Número ≥ 0";

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="font-heading text-xl font-semibold tracking-tight">
            {isEditing ? "Editar producto" : "Nuevo producto"}
          </DialogTitle>
          <DialogDescription>
            {isEditing
              ? "Modificá los datos del producto. El cambio aplica a partir de ahora."
              : "Sumá un producto a la carta. Asignale un color único para identificarlo visualmente."}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-5">
          {/* ── Identidad ───────────────────────────────────────────────────── */}
          <section className="space-y-3">
            <SectionHeader>Identidad</SectionHeader>

            <div className="space-y-1.5">
              <Label htmlFor="nombre">Nombre *</Label>
              <Input
                id="nombre"
                value={state.nombre}
                onChange={(e) => setState({ ...state, nombre: e.target.value })}
                placeholder="Ej: Miga de Jamón y Queso"
                autoFocus
                aria-invalid={!!(errors.nombre ?? liveErrors.nombre)}
                className={cn(!!(errors.nombre ?? liveErrors.nombre) && "border-destructive")}
              />
              {(errors.nombre ?? liveErrors.nombre) ? (
                <p className="text-xs text-destructive">{errors.nombre ?? liveErrors.nombre}</p>
              ) : null}
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="descripcion">Descripción</Label>
              <Input
                id="descripcion"
                value={state.descripcion}
                onChange={(e) => setState({ ...state, descripcion: e.target.value })}
                placeholder="Opcional"
                aria-invalid={!!errors.descripcion}
              />
              {errors.descripcion ? (
                <p className="text-xs text-destructive">{errors.descripcion}</p>
              ) : null}
            </div>
          </section>

          {/* ── Categoría y precio ──────────────────────────────────────────── */}
          <section className="space-y-3">
            <SectionHeader>Clasificación</SectionHeader>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="categoria">Categoría *</Label>
                <Select
                  value={state.categoriaId}
                  onValueChange={(v) => setState({ ...state, categoriaId: v ?? "" })}
                >
                  <SelectTrigger
                    id="categoria"
                    aria-invalid={!!(errors.categoriaId ?? liveErrors.categoriaId)}
                    className={cn(!!(errors.categoriaId ?? liveErrors.categoriaId) && "border-destructive")}
                  >
                    <SelectValue placeholder="Elegí" />
                  </SelectTrigger>
                  <SelectContent>
                    {categorias.filter((c) => c.activo).map((c) => (
                      <SelectItem key={c.id} value={c.id}>
                        <span className="mr-1.5">{c.emoji}</span>
                        {c.nombre}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {(errors.categoriaId ?? liveErrors.categoriaId) ? (
                  <p className="text-xs text-destructive">
                    {errors.categoriaId ?? liveErrors.categoriaId}
                  </p>
                ) : null}
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="precio">Precio *</Label>
                <div className="relative">
                  <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">
                    $
                  </span>
                  <Input
                    id="precio"
                    type="number"
                    inputMode="decimal"
                    step="50"
                    min="0"
                    value={state.precio}
                    onChange={(e) => setState({ ...state, precio: e.target.value })}
                    placeholder="0"
                    className={cn(
                      "pl-6 tabular-nums",
                      !!(errors.precio ?? liveErrors.precio) && "border-destructive",
                    )}
                    aria-invalid={!!(errors.precio ?? liveErrors.precio)}
                  />
                </div>
                {(errors.precio ?? liveErrors.precio) ? (
                  <p className="text-xs text-destructive">
                    {errors.precio ?? liveErrors.precio}
                  </p>
                ) : null}
              </div>
            </div>
          </section>

          {/* ── Stock ───────────────────────────────────────────────────────── */}
          <section className="space-y-3 rounded-lg border border-border bg-muted/20 p-3">
            <SectionHeader hint="Baja automático al vender">
              Stock disponible (lote pre-hecho)
            </SectionHeader>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="stockActual">Stock actual *</Label>
                <Input
                  id="stockActual"
                  type="number"
                  inputMode="numeric"
                  step="1"
                  min="0"
                  value={state.stockActual}
                  onChange={(e) => setState({ ...state, stockActual: e.target.value })}
                  placeholder="0"
                  className={cn(
                    "tabular-nums",
                    !!(errors.stockActual ?? liveErrors.stockActual) && "border-destructive",
                  )}
                  aria-invalid={!!(errors.stockActual ?? liveErrors.stockActual)}
                />
                {(errors.stockActual ?? liveErrors.stockActual) ? (
                  <p className="text-xs text-destructive">
                    {errors.stockActual ?? liveErrors.stockActual}
                  </p>
                ) : null}
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="stockMinimo">Alerta cuando baje de *</Label>
                <Input
                  id="stockMinimo"
                  type="number"
                  inputMode="numeric"
                  step="1"
                  min="0"
                  value={state.stockMinimo}
                  onChange={(e) => setState({ ...state, stockMinimo: e.target.value })}
                  placeholder="0"
                  className={cn(
                    "tabular-nums",
                    !!(errors.stockMinimo ?? liveErrors.stockMinimo) && "border-destructive",
                  )}
                  aria-invalid={!!(errors.stockMinimo ?? liveErrors.stockMinimo)}
                />
                {(errors.stockMinimo ?? liveErrors.stockMinimo) ? (
                  <p className="text-xs text-destructive">
                    {errors.stockMinimo ?? liveErrors.stockMinimo}
                  </p>
                ) : null}
              </div>
            </div>
          </section>

          {/* ── Apariencia ──────────────────────────────────────────────────── */}
          <section className="space-y-3">
            <SectionHeader>Apariencia</SectionHeader>

            <div className="space-y-1.5">
              <Label>Color identificatorio *</Label>
              <ColorPicker
                value={state.color}
                onChange={(c) => setState({ ...state, color: c })}
              />
              <p className="text-xs text-muted-foreground">
                Seleccionado:{" "}
                <span className="font-medium text-foreground">
                  {COLOR_PLATO_HEX[state.color].label}
                </span>{" "}
                — se usa en el stripe del card para reconocer el plato de un vistazo.
              </p>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="emoji">Emoji</Label>
              <div className="flex flex-wrap gap-1">
                {EMOJI_SUGERIDOS.map((e) => (
                  <button
                    key={e || "none"}
                    type="button"
                    onClick={() => setState({ ...state, emoji: e })}
                    className={cn(
                      "h-9 w-9 rounded-md border text-lg transition-colors",
                      state.emoji === e
                        ? "border-brand bg-brand/15 text-brand"
                        : "border-border bg-background hover:bg-muted",
                    )}
                    aria-pressed={state.emoji === e}
                    aria-label={e || "Sin emoji"}
                  >
                    {e || "—"}
                  </button>
                ))}
              </div>
            </div>

            <div className="space-y-1.5">
              <Label>Imagen</Label>
              <ImageUploader
                value={state.imagen}
                onChange={(v) => {
                  setState({ ...state, imagen: v });
                  if (errors.imagen) {
                    const { imagen: _omit, ...rest } = errors;
                    void _omit;
                    setErrors(rest);
                  }
                }}
                onError={(msg) => toast.error(msg)}
              />
              {errors.imagen ? (
                <p className="text-xs text-destructive">{errors.imagen}</p>
              ) : null}
            </div>
          </section>

          {/* ── Preview en vivo ─────────────────────────────────────────────── */}
          {state.nombre.trim().length > 0 ? (
            <section className="rounded-lg border border-dashed border-border/60 bg-card/40 p-3">
              <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-medium">
                Vista previa
              </p>
              <div className="mt-2 flex items-center gap-3">
                {state.imagen ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={state.imagen}
                    alt=""
                    className="size-10 shrink-0 rounded-md object-cover ring-1 ring-white/15 bg-muted shadow-[0_2px_8px_-2px_rgba(0,0,0,0.5)] sm:size-12"
                  />
                ) : state.emoji ? (
                  <span className="grid size-10 shrink-0 place-items-center rounded-md bg-muted text-lg sm:size-12 sm:text-xl">
                    {state.emoji}
                  </span>
                ) : (
                  <span
                    className="size-10 shrink-0 rounded-md bg-muted sm:size-12"
                    style={{
                      borderLeft: `4px solid ${COLOR_PLATO_HEX[state.color].bg}`,
                    }}
                  />
                )}
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium">{state.nombre}</p>
                  <p className="text-[11px] text-muted-foreground">
                    {previewCategoria?.emoji} {previewCategoria?.nombre ?? "Sin categoría"}
                  </p>
                </div>
                <span className="font-heading text-sm font-semibold tabular-nums leading-none sm:text-base">
                  ${Number.isFinite(precioNum) ? precioNum.toLocaleString("es-AR") : "0"}
                </span>
              </div>
            </section>
          ) : null}

          {/* ── Estado ──────────────────────────────────────────────────────── */}
          <label
            htmlFor="activo"
            className="flex cursor-pointer items-center justify-between gap-3 rounded-lg border border-border bg-background/40 p-3"
          >
            <div>
              <p className="text-sm font-medium">Activo en la carta</p>
              <p className="text-[11px] text-muted-foreground">
                Si está apagado, el plato no aparece en el selector de pedidos.
              </p>
            </div>
            <span
              className={cn(
                "relative inline-flex h-6 w-11 shrink-0 items-center rounded-full transition-colors",
                state.activo ? "bg-brand" : "bg-muted",
              )}
              role="presentation"
            >
              <span
                className={cn(
                  "inline-block size-5 transform rounded-full bg-white shadow transition-transform",
                  state.activo ? "translate-x-5" : "translate-x-0.5",
                )}
              />
            </span>
            <input
              id="activo"
              type="checkbox"
              checked={state.activo}
              onChange={(e) => setState({ ...state, activo: e.target.checked })}
              className="sr-only"
            />
          </label>
        </div>

        <DialogFooter className="gap-2 sm:justify-between">
          {isEditing ? (
            <Button
              type="button"
              variant="destructive"
              size="sm"
              onClick={handleDelete}
              disabled={saving}
            >
              <Trash2 className="size-3.5" />
              Eliminar
            </Button>
          ) : (
            <span />
          )}
          <div className="flex gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => onOpenChange(false)}
              disabled={saving}
            >
              Cancelar
            </Button>
            <Button
              type="button"
              size="sm"
              onClick={handleSave}
              disabled={saving}
              className="bg-gradient-to-br from-brand to-secondary text-primary-foreground hover:brightness-110 brand-glow border-0"
            >
              {saving ? (
                <Loader2 className="size-3.5 animate-spin" />
              ) : (
                <Save className="size-3.5" />
              )}
              {isEditing ? "Guardar cambios" : "Crear producto"}
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}