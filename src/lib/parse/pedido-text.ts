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
 * Mapa de typos / variantes ortográficas → forma canónica.
 *
 * Se aplica ANTES de tokenizar para que el matching trabaje sobre el texto
 * normalizado (sin que un typo rompa el match). Es deliberadamente chico:
 * solo corregimos palabras que vemos seguido en mensajes de WhatsApp reales.
 */
const TYPO_MAP: Record<string, string> = {
  // ─── Hamburguesas / burgers
  "burguer": "burger",
  "burguers": "burger",
  "burgerrs": "burger",
  "burgerr": "burger",
  "boburguer": "burger",
  "hamburgueza": "hamburguesa",
  "hamburgesas": "hamburguesa",
  "hamburgeza": "hamburguesa",
  // ─── Pizzas / muzza
  "musarella": "muzzarella",
  "muzarela": "muzzarella",
  "mussarella": "muzzarella",
  "mussarela": "muzzarella",
  "mussa": "muzza",
  "musa": "muzza",
  "mozarella": "muzzarella",
  "mozarela": "muzzarella",
  "mocarela": "muzzarella",
  "muza": "muzza",
  "pizzza": "pizza",
  "piça": "pizza",
  // ─── Empanadas
  "empana": "empanada",
  "empanadaas": "empanada",
  // ─── Sándwiches / tortas
  "sanduche": "sanguche",
  "sanduches": "sanguche",
  "sandwiche": "sanguche",
  "sandwiches": "sanguche",
  // ─── Alitos
  "alitoss": "alito",
  "alitros": "alito",
  "alites": "alito",
  // ─── Helados
  "heladdo": "helado",
  "helao": "helado",
  "helasa": "helado",
  // ─── Calabreza
  "calabresa": "calabreza",
  "calabrezas": "calabreza",
};

/**
 * Singulariza plurales regulares del español: quita la 's' final si está
 * precedida por consonante (excepto s, x, z, ce, ge — esos no pluralizan con -s).
 * Sirve para que "hamburguesas" / "burgers" / "helados" matcheen con productos
 * en singular ("hamburguesa" / "burger" / "helado") y viceversa.
 */
function singularize(token: string): string {
  if (token.length <= 3) return token;
  if (!token.endsWith("s")) return token;
  const prev = token[token.length - 2];
  // No singularizar si termina en -ss, -xs, -zs, -ces, -ges (ya singulares o irregulares)
  if ("sxz".includes(prev)) return token;
  if (token.endsWith("ces") || token.endsWith("ges")) return token;
  return token.slice(0, -1);
}

/**
 * Sinónimos coloquiales → nombre de categoría. Usado cuando el usuario escribe
 * "sanguches" pero la categoría se llama "Sándwiches de Miga", etc.
 *
 * Las keys son la versión normalizada (lowercase, sin acentos, sin stopwords)
 * del nombre de la categoría, igualadas con `tokenize(cat.nombre).join(" ")`.
 */
const CATEGORY_SYNONYMS: Record<string, string[]> = {
  // ─── Alitos (cat_alitos)
  alito: [
    "alito", "alita", "alitas", "alitito",
    "alitas bbq", "alitas crispy", "alitas picantes",
    "wings", "wings bbq", "wing", "alita pollo", "alitas pollo",
    "alita sola", "porcion alitas", "porcion alito",
  ],
  // ─── Hambur Pizza (cat_hambur_pizza) — categoría "híbrida" hamburguesa+pizza
  "hambur pizza": [
    "hambur pizza", "hamburguesa pizza", "hamburguesapizza",
    "hamburpizza", "ham pizza", "hamur pizza",
    "pizza hamburguesa", "pizza con carne", "pizza burger",
    "pizza de carne",
  ],
  // ─── Empanadas (cat_empanadas)
  empanada: [
    "empanada", "empanadas", "empanaditas", "empanadon",
    "empanada frita", "empanadas fritas", "emp frita", "empanada al horno",
    "emp", "empanada de carne", "empanada jyq", "empanada de queso",
    "empanada verdura", "empanada caprese",
  ],
  // ─── Tortas y Sándwiches (cat_tortas)
  "torta sandwich": [
    "torta", "tortas", "tortita",
    "sanguche", "sanguches", "sanguchito",
    "sandwich", "sandwiches", "sandwiche", "sanduches", "sanduche",
    "miga", "migas", "torta miga", "torta de miga", "tortas de miga",
    "triple", "triples", "triple de miga", "triples de miga",
    "torta picada",
  ],
  // ─── Hamburguesas (cat_hamburguesas) — matchea si el input NO menciona "doble"/"casera"/etc.
  hamburguesa: [
    "hamburguesa", "hamburguesas", "burger", "burgers",
    "burguer", "hambur", "hambu",
    "burguers", "boburguer", "hamburgueza", "hamburgeza",
    "burg", "casera burger",
  ],
  // ─── Pizzas (cat_pizzas) — matchea solo si NO hay topping específico (muzza/calabreza/etc.)
  pizza: [
    "pizza", "pizzas", "piz", "pizza al horno",
    "pizza entera", "pizza de molde", "pizza de piedra",
  ],
  // ─── Combos (cat_combos)
  combo: [
    "combo", "combos", "promo", "promos", "promocion",
    "combo hamburguesa", "combo sanguche", "combo papas",
    "combo completo", "menu", "menu combo",
  ],
  // ─── Helados (cat_helados)
  helado: [
    "helado", "helados", "helasa", "helao", "heladito", "helada", "heladas",
    "postre helado", "postrecito", "copita", "cucurucho", "cucu",
    "paleta", "palito", "bombon", "bombones",
    "torta helada", "turron", "turron helado",
    "grido", "frisco", "familiar", "familiar helado",
    "kilo helado", "1kg helado", "1/4 helado", "cuarto helado",
    "medio kilo helado",
  ],
};

/**
 * Modificadores que apuntan a un PRODUCTO ESPECÍFICO dentro de una categoría
 * (no a la categoría en general).
 *
 * Cada modificador tiene un peso:
 *   - 1.0 = modificador fuerte / distintivo (ej: "doble", "casera")
 *   - 0.5 = modificador débil / fallback (ej: "simple", "clasica")
 *
 * El scoring aplica:
 *   1. +0.15 por cada hit de modificador (bonus)
 *   2. -50% al score si en la misma categoría hay OTRO producto con más hits
 *      (penalty para desambiguar)
 *
 * Esto resuelve casos como "burger doble" → Burgers Doble Todo (no Burgers).
 */
const PRODUCT_MODIFIERS: Record<string, Array<{ token: string; weight: number }>> = {
  // ─── Hamburguesas
  prod_burger: [
    { token: "simple", weight: 0.5 },
    { token: "clasica", weight: 0.5 },
    { token: "normal", weight: 0.5 },
    { token: "sola", weight: 0.5 },
  ],
  prod_burger_doble_todo: [
    { token: "doble", weight: 1.0 },
    { token: "todo", weight: 1.0 },
    { token: "completisima", weight: 1.0 },
    { token: "completa con todo", weight: 1.0 },
  ],
  prod_burgers_completa_caseras: [
    { token: "casera", weight: 1.0 },
    { token: "caseras", weight: 1.0 },
    { token: "completas", weight: 1.0 },
    { token: "completa caseras", weight: 1.0 },
    { token: "completa casera", weight: 1.0 },
    { token: "burguer casera", weight: 1.0 },
    { token: "burger casera", weight: 1.0 },
    { token: "hamburguesa casera", weight: 1.0 },
  ],
  // ─── Pizzas
  prod_pizza_completa: [
    { token: "muzza", weight: 1.0 },
    { token: "muzzarella", weight: 1.0 },
    { token: "mozzarella", weight: 1.0 },
    { token: "jyq", weight: 1.0 },
    { token: "j y q", weight: 1.0 },
    { token: "jamon y queso", weight: 1.0 },
    { token: "napolitana", weight: 0.7 },
    { token: "napo", weight: 0.7 },
  ],
  prod_pizza_calabreza: [
    { token: "calabreza", weight: 1.0 },
    { token: "calabresa", weight: 1.0 },
    { token: "cala", weight: 0.8 },
    { token: "longaniza", weight: 1.0 },
    { token: "calabrezas", weight: 1.0 },
  ],
  prod_pizza_mixta: [
    { token: "mixta", weight: 1.0 },
    { token: "mitad y mitad", weight: 1.0 },
    { token: "1/2 y 1/2", weight: 1.0 },
    { token: "media y media", weight: 1.0 },
    { token: "salchicha alemana", weight: 1.0 },
  ],
  // ─── Empanadas (fritas vs horno)
  prod_empanada_generica: [
    { token: "empanada", weight: 0.3 }, // base, peso bajo para no ganar por defecto
  ],
  prod_emp_frita_carne: [
    { token: "carne", weight: 1.0 },
    { token: "de carne", weight: 1.0 },
    { token: "frita carne", weight: 1.0 },
  ],
  prod_emp_frita_jyq: [
    { token: "jyq", weight: 1.0 },
    { token: "j y q", weight: 1.0 },
    { token: "jamon y queso", weight: 1.0 },
    { token: "jamon muzza", weight: 1.0 },
  ],
  prod_emp_frita_muzz_huevo: [
    { token: "muzza y huevo", weight: 1.0 },
    { token: "muzz y huevo", weight: 1.0 },
    { token: "mozzarella y huevo", weight: 1.0 },
    { token: "queso y huevo", weight: 0.8 },
  ],
  prod_emp_frita_caprese: [
    { token: "caprese", weight: 1.0 },
  ],
  prod_emp_frita_milan_muzz: [
    { token: "milanesa y muzza", weight: 1.0 },
    { token: "milanesa y mozzarella", weight: 1.0 },
    { token: "milanesa muzza", weight: 1.0 },
  ],
  prod_empanadas_horno_carne: [
    { token: "al horno", weight: 1.0 },
    { token: "horno", weight: 0.8 },
    { token: "cuchillo", weight: 1.0 },
  ],
  // ─── Sándwiches / tortas
  prod_torta_miga_picada: [
    { token: "picada", weight: 1.0 },
    { token: "con picada", weight: 1.0 },
    { token: "sanguche", weight: 0.8 },
    { token: "sanguches", weight: 0.8 },
  ],
  prod_triples_jyq: [
    { token: "jyq", weight: 1.0 },
    { token: "j y q", weight: 1.0 },
    { token: "jamon y queso", weight: 1.0 },
    { token: "sanguche", weight: 0.8 },
    { token: "sanguches", weight: 0.8 },
    { token: "sandwich", weight: 0.8 },
  ],
  prod_triples_jyq_b: [
    { token: "miga jyq", weight: 1.0 },
    { token: "miga j y q", weight: 1.0 },
    { token: "sanguche", weight: 0.8 },
    { token: "sanguches", weight: 0.8 },
  ],
  prod_triples_verdura: [
    { token: "verdura", weight: 1.0 },
    { token: "verduras", weight: 1.0 },
    { token: "de verdura", weight: 1.0 },
    { token: "sanguche", weight: 0.8 },
    { token: "sanguches", weight: 0.8 },
  ],
  // ─── Alitos
  prod_alitos_completos_a: [
    { token: "porcion grande", weight: 0.5 },
    { token: "alito grande", weight: 0.5 },
  ],
  prod_alitos_completos_b: [
    { token: "porcion grande", weight: 0.5 },
    { token: "alito grande", weight: 0.5 },
  ],
  // ─── Helados
  prod_helados_grido: [
    { token: "grido", weight: 1.0 },
    { token: "variedad", weight: 1.0 },
    { token: "variedades", weight: 1.0 },
    { token: "torta", weight: 0.5 },
    { token: "familiar", weight: 0.7 },
    { token: "escoces", weight: 1.0 },
  ],
  // ─── Combos
  prod_combo: [
    { token: "combo", weight: 1.0 },
    { token: "promo", weight: 1.0 },
    { token: "combo completo", weight: 1.0 },
  ],
};

const OBSERVATION_KEYWORDS = /^(sin|con|para|nota|obs|obs:|nota:)/i;

const SEPARATOR_REGEX = /\r?\n|;|\s*\+\s*|,|\s+y\s+(?=\w)/g;

/**
 * Saluda / prefijos de nombre que se pueden ignorar al inicio de un segmento
 * para encontrar la cantidad. Ej: "Hola María, 2 sanguches..." → strip "Hola María,"
 * → queda "2 sanguches..." que sí matchea leading-word quantity.
 */
const SEGMENT_GREETING = /^(?:hola|buen[oa]s?(?:\s+(?:d[ií]a|tardes|noches))?|para|entreg(?:ar(?:le)?|a))\s+[A-Z][\w\s]*?(?:[,;:\-]|\s+\d|\s*$)/i;

/**
 * Aplica el TYPO_MAP + singularización sobre los tokens.
 * Orden: TYPO_MAP primero (más específico, ej: "burguer" → "burger"),
 * después singularize (general, ej: "burgers" → "burger").
 */
function normalizeTokens(tokens: string[]): string[] {
  return tokens.map((t) => {
    const typoFixed = TYPO_MAP[t] ?? t;
    return singularize(typoFixed);
  });
}

/**
 * Normaliza un texto completo:
 *   1. lowercase + NFD (separa acentos) + strip diacríticos
 *   2. Reemplaza typos multi-palabra del TYPO_MAP (ej: "media y media" → "media y media")
 *   3. Aplica TYPO_MAP por token para palabras sueltas (ej: "musarela" → "muzzarella")
 *   4. Limpia caracteres no alfanuméricos (excepto /)
 *   5. Colapsa whitespace
 */
function normalize(input: string): string {
  let text = input
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");

  // 1) Reemplazo de typos multi-palabra (frases enteras)
  // Ordenamos por longitud descendente para que "media y media" matchee antes que "media".
  const multiWordEntries = Object.entries(TYPO_MAP)
    .filter(([k]) => k.includes(" "))
    .sort(([a], [b]) => b.length - a.length);
  for (const [typo, canon] of multiWordEntries) {
    text = text.replace(new RegExp(`\\b${escapeRegex(typo)}\\b`, "gi"), canon);
  }

  // 2) Limpieza final
  text = text
    .replace(/[^\w\s/]/g, " ")
    .replace(/\s+/g, " ")
    .trim();

  return text;
}

function escapeRegex(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function stripStopwords(tokens: string[]): string[] {
  return tokens.filter((t) => !STOPWORDS.has(t));
}

function tokenize(input: string): string[] {
  const normalized = normalize(input);
  const raw = normalized.split(" ").filter(Boolean);
  return stripStopwords(normalizeTokens(raw));
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
  /** Suma de pesos de modificadores que matchearon. Usado para desempate. */
  modifierScore: number;
}

/**
 * Cuenta cuántos modificadores del producto matchean en los tokens del input.
 * Devuelve { hits, weight } donde:
 *   - hits: cantidad de modificadores que matchearon
 *   - weight: suma de los pesos de esos modificadores
 *
 * Soporta modificadores multi-token (ej: "media y media") además de single-token.
 */
function countModifierHits(
  tokens: string[],
  modifiers: Array<{ token: string; weight: number }>,
): { hits: number; weight: number } {
  let hits = 0;
  let weight = 0;
  for (const m of modifiers) {
    const modTokens = m.token.split(" ");
    if (modTokens.length === 1) {
      if (tokens.includes(m.token)) {
        hits++;
        weight += m.weight;
      }
    } else {
      // Multi-token: buscar la subsecuencia contigua en tokens
      const joined = tokens.join(" ");
      if (joined.includes(m.token)) {
        hits++;
        weight += m.weight;
      }
    }
  }
  return { hits, weight };
}

function scoreMatch(nameTokens: string[], product: Producto): ScoredMatch | null {
  if (nameTokens.length === 0) return null;
  const productTokens = tokenize(product.nombre);
  if (productTokens.length === 0) return null;

  // Calcular score base por intersección de tokens
  const productSet = new Set(productTokens);
  const allHits = nameTokens.every((t) => productSet.has(t));
  let baseScore = 0;
  let baseReason = "";
  let baseHits = nameTokens.filter((t) => productSet.has(t)).length;

  if (allHits && nameTokens.length >= 1) {
    // Bonus si el primer token matchea el primer token del producto
    const startsBonus = nameTokens[0] === productTokens[0] ? 0.15 : 0;
    const coverage = nameTokens.length / productTokens.length;
    let base = 0.85 + coverage * 0.1 + startsBonus;
    // Penalizar match débil: 1 token de input que cae dentro de un producto largo.
    // Ej: "sanguche" matchea "Combo: 2 Sandwiches + Burger + Papas" por cobertura
    // completa, pero es un match genérico — bajamos el score para que el match
    // por categoría (que prefiere Triples) pueda ganarle.
    if (nameTokens.length === 1 && productTokens.length >= 4) {
      base -= 0.25;
    }
    baseScore = Math.min(1, Math.max(0, base));
    baseReason = `cobertura completa (${nameTokens.length}/${productTokens.length})`;
  } else if (baseHits > 0) {
    // Intersección parcial: recall-biased. El usuario a veces omite palabras de
    // categoría ("sanguches de milanesa" vs "Miga de Milanesa" — matchea "milanesa").
    const recall = baseHits / nameTokens.length;
    const precision = baseHits / productTokens.length;
    baseScore = recall * 0.85 + precision * 0.15;
    baseReason = `intersección ${baseHits}/${nameTokens.length} (recall ${recall.toFixed(2)})`;
  } else {
    baseScore = 0;
  }

  // Bonus por modificadores de producto (ej: "muzza" apunta a Pizza Completa).
  // Modificadores con peso alto (>0.7) tienen un boost fuerte porque son
  // señales claras de intención del usuario. Peso bajo solo agrega un nudge.
  //
  // EXCLUSIVE BOOST: si el modifier matchea un token que NO está en el nombre
  // del producto, es una señal MUY fuerte de intención (el usuario dijo algo
  // específico que solo este producto tiene). Bonus extra 0.15 por cada uno.
  const modifiers = PRODUCT_MODIFIERS[product.id] ?? [];
  let modHits = 0;
  let modWeight = 0;
  let exclusiveHits = 0;
  for (const m of modifiers) {
    const modTokens = m.token.split(" ");
    let matched = false;
    if (modTokens.length === 1) {
      if (nameTokens.includes(m.token)) {
        matched = true;
        if (!productSet.has(m.token)) exclusiveHits++;
      }
    } else {
      const joined = nameTokens.join(" ");
      if (joined.includes(m.token)) {
        matched = true;
        // Multi-token: chequeamos si TODOS los tokens están en productTokens
        const allInProduct = modTokens.every((mt) => productSet.has(mt));
        if (!allInProduct) exclusiveHits++;
      }
    }
    if (matched) {
      modHits++;
      modWeight += m.weight;
    }
  }

  let finalScore = baseScore;
  let modReason = "";
  if (modHits > 0) {
    finalScore += 0.25 * modWeight;
    if (exclusiveHits > 0) {
      finalScore += 0.15 * exclusiveHits; // señal MUY fuerte
      modReason = ` · modificador(+${modHits}, peso ${modWeight.toFixed(1)}, exclusivos ${exclusiveHits})`;
    } else {
      modReason = ` · modificador(+${modHits}, peso ${modWeight.toFixed(1)})`;
    }
    finalScore = Math.min(finalScore, 1);
  }

  // Si NO hubo match base (0 hits por nombre), el modifier puede salvarlo
  // SI tiene peso fuerte (>= 0.7). Si no, descartamos.
  if (baseHits === 0) {
    if (modWeight < 0.7) return null;
    // Score mínimo razonable cuando hay modifier fuerte pero 0 hits base.
    // 0.65 es alto para superar matches "débiles" como Combo matcheando "sanguche"
    // por cobertura completa (penalizado a 0.62).
    finalScore = Math.max(finalScore, 0.65);
  }

  // Threshold check DESPUÉS de aplicar modifier bonus
  if (finalScore < 0.45) return null;

  return {
    product,
    score: finalScore,
    reason: baseReason + modReason,
    modifierScore: modWeight,
  };
}

function matchProducto(
  name: string,
  productos: Producto[],
  minScore: number,
  categorias: { id: string; nombre: string; emoji?: string }[] = [],
): ScoredMatch | null {
  const tokens = tokenize(name);
  if (tokens.length === 0) return null;

  // Calculamos score para todos los productos activos que matcheen al menos algo.
  const candidates: ScoredMatch[] = [];
  for (const product of productos) {
    if (!product.activo) continue;
    const candidate = scoreMatch(tokens, product);
    if (!candidate) continue;
    candidates.push(candidate);
  }

  if (candidates.length === 0) {
    // Fallback: si no matcheó nada y la palabra es muy genérica (ej: "sanguches"),
    // intentar matchear contra el NOMBRE de la categoría y devolver el primer producto de esa categoría.
    const fallback = matchByCategory(tokens, productos, categorias);
    if (fallback) return fallback;
    return null;
  }

  // Desempate intra-categoría por modificadores: si hay 2+ productos de la misma
  // categoría, penalizamos (-50% al score) a los que tengan MENOS modificadores
  // matcheando. Esto resuelve "burger doble" → Burgers Doble Todo (no Burgers).
  const byCategory = new Map<string, ScoredMatch[]>();
  for (const c of candidates) {
    const cat = c.product.categoriaId;
    if (!byCategory.has(cat)) byCategory.set(cat, []);
    byCategory.get(cat)!.push(c);
  }
  for (const [, group] of byCategory) {
    if (group.length < 2) continue;
    const maxModWeight = Math.max(...group.map((c) => c.modifierScore));
    for (const c of group) {
      if (maxModWeight > 0 && c.modifierScore < maxModWeight) {
        c.score *= 0.5;
        c.reason += ` · desempate(-50%)`;
      }
    }
  }

  // Ordenar por score descendente. Tiebreakers en orden:
  //   1. score (mayor gana)
  //   2. modifierScore (mayor gana — preferencia por specificity)
  //   3. cantidad de tokens en el nombre (menor gana — nombre más corto = más genérico = default)
  candidates.sort((a, b) => {
    if (Math.abs(b.score - a.score) > 0.001) return b.score - a.score;
    if (Math.abs(b.modifierScore - a.modifierScore) > 0.001) return b.modifierScore - a.modifierScore;
    const aTokens = tokenize(a.product.nombre).length;
    const bTokens = tokenize(b.product.nombre).length;
    return aTokens - bTokens; // nombre más corto gana como default
  });

  const best = candidates[0];
  if (best.score < minScore) return null;
  return best;
}

/**
 * Matchea por categoría: si al menos UN token del input matchea el nombre de
 * una categoría (o algún sinónimo coloquial), devuelve el producto más
 * apropiado de esa categoría.
 *
 * Selección del producto dentro de la categoría:
 *   1. Preferir el que tenga más modificadores matcheando (más específico).
 *   2. Si hay empate, preferir el de nombre más corto (más genérico = "default").
 *
 * Ejemplos:
 *   "sanguches" → Triples JyQ (primero de cat_tortas, sin modificador)
 *   "sanguches verdura" → Triples de Verdura (modifier "verdura" matchea)
 *   "hamburguesa" → Burgers (el de nombre más corto de cat_hamburguesas)
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
    const catKey = tokenize(cat.nombre).join(" ");
    const synonyms = CATEGORY_SYNONYMS[catKey] ?? [];
    const synonymSet = new Set(synonyms);

    // Al menos UN token del input debe matchear categoría o sinónimo.
    const matchCount = tokens.filter(
      (t) => catTokens.has(t) || synonymSet.has(t),
    ).length;
    if (matchCount === 0) continue;

    const productsInCat = productos.filter((p) => p.activo && p.categoriaId === cat.id);
    if (productsInCat.length === 0) continue;

    // Encontrar el producto "mejor": más modificadores matcheando;
    // empate → nombre más corto (default).
    let bestProduct = productsInCat[0];
    let bestModWeight = 0;
    for (const p of productsInCat) {
      const modifiers = PRODUCT_MODIFIERS[p.id] ?? [];
      const { weight } = countModifierHits(tokens, modifiers);
      if (weight > bestModWeight) {
        bestModWeight = weight;
        bestProduct = p;
      } else if (weight === bestModWeight) {
        // Empate: nombre más corto gana (default)
        if (tokenize(p.nombre).length < tokenize(bestProduct.nombre).length) {
          bestProduct = p;
        }
      }
    }

    return {
      product: bestProduct,
      score: 0.6 + bestModWeight * 0.2,
      reason: `categoría "${cat.nombre}"`,
      modifierScore: bestModWeight,
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