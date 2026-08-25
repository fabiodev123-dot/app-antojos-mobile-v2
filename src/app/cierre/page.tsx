"use client";

import { useMemo, useState } from "react";
import {
  Mail,
  MessageCircle,
  TrendingUp,
  TrendingDown,
  Scale,
  MoonStar,
  Save,
  Plus,
  Trash2,
  Loader2,
  FileText,
  FileSpreadsheet,
  Boxes,
  ShoppingCart,
  AlertTriangle,
  ChevronDown,
  ChevronUp,
  Calendar,
} from "lucide-react";
import {
  cierresRepository,
  gastosRepository,
  ingredientesRepository,
  pedidosRepository,
  productosRepository,
  ventasRapidasRepository,
} from "@/lib/repositories";
import { useRepositoryList } from "@/hooks/use-repository";
import { ShellHeader } from "@/components/layout/shell-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ButtonLink } from "@/components/ui/button-link";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { formatFechaLarga, formatPrecio, hoy } from "@/lib/format";
import {
  buildCierreResumen,
  buildMailtoHref,
  buildWhatsappHref,
  filenameForCierre,
  getConsolidadoProductos,
  type CierreData,
  type PeriodoTipo,
} from "@/lib/export/cierre-text";
import { generateCierrePdf } from "@/lib/export/cierre-pdf";
import { generateCierreExcel } from "@/lib/export/cierre-excel";
import { downloadBlob } from "@/lib/export/download";
import { getStartOfWeek, getWeekDays, formatWeekLabel } from "@/lib/utils/week";
import {
  gastoCreateSchema,
  gastoFormSchema,
  type FieldErrors,
  zodToFieldErrors,
} from "@/lib/schemas";
import { toast } from "sonner";
import type { CategoriaGasto } from "@/lib/types";
import { VentasRapidasManager } from "@/components/features/ventas-rapidas-manager";

const MESES = [
  "Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio",
  "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre",
];

export default function CierrePage() {
  const cierres = useRepositoryList(cierresRepository);
  const gastos = useRepositoryList(gastosRepository);
  const pedidos = useRepositoryList(pedidosRepository);
  const ingredientes = useRepositoryList(ingredientesRepository);
  const productos = useRepositoryList(productosRepository);
  const ventasRapidas = useRepositoryList(ventasRapidasRepository);

  const [periodo, setPeriodo] = useState<PeriodoTipo>("diario");
  const [reponerOpen, setReponerOpen] = useState(true);
  const [showGastoDialog, setShowGastoDialog] = useState(false);
  const [generating, setGenerating] = useState<"pdf" | "xlsx" | null>(null);

  const today = hoy();

  // 1. Datos para período DIARIO
  const pedidosDiario = useMemo(() => pedidos.filter((p) => p.fecha === today), [pedidos, today]);
  const gastosDiario = useMemo(() => gastos.filter((g) => g.fecha === today), [gastos, today]);
  const ventasRapidasDiario = useMemo(() => ventasRapidas.filter((v) => v.fecha === today), [ventasRapidas, today]);

  // 2. Datos para período SEMANAL
  const startOfWeek = useMemo(() => getStartOfWeek(today), [today]);
  const weekDaysSet = useMemo(() => new Set(getWeekDays(startOfWeek)), [startOfWeek]);
  const pedidosSemanal = useMemo(() => pedidos.filter((p) => weekDaysSet.has(p.fecha)), [pedidos, weekDaysSet]);
  const gastosSemanal = useMemo(() => gastos.filter((g) => weekDaysSet.has(g.fecha)), [gastos, weekDaysSet]);
  const ventasRapidasSemanal = useMemo(() => ventasRapidas.filter((v) => weekDaysSet.has(v.fecha)), [ventasRapidas, weekDaysSet]);
  const weekLabel = useMemo(() => `Semana ${formatWeekLabel(startOfWeek)}`, [startOfWeek]);

  // 3. Datos para período MENSUAL
  const currentMonthPrefix = useMemo(() => today.slice(0, 7), [today]);
  const pedidosMensual = useMemo(() => pedidos.filter((p) => p.fecha.startsWith(currentMonthPrefix)), [pedidos, currentMonthPrefix]);
  const gastosMensual = useMemo(() => gastos.filter((g) => g.fecha.startsWith(currentMonthPrefix)), [gastos, currentMonthPrefix]);
  const ventasRapidasMensual = useMemo(() => ventasRapidas.filter((v) => v.fecha.startsWith(currentMonthPrefix)), [ventasRapidas, currentMonthPrefix]);
  const monthLabel = useMemo(() => {
    const mIdx = Number(today.slice(5, 7)) - 1;
    return `Mes de ${MESES[mIdx]} ${today.slice(0, 4)}`;
  }, [today]);

  // Datos consolidados activos según el período seleccionado
  const activeData = useMemo<CierreData>(() => {
    if (periodo === "semanal") {
      return {
        fecha: `semana-${startOfWeek}`,
        periodo: "semanal",
        periodoLabel: weekLabel,
        pedidos: pedidosSemanal,
        gastos: gastosSemanal,
        ventasRapidas: ventasRapidasSemanal,
      };
    }
    if (periodo === "mensual") {
      return {
        fecha: `mes-${currentMonthPrefix}`,
        periodo: "mensual",
        periodoLabel: monthLabel,
        pedidos: pedidosMensual,
        gastos: gastosMensual,
        ventasRapidas: ventasRapidasMensual,
      };
    }
    return {
      fecha: today,
      periodo: "diario",
      periodoLabel: formatFechaLarga(today),
      pedidos: pedidosDiario,
      gastos: gastosDiario,
      ventasRapidas: ventasRapidasDiario,
    };
  }, [
    periodo,
    today,
    startOfWeek,
    weekLabel,
    monthLabel,
    currentMonthPrefix,
    pedidosDiario,
    gastosDiario,
    ventasRapidasDiario,
    pedidosSemanal,
    gastosSemanal,
    ventasRapidasSemanal,
    pedidosMensual,
    gastosMensual,
    ventasRapidasMensual,
  ]);

  const resumen = useMemo(() => buildCierreResumen(activeData), [activeData]);
  const consolidados = useMemo(() => getConsolidadoProductos(activeData.pedidos), [activeData.pedidos]);

  const ultimoCierre = [...cierres].sort((a, b) => (a.fecha > b.fecha ? -1 : 1))[0];
  const cierreGuardado = cierres.find((c) => c.fecha === activeData.fecha);

  const platosBajos = productos.filter(
    (p) => p.activo && p.stockActual <= p.stockMinimo,
  );
  const ingredientesBajos = ingredientes.filter(
    (i) => i.activo && i.stockActual <= i.stockMinimo,
  );

  async function handleCopiarListaCompras() {
    if (platosBajos.length === 0 && ingredientesBajos.length === 0) {
      toast.info("Nada que reponer, todo bajo control");
      return;
    }
    const lines: string[] = ["🛒 *Lista de reposición*", ""];
    if (platosBajos.length > 0) {
      lines.push("*Platos a cocinar:*");
      for (const p of platosBajos) {
        const deficit = Math.max(1, p.stockMinimo * 2 - p.stockActual);
        lines.push(`• ${p.nombre} — preparar ${deficit} unidades`);
      }
    }
    if (ingredientesBajos.length > 0) {
      if (platosBajos.length > 0) lines.push("");
      lines.push("*Materia prima:*");
      for (const i of ingredientesBajos) {
        const deficit = Math.max(1, i.stockMinimo * 2 - i.stockActual);
        lines.push(`• ${i.nombre} — ${deficit} ${i.unidad}`);
      }
    }
    try {
      await navigator.clipboard.writeText(lines.join("\n"));
      toast.success("Lista copiada al portapapeles");
    } catch {
      toast.error("No pude copiar. Copiá a mano desde la lista.");
    }
  }

  async function handlePdf() {
    setGenerating("pdf");
    try {
      const blob = await generateCierrePdf(activeData);
      await downloadBlob(blob, filenameForCierre(activeData.fecha, "pdf", periodo));
      toast.success(`PDF (${periodo}) descargado`);
    } catch {
      toast.error("Error al generar PDF");
    } finally {
      setGenerating(null);
    }
  }

  async function handleExcel() {
    setGenerating("xlsx");
    try {
      const blob = await generateCierreExcel(activeData);
      await downloadBlob(blob, filenameForCierre(activeData.fecha, "xlsx", periodo));
      toast.success(`Excel (${periodo}) descargado`);
    } catch {
      toast.error("Error al generar Excel");
    } finally {
      setGenerating(null);
    }
  }

  function handleEmail() {
    const href = buildMailtoHref(activeData);
    window.open(href, "_self");
  }

  function handleWhatsapp() {
    const href = buildWhatsappHref(activeData);
    window.open(href, "_blank", "noopener,noreferrer");
  }

  function handleGuardarCierre() {
    const dataToSave = {
      fecha: activeData.fecha,
      totalVentas: resumen.totalVentas,
      cantidadPedidos: resumen.cantidadPedidos,
      totalGastos: resumen.totalGastos,
      balance: resumen.balance,
      notas: undefined as string | undefined,
      enviadoEmail: false,
      enviadoWsp: false,
    };
    if (cierreGuardado) {
      cierresRepository.update(cierreGuardado.id, dataToSave);
      toast.success(`Cierre ${periodo} actualizado`);
    } else {
      cierresRepository.create(dataToSave as Omit<typeof dataToSave, "notas"> & { notas?: string });
      toast.success(`Cierre ${periodo} guardado`);
    }
  }

  function handleEliminarGasto(id: string) {
    gastosRepository.delete(id);
    toast.success("Gasto eliminado");
  }

  const pedidosCerrados = activeData.pedidos.filter(
    (p) => p.estado === "entregado" || p.estado === "listo",
  );
  const pedidosPendientes = activeData.pedidos.filter(
    (p) => p.estado === "pendiente" || p.estado === "preparando",
  );

  return (
    <>
      <ShellHeader
        title="Cierre de caja"
        subtitle={activeData.periodoLabel}
      />

      <main className="mx-auto max-w-6xl px-4 py-4 space-y-4 pb-32">
        {/* Selector de Período (Tabs) */}
        <div className="flex items-center justify-center">
          <Tabs
            value={periodo}
            onValueChange={(v) => setPeriodo(v as PeriodoTipo)}
            className="w-full"
          >
            <TabsList className="grid w-full grid-cols-3 h-10 p-1 bg-muted/60 rounded-xl border border-border/40">
              <TabsTrigger value="diario" className="rounded-lg text-xs font-semibold">
                Diario
              </TabsTrigger>
              <TabsTrigger value="semanal" className="rounded-lg text-xs font-semibold">
                Semanal
              </TabsTrigger>
              <TabsTrigger value="mensual" className="rounded-lg text-xs font-semibold">
                Mensual
              </TabsTrigger>
            </TabsList>
          </Tabs>
        </div>

        {/* Card de Balance Principal */}
        <Card className="overflow-hidden p-0 card-elevated border-primary/20">
          <CardHeader className="border-b border-border/60 bg-gradient-to-br from-primary/8 via-primary/3 to-transparent p-4">
            <CardTitle className="flex items-center justify-between gap-2 text-sm font-medium">
              <span className="flex items-center gap-2">
                <Scale className="size-4 text-primary" />
                Balance {periodo === "diario" ? "de hoy" : periodo === "semanal" ? "semanal" : "mensual"}
              </span>
              <span className="text-[11px] text-muted-foreground font-normal">
                {activeData.periodoLabel}
              </span>
            </CardTitle>
          </CardHeader>
          <CardContent className="grid grid-cols-3 gap-3 p-4 pt-4">
            <Stat
              icon={<TrendingUp className="size-3.5" />}
              label="Ventas"
              value={formatPrecio(resumen.totalVentas)}
              valueClass="text-success"
              bgClass="bg-success/15 text-success"
            />
            <Stat
              icon={<TrendingDown className="size-3.5" />}
              label="Gastos"
              value={formatPrecio(resumen.totalGastos)}
              valueClass="text-destructive"
              bgClass="bg-destructive/15 text-destructive"
            />
            <Stat
              icon={<MoonStar className="size-3.5" />}
              label={resumen.balance >= 0 ? "Ganancia" : "Pérdida"}
              value={formatPrecio(Math.abs(resumen.balance))}
              valueClass={resumen.balance >= 0 ? "text-success" : "text-destructive"}
              bgClass={resumen.balance >= 0 ? "bg-success/15 text-success" : "bg-destructive/15 text-destructive"}
            />
          </CardContent>
        </Card>

        {/* Botón Guardar Cierre */}
        <Button
          className="w-full font-bold shadow-md"
          size="lg"
          onClick={handleGuardarCierre}
          variant={cierreGuardado ? "outline" : "default"}
        >
          <Save className="size-4" />
          {cierreGuardado
            ? `Actualizar cierre ${periodo === "diario" ? "del día" : periodo === "semanal" ? "semanal" : "mensual"}`
            : `Guardar cierre ${periodo === "diario" ? "del día" : periodo === "semanal" ? "semanal" : "mensual"}`}
        </Button>

        {/* Sección "Qué reponer" con acordeón contraer/expandir */}
        <Card className="overflow-hidden p-0 card-elevated">
          <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 border-b border-border/60 bg-gradient-to-r from-muted/40 to-transparent p-3.5">
            <button
              type="button"
              onClick={() => setReponerOpen(!reponerOpen)}
              className="flex items-center gap-2 text-sm font-medium text-left hover:text-primary transition-colors select-none group"
            >
              <Boxes className="size-4 text-primary" />
              <span>Qué reponer</span>
              {platosBajos.length + ingredientesBajos.length > 0 ? (
                <Badge variant="outline" className="border-warning/40 bg-warning/15 text-warning text-[10px]">
                  {platosBajos.length + ingredientesBajos.length}
                </Badge>
              ) : null}
              {reponerOpen ? (
                <ChevronUp className="size-4 text-muted-foreground group-hover:text-foreground transition-transform" />
              ) : (
                <ChevronDown className="size-4 text-muted-foreground group-hover:text-foreground transition-transform" />
              )}
            </button>
            <div className="flex items-center gap-1.5">
              {platosBajos.length + ingredientesBajos.length > 0 ? (
                <Button size="sm" variant="outline" onClick={handleCopiarListaCompras}>
                  Copiar lista
                </Button>
              ) : null}
              <ButtonLink href="/productos" size="sm" variant="outline">
                Ver carta
              </ButtonLink>
            </div>
          </CardHeader>
          {reponerOpen ? (
            <CardContent className="divide-y divide-border p-0">
              {platosBajos.length === 0 && ingredientesBajos.length === 0 ? (
                <div className="px-3 py-4 text-sm text-muted-foreground text-center">
                  Stock bajo control. Nada que reponer.
                </div>
              ) : (
                <>
                  {platosBajos.length > 0 ? (
                    <>
                      <p className="px-3 pt-2.5 pb-1 text-[11px] uppercase tracking-wider text-muted-foreground">
                        Platos a cocinar
                      </p>
                      {platosBajos.map((p) => (
                        <div key={p.id} className="flex items-center justify-between gap-2 p-3">
                          <div className="min-w-0 flex items-center gap-2">
                            <AlertTriangle className="size-3.5 text-warning shrink-0" />
                            <span className="truncate text-sm">
                              {p.emoji ? <span className="mr-1">{p.emoji}</span> : null}
                              {p.nombre}
                            </span>
                          </div>
                          <span className="font-mono text-xs tabular-nums text-muted-foreground shrink-0">
                            <span className="text-destructive font-medium">{p.stockActual}</span>
                            <span className="mx-1">/</span>
                            <span>mín {p.stockMinimo}</span>
                          </span>
                        </div>
                      ))}
                    </>
                  ) : null}
                  {ingredientesBajos.length > 0 ? (
                    <>
                      <p className="px-3 pt-2.5 pb-1 text-[11px] uppercase tracking-wider text-muted-foreground">
                        Materia prima
                      </p>
                      {ingredientesBajos.map((i) => (
                        <div key={i.id} className="flex items-center justify-between gap-2 p-3">
                          <div className="min-w-0 flex items-center gap-2">
                            <AlertTriangle className="size-3.5 text-warning shrink-0" />
                            <span className="truncate text-sm">{i.nombre}</span>
                          </div>
                          <span className="font-mono text-xs tabular-nums text-muted-foreground shrink-0">
                            <span className="text-destructive font-medium">{i.stockActual}</span>
                            <span className="mx-1">/</span>
                            <span>mín {i.stockMinimo}</span>
                            <span className="ml-1">{i.unidad}</span>
                          </span>
                        </div>
                      ))}
                    </>
                  ) : null}
                </>
              )}
            </CardContent>
          ) : null}
        </Card>

        {/* Resumen de Platos / Unidades Vendidas */}
        {consolidados.length > 0 ? (
          <Card className="overflow-hidden p-0 card-elevated">
            <CardHeader className="border-b border-border/60 bg-muted/30 p-3.5">
              <CardTitle className="flex items-center justify-between gap-2 text-sm font-medium">
                <span className="flex items-center gap-2">
                  <ShoppingCart className="size-4 text-primary" />
                  Platos y unidades vendidas ({periodo})
                </span>
                <span className="text-xs text-muted-foreground font-mono">
                  {resumen.totalUnidades} un. total
                </span>
              </CardTitle>
            </CardHeader>
            <CardContent className="divide-y divide-border p-0">
              {consolidados.slice(0, 8).map((c, i) => (
                <div key={i} className="flex items-center justify-between gap-2 p-3 text-xs">
                  <span className="font-medium truncate">{c.nombreProducto}</span>
                  <div className="flex items-center gap-3 shrink-0">
                    <span className="font-bold text-primary tabular-nums">
                      {c.cantidad} {c.cantidad === 1 ? "unidad" : "unidades"}
                    </span>
                    <span className="font-mono tabular-nums text-muted-foreground">
                      {formatPrecio(c.subtotal)}
                    </span>
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>
        ) : null}

        {/* Gastos del período */}
        <Card className="overflow-hidden p-0 card-elevated">
          <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 border-b border-border/60 bg-gradient-to-r from-muted/40 to-transparent p-3.5">
            <CardTitle className="text-sm font-medium">
              Gastos ({periodo === "diario" ? "del día" : periodo === "semanal" ? "de la semana" : "del mes"})
            </CardTitle>
            <Button size="sm" variant="outline" onClick={() => setShowGastoDialog(true)}>
              <Plus className="size-3.5" />
              Agregar
            </Button>
          </CardHeader>
          <CardContent className="divide-y divide-border p-0">
            {activeData.gastos.length === 0 ? (
              <p className="px-3 py-4 text-sm text-muted-foreground text-center">
                Sin gastos registrados en este período.
              </p>
            ) : (
              activeData.gastos.map((g) => (
                <div key={g.id} className="flex items-center justify-between gap-2 p-3">
                  <div className="min-w-0">
                    <p className="truncate font-medium">{g.descripcion}</p>
                    <div className="flex items-center gap-2 mt-0.5">
                      <Badge variant="outline" className="capitalize text-[10px]">
                        {g.categoria.replace(/_/g, " ")}
                      </Badge>
                      {periodo !== "diario" ? (
                        <span className="text-[10px] text-muted-foreground font-mono">
                          {g.fecha}
                        </span>
                      ) : null}
                    </div>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <span className="font-heading font-semibold tabular-nums text-destructive">
                      {formatPrecio(g.monto)}
                    </span>
                    <button
                      type="button"
                      onClick={() => handleEliminarGasto(g.id)}
                      className="flex h-7 w-7 items-center justify-center rounded-md text-muted-foreground hover:bg-destructive/10 hover:text-destructive transition-colors"
                      aria-label="Eliminar gasto"
                    >
                      <Trash2 className="size-3.5" />
                    </button>
                  </div>
                </div>
              ))
            )}
          </CardContent>
        </Card>

        {/* Ventas rápidas del período */}
        <VentasRapidasManager ventas={activeData.ventasRapidas ?? []} />

        {/* Pedidos del período */}
        <Card className="overflow-hidden p-0 card-elevated">
          <CardHeader className="border-b border-border/60 bg-muted/30 p-3.5">
            <CardTitle className="flex items-center gap-2 text-sm font-medium">
              <Calendar className="size-4 text-primary" />
              Pedidos ({periodo === "diario" ? "del día" : periodo === "semanal" ? "semanales" : "mensuales"})
            </CardTitle>
          </CardHeader>
          <CardContent className="grid grid-cols-2 gap-2 p-4 pt-4 text-sm">
            <div>
              <p className="text-muted-foreground text-xs">Cerrados</p>
              <p className="font-heading text-2xl font-bold tabular-nums">{pedidosCerrados.length}</p>
            </div>
            <div>
              <p className="text-muted-foreground text-xs">Pendientes</p>
              <p className="font-heading text-2xl font-bold tabular-nums">
                {pedidosPendientes.length}
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Exportar y enviar */}
        <Card className="overflow-hidden p-0 card-elevated">
          <CardHeader className="border-b border-border/60 bg-muted/30 p-3.5">
            <CardTitle className="text-sm font-medium">
              Exportar y enviar ({periodo})
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 p-3 pt-3">
            <Button className="w-full" variant="outline" onClick={handlePdf} disabled={generating !== null}>
              {generating === "pdf" ? (
                <Loader2 className="size-4 animate-spin" />
              ) : (
                <FileText className="size-4" />
              )}
              Descargar PDF ({periodo})
            </Button>
            <Button className="w-full" variant="outline" onClick={handleExcel} disabled={generating !== null}>
              {generating === "xlsx" ? (
                <Loader2 className="size-4 animate-spin" />
              ) : (
                <FileSpreadsheet className="size-4" />
              )}
              Descargar Excel ({periodo})
            </Button>
            <Button className="w-full" variant="outline" onClick={handleEmail}>
              <Mail className="size-4" />
              Enviar por email
            </Button>
            <Button className="w-full" variant="outline" onClick={handleWhatsapp}>
              <MessageCircle className="size-4" />
              Enviar por WhatsApp
            </Button>
          </CardContent>
        </Card>

        {/* Último cierre guardado */}
        {ultimoCierre ? (
          <Card className="card-elevated">
            <CardHeader className="pb-2">
              <CardTitle className="text-base">Último cierre guardado</CardTitle>
            </CardHeader>
            <CardContent className="p-3 pt-0 text-sm">
              <p className="font-medium">{ultimoCierre.fecha}</p>
              <div className="mt-2 grid grid-cols-3 gap-2 text-xs">
                <div>
                  <p className="text-muted-foreground">Ventas</p>
                  <p className="font-mono tabular-nums font-medium">{formatPrecio(ultimoCierre.totalVentas)}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Gastos</p>
                  <p className="font-mono tabular-nums font-medium">{formatPrecio(ultimoCierre.totalGastos)}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">{ultimoCierre.balance >= 0 ? "Ganancia" : "Pérdida"}</p>
                  <p className={`font-mono tabular-nums font-medium ${ultimoCierre.balance >= 0 ? "text-success" : "text-destructive"}`}>
                    {formatPrecio(Math.abs(ultimoCierre.balance))}
                  </p>
                </div>
              </div>
              {ultimoCierre.notas ? (
                <p className="mt-2 text-xs text-muted-foreground italic">{ultimoCierre.notas}</p>
              ) : null}
            </CardContent>
          </Card>
        ) : null}
      </main>

      <GastoDialog open={showGastoDialog} onOpenChange={setShowGastoDialog} fecha={today} />
    </>
  );
}

function Stat({
  icon,
  label,
  value,
  valueClass,
  bgClass,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  valueClass?: string;
  bgClass?: string;
}) {
  return (
    <div>
      <div className="flex items-center justify-between gap-1 text-xs text-muted-foreground">
        <span>{label}</span>
        <span className={`flex h-5 w-5 items-center justify-center rounded ${bgClass ?? "bg-muted text-muted-foreground"}`}>
          {icon}
        </span>
      </div>
      <p className={`font-heading text-xl font-bold tabular-nums mt-1 ${valueClass ?? ""}`}>{value}</p>
    </div>
  );
}

function GastoDialog({
  open,
  onOpenChange,
  fecha,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  fecha: string;
}) {
  const [descripcion, setDescripcion] = useState("");
  const [categoria, setCategoria] = useState<CategoriaGasto>("insumos");
  const [monto, setMonto] = useState("");
  const [errors, setErrors] = useState<FieldErrors>({});
  const [saving, setSaving] = useState(false);

  function reset() {
    setDescripcion("");
    setCategoria("insumos");
    setMonto("");
    setErrors({});
  }

  function handleSave() {
    const formResult = gastoFormSchema.safeParse({ descripcion, categoria, monto });
    if (!formResult.success) {
      setErrors(zodToFieldErrors(formResult.error));
      return;
    }

    const createResult = gastoCreateSchema.safeParse({
      ...formResult.data,
      fecha,
      monto: Number(formResult.data.monto),
    });
    if (!createResult.success) {
      setErrors(zodToFieldErrors(createResult.error));
      return;
    }

    setSaving(true);
    gastosRepository.create(createResult.data);
    toast.success("Gasto agregado");
    reset();
    setSaving(false);
    onOpenChange(false);
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Nuevo gasto</DialogTitle>
          <DialogDescription>Registrá un gasto del día.</DialogDescription>
        </DialogHeader>

        <div className="space-y-3">
          <div className="space-y-2">
            <Label htmlFor="descripcion">Descripción</Label>
            <Input
              id="descripcion"
              value={descripcion}
              onChange={(e) => setDescripcion(e.target.value)}
              placeholder="Ej: Compra de pan y queso"
              autoFocus
              aria-invalid={!!errors.descripcion}
            />
            {errors.descripcion ? <p className="text-xs text-destructive">{errors.descripcion}</p> : null}
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label htmlFor="categoria">Categoría</Label>
              <Select value={categoria} onValueChange={(v) => setCategoria((v ?? "insumos") as CategoriaGasto)}>
                <SelectTrigger id="categoria">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="insumos">Insumos</SelectItem>
                  <SelectItem value="servicios">Servicios</SelectItem>
                  <SelectItem value="sueldos">Sueldos</SelectItem>
                  <SelectItem value="alquiler">Alquiler</SelectItem>
                  <SelectItem value="servicios_publicos">Servicios públicos</SelectItem>
                  <SelectItem value="transporte">Transporte</SelectItem>
                  <SelectItem value="marketing">Marketing</SelectItem>
                  <SelectItem value="otros">Otros</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="monto">Monto</Label>
              <div className="relative">
                <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">$</span>
                <Input
                  id="monto"
                  type="number"
                  inputMode="decimal"
                  step="any"
                  min="0"
                  value={monto}
                  onChange={(e) => setMonto(e.target.value)}
                  placeholder="0"
                  className="pl-6 tabular-nums"
                  aria-invalid={!!errors.monto}
                />
              </div>
              {errors.monto ? <p className="text-xs text-destructive">{errors.monto}</p> : null}
            </div>
          </div>
        </div>

        <DialogFooter className="gap-2">
          <Button variant="outline" size="sm" onClick={() => onOpenChange(false)} disabled={saving}>
            Cancelar
          </Button>
          <Button size="sm" onClick={handleSave} disabled={saving}>
            <Save className="size-3.5" />
            Agregar gasto
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}