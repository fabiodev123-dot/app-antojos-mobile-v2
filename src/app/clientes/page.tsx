"use client";

import { useState } from "react";
import { Phone, MapPin, Mail, StickyNote, Plus, Pencil } from "lucide-react";
import { clientesRepository } from "@/lib/repositories";
import { useRepositoryList } from "@/hooks/use-repository";
import { ShellHeader } from "@/components/layout/shell-header";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ClienteFormDialog } from "@/components/features/cliente-form-dialog";
import { EmptyState } from "@/components/features/empty-state";
import { formatFechaCorta } from "@/lib/format";
import { cn } from "@/lib/utils";
import type { Cliente } from "@/lib/types";

const AVATAR_COLORS = [
  "bg-red-500/15 text-red-700 dark:text-red-300",
  "bg-orange-500/15 text-orange-700 dark:text-orange-300",
  "bg-amber-500/15 text-amber-700 dark:text-amber-300",
  "bg-yellow-500/15 text-yellow-700 dark:text-yellow-300",
  "bg-green-500/15 text-green-700 dark:text-green-300",
  "bg-teal-500/15 text-teal-700 dark:text-teal-300",
  "bg-blue-500/15 text-blue-700 dark:text-blue-300",
  "bg-purple-500/15 text-purple-700 dark:text-purple-300",
  "bg-pink-500/15 text-pink-700 dark:text-pink-300",
  "bg-rose-500/15 text-rose-700 dark:text-rose-300",
];

function avatarFor(nombre: string): string {
  let hash = 0;
  for (let i = 0; i < nombre.length; i++) {
    hash = (hash << 5) - hash + nombre.charCodeAt(i);
    hash |= 0;
  }
  return AVATAR_COLORS[Math.abs(hash) % AVATAR_COLORS.length];
}

function initials(nombre: string): string {
  const parts = nombre.trim().split(/\s+/).slice(0, 2);
  return parts.map((p) => p[0]?.toUpperCase() ?? "").join("");
}

export default function ClientesPage() {
  const clientes = useRepositoryList(clientesRepository);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<Cliente | null>(null);

  const sorted = [...clientes].sort((a, b) => a.nombre.localeCompare(b.nombre));

  function openNew() {
    setEditing(null);
    setDialogOpen(true);
  }

  function openEdit(cliente: Cliente) {
    setEditing(cliente);
    setDialogOpen(true);
  }

  return (
    <>
      <ShellHeader
        title="Clientes"
        subtitle={`${clientes.length} registrados`}
        right={
          <Button size="sm" onClick={openNew}>
            <Plus className="size-3.5" />
            Nuevo
          </Button>
        }
      />
      <main className="mx-auto max-w-6xl px-4 py-4 space-y-2">
        {sorted.length === 0 ? (
          <Card className="border-dashed">
            <CardContent className="p-0">
              <EmptyState
                icon="users"
                title="Sin clientes registrados"
                description="Sumá tu primer cliente con el botón + arriba"
              />
            </CardContent>
          </Card>
        ) : null}
        {sorted.map((c) => (
          <Card key={c.id} className="p-0 card-elevated hover-lift">
            <button
              type="button"
              onClick={() => openEdit(c)}
              className="flex w-full items-stretch gap-3 p-3.5 text-left"
            >
              <span
                className={cn(
                  "flex h-11 w-11 shrink-0 items-center justify-center rounded-full font-semibold text-sm",
                  avatarFor(c.nombre),
                )}
                aria-hidden
              >
                {initials(c.nombre)}
              </span>
              <div className="min-w-0 flex-1">
                <p className="font-medium truncate">{c.nombre}</p>
                <div className="mt-1 flex flex-col gap-0.5 text-xs text-muted-foreground">
                  <span className="inline-flex items-center gap-1.5">
                    <Phone className="size-3" />
                    {c.telefono}
                  </span>
                  {c.direccion ? (
                    <span className="inline-flex items-center gap-1.5">
                      <MapPin className="size-3" />
                      {c.direccion}
                    </span>
                  ) : null}
                  {c.email ? (
                    <span className="inline-flex items-center gap-1.5">
                      <Mail className="size-3" />
                      {c.email}
                    </span>
                  ) : null}
                  {c.notas ? (
                    <span className="inline-flex items-start gap-1.5 mt-1 text-warning">
                      <StickyNote className="size-3 mt-0.5 shrink-0" />
                      <span>{c.notas}</span>
                    </span>
                  ) : null}
                </div>
              </div>
              <div className="flex items-start gap-1 shrink-0">
                <div className="text-right">
                  <Badge variant="secondary" className="font-mono tabular-nums">
                    {c.totalPedidos} {c.totalPedidos === 1 ? "pedido" : "pedidos"}
                  </Badge>
                  {c.ultimaCompra ? (
                    <p className="mt-1 text-[10px] text-muted-foreground">
                      Última: {formatFechaCorta(c.ultimaCompra)}
                    </p>
                  ) : null}
                </div>
                <Pencil className="size-3.5 text-muted-foreground mt-1" />
              </div>
            </button>
          </Card>
        ))}
      </main>

      <ClienteFormDialog
        key={editing?.id ?? "new"}
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        cliente={editing}
      />
    </>
  );
}