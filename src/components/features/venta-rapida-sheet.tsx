"use client";

import { useEffect, useRef, useState } from "react";
import { Zap, Loader2 } from "lucide-react";
import { toast } from "sonner";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ventasRapidasRepository } from "@/lib/repositories";
import {
  ventaRapidaFormSchema,
  ventaRapidaCreateSchema,
  type FieldErrors,
  zodToFieldErrors,
} from "@/lib/schemas";
import { hoy } from "@/lib/format";

interface VentaRapidaSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

/**
 * Sheet de captura rápida: 1 input de monto, 1 input de hora (autofill),
 * 1 input de nota opcional, 1 botón "Anotar". Pensado para que el dueño
 * anote "vendí $X" en 5 segundos sin pasar por el flujo de pedidos.
 */
export function VentaRapidaSheet({ open, onOpenChange }: VentaRapidaSheetProps) {
  const [monto, setMonto] = useState("");
  const [hora, setHora] = useState(() => formatHoraActual());
  const [nota, setNota] = useState("");
  const [errors, setErrors] = useState<FieldErrors>({});
  const [saving, setSaving] = useState(false);
  const montoRef = useRef<HTMLInputElement>(null);

  // Foco automático en el input de monto al abrir
  useEffect(() => {
    if (open) {
      // pequeño delay para que la animación termine
      const t = setTimeout(() => montoRef.current?.focus(), 100);
      return () => clearTimeout(t);
    }
  }, [open]);

  function reset() {
    setMonto("");
    setHora(formatHoraActual());
    setNota("");
    setErrors({});
  }

  function handleSave() {
    const formResult = ventaRapidaFormSchema.safeParse({ monto, hora, nota: nota || undefined });
    if (!formResult.success) {
      setErrors(zodToFieldErrors(formResult.error));
      return;
    }

    const createResult = ventaRapidaCreateSchema.safeParse({
      fecha: hoy(),
      hora: formResult.data.hora,
      monto: Number(formResult.data.monto),
      nota: formResult.data.nota || undefined,
    });
    if (!createResult.success) {
      setErrors(zodToFieldErrors(createResult.error));
      return;
    }

    setSaving(true);
    try {
      ventasRapidasRepository.create(createResult.data);
      toast.success(`Anotado: $${createResult.data.monto.toLocaleString("es-AR")}`);
      reset();
      onOpenChange(false);
    } catch {
      toast.error("No pude guardar la venta");
    } finally {
      setSaving(false);
    }
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="bottom"
        showCloseButton={false}
        className="rounded-t-2xl border-t border-x-0 border-b-0 sm:max-w-md sm:mx-auto"
      >
        <SheetHeader className="pb-3">
          <SheetTitle className="flex items-center gap-2 text-base">
            <Zap className="size-4 text-primary" />
            Anotar venta rápida
          </SheetTitle>
          <SheetDescription className="text-xs">
            Sin cliente, sin items. Solo el monto que vendiste.
          </SheetDescription>
        </SheetHeader>

        <div className="space-y-3 pb-[calc(1rem+env(safe-area-inset-bottom))]">
          <div className="space-y-1.5">
            <Label htmlFor="vr-monto" className="text-xs uppercase tracking-wider text-muted-foreground">
              Monto (ARS)
            </Label>
            <Input
              ref={montoRef}
              id="vr-monto"
              type="text"
              inputMode="numeric"
              pattern="[0-9]*"
              placeholder="5000"
              value={monto}
              onChange={(e) => setMonto(e.target.value.replace(/[^\d]/g, ""))}
              className="text-2xl font-heading font-bold tabular-nums h-14"
              autoComplete="off"
            />
            {errors.monto ? (
              <p className="text-xs text-destructive">{errors.monto}</p>
            ) : null}
          </div>

          <div className="grid grid-cols-2 gap-2">
            <div className="space-y-1.5">
              <Label htmlFor="vr-hora" className="text-xs uppercase tracking-wider text-muted-foreground">
                Hora
              </Label>
              <Input
                id="vr-hora"
                type="time"
                value={hora}
                onChange={(e) => setHora(e.target.value)}
                className="tabular-nums"
              />
              {errors.hora ? (
                <p className="text-xs text-destructive">{errors.hora}</p>
              ) : null}
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="vr-nota" className="text-xs uppercase tracking-wider text-muted-foreground">
                Nota (opcional)
              </Label>
              <Input
                id="vr-nota"
                type="text"
                placeholder="mostrador, sin delivery..."
                value={nota}
                onChange={(e) => setNota(e.target.value.slice(0, 120))}
                maxLength={120}
                autoComplete="off"
              />
            </div>
          </div>

          <Button
            className="w-full"
            size="lg"
            onClick={handleSave}
            disabled={saving || !monto}
          >
            {saving ? (
              <Loader2 className="size-4 animate-spin" />
            ) : (
              <Zap className="size-4" />
            )}
            {monto ? `Anotar $${Number(monto).toLocaleString("es-AR")}` : "Anotar"}
          </Button>
        </div>
      </SheetContent>
    </Sheet>
  );
}

function formatHoraActual(): string {
  const d = new Date();
  const hh = String(d.getHours()).padStart(2, "0");
  const mm = String(d.getMinutes()).padStart(2, "0");
  return `${hh}:${mm}`;
}
