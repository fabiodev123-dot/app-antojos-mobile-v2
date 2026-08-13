"use client";

import { useEffect, useState, useSyncExternalStore } from "react";
import { Download, Share, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";

// Tipos para el evento beforeinstallprompt (no está en TS stdlib todavía)
interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed"; platform: string }>;
}

const STORAGE_KEY_DISMISSED = "antojos:pwa-install-dismissed";
const STORAGE_KEY_INSTALLED = "antojos:pwa-installed";

// useSyncExternalStore: server → false, client → true. Sin useEffect ni setState.
// Requisito de React Compiler (regla react-hooks/set-state-in-effect).
function useIsClient() {
  return useSyncExternalStore(
    () => () => {},
    () => true,
    () => false,
  );
}

/**
 * ¿La app está corriendo ya en modo "instalada" (sin barra del browser)?
 * Combina dos señales: display-mode CSS media query + flag en localStorage
 * (que persiste entre sesiones, por si el user entra en una tab nueva).
 * El `subscribe` escucha `appinstalled` y `storage` para re-evaluar el snapshot
 * cuando el usuario instala durante la sesión.
 */
function useIsInstalled() {
  return useSyncExternalStore(
    (notify) => {
      window.addEventListener("appinstalled", notify);
      window.addEventListener("storage", notify);
      return () => {
        window.removeEventListener("appinstalled", notify);
        window.removeEventListener("storage", notify);
      };
    },
    () => {
      if (window.matchMedia("(display-mode: standalone)").matches) return true;
      try {
        return localStorage.getItem(STORAGE_KEY_INSTALLED) === "true";
      } catch {
        return false;
      }
    },
    () => false,
  );
}

/**
 * Detecta iOS para mostrar instrucciones específicas (Safari no dispara
 * `beforeinstallprompt`).
 */
function detectIOS() {
  if (typeof window === "undefined") return false;
  const ua = window.navigator.userAgent;
  // iPadOS 13+ se identifica como Mac — chequear touch points
  const isIPadOS = ua.includes("Mac") && "ontouchend" in document;
  return /iPad|iPhone|iPod/.test(ua) || isIPadOS;
}

export function PwaInstall() {
  const [installEvent, setInstallEvent] = useState<BeforeInstallPromptEvent | null>(null);
  const [showInstructions, setShowInstructions] = useState(false);
  const mounted = useIsClient();
  const installed = useIsInstalled();
  const isIOS = mounted ? detectIOS() : false;

  useEffect(() => {
    if (!mounted) return;

    // Si el usuario ya descartó esta sesión, no re-mostrar
    if (sessionStorage.getItem(STORAGE_KEY_DISMISSED) === "true") return;

    function handleBeforeInstall(e: Event) {
      e.preventDefault();
      setInstallEvent(e as BeforeInstallPromptEvent);
    }

    function handleInstalled() {
      try {
        localStorage.setItem(STORAGE_KEY_INSTALLED, "true");
      } catch {
        // ignore
      }
      // Forzar re-evaluación del useSyncExternalStore (instalado = true)
      window.dispatchEvent(new Event("storage"));
    }

    window.addEventListener("beforeinstallprompt", handleBeforeInstall);
    window.addEventListener("appinstalled", handleInstalled);

    return () => {
      window.removeEventListener("beforeinstallprompt", handleBeforeInstall);
      window.removeEventListener("appinstalled", handleInstalled);
    };
  }, [mounted]);

  async function handleInstallClick() {
    if (installEvent) {
      // Android / Chrome / Edge: prompt nativo
      await installEvent.prompt();
      const { outcome } = await installEvent.userChoice;
      if (outcome === "accepted") {
        try {
          localStorage.setItem(STORAGE_KEY_INSTALLED, "true");
        } catch {
          // ignore
        }
        window.dispatchEvent(new Event("storage"));
      }
      setInstallEvent(null);
    } else {
      // iOS: mostrar instrucciones
      setShowInstructions(true);
    }
  }

  function handleDismiss() {
    try {
      sessionStorage.setItem(STORAGE_KEY_DISMISSED, "true");
    } catch {
      // ignore
    }
    setInstallEvent(null);
  }

  // No mostrar nada si: ya está instalado, no montó todavía, o no hay evento
  // y no es iOS (escritorio sin soporte PWA).
  if (!mounted || installed) return null;
  if (!installEvent && !isIOS) return null;

  return (
    <>
      <div className="fixed inset-x-0 bottom-[calc(5rem+env(safe-area-inset-bottom))] z-30 mx-auto max-w-md px-3 pb-2">
        <div className="flex items-center gap-3 rounded-xl border border-brand/40 bg-card/95 p-3 shadow-2xl backdrop-blur supports-[backdrop-filter]:bg-card/80">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-gradient-to-br from-brand to-secondary text-primary-foreground shadow-md">
            <Download className="size-5" />
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-sm font-medium leading-tight">Instalá Antojos</p>
            <p className="text-[11px] text-muted-foreground leading-tight">
              Accedé desde tu pantalla de inicio, sin navegador.
            </p>
          </div>
          <Button size="sm" onClick={handleInstallClick} className="shrink-0 rounded-full">
            Instalar
          </Button>
          <button
            type="button"
            onClick={handleDismiss}
            className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md text-muted-foreground hover:bg-muted hover:text-foreground"
            aria-label="Cerrar"
          >
            <X className="size-3.5" />
          </button>
        </div>
      </div>

      <Sheet open={showInstructions} onOpenChange={setShowInstructions}>
        <SheetContent
          side="bottom"
          className="gap-0 rounded-t-2xl border-border bg-popover px-0 pb-0 shadow-2xl"
        >
          <div className="flex justify-center pt-2 pb-1">
            <span className="h-1 w-10 rounded-full bg-border" aria-hidden />
          </div>

          <SheetHeader className="border-b border-border/60 px-5 pb-4">
            <SheetTitle className="font-heading text-xl font-semibold tracking-tight">
              Instalar en iPhone / iPad
            </SheetTitle>
            <SheetDescription className="text-xs">
              Safari no permite instalar con un botón. Hacelo así:
            </SheetDescription>
          </SheetHeader>

          <ol className="space-y-3 px-5 py-5 text-sm">
            <li className="flex gap-3">
              <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-brand/15 text-sm font-bold text-brand">
                1
              </span>
              <div>
                <p className="font-medium">Tocá el botón Compartir</p>
                <p className="text-xs text-muted-foreground">
                  El ícono <Share className="inline size-3.5 align-text-bottom" /> en la barra de Safari (el cuadrado con la flecha hacia arriba).
                </p>
              </div>
            </li>
            <li className="flex gap-3">
              <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-brand/15 text-sm font-bold text-brand">
                2
              </span>
              <div>
                <p className="font-medium">Elegí &quot;Agregar a pantalla de inicio&quot;</p>
                <p className="text-xs text-muted-foreground">
                  Bajá hasta encontrar la opción dentro del menú.
                </p>
              </div>
            </li>
            <li className="flex gap-3">
              <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-brand/15 text-sm font-bold text-brand">
                3
              </span>
              <div>
                <p className="font-medium">Tocá &quot;Agregar&quot;</p>
                <p className="text-xs text-muted-foreground">
                  Listo. Antojos aparece como una app más en tu celular.
                </p>
              </div>
            </li>
          </ol>

          <div className="border-t border-border/60 bg-popover px-5 py-4 pb-[calc(1rem+env(safe-area-inset-bottom))]">
            <Button
              variant="outline"
              onClick={() => setShowInstructions(false)}
              className="w-full"
            >
              Entendido
            </Button>
          </div>
        </SheetContent>
      </Sheet>
    </>
  );
}