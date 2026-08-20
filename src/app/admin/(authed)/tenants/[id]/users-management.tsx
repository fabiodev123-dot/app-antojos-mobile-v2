"use client";

import { useState, useTransition } from "react";
import { UserPlus, Trash2, Loader2, Copy, Check } from "lucide-react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { TenantUser } from "@/lib/services/admin-service";
import {
  addTenantUserAction,
  createTenantUserAction,
  removeTenantUserAction,
} from "./user-actions";

const ROLE_OPTIONS = [
  { value: "owner", label: "Owner" },
  { value: "admin", label: "Admin" },
  { value: "operador", label: "Operador" },
] as const;

type Role = (typeof ROLE_OPTIONS)[number]["value"];

export function UsersManagement({
  tenantId,
  tenantName,
  users,
}: {
  tenantId: string;
  tenantName: string;
  users: TenantUser[];
}) {
  const [email, setEmail] = useState("");
  const [role, setRole] = useState<Role>("operador");
  const [isPending, startTransition] = useTransition();
  const [removingId, setRemovingId] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<{ ok: boolean; msg: string } | null>(
    null,
  );
  const [created, setCreated] = useState<{
    email: string;
    password: string;
  } | null>(null);
  const [copied, setCopied] = useState(false);

  function handleAdd() {
    if (!email || isPending) return;
    setFeedback(null);
    setCreated(null);
    startTransition(async () => {
      const result = await addTenantUserAction(
        { tenantId, email, role },
        tenantName,
      );
      if (result.ok) {
        setFeedback({ ok: true, msg: result.message });
        setEmail("");
      } else {
        setFeedback({ ok: false, msg: result.error });
      }
    });
  }

  function handleCreate() {
    if (!email || isPending) return;
    setFeedback(null);
    setCreated(null);
    startTransition(async () => {
      const result = await createTenantUserAction(
        { tenantId, email, role },
        tenantName,
      );
      if (result.ok) {
        setCreated({ email: result.email, password: result.password });
        setEmail("");
      } else {
        setFeedback({ ok: false, msg: result.error });
      }
    });
  }

  async function handleCopy(text: string) {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      setFeedback({ ok: false, msg: "No se pudo copiar al portapapeles." });
    }
  }

  function handleRemove(userId: string) {
    if (!confirm("¿Eliminar este usuario del tenant?")) return;
    setFeedback(null);
    setRemovingId(userId);
    startTransition(async () => {
      const result = await removeTenantUserAction(
        { tenantId, userId },
        tenantName,
      );
      setRemovingId(null);
      if (result.ok) {
        setFeedback({ ok: true, msg: result.message });
      } else {
        setFeedback({ ok: false, msg: result.error });
      }
    });
  }

  return (
    <Card className="p-0">
      <CardHeader className="border-b border-border/60 p-4">
        <CardTitle className="text-sm">
          Usuarios ({users.length})
        </CardTitle>
        <CardDescription className="text-xs">
          Creá un usuario nuevo (genera password) o agregá uno existente.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4 p-4">
        {users.length === 0 ? (
          <p className="text-muted-foreground py-4 text-center text-sm">
            Este tenant no tiene usuarios.
          </p>
        ) : (
          <ul className="divide-y divide-border/60">
            {users.map((u) => (
              <li
                key={u.userId}
                className="flex items-center justify-between gap-2 py-2"
              >
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium">{u.email}</p>
                  <p className="text-muted-foreground font-mono text-xs">
                    {u.userId.slice(0, 8)}…
                  </p>
                </div>
                <Badge variant="outline" className="capitalize">
                  {u.role}
                </Badge>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon-sm"
                  onClick={() => handleRemove(u.userId)}
                  disabled={isPending}
                  aria-label={`Eliminar ${u.email}`}
                >
                  {removingId === u.userId ? (
                    <Loader2 className="size-3 animate-spin" />
                  ) : (
                    <Trash2 className="size-3.5" />
                  )}
                </Button>
              </li>
            ))}
          </ul>
        )}

        {created ? (
          <div className="space-y-2 rounded-md border border-success/40 bg-success/10 p-3 text-xs">
            <p className="font-semibold text-success">
              ✓ Usuario creado: {created.email}
            </p>
            <p className="text-foreground/80">
              Password (mostrada una sola vez, copiala ahora):
            </p>
            <div className="flex items-center gap-2">
              <code className="flex-1 break-all rounded bg-background/80 p-2 font-mono text-[11px]">
                {created.password}
              </code>
              <Button
                type="button"
                size="icon-sm"
                variant="outline"
                onClick={() => handleCopy(created.password)}
                aria-label="Copiar password"
              >
                {copied ? (
                  <Check className="size-3.5 text-success" />
                ) : (
                  <Copy className="size-3.5" />
                )}
              </Button>
            </div>
            <Button
              type="button"
              size="sm"
              variant="ghost"
              onClick={() => setCreated(null)}
            >
              Cerrar
            </Button>
          </div>
        ) : null}

        <div className="space-y-2 border-t border-border/60 pt-4">
          <Label className="text-xs">Crear / agregar usuario</Label>
          <div className="flex flex-col gap-2 sm:flex-row">
            <Input
              type="email"
              placeholder="email@ejemplo.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              disabled={isPending}
              className="flex-1"
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  handleCreate();
                }
              }}
            />
            <Select
              value={role}
              onValueChange={(v) => setRole(v as Role)}
              disabled={isPending}
            >
              <SelectTrigger className="w-full sm:w-32">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {ROLE_OPTIONS.map((opt) => (
                  <SelectItem key={opt.value} value={opt.value}>
                    {opt.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="flex flex-col gap-2 sm:flex-row">
            <Button
              type="button"
              onClick={handleCreate}
              disabled={!email || isPending}
              className="flex-1"
            >
              <UserPlus className="size-3.5" />
              {isPending ? "Creando…" : "Crear nuevo (genera password)"}
            </Button>
            <Button
              type="button"
              variant="outline"
              onClick={handleAdd}
              disabled={!email || isPending}
              className="flex-1"
            >
              {isPending ? "Agregando…" : "Agregar existente"}
            </Button>
          </div>
          <p className="text-muted-foreground text-[10px]">
            "Crear" genera una password fuerte de 20 caracteres y muestra el
            resultado una sola vez. "Agregar" usa un usuario que ya existe en
            Supabase.
          </p>
        </div>

        {feedback && (
          <p
            className={
              feedback.ok
                ? "text-success text-xs font-medium"
                : "text-destructive text-xs font-medium"
            }
          >
            {feedback.msg}
          </p>
        )}
      </CardContent>
    </Card>
  );
}