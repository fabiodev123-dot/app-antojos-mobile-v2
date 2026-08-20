"use client";

import type { ReactNode } from "react";
import { Toaster } from "@/components/ui/sonner";
import { BottomNav } from "@/components/layout/bottom-nav";
import { PwaInstall } from "@/components/features/pwa-install";
import { PwaRegister } from "@/components/features/pwa-register";
import { VentaRapidaFab } from "@/components/layout/venta-rapida-fab";
import { useDeviceHeartbeat } from "@/hooks/use-device-heartbeat";

export function AppShell({
  children,
  topBar,
}: {
  children: ReactNode;
  topBar?: ReactNode;
}) {
  useDeviceHeartbeat();
  return (
    <div className="min-h-dvh bg-background text-foreground">
      {topBar}
      <div className="pb-[calc(5rem+env(safe-area-inset-bottom))]">
        {children}
      </div>
      <BottomNav />
      <VentaRapidaFab />
      <PwaInstall />
      <PwaRegister />
      <Toaster position="top-center" richColors closeButton />
    </div>
  );
}