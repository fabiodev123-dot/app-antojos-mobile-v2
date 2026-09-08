import type React from "react";

/**
 * Layout para páginas públicas (landing, login).
 * No hace auth queries ni renderiza AppShell/BottomNav.
 */
export default function PublicLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
