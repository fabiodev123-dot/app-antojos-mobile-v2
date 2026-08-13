import type { Producto, TipoEntrega } from "@/lib/types";

/**
 * Parser local de pedidos escritos a mano / copiados de WhatsApp.
 *
 * NO usa IA: matching fuzzy contra los productos cargados en carta.
 * Pensado para texto en español rioplatense, con typos, abreviaturas
 * y separadores informales (comas, "y", saltos de línea).
 *
 * Ejemplos que entiende:
 *   "2 sanguches de milanesa, una docena sanguches, una coca"
 *   "sanguche milanesa x3 + docena sanguches + coca sin cebolla"
 *   "- pizza muzza\n- 2 empanadas jamón\n- coca 1.5L"
 */

export interface ParsedItem {
  cantidad: number;
  matched: Producto | null;
  raw: string;
  score: number;
  /** Razón por la que el parser tomó una decisión (útil para debugging/UX). */
  reason: string;
}

export interface ParseResult {
  matched: ParsedItem[];
  unmatched: ParsedItem[];
  observations: string[];
  /** Nombre del cliente extraído del texto (si se detecta). Vacío si no. */
  nombreCliente: string;
  /**
   * Modalidad de entrega inferida del texto. `null` si no se detectó
   * (el caller decide el default — usualmente "retiro").
   */
  tipoEntregaDetectado: TipoEntrega | null;
}

const NUMBER_WORDS: Record<string, number> = {
  un: 1, una: 1, uno: 1,
  dos: 2,
  tres: 3,
  cuatro: 4,
  cinco: 5,
  seis: 6,
  siete: 7,
  ocho: 8,
  nueve: 9,
  diez: 10,
  once: 11,
  doce: 12, docena: 12,
};

/**
 * Patrones para detectar el nombre del cliente en un mensaje de WhatsApp.
 *
 * Cada regex captura el nombre en el grupo 1. Probamos en orden y nos
 * quedamos con el primer match razonable (2-30 chars, no palabra común).
 */
const NAME_PATTERNS: Array<{ pattern: RegExp; label: string }> = [
  // Orden importante: alternativas MÁS LARGAS primero. JS regex no re-backtrackea dentro de
  // un grupo `(?:a|b)` cuando la primera match consume el mismo prefijo — poner "buenas"
  // antes que "buenas\s+tardes" rompe el match para "Buenas tardes Diego".
  { pattern: /^(?:buenas\s+tardes|buenas\s+noches|buen\s+d[ií]a|hola|buenas)\s+([A-ZÁÉÍÓÚÑa-záéíóúñ][a-záéíóúñ]+(?:\s+[A-ZÁÉÍÓÚÑa-záéíóúñ][a-záéíóúñ]+){0,3})/i, label: "saludo inicial" },
  { pattern: /\b(?:me\s+llamo|soy|mi\s+nombre\s+es)\s+([A-ZÁÉÍÓÚÑa-záéíóúñ][a-záéíóúñ]+(?:\s+[A-ZÁÉÍÓÚÑa-záéíóúñ][a-záéíóúñ]+){0,3})/i, label: "presentación" },
  { pattern: /\b(?:para|a\s+nombre\s+de|entreg(?:arle|ar)\s+a)\s+([A-ZÁÉÍÓÚÑa-záéíóúñ][a-záéíóúñ]+(?:\s+[A-ZÁÉÍÓÚÑa-záéíóúñ][a-záéíóúñ]+){0,3})/i, label: "para/a nombre de" },
  { pattern: /\b([A-ZÁÉÍÓÚÑ][a-záéíóúñ]{2,})[\s,]+(?:quiere|pide|necesita|consulta|habla|pregunta)/i, label: "nombre + verbo" },
];

/**
 * Palabras comunes que NO deben tomarse como nombre aunque matcheen un patrón.
 */
const NAME_STOPWORDS = new Set([
  "hola", "buenas", "buena", "bueno", "tardes", "noches", "dias", "dia",
  "para", "con", "sin", "por", "que", "como", "del", "los", "las",
  "una", "uno", "dos", "tres", "docena", "media", "docenas",
  "encargue", "encargo", "encarguen", "encargamos",
  "confirmo", "confirmen", "anoto", "anoten",
]);

/**
 * Detecta la modalidad de entrega a partir del texto.
 *
 * Devuelve `"delivery"`, `"retiro"` o `null` si no se encontró evidencia.
 * Si aparecen ambas en el texto, gana la que aparece primero (heurística
 * práctica: la intención se suele expresar al inicio del mensaje).
 *
 * El matching es case-insensitive y tolerante a acentos.
 */
const DELIVERY_PATTERNS: RegExp[] = [
  /\bdelivery\b/i,
  /\bdomicilio\b/i,
  /\ba\s+domicilio\b/i,
  /\ba\s+casa\b/i,
  /\bcon\s+env[ií]o\b/i,
  /\bm[aá]nd(?:a(?:r|me|lo)|e)\s+a\b/i,
  /\bllev[aá]r?(?:me|lo)\s+a\b/i,
  /\bpara\s+llevar\s+a\b/i,
];

const RETIRO_PATTERNS: RegExp[] = [
  /\bretiro\b/i,
  /\bretira(?:r)?\b/i,
  /\bpaso\s+a\s+buscar\b/i,
  /\bpasa\s+a\s+buscar\b/i,
  /\bpasa\s+a\s+retirar\b/i,
  /\bvoy\s+a\s+buscar\b/i,
  /\bvoy\s+por\b/i,
  /\bvoy\s+al\s+local\b/i,
  /\bpasamos?\s+a\s+buscar\b/i,
  /\bmostrador\b/i,
  /\bpick[\s-]?up\b/i,
];

function detectTipoEntrega(text: string): TipoEntrega | null {
  let firstDelivery = -1;
  let firstRetiro = -1;
  for (const re of DELIVERY_PATTERNS) {
    const m = text.search(re);
    if (m >= 0 && (firstDelivery < 0 || m < firstDelivery)) firstDelivery = m;
  }
  for (const re of RETIRO_PATTERNS) {
    const m = text.search(re);
    if (m >= 0 && (firstRetiro < 0 || m < firstRetiro)) firstRetiro = m;
  }
  if (firstDelivery < 0 && firstRetiro < 0) return null;
  if (firstDelivery < 0) return "retiro";
  if (firstRetiro < 0) return "delivery";
  return firstDelivery <= firstRetiro ? "delivery" : "retiro";
}

function extractNombreCliente(text: string): string {
  for (const { pattern } of NAME_PATTERNS) {
    const m = text.match(pattern);
    if (!m || !m[1]) continue;
    const candidato = m[1].trim();
    const words = candidato.split(/\s+/);
    if (words.length === 0) continue;
    if (words.some((w) => NAME_STOPWORDS.has(w.toLowerCase()))) continue;
    // Longitud razonable
    if (candidato.length < 2 || candidato.length > 40) continue;
    // Cada palabra empieza con mayúscula/minúscula (case-insensitive) o es conector.
    // Aceptamos lowercase también porque en mensajes informales el nombre puede no tener
    // mayúscula (ej: "para roberto").
    const ok = words.every(
      (w, i) =>
        /^[a-záéíóúñ]/i.test(w) || (i > 0 && /^(de|del|la|las|los|y)$/i.test(w)),
    );
    if (!ok) continue;
    return candidato;
  }
  return "";
}

const MULTIPLIERS: Array<{ pattern: RegExp; factor: number; reason: string }> = [
  { pattern: /\bdocena(?:s)?\b/i, factor: 12, reason: "docena ×12" },
  { pattern: /\bmedia\s+docena\b/i, factor: 6, reason: "media docena ×6" },
];

const STOPWORDS = new Set([
  "de", "del", "la", "el", "los", "las", "con", "para", "por", "un", "una", "unos", "unas",
]);

/**
 * Sinónimos coloquiales → nombre de categoría. Usado cuando el usuario escribe
 * "sanguches" pero la categoría se llama "Sándwiches de Miga", etc.
 */
const CATEGORY_SYNONYMS: Record<string, string[]> = {
  "alitos": ["alitos", "alita", "alitas"],
  "hambur pizza": ["hambur pizza", "hamburguesa pizza", "hamburguesapizza"],
  "empanadas": ["empanada", "empanadas", "empanaditas", "empanada frita", "empanadas fritas"],
  "tortas y sándwiches": ["torta", "tortas", "sanguche", "sanguches", "sandwich", "sandwiches", "miga", "migas", "triple", "triples", "torta de miga"],
  "hamburguesas": ["burger", "burgers", "hamburguesa", "hamburguesas"],
  "pizzas": ["pizza", "pizzas", "muzzarella", "calabreza"],
  "combos": ["combo", "combos", "promo"],
  "helados": ["helado", "helados", "grido", "torta helada"],
};

const OBSERVATION_KEYWORDS = /^(sin|con|para|nota|obs|obs:|nota:)/i;

const SEPARATOR_REGEX = /\r?\n|;|\s*\+\s*|,|\s+y\s+(?=\w)/g;

/**
 * Saluda / prefijos de nombre que se pueden ignorar al inicio de un segmento
 * para encontrar la cantidad. Ej: "Hola María, 2 sanguches..." → strip "Hola María,"
 * → queda "2 sanguches..." que sí matchea leading-word quantity.
 */
const SEGMENT_GREETING = /^(?:hola|buen[oa]s?(?:\s+(?:d[ií]a|tardes|noches))?|para|entreg(?:ar(?:le)?|a))\s+[A-Z][\w\s]*?(?:[,;:\-]|\s+\d|\s*$)/i;

function normalize(input: string): string {
  return input
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^\w\s/]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function stripStopwords(tokens: string[]): string[] {
  return tokens.filter((t) => !STOPWORDS.has(t));
}

function tokenize(input: string): string[] {
  return stripStopwords(normalize(input).split(" ").filter(Boolean));
}

function parseQuantity(token: string): number | null {
  if (!token) return null;
  const n = Number(token.replace(",", "."));
  if (!Number.isNaN(n) && n > 0 && n < 1000) return n;
  const w = token.toLowerCase();
  if (w in NUMBER_WORDS) return NUMBER_WORDS[w];
  return null;
}

function extractQuantity(segment: string): { qty: number; name: string; reason: string } {
  let trimmed = segment.trim().replace(/^[-•·*]\s*/, "");

  // Strip greeting prefix si existe (ej: "Hola María, 2 sanguches..." → "2 sanguches...")
  trimmed = trimmed.replace(SEGMENT_GREETING, "").trim();

  // Strip "para X" / "a nombre de X" / "entregar a X" SUFIJO. El cliente puede
  // estar al final: "2 sanguches de milanesa para Roberto" → "2 sanguches de milanesa".
  // Usamos `[\s\S]` en vez de `\w` para que matchee acentos (María, González, etc.).
  trimmed = trimmed
    .replace(
      /\s+(?:para|a\s+nombre\s+de|entreg(?:ar(?:le)?|a)\s+a)\s+[A-ZÁÉÍÓÚÑa-záéíóúñ][\s\S]*$/i,
      "",
    )
    .trim();

  // Patrones a probar en orden:
  // 1. "2 sanguches", "dos sanguches"
  const leadingWord = trimmed.match(/^(\d+|\w+)\s+(.+)$/);
  if (leadingWord) {
    const q = parseQuantity(leadingWord[1]);
    if (q !== null) return { qty: q, name: leadingWord[2], reason: `cantidad="${leadingWord[1]}"` };
  }

  // 2. "sanguches x2", "sanguches por 2", "sanguches × 2"
  const trailingMult = trimmed.match(/^(.+?)\s+(?:x|×|por)\s*(\d+)$/i);
  if (trailingMult) {
    const q = parseQuantity(trailingMult[2]);
    if (q !== null) return { qty: q, name: trailingMult[1], reason: `sufijo "x${trailingMult[2]}"` };
  }

  // 3. Sin cantidad explícita → 1
  return { qty: 1, name: trimmed, reason: "sin cantidad → 1" };
}

function applyMultipliers(qty: number, segment: string): { qty: number; reason: string } {
  for (const { pattern, factor, reason } of MULTIPLIERS) {
    if (pattern.test(segment)) {
      return { qty: qty * factor, reason };
    }
  }
  return { qty, reason: "" };
}

interface ScoredMatch {
  product: Producto;
  score: number;
  reason: string;
}

function scoreMatch(nameTokens: string[], product: Producto): ScoredMatch | null {
  if (nameTokens.length === 0) return null;
  const productTokens = tokenize(product.nombre);
  if (productTokens.length === 0) return null;

  // Match 1: todos los tokens del nombre aparecen en el producto (orden libre)
  const productSet = new Set(productTokens);
  const allHits = nameTokens.every((t) => productSet.has(t));
  if (allHits && nameTokens.length >= 1) {
    // Bonus si el primer token matchea el primer token del producto
    const startsBonus = nameTokens[0] === productTokens[0] ? 0.15 : 0;
    const coverage = nameTokens.length / productTokens.length;
    const score = Math.min(1, 0.85 + coverage * 0.1 + startsBonus);
    return { product, score, reason: `cobertura completa (${nameTokens.length}/${productTokens.length})` };
  }

  // Match 2: intersección parcial ponderada. Recall-biased porque el usuario a veces
  // omite palabras de categoría ("sanguches de milanesa" vs "Miga de Milanesa" — matchea "milanesa").
  const hits = nameTokens.filter((t) => productSet.has(t)).length;
  if (hits === 0) return null;
  const recall = hits / nameTokens.length;
  const precision = hits / productTokens.length;
  const score = recall * 0.75 + precision * 0.25;
  if (score < 0.45) return null;
  return { product, score, reason: `intersección ${hits}/${nameTokens.length} (recall ${recall.toFixed(2)})` };
}

function matchProducto(
  name: string,
  productos: Producto[],
  minScore: number,
  categorias: { id: string; nombre: string; emoji?: string }[] = [],
): ScoredMatch | null {
  const tokens = tokenize(name);
  if (tokens.length === 0) return null;

  let best: ScoredMatch | null = null;
  for (const product of productos) {
    if (!product.activo) continue;
    const candidate = scoreMatch(tokens, product);
    if (!candidate) continue;
    if (!best || candidate.score > best.score) {
      best = candidate;
    }
  }
  if (!best || best.score < minScore) {
    // Fallback: si no matcheó nada y la palabra es muy genérica (ej: "sanguches"),
    // intentar matchear contra el NOMBRE de la categoría y devolver el primer producto de esa categoría.
    const fallback = matchByCategory(tokens, productos, categorias);
    if (fallback) return fallback;
    return null;
  }
  return best;
}

/**
 * Matchea por categoría: si los tokens del nombre matchean el nombre de una categoría
 * (o algún sinónimo coloquial), devuelve el primer producto activo de esa categoría.
 * Útil cuando el usuario escribe solo "sanguches" → matchear contra "Sándwiches de Miga".
 */
function matchByCategory(
  tokens: string[],
  productos: Producto[],
  categorias: { id: string; nombre: string; emoji?: string }[],
): ScoredMatch | null {
  if (tokens.length === 0) return null;
  for (const cat of categorias) {
    if (!cat.id) continue;
    const catTokens = new Set(tokenize(cat.nombre));
    const synonyms = CATEGORY_SYNONYMS[tokenize(cat.nombre).join(" ")] ?? [];
    const synonymSet = new Set(synonyms);

    const allMatch = tokens.every(
      (t) => catTokens.has(t) || synonymSet.has(t),
    );
    if (!allMatch) continue;
    // Encontrar primer producto activo de esta categoría
    const product = productos.find((p) => p.activo && p.categoriaId === cat.id);
    if (!product) continue;
    return {
      product,
      score: 0.6, // score medio para que pase el threshold
      reason: `categoría "${cat.nombre}"`,
    };
  }
  return null;
}

export function parsePedidoText(
  text: string,
  productos: Producto[],
  options: { minScore?: number; categorias?: { id: string; nombre: string; emoji?: string }[] } = {},
): ParseResult {
  const minScore = options.minScore ?? 0.45;
  const categorias = options.categorias ?? [];
  const segments = text.split(SEPARATOR_REGEX).map((s) => s.trim()).filter(Boolean);

  const matched: ParsedItem[] = [];
  const unmatched: ParsedItem[] = [];
  const observations: string[] = [];

  for (const segment of segments) {
    if (!segment.trim()) continue;

    if (OBSERVATION_KEYWORDS.test(segment)) {
      observations.push(segment);
      continue;
    }

    const { qty, name, reason } = extractQuantity(segment);
    const { qty: finalQty, reason: multReason } = applyMultipliers(qty, segment);
    const reasonParts = [reason, multReason].filter(Boolean);

    const match = matchProducto(name, productos, minScore, categorias);
    if (match) {
      matched.push({
        cantidad: finalQty,
        matched: match.product,
        raw: segment,
        score: match.score,
        reason: [...reasonParts, `${match.product.nombre} (${match.reason})`].join(" · "),
      });
    } else {
      unmatched.push({
        cantidad: finalQty,
        matched: null,
        raw: segment,
        score: 0,
        reason: reasonParts.join(" · ") || "no match",
      });
    }
  }

  // Deduplicar: sumar cantidades del mismo producto
  const dedup = new Map<string, ParsedItem>();
  for (const item of matched) {
    if (!item.matched) continue;
    const key = item.matched.id;
    const existing = dedup.get(key);
    if (existing) {
      existing.cantidad += item.cantidad;
      existing.reason = `${existing.reason} + ${item.raw}`;
    } else {
      dedup.set(key, { ...item });
    }
  }

  return {
    matched: Array.from(dedup.values()).sort((a, b) => b.score - a.score),
    unmatched,
    observations,
    nombreCliente: extractNombreCliente(text),
    tipoEntregaDetectado: detectTipoEntrega(text),
  };
}