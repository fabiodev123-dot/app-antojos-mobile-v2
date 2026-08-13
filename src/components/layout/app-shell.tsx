import type { ReactNode } from "react";
import { Toaster } from "@/components/ui/sonner";
import { BottomNav } from "@/components/layout/bottom-nav";
import { PwaInstall } from "@/components/features/pwa-install";
import { PwaRegister } from "@/components/features/pwa-register";

export function AppShell({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-dvh bg-background text-foreground">
      <div className="pb-[calc(5rem+env(safe-area-inset-bottom))]">
        {children}
      </div>
      <BottomNav />
      <PwaInstall />
      <PwaRegister />
      <Toaster position="top-center" richColors closeButton />
    </div>
  );
}