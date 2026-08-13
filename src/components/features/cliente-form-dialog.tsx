"use client";

import { useState } from "react";
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
import { Textarea } from "@/components/ui/textarea";
import { clientesRepository } from "@/lib/repositories";
import {
  clienteCreateSchema,
  clienteFormSchema,
  type FieldErrors,
  zodToFieldErrors,
} from "@/lib/schemas";
import type { Cliente } from "@/lib/types";
import { toast } from "sonner";

interface ClienteFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  cliente?: Cliente | null;
}

function buildInitial(cliente: Cliente | null | undefined) {
  if (cliente) {
    return {
      nombre: cliente.nombre,
      telefono: cliente.telefono,
      direccion: cliente.direccion ?? "",
      email: cliente.email ?? "",
      notas: cliente.notas ?? "",
    };
  }
  return { nombre: "", telefono: "", direccion: "", email: "", notas: "" };
}

export function ClienteFormDialog({ open, onOpenChange, cliente }: ClienteFormDialogProps) {
  const isEditing = !!cliente;
  const [state, setState] = useState(() => buildInitial(cliente));
  const [errors, setErrors] = useState<FieldErrors>({});
  const [saving, setSaving] = useState(false);

  function handleSave() {
    const formResult = clienteFormSchema.safeParse(state);
    if (!formResult.success) {
      setErrors(zodToFieldErrors(formResult.error));
      return;
    }

    const createResult = clienteCreateSchema.safeParse({
      ...formResult.data,
      totalPedidos: cliente?.totalPedidos ?? 0,
      ultimaCompra: cliente?.ultimaCompra,
    });
    if (!createResult.success) {
      setErrors(zodToFieldErrors(createResult.error));
      return;
    }

    setSaving(true);
    try {
      if (isEditing && cliente) {
        clientesRepository.update(cliente.id, createResult.data);
        toast.success(`"${createResult.data.nombre}" actualizado`);
      } else {
        clientesRepository.create(createResult.data);
        toast.success(`"${createResult.data.nombre}" agregado`);
      }
      onOpenChange(false);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Error al guardar");
    } finally {
      setSaving(false);
    }
  }

  function handleDelete() {
    if (!cliente) return;
    if (!confirm(`¿Eliminar a "${cliente.nombre}"? Sus pedidos históricos se conservan.`)) return;
    clientesRepository.delete(cliente.id);
    toast.success(`"${cliente.nombre}" eliminado`);
    onOpenChange(false);
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{isEditing ? "Editar cliente" : "Nuevo cliente"}</DialogTitle>
          <DialogDescription>
            {isEditing
              ? "Modificá los datos del cliente."
              : "Sumá un cliente con sus datos de contacto."}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="nombre">Nombre *</Label>
            <Input
              id="nombre"
              value={state.nombre}
              onChange={(e) => setState({ ...state, nombre: e.target.value })}
              placeholder="Ej: María González"
              autoFocus
              aria-invalid={!!errors.nombre}
            />
            {errors.nombre ? <p className="text-xs text-destructive">{errors.nombre}</p> : null}
          </div>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="telefono">Teléfono *</Label>
              <Input
                id="telefono"
                value={state.telefono}
                onChange={(e) => setState({ ...state, telefono: e.target.value })}
                placeholder="+54 11 5555-1234"
                aria-invalid={!!errors.telefono}
              />
              {errors.telefono ? <p className="text-xs text-destructive">{errors.telefono}</p> : null}
            </div>
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                value={state.email}
                onChange={(e) => setState({ ...state, email: e.target.value })}
                placeholder="opcional"
                aria-invalid={!!errors.email}
              />
              {errors.email ? <p className="text-xs text-destructive">{errors.email}</p> : null}
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="direccion">Dirección</Label>
            <Input
              id="direccion"
              value={state.direccion}
              onChange={(e) => setState({ ...state, direccion: e.target.value })}
              placeholder="Calle, número, piso/depto — opcional"
              aria-invalid={!!errors.direccion}
            />
            {errors.direccion ? <p className="text-xs text-destructive">{errors.direccion}</p> : null}
          </div>

          <div className="space-y-2">
            <Label htmlFor="notas">Notas</Label>
            <Textarea
              id="notas"
              value={state.notas}
              onChange={(e) => setState({ ...state, notas: e.target.value })}
              placeholder="Preferencias, horarios, observaciones..."
              rows={3}
              aria-invalid={!!errors.notas}
            />
            {errors.notas ? <p className="text-xs text-destructive">{errors.notas}</p> : null}
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
              {isEditing ? "Guardar cambios" : "Crear cliente"}
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}