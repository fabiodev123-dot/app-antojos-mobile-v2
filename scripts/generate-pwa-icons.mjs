/**
 * Genera los iconos PWA de Antojos a partir del logo SVG.
 *
 * Output:
 *   - src/app/icon.png            (32x32, favicon Next.js)
 *   - src/app/apple-icon.png      (180x180, iOS touch icon)
 *   - public/icon-192x192.png     (PWA standard)
 *   - public/icon-512x512.png     (PWA standard)
 *   - public/icon-maskable-512.png (PWA adaptive, 40% safe zone)
 */
import sharp from "sharp";
import { mkdir, writeFile } from "node:fs/promises";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = resolve(__dirname, "..");

// SVG del logo: plato estilizado sobre fondo degradado naranja → amarillo
// con padding generoso para maskable icon safe zone.
const iconSvg = (size, withSafeZone = false) => `
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512" width="${size}" height="${size}">
  <defs>
    <linearGradient id="bg" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stop-color="#FF6600"/>
      <stop offset="100%" stop-color="#FFCC00"/>
    </linearGradient>
    <radialGradient id="hl" cx="0.3" cy="0.25" r="0.7">
      <stop offset="0%" stop-color="rgba(255,255,255,0.30)"/>
      <stop offset="60%" stop-color="rgba(255,255,255,0)"/>
    </radialGradient>
  </defs>
  ${withSafeZone
    ? `<rect width="512" height="512" fill="url(#bg)"/>`  // maskable: full bleed
    : `<rect width="512" height="512" rx="96" fill="url(#bg)"/>`  // standard: rounded
  }
  ${withSafeZone
    ? `<rect width="512" height="512" fill="url(#hl)"/>`  // highlight full bleed para maskable
    : `<rect width="512" height="512" rx="96" fill="url(#hl)"/>`
  }
  <!-- Plato: línea superior (mesa) + cuenco (bowl) -->
  <g fill="none" stroke="#FFFFFF" stroke-width="22" stroke-linecap="round" stroke-linejoin="round">
    <!-- Tapa del plato -->
    <path d="M 156 180 L 156 240"/>
    <path d="M 156 220 L 356 220"/>
    <!-- Cuenco -->
    <path d="M 156 280 L 356 280 L 356 280.5 a 80 80 0 0 1 -80 80 L 236 360.5 a 80 80 0 0 1 -80 -80 Z"/>
  </g>
  <!-- Sombra sutil del plato (opcional, da profundidad) -->
  <ellipse cx="256" cy="380" rx="80" ry="8" fill="rgba(0,0,0,0.18)"/>
</svg>
`.trim();

async function generateSvgPng(svg, size, outPath) {
  await mkdir(dirname(outPath), { recursive: true });
  await sharp(Buffer.from(svg))
    .resize(size, size, { fit: "cover" })
    .png({ compressionLevel: 9 })
    .toFile(outPath);
  console.log(`  ✓ ${outPath.replace(root + "\\", "")} (${size}x${size})`);
}

async function main() {
  console.log("Generando iconos PWA de Antojos…\n");

  // Standard (rounded corners)
  const standardSvg = iconSvg(512, false);
  await generateSvgPng(standardSvg, 192, resolve(root, "public/icon-192x192.png"));
  await generateSvgPng(standardSvg, 512, resolve(root, "public/icon-512x512.png"));

  // Maskable (full bleed, 40% safe zone respetado)
  const maskableSvg = iconSvg(512, true);
  await generateSvgPng(maskableSvg, 512, resolve(root, "public/icon-maskable-512.png"));

  // Next.js app conventions (favicon + apple touch)
  const appleSvg = iconSvg(180, false);
  await generateSvgPng(appleSvg, 180, resolve(root, "src/app/apple-icon.png"));

  // favicon multi-tamaño (32x32 simple)
  const faviconSvg = iconSvg(32, false);
  await mkdir(resolve(root, "src/app"), { recursive: true });
  await sharp(Buffer.from(faviconSvg))
    .resize(32, 32)
    .png()
    .toFile(resolve(root, "src/app/icon.png"));

  console.log(`  ✓ src/app/icon.png (32x32, favicon)`);
  console.log(`  ✓ src/app/apple-icon.png (180x180, iOS)\n`);
  console.log("Listo. ✓");
}

main().catch((err) => {
  console.error("ERROR:", err);
  process.exit(1);
});