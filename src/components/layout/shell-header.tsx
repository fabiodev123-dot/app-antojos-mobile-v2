import Link from "next/link";
import type { ReactNode } from "react";
import { Logo } from "@/components/features/logo";
import { cn } from "@/lib/utils";

export function ShellHeader({
  title,
  subtitle,
  right,
}: {
  title: string;
  subtitle?: string;
  right?: ReactNode;
}) {
  return (
    <header className="sticky top-0 z-40 border-b border-border bg-background/85 backdrop-blur-xl supports-[backdrop-filter]:bg-background/70">
      <div className="mx-auto flex h-14 max-w-6xl items-center justify-between gap-3 px-4">
        <Link href="/" className="flex items-center gap-2.5 min-w-0">
          <Logo size="sm" />
          <div className="min-w-0">
            <h1 className="truncate font-heading text-[15px] font-semibold leading-none tracking-tight">{title}</h1>
            {subtitle ? (
              <p className="truncate text-[11px] text-muted-foreground mt-0.5">{subtitle}</p>
            ) : null}
          </div>
        </Link>
        {right ? (
          <div className="flex shrink-0 items-center gap-1.5 whitespace-nowrap">
            {right}
          </div>
        ) : null}
      </div>
    </header>
  );
}

export function PageHeader({
  title,
  subtitle,
  right,
  className,
}: {
  title: string;
  subtitle?: string;
  right?: ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("flex items-end justify-between gap-3", className)}>
      <div className="min-w-0">
        <h2 className="font-heading text-2xl font-bold tracking-tight text-balance">{title}</h2>
        {subtitle ? (
          <p className="mt-0.5 text-sm text-muted-foreground text-pretty">{subtitle}</p>
        ) : null}
      </div>
      {right ? <div className="shrink-0">{right}</div> : null}
    </div>
  );
}