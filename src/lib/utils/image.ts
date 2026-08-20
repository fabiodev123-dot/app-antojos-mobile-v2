/**
 * Utilidades para manipular imágenes en el cliente sin librerías externas.
 *
 * - `readFileAsDataUrl(file)`: lee un File como data URL.
 * - `loadImage(src)`: carga un `src` (data URL o path) en un HTMLImageElement.
 * - `compressImage(img, opts)`: re-manda la imagen por un canvas con
 *   tamaño máximo y calidad JPEG reducible. Baja fotos de celular de
 *   ~3-5MB a ~100-300KB para que entren en localStorage.
 */

export function readFileAsDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = () => reject(reader.error ?? new Error("No se pudo leer el archivo"));
    reader.readAsDataURL(file);
  });
}

export function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error("No se pudo cargar la imagen"));
    img.src = src;
  });
}

export interface CompressOptions {
  /** Ancho máximo en píxeles. Si la imagen es más chica, no se agranda. */
  maxWidth?: number;
  /** Alto máximo en píxeles. Si la imagen es más chica, no se agranda. */
  maxHeight?: number;
  /** Calidad JPEG (0-1). Default: 0.85. */
  quality?: number;
  /** Tipo MIME de salida. Default: "image/jpeg". */
  type?: string;
}

/**
 * Re-encode la imagen a JPEG con tamaño máximo y calidad controlada.
 * Devuelve un data URL nuevo. Si el original es chico y de tipo compatible,
 * devuelve el mismo src (sin tocar).
 */
export async function compressImage(
  src: string,
  opts: CompressOptions = {},
): Promise<string> {
  const maxWidth = opts.maxWidth ?? 1024;
  const maxHeight = opts.maxHeight ?? 1024;
  const quality = opts.quality ?? 0.85;
  const type = opts.type ?? "image/jpeg";

  const img = await loadImage(src);
  const { width, height } = img;
  const ratio = Math.min(1, maxWidth / width, maxHeight / height);
  if (ratio >= 1 && type === "image/jpeg") {
    // No necesitamos escalar — devolvemos el src tal cual.
    return src;
  }

  const canvas = document.createElement("canvas");
  canvas.width = Math.round(width * ratio);
  canvas.height = Math.round(height * ratio);
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("No se pudo crear contexto de canvas");
  ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
  return canvas.toDataURL(type, quality);
}

/**
 * Estima el tamaño en bytes de un data URL (no incluye el prefijo).
 */
export function estimateDataUrlSize(dataUrl: string): number {
  const comma = dataUrl.indexOf(",");
  if (comma < 0) return 0;
  const b64 = dataUrl.slice(comma + 1);
  // Cada 4 chars base64 = 3 bytes.
  return Math.floor((b64.length * 3) / 4);
}

/**
 * Devuelve el tamaño formateado (KB/MB) para feedback al usuario.
 */
export function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}