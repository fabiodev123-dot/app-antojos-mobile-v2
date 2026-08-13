import { cn } from "@/lib/utils";

interface EmptyStateProps {
  icon?: "package" | "users" | "clipboard" | "boxes" | "moon";
  title: string;
  description?: string;
  className?: string;
}

const ICONS = {
  package: (
    <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z M3.27 6.96 12 12.01l8.73-5.05M12 22.08V12" />
  ),
  users: (
    <>
      <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
      <circle cx="9" cy="7" r="4" />
      <path d="M22 21v-2a4 4 0 0 0-3-3.87" />
      <path d="M16 3.13a4 4 0 0 1 0 7.75" />
    </>
  ),
  clipboard: (
    <>
      <rect x="8" y="2" width="8" height="4" rx="1" />
      <path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2" />
      <path d="M9 14l2 2 4-4" />
    </>
  ),
  boxes: (
    <>
      <path d="M2 3h6v6H2zM12 3h6v6h-6zM22 3h-2v6h2zM2 15h6v6H2zM12 15h6v6h-6zM22 15h-2v6h2z" />
    </>
  ),
  moon: (
    <>
      <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
    </>
  ),
} as const;

export function EmptyState({ icon = "package", title, description, className }: EmptyStateProps) {
  return (
    <div className={cn("py-10 text-center", className)}>
      <div className="mx-auto mb-3 flex h-16 w-16 items-center justify-center rounded-2xl bg-muted/50 text-muted-foreground/40">
        <svg
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.5"
          strokeLinecap="round"
          strokeLinejoin="round"
          className="size-8"
          aria-hidden
        >
          {ICONS[icon]}
        </svg>
      </div>
      <p className="text-sm font-medium text-muted-foreground">{title}</p>
      {description ? (
        <p className="mt-0.5 text-xs text-muted-foreground/70">{description}</p>
      ) : null}
    </div>
  );
}