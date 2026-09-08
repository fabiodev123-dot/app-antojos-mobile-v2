import type { Metadata } from "next";
import Link from "next/link";
import {
  ChevronRight,
  Clock,
  MessageSquare,
  Phone,
  Store,
  Truck,
  Zap,
  MapPin,
  Star,
  Utensils,
  CreditCard,
  Timer,
  CheckCircle2,
  Flame,
  ArrowRight,
  Sparkles,
  BadgePercent,
} from "lucide-react";
import { seedCategorias } from "@/lib/mock/categorias";
import { seedProductos } from "@/lib/mock/productos";
import { formatPrecio } from "@/lib/format";
import { ScrollReveal } from "@/components/features/scroll-reveal";
import { StickyCtaBar } from "@/components/features/sticky-cta-bar";

/* ──────────────────────────── CONFIG ──────────────────────────── */

export const metadata: Metadata = {
  title: "Antojos — Rotisería | Carta y pedidos por WhatsApp",
  description:
    "Hambur pizzas, alitos, milanesas, pizzas y más. La rotisería Antojos: retiro en local o delivery, pedís por WhatsApp.",
  openGraph: {
    title: "Antojos — Rotisería",
    description:
      "Hambur pizzas, alitos, milanesas, pizzas y más. Pedí por WhatsApp: retiro en local o delivery.",
    images: ["/logo-antojos.jpg"],
  },
};

const WHATSAPP_NUMEROS = [
  { digits: "543704087573", display: "370 408-7573" },
  { digits: "543704649473", display: "370 464-9473" },
];

const HORARIO = "Lun-Dom 19:00 - 23:00";
const UBICACION = "Formosa Capital";

function waLink(digits: string, mensaje?: string): string {
  const text = mensaje || "¡Hola Antojos! Quiero hacer un pedido 🍕";
  return `https://wa.me/${digits}?text=${encodeURIComponent(text)}`;
}

/* ──────────────────────────── DATA ────────────────────────────── */

const productosUnicos = new Map(
  seedProductos.filter((p) => p.activo).map((p) => [p.nombre, p])
);

const CARTA = seedCategorias
  .filter((c) => c.activo)
  .map((c) => ({
    categoria: c,
    productos: [...productosUnicos.values()].filter(
      (p) => p.categoriaId === c.id
    ),
  }))
  .filter((g) => g.productos.length > 0);

const BENEFICIOS = [
  { icon: Timer, label: "30-45 min", sub: "Tiempo estimado" },
  { icon: Truck, label: "Delivery", sub: "A tu puerta" },
  { icon: MessageSquare, label: "WhatsApp", sub: "Pedí al toque" },
  { icon: CreditCard, label: "Pagás al recibir", sub: "Sin tarjeta" },
  { icon: Store, label: "Retiro en local", sub: "A los 10 min" },
  { icon: Utensils, label: "Casero", sub: "Hecho con amor" },
];

const PASOS = [
  {
    numero: "1",
    titulo: "Elegí en la carta",
    texto: "Mirá los platos y precios que se te antojan.",
    icon: Utensils,
  },
  {
    numero: "2",
    titulo: "Escribinos por WhatsApp",
    texto: "Mandanos tu pedido con un toque, sin llamadas.",
    icon: MessageSquare,
  },
  {
    numero: "3",
    titulo: "Te confirmamos",
    texto: "Te avisamos en minutos si tu pedido está listo.",
    icon: CheckCircle2,
  },
  {
    numero: "4",
    titulo: "Disfrutá",
    texto: "Retirás en el local o te lo llevamos a casa.",
    icon: Zap,
  },
];

const PROMOS = [
  {
    titulo: "Combo Familiar",
    descripcion: "Hambur Pizza + 6 empanadas a elección",
    badge: "Popular",
    badgeIcon: Flame,
    urgencia: "Todos los días",
    precio: "$12.500",
    precioOriginal: null,
    descuento: null,
    imagen: "/imgplatos/1.jpg",
    gradient: "from-orange-600/90 via-orange-800/70 to-zinc-950/95",
    accent: "text-orange-300",
  },
  {
    titulo: "Lunes 2x1",
    descripcion: "En todas las empanadas, todo el lunes",
    badge: "2x1",
    badgeIcon: BadgePercent,
    urgencia: "Solo lunes",
    precio: "$800",
    precioOriginal: "$1.600",
    descuento: "50%",
    imagen: "/imgplatos/5.jpg",
    gradient: "from-amber-600/90 via-amber-800/70 to-zinc-950/95",
    accent: "text-amber-300",
  },
  {
    titulo: "Milanesa + Papas",
    descripcion: "Milanesa al cuchillo con papas fritas caseras",
    badge: "Nuevo",
    badgeIcon: Sparkles,
    urgencia: "Disponible ahora",
    precio: "$9.800",
    precioOriginal: null,
    descuento: null,
    imagen: "/imgplatos/8.jpg",
    gradient: "from-brand/90 via-orange-900/70 to-zinc-950/95",
    accent: "text-orange-200",
  },
];

/* ──────────────────────────── PAGE ────────────────────────────── */

export default function LandingPage() {
  const waPrincipal = waLink(WHATSAPP_NUMEROS[0].digits);

  return (
    <main className="min-h-svh bg-zinc-950 text-zinc-100 pb-16 sm:pb-0 noise-bg">
      {/* ─── HEADER ─── */}
      <header className="border-b border-white/10 bg-zinc-950/90 sticky top-0 z-30 backdrop-blur-xl">
        <div className="mx-auto flex h-14 max-w-5xl items-center justify-between gap-3 px-4">
          <div className="flex items-center gap-2.5">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src="/logo-mark.png"
              alt=""
              className="h-9 w-9 rounded-xl ring-1 ring-brand/40"
            />
            <div className="flex flex-col leading-none">
              <span className="font-heading text-lg font-bold tracking-tight">
                Antojos
              </span>
              <span className="hidden sm:block text-[10px] text-zinc-500 tracking-wide">
                {HORARIO}
              </span>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <span className="hidden md:flex items-center gap-1.5 text-xs text-zinc-400">
              <MapPin className="size-3.5 text-brand" />
              {UBICACION}
            </span>
            <Link
              href="/login"
              className="flex h-9 items-center gap-1.5 rounded-full border border-white/15 px-4 text-sm font-medium text-zinc-300 transition-all duration-200 hover:bg-white/5 hover:text-white hover:border-white/25"
            >
              Iniciar sesión
            </Link>
            <a
              href={waPrincipal}
              target="_blank"
              rel="noopener noreferrer"
              className="gold-sweep bg-brand hover:bg-brand/90 flex h-9 items-center gap-1.5 rounded-full px-4 text-sm font-semibold text-brand-foreground shadow-md shadow-brand/25 transition-all duration-200 hover:shadow-lg hover:shadow-brand/30"
            >
              <MessageSquare className="size-4" />
              <span className="hidden sm:inline">Pedí ahora</span>
            </a>
          </div>
        </div>

        {/* ─── NAVIGATION ─── */}
        <nav className="border-t border-white/5 bg-zinc-950/50">
          <div className="mx-auto flex max-w-5xl items-center justify-center gap-1 overflow-x-auto px-4 py-2 scrollbar-none">
            {[
              { href: "#inicio", label: "Inicio", icon: Store },
              { href: "#promos", label: "Promos", icon: Flame },
              { href: "#carta", label: "Carta", icon: Utensils },
              { href: "#como-pedir", label: "Cómo pedir", icon: MessageSquare },
            ].map(({ href, label, icon: Icon }) => (
              <a
                key={href}
                href={href}
                className="flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-medium text-zinc-400 transition-all duration-200 hover:bg-white/5 hover:text-white"
              >
                <Icon className="size-3.5" />
                {label}
              </a>
            ))}
          </div>
        </nav>
      </header>

      {/* ─── HERO ─── */}
      <section id="inicio" className="relative border-b border-white/10 overflow-hidden">
        {/* Background image with gradient overlay */}
        <div className="absolute inset-0">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="/imgplatos/2.jpg"
            alt=""
            className="h-full w-full object-cover opacity-30"
          />
          <div className="absolute inset-0 bg-gradient-to-b from-zinc-950/60 via-zinc-950/80 to-zinc-950" />
        </div>

        <div className="relative mx-auto flex max-w-5xl flex-col items-center gap-6 px-4 py-16 text-center sm:py-24">
          {/* Badge "Abierto ahora" */}
          <div className="pill pill-green">
            <span className="relative flex h-2 w-2">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-green-400 opacity-75" />
              <span className="relative inline-flex h-2 w-2 rounded-full bg-green-500" />
            </span>
            Abierto ahora · {HORARIO}
          </div>

          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="/logo-antojos.jpg"
            alt="Logo de Antojos — Rotisería"
            className="brand-glow size-36 rounded-3xl ring-1 ring-brand/30 sm:size-44"
          />

          <div className="flex flex-col gap-2">
            <h1 className="font-heading text-4xl font-bold tracking-tight text-balance sm:text-5xl lg:text-6xl">
              Si se te antojó,{" "}
              <span className="text-brand">lo tenemos</span>
            </h1>
            <p className="text-muted-foreground mx-auto max-w-md text-pretty sm:text-lg">
              Hambur pizzas, alitos, milanesas y más. Retiro en local o
              delivery: escribinos por WhatsApp y en minutos lo tenés.
            </p>
          </div>

          {/* Social proof */}
          <div className="flex items-center gap-4 text-sm text-zinc-400">
            <span className="flex items-center gap-1">
              <Star className="size-4 fill-yellow-500 text-yellow-500" />
              <span className="font-semibold text-zinc-200">4.8</span>
              <span>(120+ reseñas)</span>
            </span>
            <span className="h-1 w-1 rounded-full bg-zinc-600" />
            <span className="flex items-center gap-1">
              <Truck className="size-4 text-brand" />
              <span>30-45 min delivery</span>
            </span>
          </div>

          <div className="flex flex-col gap-3 sm:flex-row">
            <a
              href={waPrincipal}
              target="_blank"
              rel="noopener noreferrer"
              className="gold-sweep bg-brand hover:bg-brand/90 flex h-12 items-center justify-center gap-2 rounded-full px-7 text-base font-bold tracking-tight text-brand-foreground shadow-lg shadow-brand/30 transition-all duration-200 hover:shadow-xl hover:shadow-brand/35 active:scale-[0.97]"
            >
              <MessageSquare className="size-5" />
              Pedir por WhatsApp
            </a>
            <a
              href="#carta"
              className="flex h-12 items-center justify-center gap-1.5 rounded-full border border-white/15 px-7 text-base font-semibold tracking-tight transition-all duration-200 hover:bg-white/5 hover:border-white/25 active:scale-[0.97]"
            >
              Ver la carta
              <ChevronRight className="size-4" />
            </a>
          </div>
        </div>
      </section>

      {/* ─── TRUST BAR ─── */}
      <section className="reveal border-b border-white/10 bg-zinc-900/50 section-glow noise-bg">
        <div className="mx-auto max-w-5xl px-4 py-6">
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-6">
            {BENEFICIOS.map(({ icon: Icon, label, sub }) => (
              <div
                key={label}
                className="flex flex-col items-center gap-1.5 text-center"
              >
                <div className="pill pill-brand flex size-10 items-center justify-center rounded-xl">
                  <Icon className="size-5" />
                </div>
                <span className="text-sm font-semibold">{label}</span>
                <span className="text-[11px] text-zinc-500">{sub}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ─── PROMOS ─── */}
      <section id="promos" className="reveal border-b border-white/10 noise-bg">
        <div className="mx-auto max-w-5xl px-4 py-14">
          {/* Header */}
          <div className="mb-10 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <span className="flex size-11 items-center justify-center rounded-2xl bg-gradient-to-br from-brand to-orange-700 shadow-lg shadow-brand/30">
                <Flame className="size-6 text-white" />
              </span>
              <div>
                <h2 className="font-heading text-2xl font-bold tracking-tight sm:text-3xl">
                  Promos de la semana
                </h2>
                <p className="text-sm text-zinc-400">Ofertas que se antojan</p>
              </div>
            </div>
            <span className="pill pill-neutral hidden sm:inline-flex">
              <Timer className="size-3.5" />
              Actualizadas semanalmente
            </span>
          </div>

          {/* Cards Grid */}
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {PROMOS.map((promo) => {
              const BadgeIcon = promo.badgeIcon;
              return (
                <div
                  key={promo.titulo}
                  className="group relative overflow-hidden rounded-3xl bg-zinc-900 ring-1 ring-white/10 transition-all duration-500 hover:ring-white/25 hover:shadow-2xl hover:shadow-black/50 hover:-translate-y-1"
                >
                  {/* Image Background */}
                  <div className="relative h-52 overflow-hidden sm:h-56">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={promo.imagen}
                      alt={promo.titulo}
                      className="absolute inset-0 h-full w-full object-cover transition-transform duration-700 group-hover:scale-110"
                    />
                    {/* Gradient Overlay */}
                    <div className={`absolute inset-0 bg-gradient-to-t ${promo.gradient}`} />
                    <div className="absolute inset-0 bg-gradient-to-t from-zinc-950 via-transparent to-transparent opacity-80" />
                    
                    {/* Badge - Top Left */}
                    <div className="absolute left-4 top-4 z-10">
                      <span className="pill pill-brand shadow-lg">
                        <BadgeIcon className="size-3.5" />
                        {promo.badge}
                      </span>
                    </div>

                    {/* Discount Badge - Top Right */}
                    {promo.descuento && (
                      <div className="absolute right-4 top-4 z-10">
                        <span className="flex items-center rounded-full bg-red-500 px-3 py-1.5 text-xs font-bold text-white shadow-lg shadow-red-500/40 animate-pulse">
                          -{promo.descuento}
                        </span>
                      </div>
                    )}

                    {/* Urgency - Bottom Right on image */}
                    <div className="absolute bottom-4 right-4 z-10">
                      <span className="pill pill-neutral text-[10px]">
                        <Clock className="size-3" />
                        {promo.urgencia}
                      </span>
                    </div>
                  </div>

                  {/* Content */}
                  <div className="relative p-5">
                    {/* Title */}
                    <h3 className="font-heading text-xl font-bold tracking-tight mb-1.5">
                      {promo.titulo}
                    </h3>
                    
                    {/* Description */}
                    <p className="text-sm text-zinc-400 leading-relaxed mb-4">
                      {promo.descripcion}
                    </p>

                    {/* Price + CTA Row */}
                    <div className="flex items-end justify-between">
                      <div className="flex flex-col">
                        {promo.precioOriginal && (
                          <span className="text-xs text-zinc-500 line-through">
                            {promo.precioOriginal}
                          </span>
                        )}
                        <span className="font-heading text-2xl font-bold text-brand">
                          {promo.precio}
                        </span>
                      </div>
                      
                      <a
                        href={waLink(
                          WHATSAPP_NUMEROS[0].digits,
                          `¡Hola! Quiero el ${promo.titulo} 🍕`
                        )}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="gold-sweep inline-flex items-center gap-2 rounded-full bg-brand px-5 py-2.5 text-sm font-bold tracking-tight text-brand-foreground shadow-lg shadow-brand/30 transition-all duration-200 hover:bg-brand/90 hover:shadow-xl hover:shadow-brand/40 active:scale-[0.97]"
                      >
                        <MessageSquare className="size-4" />
                        Pedir
                        <ArrowRight className="size-3.5 transition-transform group-hover:translate-x-0.5" />
                      </a>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Bottom hint */}
          <div className="mt-8 flex justify-center">
            <span className="pill pill-neutral">
              <Sparkles className="size-3.5 text-brand" />
              Más promos disponibles por WhatsApp
            </span>
          </div>
        </div>
      </section>

      {/* ─── CARTA ─── */}
      <section id="carta" className="reveal mx-auto max-w-5xl scroll-mt-20 px-4 py-12">
        <div className="mb-8 flex flex-col gap-1">
          <h2 className="font-heading text-3xl font-bold tracking-tight">
            La carta
          </h2>
          <p className="text-muted-foreground text-sm">
            Elegí tu antojo. Los precios pueden variar, confirmá por WhatsApp.
          </p>
        </div>

        {/* Category chips */}
        <div className="mb-8 flex gap-2 overflow-x-auto scrollbar-none pb-2">
          {CARTA.map(({ categoria }) => (
            <a
              key={categoria.id}
              href={`#${categoria.id}`}
              className="pill pill-neutral shrink-0 hover:!text-brand hover:!border-brand/40 hover:!bg-brand/10"
            >
              <span>{categoria.emoji}</span>
              {categoria.nombre}
            </a>
          ))}
        </div>

        <div className="flex flex-col gap-12">
          {CARTA.map(({ categoria, productos }) => (
            <div key={categoria.id} id={categoria.id} className="scroll-mt-24">
              <h3 className="font-heading mb-4 flex items-center gap-2 text-xl font-bold tracking-tight">
                <span aria-hidden>{categoria.emoji}</span>
                {categoria.nombre}
                <span className="ml-2 text-xs font-normal text-zinc-500">
                  ({productos.length})
                </span>
              </h3>
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
                {productos.map((p) => (
                  <article
                    key={p.id}
                    className="group overflow-hidden rounded-2xl bg-zinc-900 ring-1 ring-white/10 transition-all hover:ring-brand/40 hover:translate-y-[-2px]"
                  >
                    <div className="relative overflow-hidden">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={p.imagen ?? undefined}
                        alt={p.nombre}
                        loading="lazy"
                        className="aspect-square w-full object-cover transition-transform group-hover:scale-105"
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                    </div>
                    <div className="flex flex-col gap-1 p-3">
                      <h4 className="line-clamp-1 text-sm font-semibold leading-tight">
                        {p.nombre}
                      </h4>
                      {p.descripcion ? (
                        <p className="text-muted-foreground line-clamp-2 text-xs">
                          {p.descripcion}
                        </p>
                      ) : null}
                      <div className="mt-auto flex items-center justify-between pt-1">
                        <p className="font-heading text-brand text-sm font-bold">
                          {formatPrecio(p.precio)}
                        </p>
                        <a
                          href={waLink(
                            WHATSAPP_NUMEROS[0].digits,
                            `¡Hola! Quiero pedir: ${p.nombre} — ${formatPrecio(p.precio)} 🍕`
                          )}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex size-7 items-center justify-center rounded-full bg-brand/10 text-brand transition-all duration-200 hover:bg-brand hover:text-white hover:shadow-md hover:shadow-brand/20 active:scale-90"
                          aria-label={`Pedir ${p.nombre}`}
                        >
                          <MessageSquare className="size-3.5" />
                        </a>
                      </div>
                    </div>
                  </article>
                ))}
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* ─── CÓMO PEDIR ─── */}
      <section id="como-pedir" className="reveal border-t border-white/10">
        <div className="mx-auto max-w-5xl px-4 py-12">
          <h2 className="font-heading mb-8 text-3xl font-bold tracking-tight">
            ¿Cómo pedir?
          </h2>
          <div className="relative">
            {/* Progress line */}
            <div className="absolute left-[19px] top-0 bottom-0 w-0.5 bg-gradient-to-b from-brand via-brand/50 to-transparent sm:left-1/2 sm:-translate-x-px" />

            <ol className="grid gap-8 sm:grid-cols-2 lg:grid-cols-4">
              {PASOS.map((paso, i) => {
                const Icon = paso.icon;
                return (
                  <li
                    key={paso.numero}
                    className="relative flex gap-4 sm:flex-col sm:gap-3 sm:text-center"
                  >
                    <div className="relative z-10 flex size-10 shrink-0 items-center justify-center rounded-full bg-brand text-sm font-bold text-brand-foreground ring-4 ring-zinc-950">
                      {paso.numero}
                    </div>
                    <div className="flex flex-col gap-1">
                      <div className="flex items-center gap-2 sm:justify-center">
                        <Icon className="size-4 text-brand" />
                        <h3 className="font-heading text-base font-semibold">
                          {paso.titulo}
                        </h3>
                      </div>
                      <p className="text-muted-foreground text-sm">{paso.texto}</p>
                    </div>
                  </li>
                );
              })}
            </ol>
          </div>
        </div>
      </section>

      {/* ─── CTA FINAL ─── */}
      <section className="reveal border-t border-white/10">
        <div className="relative overflow-hidden">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="/imgplatos/1.jpg"
            alt=""
            className="absolute inset-0 h-full w-full object-cover opacity-20"
          />
          <div className="absolute inset-0 bg-gradient-to-b from-zinc-950/80 to-zinc-950" />

          <div className="relative mx-auto max-w-5xl px-4 py-16 text-center">
            <span className="bg-brand/15 text-brand flex size-12 items-center justify-center rounded-full border border-brand/30 mx-auto mb-5">
              <Zap className="size-6" />
            </span>
            <h2 className="font-heading text-3xl font-bold tracking-tight sm:text-4xl">
              ¿Se te antojó algo?
            </h2>
            <p className="text-muted-foreground mx-auto mt-3 max-w-sm text-pretty">
              Escribinos por WhatsApp y armamos tu pedido. Retiro en local o
              delivery a tu puerta.
            </p>

            {/* WhatsApp preview card */}
            <div className="mx-auto mt-8 max-w-sm rounded-2xl border border-white/10 bg-zinc-900/80 p-4 text-left backdrop-blur-sm">
              <div className="flex items-center gap-2 mb-3">
                <div className="flex size-8 items-center justify-center rounded-full bg-green-600">
                  <MessageSquare className="size-4 text-white" />
                </div>
                <div>
                  <p className="text-sm font-semibold">Antojos Rotisería</p>
                  <p className="text-[11px] text-green-400">en línea</p>
                </div>
              </div>
              <div className="rounded-lg bg-[#005c4b] p-3 text-sm text-zinc-100">
                ¡Hola Antojos! Quiero hacer un pedido 🍕
              </div>
            </div>

            <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:justify-center">
              <a
                href={waPrincipal}
                target="_blank"
                rel="noopener noreferrer"
                className="gold-sweep bg-brand hover:bg-brand/90 flex h-12 items-center justify-center gap-2 rounded-full px-7 text-base font-bold tracking-tight text-brand-foreground shadow-lg shadow-brand/30 transition-all duration-200 hover:shadow-xl hover:shadow-brand/35 active:scale-[0.97]"
              >
                <MessageSquare className="size-5" />
                Pedir por WhatsApp
              </a>
            </div>

            <div className="mt-6 flex flex-col items-center gap-2 text-sm text-zinc-400">
              <span className="flex items-center gap-1.5">
                <Phone className="size-3.5" />
                También podés llamar
              </span>
              <div className="flex gap-4">
                {WHATSAPP_NUMEROS.map((n) => (
                  <a
                    key={n.digits}
                    href={`tel:${n.digits}`}
                    className="font-semibold text-zinc-200 hover:text-brand transition-colors"
                  >
                    {n.display}
                  </a>
                ))}
              </div>
            </div>

            <div className="mt-6 flex items-center justify-center gap-4 text-xs text-zinc-500">
              <span className="flex items-center gap-1">
                <MapPin className="size-3" />
                {UBICACION}
              </span>
              <span>·</span>
              <span className="flex items-center gap-1">
                <Clock className="size-3" />
                {HORARIO}
              </span>
            </div>
          </div>
        </div>
      </section>

      {/* ─── FOOTER ─── */}
      <footer className="border-t border-white/10">
        <div className="mx-auto max-w-5xl px-4 py-10">
          <div className="grid gap-8 sm:grid-cols-3">
            {/* Brand */}
            <div className="flex flex-col gap-3">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src="/logo-mark.png" alt="Antojos" className="h-10 w-10 rounded-xl ring-1 ring-brand/40" />
              <p className="text-sm font-semibold">Antojos — Rotisería</p>
              <p className="text-xs text-zinc-500">La rotisería que se te antoja</p>
            </div>

            {/* Horarios */}
            <div className="flex flex-col gap-2">
              <h4 className="text-xs font-bold uppercase tracking-wider text-zinc-400">
                Horarios
              </h4>
              <p className="text-sm">
                <Clock className="mr-1.5 inline size-3.5 text-brand" />
                {HORARIO}
              </p>
              <p className="text-sm">
                <MapPin className="mr-1.5 inline size-3.5 text-brand" />
                {UBICACION}
              </p>
            </div>

            {/* Contacto */}
            <div className="flex flex-col gap-2">
              <h4 className="text-xs font-bold uppercase tracking-wider text-zinc-400">
                Contacto
              </h4>
              {WHATSAPP_NUMEROS.map((n) => (
                <a
                  key={n.digits}
                  href={waLink(n.digits)}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-1.5 text-sm hover:text-brand transition-colors"
                >
                  <MessageSquare className="size-3.5 text-green-500" />
                  {n.display}
                </a>
              ))}
            </div>
          </div>

          <div className="mt-8 flex flex-col items-center justify-between gap-3 border-t border-white/10 pt-6 sm:flex-row">
            <p className="text-xs text-zinc-500">
              © 2026 Antojos · Hecho con ❤️ en Formosa
            </p>
            <Link
              href="/login"
              className="text-xs text-zinc-500 hover:text-zinc-300 underline transition-colors"
            >
              ¿Sos del equipo? Ingresá
            </Link>
          </div>
        </div>
      </footer>

      <StickyCtaBar />
      <ScrollReveal />
    </main>
  );
}
