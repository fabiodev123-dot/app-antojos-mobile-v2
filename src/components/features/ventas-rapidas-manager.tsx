"use client";

import { useState, useTransition } from "react";
import { Pencil, Trash2, Loader2, Zap } from "lucide-react";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ventasRapidasRepository } from "@/lib/repositories";
import {
  ventaRapidaFormSchema,
  ventaRapidaCreateSchema,
  zodToFieldErrors,
  type FieldErrors,
} from "@/lib/schemas";
import { formatPrecio } from "@/lib/format";
import type { VentaRapida } from "@/lib/types";

type EditForm = {
  monto: string;
  hora: string;
  nota: string;
};

const EMPTY_FORM: EditForm = { monto: "", hora: "", nota: "" };

export function VentasRapidasManager({
  ventas,
}: {
  ventas: VentaRapida[];
}) {
  const [editing, setEditing] = useState<VentaRapida | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const [form, setForm] = useState<EditForm>(EMPTY_FORM);
  const [errors, setErrors] = useState<FieldErrors>({});

  function openEdit(v: VentaRapida) {
    setEditing(v);
    setForm({ monto: String(v.monto), hora: v.hora, nota: v.nota ?? "" });
    setErrors({});
  }

  function closeEdit() {
    setEditing(null);
    setForm(EMPTY_FORM);
    setErrors({});
  }

  function handleSave() {
    if (!editing) return;

    const formResult = ventaRapidaFormSchema.safeParse(form);
    if (!formResult.success) {
      setErrors(zodToFieldErrors(formResult.error));
      return;
    }

    const createResult = ventaRapidaCreateSchema.safeParse({
      ...formResult.data,
      fecha: editing.fecha,
    });
    if (!createResult.success) {
      setErrors(zodToFieldErrors(createResult.error));
      return;
    }

    startTransition(async () => {
      try {
        await ventasRapidasRepository.update(editing.id, createResult.data);
        toast.success("Venta actualizada");
        closeEdit();
      } catch {
        toast.error("No se pudo actualizar la venta");
      }
    });
  }

  function handleDelete(id: string) {
    if (!confirm("¿Eliminar esta venta rápida? No se puede deshacer.")) {
      return;
    }
    setDeletingId(id);
    startTransition(async () => {
      try {
        await ventasRapidasRepository["delete"](id);
        toast.success("Venta eliminada");
      } catch {
        toast.error("No se pudo eliminar la venta");
      } finally {
        setDeletingId(null);
      }
    });
  }

  if (ventas.length === 0) return null;

  return (
    <>
      <Card className="overflow-hidden p-0 card-elevated">
        <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 border-b border-border/60 bg-gradient-to-r from-muted/40 to-transparent p-3.5">
          <CardTitle className="flex items-center gap-2 text-sm font-medium">
            <Zap className="size-4 text-primary" />
            Ventas rápidas
          </CardTitle>
          <Badge
            variant="outline"
            className="border-primary/30 bg-primary/10 text-primary text-[10px]"
          >
            {ventas.length} {ventas.length === 1 ? "anotada" : "anotadas"}
          </Badge>
        </CardHeader>
        <CardContent className="divide-y divide-border p-0">
          {ventas.map((v) => (
            <div
              key={v.id}
              className="flex items-center justify-between gap-2 p-3"
            >
              <div className="min-w-0 flex items-center gap-2">
                <span className="text-[10px] font-mono tabular-nums text-muted-foreground shrink-0">
                  {v.hora}
                </span>
                {v.nota ? (
                  <span className="truncate text-sm text-muted-foreground">
                    {v.nota}
                  </span>
                ) : null}
              </div>
              <div className="flex items-center gap-1.5">
                <span className="font-heading font-semibold tabular-nums text-success shrink-0 mr-1">
                  {formatPrecio(v.monto)}
                </span>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon-sm"
                  onClick={() => openEdit(v)}
                  aria-label={`Editar venta de ${v.hora}`}
                  disabled={isPending}
                >
                  <Pencil className="size-3.5" />
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon-sm"
                  onClick={() => handleDelete(v.id)}
                  disabled={isPending}
                  aria-label={`Eliminar venta de ${v.hora}`}
                >
                  {deletingId === v.id && isPending ? (
                    <Loader2 className="size-3 animate-spin" />
                  ) : (
                    <Trash2 className="size-3.5" />
                  )}
                </Button>
              </div>
            </div>
          ))}
        </CardContent>
      </Card>

      <Dialog open={!!editing} onOpenChange={(open) => !open && closeEdit()}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Editar venta rápida</DialogTitle>
            <DialogDescription>
              Corregí el monto, hora o nota. La fecha no se puede cambiar.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <div className="space-y-1.5">
              <Label htmlFor="vr-monto" className="text-xs">
                Monto (ARS)
              </Label>
              <Input
                id="vr-monto"
                type="text"
                inputMode="decimal"
                placeholder="5000"
                value={form.monto}
                onChange={(e) => setForm({ ...form, monto: e.target.value })}
                className={errors.monto ? "border-destructive" : ""}
              />
              {errors.monto && (
                <p className="text-destructive text-xs">{errors.monto}</p>
              )}
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="vr-hora" className="text-xs">
                Hora
              </Label>
              <Input
                id="vr-hora"
                type="time"
                value={form.hora}
                onChange={(e) => setForm({ ...form, hora: e.target.value })}
                className={errors.hora ? "border-destructive" : ""}
              />
              {errors.hora && (
                <p className="text-destructive text-xs">{errors.hora}</p>
              )}
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="vr-nota" className="text-xs">
                Nota (opcional)
              </Label>
              <Input
                id="vr-nota"
                type="text"
                placeholder="Ej: efectivo sin cliente"
                value={form.nota}
                onChange={(e) => setForm({ ...form, nota: e.target.value })}
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={closeEdit}
              disabled={isPending}
            >
              Cancelar
            </Button>
            <Button type="button" onClick={handleSave} disabled={isPending}>
              {isPending ? "Guardando…" : "Guardar"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}