import Link from "next/link";
import { cn } from "@/lib/utils";

interface LogoProps {
  className?: string;
  href?: string;
  size?: "sm" | "md" | "lg";
}

export function Logo({ className, href, size = "md" }: LogoProps) {
  const sizes = {
    sm: "h-8 w-8",
    md: "h-9 w-9",
    lg: "h-12 w-12",
  }[size];

  const inner = (
    <span
      className={cn(
        "block shrink-0 overflow-hidden rounded-xl bg-black ring-1 ring-brand/40",
        sizes,
        className,
      )}
      aria-label="Antojos"
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src="/logo-mark.png"
        alt=""
        className="h-full w-full object-cover"
      />
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