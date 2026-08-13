"use client";

import { useRef, useState } from "react";
import { Camera, ImagePlus, X, Link2, Upload, Loader2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import {
  compressImage,
  estimateDataUrlSize,
  formatBytes,
  readFileAsDataUrl,
} from "@/lib/utils/image";

const MAX_BYTES = 1_500_000; // ~1.5 MB después de comprimir — limita el localStorage.

interface ImageUploaderProps {
  value: string;
  onChange: (next: string) => void;
  /** Callback opcional cuando hay error (tamaño excedido, formato inválido). */
  onError?: (message: string) => void;
  className?: string;
}

type Modo = "auto" | "url";

/**
 * Campo de imagen con dos modos:
 *
 * - Auto: detecta si `value` parece una data URL (upload) o un path (manual).
 * - url: fuerza input de texto (path o URL).
 *
 * El modo upload captura foto con la cámara O elige de la galería del
 * dispositivo. La imagen se comprime con Canvas antes de guardar para
 * no explotar el localStorage.
 */
export function ImageUploader({ value, onChange, onError, className }: ImageUploaderProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [compressing, setCompressing] = useState(false);
  const [modoForzado, setModoForzado] = useState<Modo>("auto");

  const esDataUrl = value?.startsWith("data:") ?? false;
  const modo: Modo =
    modoForzado === "url"
      ? "url"
      : esDataUrl
        ? "auto"
        : value
          ? "url"
          : "auto";

  const sizeBytes = esDataUrl ? estimateDataUrlSize(value) : 0;

  async function handleFile(file: File | undefined | null) {
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      onError?.("Solo se aceptan imágenes");
      return;
    }
    setCompressing(true);
    try {
      const raw = await readFileAsDataUrl(file);
      const compressed = await compressImage(raw, {
        maxWidth: 1024,
        maxHeight: 1024,
        quality: 0.82,
      });
      const finalSize = estimateDataUrlSize(compressed);
      if (finalSize > MAX_BYTES) {
        onError?.(
          `La imagen quedó muy pesada (${formatBytes(finalSize)}). Probá con una más chica.`,
        );
        return;
      }
      onChange(compressed);
    } catch (err) {
      onError?.(err instanceof Error ? err.message : "No se pudo procesar la imagen");
    } finally {
      setCompressing(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  }

  function clear() {
    onChange("");
  }

  return (
    <div className={cn("space-y-2", className)}>
      <div className="flex items-center gap-2">
        <ModoTab
          active={modo === "auto"}
          onClick={() => setModoForzado("auto")}
          icon={<Camera className="size-3" />}
          label="Subir foto"
        />
        <ModoTab
          active={modo === "url"}
          onClick={() => setModoForzado("url")}
          icon={<Link2 className="size-3" />}
          label="URL / Path"
        />
        {value ? (
          <button
            type="button"
            onClick={clear}
            className="ml-auto inline-flex h-7 items-center gap-1 rounded-md px-1.5 text-[11px] text-muted-foreground hover:bg-muted hover:text-destructive transition-colors"
            aria-label="Quitar imagen"
          >
            <X className="size-3" />
            Quitar
          </button>
        ) : null}
      </div>

      {modo === "auto" ? (
        <SubirModo
          value={value}
          compressing={compressing}
          fileInputRef={fileInputRef}
          onPick={handleFile}
        />
      ) : (
        <UrlModo value={value} onChange={onChange} />
      )}

      {esDataUrl && sizeBytes > 0 ? (
        <p className="text-[10px] text-muted-foreground/70 tabular-nums">
          Tamaño guardado: {formatBytes(sizeBytes)}
        </p>
      ) : null}
    </div>
  );
}

function ModoTab({
  active,
  onClick,
  icon,
  label,
}: {
  active: boolean;
  onClick: () => void;
  icon: React.ReactNode;
  label: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={cn(
        "inline-flex h-7 items-center gap-1 rounded-md border px-2 text-xs font-medium transition-colors",
        active
          ? "border-brand/60 bg-brand/15 text-brand"
          : "border-border bg-background text-muted-foreground hover:bg-muted hover:text-foreground",
      )}
    >
      {icon}
      {label}
    </button>
  );
}

function SubirModo({
  value,
  compressing,
  fileInputRef,
  onPick,
}: {
  value: string;
  compressing: boolean;
  fileInputRef: React.RefObject<HTMLInputElement | null>;
  onPick: (file: File | null) => void;
}) {
  return (
    <div className="flex items-start gap-2.5">
      {/* Preview */}
      <div className="relative shrink-0">
        {value ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={value}
            alt="Preview"
            className="size-20 rounded-lg object-cover ring-1 ring-white/15 bg-muted shadow-[0_2px_8px_-2px_rgba(0,0,0,0.5)]"
          />
        ) : (
          <div className="flex size-20 flex-col items-center justify-center gap-1 rounded-lg border border-dashed border-border bg-muted/30 text-muted-foreground">
            {compressing ? (
              <Loader2 className="size-4 animate-spin" />
            ) : (
              <ImagePlus className="size-4" />
            )}
            <span className="text-[9px] uppercase tracking-wider">vacío</span>
          </div>
        )}
      </div>

      {/* Controles */}
      <div className="flex min-w-0 flex-1 flex-col gap-1.5">
        {/* Input file único con dos `capture` hints: `capture` solo sugiere
            cámara en mobile; si el browser no lo soporta, abre el picker
            normal de archivos. */}
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          capture="environment"
          onChange={(e) => onPick(e.target.files?.[0] ?? null)}
          className="hidden"
          aria-hidden
        />

        <Button
          type="button"
          size="sm"
          variant="outline"
          onClick={() => fileInputRef.current?.click()}
          disabled={compressing}
          className="w-full"
        >
          {compressing ? (
            <>
              <Loader2 className="size-3.5 animate-spin" />
              Procesando…
            </>
          ) : value ? (
            <>
              <Upload className="size-3.5" />
              Reemplazar foto
            </>
          ) : (
            <>
              <Camera className="size-3.5" />
              Sacar foto o elegir
            </>
          )}
        </Button>

        <p className="text-[11px] leading-relaxed text-muted-foreground">
          La imagen se comprime para no llenar el almacenamiento del teléfono.
        </p>
      </div>
    </div>
  );
}

function UrlModo({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  return (
    <div className="space-y-1.5">
      {value && !value.startsWith("data:") ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={value}
          alt="Preview"
          className="size-20 rounded-lg object-cover ring-1 ring-white/15 bg-muted shadow-[0_2px_8px_-2px_rgba(0,0,0,0.5)]"
        />
      ) : null}
      <Input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder="/imgplatos/1.jpg"
        autoComplete="off"
      />
      <p className="text-[11px] text-muted-foreground">
        Path relativo a <code className="text-foreground">/public</code> o URL
        completa (ej: <code className="text-foreground">/imgplatos/5.jpg</code>).
      </p>
    </div>
  );
}