"use client";

import { useState } from "react";
import { Save, Trash2, Loader2, PackagePlus, PackageMinus } from "lucide-react";
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
import { ingredientesRepository, movimientosStockRepository } from "@/lib/repositories";
import { nowIso } from "@/lib/repositories/types";
import {
  ingredienteCreateSchema,
  ingredienteFormSchema,
  type FieldErrors,
  zodToFieldErrors,
} from "@/lib/schemas";
import type { Ingrediente, UnidadMedida } from "@/lib/types";
import { toast } from "sonner";

interface IngredienteFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  ingrediente?: Ingrediente | null;
}

const UNIDADES: UnidadMedida[] = ["kg", "g", "l", "ml", "unidad", "paquete"];

const UNIDAD_LABELS: Record<UnidadMedida, string> = {
  kg: "Kilogramo (kg)",
  g: "Gramo (g)",
  l: "Litro (l)",
  ml: "Mililitro (ml)",
  unidad: "Unidad",
  paquete: "Paquete",
};

function buildInitial(ingrediente: Ingrediente | null | undefined) {
  if (ingrediente) {
    return {
      nombre: ingrediente.nombre,
      unidad: ingrediente.unidad,
      stockActual: ingrediente.stockActual.toString(),
      stockMinimo: ingrediente.stockMinimo.toString(),
      costoUnitario: ingrediente.costoUnitario?.toString() ?? "",
      activo: ingrediente.activo,
    };
  }
  return {
    nombre: "",
    unidad: "kg" as UnidadMedida,
    stockActual: "0",
    stockMinimo: "0",
    costoUnitario: "",
    activo: true,
  };
}

export function IngredienteFormDialog({ open, onOpenChange, ingrediente }: IngredienteFormDialogProps) {
  const isEditing = !!ingrediente;
  const [state, setState] = useState(() => buildInitial(ingrediente));
  const [errors, setErrors] = useState<FieldErrors>({});
  const [saving, setSaving] = useState(false);

  function handleSave() {
    const formResult = ingredienteFormSchema.safeParse(state);
    if (!formResult.success) {
      setErrors(zodToFieldErrors(formResult.error));
      return;
    }

    const stockNum = Number(formResult.data.stockActual);
    const minNum = Number(formResult.data.stockMinimo);
    const costoNum = formResult.data.costoUnitario.trim() === ""
      ? undefined
      : Number(formResult.data.costoUnitario);

    const createResult = ingredienteCreateSchema.safeParse({
      ...formResult.data,
      stockActual: stockNum,
      stockMinimo: minNum,
      costoUnitario: costoNum,
    });
    if (!createResult.success) {
      setErrors(zodToFieldErrors(createResult.error));
      return;
    }

    setSaving(true);
    try {
      let ingredienteId: string;
      if (isEditing && ingrediente) {
        const stockAnterior = ingrediente.stockActual;
        const updated = ingredientesRepository.update(ingrediente.id, createResult.data);
        ingredienteId = updated.id;
        if (stockAnterior !== createResult.data.stockActual) {
          const delta = createResult.data.stockActual - stockAnterior;
          movimientosStockRepository.create({
            ingredienteId,
            tipo: delta > 0 ? "entrada" : "salida",
            cantidad: Math.abs(delta),
            motivo: "Ajuste manual",
            fecha: nowIso().slice(0, 10),
          });
        }
        toast.success(`"${createResult.data.nombre}" actualizado`);
      } else {
        const created = ingredientesRepository.create(createResult.data);
        ingredienteId = created.id;
        if (createResult.data.stockActual > 0) {
          movimientosStockRepository.create({
            ingredienteId,
            tipo: "entrada",
            cantidad: createResult.data.stockActual,
            motivo: "Stock inicial",
            fecha: nowIso().slice(0, 10),
          });
        }
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
    if (!ingrediente) return;
    if (!confirm(`¿Eliminar "${ingrediente.nombre}"? Se perderán también las recetas que lo usen.`)) return;
    ingredientesRepository.delete(ingrediente.id);
    toast.success(`"${ingrediente.nombre}" eliminado`);
    onOpenChange(false);
  }

  const stockActualNum = Number(state.stockActual);
  const delta = ingrediente && Number.isFinite(stockActualNum) ? stockActualNum - ingrediente.stockActual : 0;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{isEditing ? "Editar ingrediente" : "Nuevo ingrediente"}</DialogTitle>
          <DialogDescription>
            {isEditing
              ? "Modificá el stock o los datos del ingrediente. Los cambios de stock quedan registrados."
              : "Sumá un ingrediente al catálogo. Definí el stock actual y el mínimo para alertas."}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="nombre">Nombre *</Label>
            <Input
              id="nombre"
              value={state.nombre}
              onChange={(e) => setState({ ...state, nombre: e.target.value })}
              placeholder="Ej: Pan de miga"
              autoFocus
              aria-invalid={!!errors.nombre}
            />
            {errors.nombre ? <p className="text-xs text-destructive">{errors.nombre}</p> : null}
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label htmlFor="unidad">Unidad</Label>
              <Select
                value={state.unidad}
                onValueChange={(v) => setState({ ...state, unidad: (v ?? "kg") as UnidadMedida })}
              >
                <SelectTrigger id="unidad">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {UNIDADES.map((u) => (
                    <SelectItem key={u} value={u}>
                      {UNIDAD_LABELS[u]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="costo">Costo unitario</Label>
              <div className="relative">
                <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">$</span>
                <Input
                  id="costo"
                  type="number"
                  inputMode="decimal"
                  step="any"
                  min="0"
                  value={state.costoUnitario}
                  onChange={(e) => setState({ ...state, costoUnitario: e.target.value })}
                  placeholder="Opcional"
                  className="pl-6 tabular-nums"
                  aria-invalid={!!errors.costoUnitario}
                />
              </div>
              {errors.costoUnitario ? <p className="text-xs text-destructive">{errors.costoUnitario}</p> : null}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label htmlFor="stockActual">Stock actual *</Label>
              <Input
                id="stockActual"
                type="number"
                inputMode="decimal"
                step="any"
                min="0"
                value={state.stockActual}
                onChange={(e) => setState({ ...state, stockActual: e.target.value })}
                className="tabular-nums"
                aria-invalid={!!errors.stockActual}
              />
              {errors.stockActual ? <p className="text-xs text-destructive">{errors.stockActual}</p> : null}
            </div>

            <div className="space-y-2">
              <Label htmlFor="stockMinimo">Stock mínimo *</Label>
              <Input
                id="stockMinimo"
                type="number"
                inputMode="decimal"
                step="any"
                min="0"
                value={state.stockMinimo}
                onChange={(e) => setState({ ...state, stockMinimo: e.target.value })}
                className="tabular-nums"
                aria-invalid={!!errors.stockMinimo}
              />
              {errors.stockMinimo ? <p className="text-xs text-destructive">{errors.stockMinimo}</p> : null}
              <p className="text-[10px] text-muted-foreground">
                Alerta cuando stock actual ≤ mínimo.
              </p>
            </div>
          </div>

          {isEditing && delta !== 0 ? (
            <div className="flex items-center gap-2 rounded-lg border border-border bg-muted/30 p-3 text-xs">
              {delta > 0 ? (
                <PackagePlus className="size-4 text-success shrink-0" />
              ) : (
                <PackageMinus className="size-4 text-warning shrink-0" />
              )}
              <span>
                <strong>{delta > 0 ? "Entrada" : "Salida"}</strong> de{" "}
                <span className="font-mono tabular-nums">{Math.abs(delta)}</span> registrada automáticamente.
              </span>
            </div>
          ) : null}

          <div className="flex items-center gap-2">
            <input
              id="activo"
              type="checkbox"
              checked={state.activo}
              onChange={(e) => setState({ ...state, activo: e.target.checked })}
              className="size-4 rounded border-border"
            />
            <Label htmlFor="activo" className="cursor-pointer">
              Activo
            </Label>
          </div>
        </div>

        <DialogFooter className="gap-2 sm:justify-between">
          {isEditing ? (
            <Button type="button" variant="destructive" size="sm" onClick={handleDelete} disabled={saving}>
              <Trash2 className="size-3.5" />
              Eliminar
            </Button>
          ) : (
            <span />
          )}
          <div className="flex gap-2">
            <Button type="button" variant="outline" size="sm" onClick={() => onOpenChange(false)} disabled={saving}>
              Cancelar
            </Button>
            <Button type="button" size="sm" onClick={handleSave} disabled={saving}>
              {saving ? <Loader2 className="size-3.5 animate-spin" /> : <Save className="size-3.5" />}
              {isEditing ? "Guardar cambios" : "Crear ingrediente"}
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}