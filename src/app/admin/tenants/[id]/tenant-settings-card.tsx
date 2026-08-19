"use client";

import { useState, useTransition } from "react";
import { Save } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { updateTenantAction, type UpdateTenantInput } from "./actions";

type Status = UpdateTenantInput["status"];
type Plan = UpdateTenantInput["plan"];

const STATUS_OPTIONS: Array<{ value: Status; label: string; hint: string }> = [
  { value: "active", label: "Activo", hint: "Acceso completo" },
  { value: "trial", label: "Trial", hint: "Período de prueba" },
  { value: "suspended", label: "Suspendido", hint: "Sin acceso" },
];

const PLAN_OPTIONS: Array<{ value: Plan; label: string }> = [
  { value: "free", label: "Free" },
  { value: "basic", label: "Basic" },
  { value: "pro", label: "Pro" },
];

export function TenantSettingsCard({
  tenantId,
  initialStatus,
  initialPlan,
}: {
  tenantId: string;
  initialStatus: Status;
  initialPlan: Plan;
}) {
  const [status, setStatus] = useState<Status>(initialStatus);
  const [plan, setPlan] = useState<Plan>(initialPlan);
  const [isPending, startTransition] = useTransition();
  const [feedback, setFeedback] = useState<{ ok: boolean; msg: string } | null>(
    null,
  );

  const dirty = status !== initialStatus || plan !== initialPlan;

  function handleSave() {
    setFeedback(null);
    startTransition(async () => {
      const result = await updateTenantAction(tenantId, { status, plan });
      if (result.ok) {
        setFeedback({ ok: true, msg: "Cambios guardados" });
      } else {
        setFeedback({ ok: false, msg: result.error });
      }
    });
  }

  return (
    <Card className="p-0">
      <CardHeader className="border-b border-border/60 p-4">
        <CardTitle className="text-sm">Configuración del tenant</CardTitle>
        <CardDescription className="text-xs">
          Cambiá el estado operativo o el plan. Los cambios impactan inmediatamente.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4 p-4">
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-1.5">
            <Label htmlFor="status-select" className="text-xs">
              Estado
            </Label>
            <Select
              value={status}
              onValueChange={(v) => setStatus(v as Status)}
              disabled={isPending}
            >
              <SelectTrigger id="status-select" className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {STATUS_OPTIONS.map((opt) => (
                  <SelectItem key={opt.value} value={opt.value}>
                    {opt.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <p className="text-muted-foreground text-xs">
              {STATUS_OPTIONS.find((o) => o.value === status)?.hint}
            </p>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="plan-select" className="text-xs">
              Plan
            </Label>
            <Select
              value={plan}
              onValueChange={(v) => setPlan(v as Plan)}
              disabled={isPending}
            >
              <SelectTrigger id="plan-select" className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {PLAN_OPTIONS.map((opt) => (
                  <SelectItem key={opt.value} value={opt.value}>
                    {opt.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="flex items-center justify-between gap-3 border-t border-border/60 pt-4">
          <div className="text-xs">
            {feedback ? (
              <span
                className={
                  feedback.ok
                    ? "text-success font-medium"
                    : "text-destructive font-medium"
                }
              >
                {feedback.msg}
              </span>
            ) : dirty ? (
              <span className="text-muted-foreground">Hay cambios sin guardar</span>
            ) : (
              <span className="text-muted-foreground">Sin cambios</span>
            )}
          </div>
          <Button
            type="button"
            onClick={handleSave}
            disabled={!dirty || isPending}
            size="sm"
          >
            <Save className="size-3.5" />
            {isPending ? "Guardando…" : "Guardar cambios"}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}