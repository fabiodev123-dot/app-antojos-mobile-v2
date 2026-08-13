import Link from "next/link";
import { cn } from "@/lib/utils";

interface LogoProps {
  className?: string;
  href?: string;
  size?: "sm" | "md" | "lg";
}

export function Logo({ className, href, size = "md" }: LogoProps) {
  const sizes = {
    sm: { box: "h-8 w-8", icon: "size-5" },
    md: { box: "h-9 w-9", icon: "size-5" },
    lg: { box: "h-12 w-12", icon: "size-7" },
  }[size];

  const inner = (
    <span
      className={cn(
        "relative flex shrink-0 items-center justify-center rounded-xl text-primary-foreground brand-glow",
        sizes.box,
        className,
      )}
      aria-label="Antojos"
    >
      <span
        aria-hidden
        className="absolute inset-0 rounded-xl bg-gradient-to-br from-brand via-brand to-secondary/90"
      />
      <span
        aria-hidden
        className="absolute inset-0 rounded-xl bg-[radial-gradient(circle_at_top_left,rgba(255,255,255,0.18),transparent_60%)]"
      />
      <svg
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2.2"
        strokeLinecap="round"
        strokeLinejoin="round"
        className={cn("relative", sizes.icon)}
        aria-hidden
      >
        <path d="M6 4v6a6 6 0 0 0 12 0V4" />
        <path d="M6 8h12" />
        <path d="M5 14h14" />
        <path d="M5 14a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2v.5a3.5 3.5 0 0 1-3.5 3.5h-7A3.5 3.5 0 0 1 5 14.5z" />
      </svg>
    </span>
  );

  if (href) {
    return (
      <Link href={href} aria-label="Inicio">
        {inner}
      </Link>
    );
  }
  return inner;
}