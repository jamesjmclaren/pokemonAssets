/**
 * Poketrace API client.
 *
 * Unified replacement for JustTCG, PokemonPriceTracker, and PriceCharting.
 * Handles both cards and sealed products through a single /v1/cards endpoint.
 * Supports graded pricing natively on Pro tier.
 *
 * API docs: https://poketrace.com/docs
 * Base URL: https://api.poketrace.com/v1
 * Auth: X-API-Key header
 */

import { convertToUsd } from "./exchange-rate";

// ---------------------------------------------------------------------------
// Configuration
// ---------------------------------------------------------------------------

const API_BASE = "https://api.poketrace.com/v1";

function getApiKey(): string {
  const key = process.env.POKETRACE_API_KEY?.trim();
  if (!key) {
    throw new Error("POKETRACE_API_KEY is not configured");
  }
  return key;
}

// Poketrace enforces a burst rate limit; on 429 the body contains
// `{ retryAfter: <seconds> }` and the response also carries a Retry-After
// header. Sleep that long, then retry with exponential backoff + jitter.
const MAX_RETRIES = 5;
const BASE_BACKOFF_MS = 500;

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function parseRetryAfterMs(headerValue: string | null, body: string): number | null {
  if (headerValue) {
    const seconds = Number(headerValue);
    if (Number.isFinite(seconds) && seconds >= 0) return seconds * 1000;
  }
  try {
    const parsed = JSON.parse(body);
    if (parsed && typeof parsed.retryAfter === "number") {
      return parsed.retryAfter * 1000;
    }
  } catch {
    // body wasn't JSON — fall through
  }
  return null;
}

async function apiFetch(path: string, params?: Record<string, string>) {
  const url = new URL(path, API_BASE);
  if (params) {
    Object.entries(params).forEach(([key, value]) => {
      if (value) url.searchParams.set(key, value);
    });
  }
  const target = url.toString();

  let lastError: Error | null = null;
  for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
    const res = await fetch(target, {
      headers: {
        "X-API-Key": getApiKey(),
        "Content-Type": "application/json",
      },
      next: { revalidate: 3600 },
    });

    if (res.ok) {
      return res.json();
    }

    const text = await res.text();

    // Retry on 429 (burst rate limit) and 5xx (transient upstream issues).
    const retriable = res.status === 429 || (res.status >= 500 && res.status < 600);
    if (retriable && attempt < MAX_RETRIES) {
      const retryAfterMs = parseRetryAfterMs(res.headers.get("retry-after"), text);
      const backoff = retryAfterMs ?? BASE_BACKOFF_MS * 2 ** attempt;
      const jitter = Math.floor(Math.random() * 250);
      await sleep(backoff + jitter);
      lastError = new Error(`Poketrace API error ${res.status}: ${text}`);
      continue;
    }

    throw new Error(`Poketrace API error ${res.status}: ${text}`);
  }

  throw lastError ?? new Error("Poketrace API: exhausted retries");
}

// ---------------------------------------------------------------------------
// Poketrace response types
// ---------------------------------------------------------------------------

interface PoketracePriceTier {
  avg: number;
  low: number;
  high: number;
  saleCount?: number;
  approxSaleCount?: number;
  avg1d?: number;
  avg7d?: number;
  avg30d?: number;
}

export interface PoketraceCard {
  id: string;
  name: string;
  cardNumber?: string;
  set: { slug: string; name: string };
  variant?: string;
  rarity?: string;
  image?: string;
  game?: string;
  market: "US" | "EU";
  currency: "USD" | "EUR";
  refs?: { tcgplayerId?: string; cardmarketId?: string };
  prices: {
    ebay?: Record<string, PoketracePriceTier>;
    tcgplayer?: Record<string, PoketracePriceTier>;
    cardmarket?: Record<string, PoketracePriceTier>;
  };
  lastUpdated?: string;
}

interface PoketraceSearchResponse {
  data: PoketraceCard[];
  hasMore: boolean;
  nextCursor: string | null;
  count: number;
}

export interface PoketraceSet {
  slug: string;
  name: string;
  logo?: string;
  releaseDate?: string;
  cardCount?: number;
  series?: string;
}

/**
 * Fetch every Poketrace card in a given set (paginated).
 * Returns the raw cards so callers can read tier-level fields like avg1d.
 */
export async function fetchPoketraceCardsBySet(
  setSlug: string,
  market: "US" | "EU" = "US",
  opts: { pageSize?: number; maxPages?: number; variant?: string } = {}
): Promise<PoketraceCard[]> {
  const pageSize = opts.pageSize ?? 100;
  const maxPages = opts.maxPages ?? 6;
  const all: PoketraceCard[] = [];
  let cursor: string | null | undefined;
  let pages = 0;

  do {
    const params: Record<string, string> = {
      set: setSlug,
      market,
      limit: String(pageSize),
    };
    if (cursor) params.cursor = cursor;
    if (opts.variant) params.variant = opts.variant;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const response: any = await apiFetch("/v1/cards", params);
    const batch: PoketraceCard[] = response?.data || [];
    all.push(...batch);
    // Poketrace nests pagination under `pagination` for both /sets and /cards
    // — fall back to the top-level fields just in case.
    const hasMore = response?.pagination?.hasMore ?? response?.hasMore;
    const nextCursor = response?.pagination?.nextCursor ?? response?.nextCursor;
    cursor = hasMore ? nextCursor : null;
    pages += 1;
  } while (cursor && pages < maxPages);

  return all;
}

/**
 * Read a specific tier (e.g. NEAR_MINT, PSA_10) from a Poketrace card,
 * preferring the source that typically carries that tier's data.
 */
export function getPoketraceTier(
  card: PoketraceCard,
  tier: string
): { avg: number; avg1d: number | null; avg7d: number | null; avg30d: number | null; saleCount: number | null; source: string } | null {
  const prices = card.prices || {};
  const sources = tier.startsWith("PSA_") || tier.startsWith("CGC_") || tier.startsWith("BGS_")
    ? ["ebay", "tcgplayer"] // graded tiers primarily on eBay
    : ["tcgplayer", "ebay", "cardmarket"]; // raw/condition tiers primarily on TCGPlayer

  // Build a list of raw-condition aliases to try.  Poketrace isn't consistent
  // about casing ("NEAR_MINT" vs "Near Mint") across sources and set types.
  const RAW_ALIASES: Record<string, string[]> = {
    NEAR_MINT: ["NEAR_MINT", "Near Mint", "NM"],
    LIGHTLY_PLAYED: ["LIGHTLY_PLAYED", "Lightly Played", "LP"],
  };
  const aliases = RAW_ALIASES[tier] ?? [tier];

  for (const source of sources) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const sourceMap = (prices as any)[source] as Record<string, PoketracePriceTier> | undefined;
    if (!sourceMap) continue;

    // Try each alias for the requested tier.
    let t: PoketracePriceTier | undefined;
    for (const alias of aliases) {
      if (sourceMap[alias]?.avg != null && sourceMap[alias]!.avg > 0) {
        t = sourceMap[alias];
        break;
      }
    }

    if (t?.avg != null && t.avg > 0) {
      return {
        avg: t.avg,
        avg1d: typeof t.avg1d === "number" ? t.avg1d : null,
        avg7d: typeof t.avg7d === "number" ? t.avg7d : null,
        avg30d: typeof t.avg30d === "number" ? t.avg30d : null,
        saleCount:
          typeof t.saleCount === "number"
            ? t.saleCount
            : typeof t.approxSaleCount === "number"
              ? t.approxSaleCount
              : null,
        source,
      };
    }
  }
  return null;
}

// ---------------------------------------------------------------------------
// Sealed product detection
// ---------------------------------------------------------------------------

const SEALED_KEYWORDS = [
  "booster box",
  "booster pack",
  "booster bundle",
  "booster display",
  "elite trainer box",
  "etb",
  "tin",
  "collection box",
  "premium collection",
  "ultra premium",
  "build and battle",
  "build & battle",
  "theme deck",
  "starter deck",
  "blister pack",
  "blister",
  "case",
  "mini tin",
  "lunchbox",
  "binder",
  "poster box",
  "tech sticker",
  "paldea evolved",
];

/**
 * Infer whether a Poketrace card is a sealed product or a card.
 * Poketrace merges both under /v1/cards, so we use heuristics.
 */
export function inferAssetType(card: PoketraceCard): "card" | "sealed" {
  const name = card.name?.toLowerCase() || "";

  // Check name against sealed product keywords
  if (SEALED_KEYWORDS.some((kw) => name.includes(kw))) {
    return "sealed";
  }

  // Cards typically have a card number; sealed products don't
  if (!card.cardNumber && !card.rarity) {
    // If no card number and no rarity, likely sealed
    // But check for common card-like indicators first
    if (name.includes(" ex") || name.includes(" gx") || name.includes(" vmax") || name.includes(" vstar")) {
      return "card";
    }
    return "sealed";
  }

  return "card";
}

// ---------------------------------------------------------------------------
// Price extraction
// ---------------------------------------------------------------------------

/**
 * Extract the best available price from a Poketrace card.
 * Prefers TCGPlayer Near Mint, falls back to eBay, then CardMarket.
 */
export function extractBestPrice(card: PoketraceCard): number | null {
  const prices = card.prices;
  if (!prices) return null;

  // US market: prefer TCGPlayer NM, then eBay NM
  if (prices.tcgplayer) {
    const nm = prices.tcgplayer["NEAR_MINT"] || prices.tcgplayer["Near Mint"];
    if (nm?.avg != null) return nm.avg;
    // Try any tier
    const firstTier = Object.values(prices.tcgplayer)[0];
    if (firstTier?.avg != null) return firstTier.avg;
  }

  if (prices.ebay) {
    const nm = prices.ebay["NEAR_MINT"] || prices.ebay["Near Mint"];
    if (nm?.avg != null) return nm.avg;
    const firstTier = Object.values(prices.ebay)[0];
    if (firstTier?.avg != null) return firstTier.avg;
  }

  // EU market: CardMarket
  if (prices.cardmarket) {
    const firstTier = Object.values(prices.cardmarket)[0];
    if (firstTier?.avg != null) return firstTier.avg;
  }

  return null;
}

/**
 * Extract graded price for a specific grade from a Poketrace card.
 * Grade string examples: "PSA 10", "CGC 9.5", "BGS 9"
 */
export function extractGradedPrice(
  card: PoketraceCard,
  grade: string
): number | null {
  const tier = gradeToPoketraceTier(grade);
  const prices = card.prices;
  if (!prices) return null;

  // Check TCGPlayer first, then eBay
  for (const source of [prices.tcgplayer, prices.ebay, prices.cardmarket]) {
    if (!source) continue;
    const tierData = source[tier];
    if (tierData?.avg != null) return tierData.avg;
  }

  return null;
}

export type PoketraceSource = "tcgplayer" | "ebay" | "cardmarket";

/**
 * Extract per-source prices for a specific tier (raw condition or graded).
 * Returns only sources that actually have a price for that tier.
 */
export function extractSourcePrices(
  card: PoketraceCard,
  tier: string
): Partial<Record<PoketraceSource, number>> {
  const prices = card.prices;
  if (!prices) return {};

  const RAW_ALIASES: Record<string, string[]> = {
    NEAR_MINT: ["NEAR_MINT", "Near Mint", "NM"],
    LIGHTLY_PLAYED: ["LIGHTLY_PLAYED", "Lightly Played", "LP"],
  };
  const aliases = RAW_ALIASES[tier] ?? [tier];

  const result: Partial<Record<PoketraceSource, number>> = {};
  for (const source of ["tcgplayer", "ebay", "cardmarket"] as const) {
    const sourceMap = prices[source];
    if (!sourceMap) continue;
    for (const alias of aliases) {
      const entry = sourceMap[alias];
      if (entry?.avg != null && entry.avg > 0) {
        result[source] = entry.avg;
        break;
      }
    }
  }
  return result;
}

/**
 * Extract all available graded prices from a Poketrace card.
 * Returns a map of grade labels to prices.
 */
export function extractAllGradedPrices(card: PoketraceCard): Record<string, number> {
  const result: Record<string, number> = {};
  const prices = card.prices;
  if (!prices) return result;

  // Collect all tiers from all sources
  for (const source of [prices.tcgplayer, prices.ebay, prices.cardmarket]) {
    if (!source) continue;
    for (const [tier, data] of Object.entries(source)) {
      if (data?.avg != null && !(tier in result)) {
        result[tier] = data.avg;
      }
    }
  }

  return result;
}

// ---------------------------------------------------------------------------
// Grade mapping
// ---------------------------------------------------------------------------

/**
 * Map a PSA/CGC/BGS grade string to a Poketrace price tier key.
 * Poketrace supports: PSA, BGS, CGC, SGC, ACE, TAG grades 1-10,
 * plus raw conditions: NEAR_MINT, LIGHTLY_PLAYED, etc.
 */
export function gradeToPoketraceTier(grade: string): string {
  if (!grade) return "NEAR_MINT";

  const g = grade.toUpperCase().trim();

  // PSA grades
  if (g.includes("PSA")) {
    const num = g.replace(/[^0-9.]/g, "");
    if (num) return `PSA_${num}`;
  }

  // CGC grades
  if (g.includes("CGC")) {
    const num = g.replace(/[^0-9.]/g, "");
    if (num) return `CGC_${num}`;
  }

  // BGS grades
  if (g.includes("BGS") || g.includes("BECKETT")) {
    const num = g.replace(/[^0-9.]/g, "");
    if (num) return `BGS_${num}`;
  }

  // SGC grades
  if (g.includes("SGC")) {
    const num = g.replace(/[^0-9.]/g, "");
    if (num) return `SGC_${num}`;
  }

  // ACE grades
  if (g.includes("ACE")) {
    const num = g.replace(/[^0-9.]/g, "");
    if (num) return `ACE_${num}`;
  }

  // TAG grades
  if (g.includes("TAG")) {
    const num = g.replace(/[^0-9.]/g, "");
    if (num) return `TAG_${num}`;
  }

  // Numeric-only grade (e.g., "10", "9.5")
  const numOnly = g.replace(/[^0-9.]/g, "");
  if (numOnly) return `PSA_${numOnly}`;

  return "NEAR_MINT";
}

/**
 * Map the old PriceCharting grade field keys to Poketrace tier keys.
 * Used during migration of legacy tethered assets.
 */
export function pcGradeFieldToPoketraceTier(pcField: string): string {
  switch (pcField) {
    case "psa10":
      return "PSA_10";
    case "grade95":
      return "CGC_9.5";
    case "grade9":
      return "PSA_9";
    case "grade8":
      return "PSA_8";
    case "grade7":
      return "PSA_7";
    case "ungraded":
    default:
      return "NEAR_MINT";
  }
}

// ---------------------------------------------------------------------------
// Query helpers
// ---------------------------------------------------------------------------

/**
 * Sanitize a user search query.
 * - Replaces smart quotes with straight ones
 * - Strips trailing card-number suffixes
 */
function sanitizeQuery(raw: string): string {
  // Normalize smart quotes and trailing card numbers
  let q = raw
    .replace(/[\u2018\u2019\u201A\u201B]/g, "'")
    .replace(/[\u201C\u201D\u201E\u201F]/g, '"')
    .replace(/\s+[-#]\s*\d+\s*$/, "")
    .trim();

  // Auto-uppercase Pokemon card mechanic/variant tokens that are
  // always capitalised in official card names. Without this, searches
  // like "mega charizard x ex" fail because the API is case-sensitive.
  const upperTokens = ["ex", "gx", "vmax", "vstar", "v", "lv", "mega", "etb"];
  q = q
    .split(/\s+/)
    .map((t) => (upperTokens.includes(t.toLowerCase()) ? t.toUpperCase() : t))
    .join(" ");

  return q;
}

// ---------------------------------------------------------------------------
// Normalization
// ---------------------------------------------------------------------------

export interface NormalizedCard {
  id: string;
  name: string;
  number?: string;
  rarity?: string;
  setName: string;
  set: string;
  imageUrl?: string;
  tcgplayerId: string | null;
  prices?: {
    tcgplayer?: { market: number };
    raw?: number;
    market?: number;
    psa10?: number;
    psa9?: number;
    psa8?: number;
    psa7?: number;
    cgc10?: number;
    cgc95?: number;
    bgs10?: number;
    bgs95?: number;
  };
  marketPrice: number | null;
  type: "card" | "sealed";
  source: "poketrace";
  currency: string;
  poketraceId: string;
  poketraceMarket: string;
  gradedPrices?: Record<string, number>;
}

/**
 * Transform a Poketrace card into the normalized format the app expects.
 */
function normalizeCard(card: PoketraceCard): NormalizedCard {
  const price = extractBestPrice(card);
  const type = inferAssetType(card);
  const gradedPrices = extractAllGradedPrices(card);

  // Map Poketrace tier keys to frontend-friendly price fields
  const priceFields: NormalizedCard["prices"] = {
    raw: price ?? undefined,
    market: price ?? undefined,
    tcgplayer: price != null ? { market: price } : undefined,
    psa10: gradedPrices["PSA_10"] ?? undefined,
    psa9: gradedPrices["PSA_9"] ?? undefined,
    psa8: gradedPrices["PSA_8"] ?? undefined,
    psa7: gradedPrices["PSA_7"] ?? undefined,
    cgc10: gradedPrices["CGC_10"] ?? undefined,
    cgc95: gradedPrices["CGC_9_5"] ?? undefined,
    bgs10: gradedPrices["BGS_10"] ?? undefined,
    bgs95: gradedPrices["BGS_9_5"] ?? undefined,
  };

  return {
    id: card.id,
    name: card.name,
    number: card.cardNumber || undefined,
    rarity: card.rarity || undefined,
    setName: card.set?.name || "",
    set: card.set?.slug || "",
    imageUrl: card.image || undefined,
    tcgplayerId: card.refs?.tcgplayerId || null,
    prices: priceFields,
    marketPrice: price,
    type,
    source: "poketrace",
    currency: card.currency || "USD",
    poketraceId: card.id,
    poketraceMarket: card.market || "US",
    gradedPrices: Object.keys(gradedPrices).length > 0 ? gradedPrices : undefined,
  };
}

/**
 * Normalize and optionally convert EUR prices to USD.
 */
async function normalizeWithConversion(card: PoketraceCard): Promise<NormalizedCard> {
  const normalized = normalizeCard(card);

  if (card.currency === "EUR" && normalized.marketPrice != null) {
    const converted = await convertToUsd(normalized.marketPrice, "EUR");
    normalized.marketPrice = converted.usd;
    if (normalized.prices?.tcgplayer) {
      normalized.prices.tcgplayer.market = converted.usd;
    }
    normalized.currency = "USD";
    // Tag that this was converted
    (normalized as NormalizedCard & { isConvertedPrice?: boolean }).isConvertedPrice = true;
  }

  return normalized;
}

// ---------------------------------------------------------------------------
// Public API functions
// ---------------------------------------------------------------------------

export interface SearchOptions {
  market?: "US" | "EU";
  limit?: number;
  cursor?: string;
  setSlug?: string;
}

/**
 * Search for cards/products on Poketrace.
 */
export async function searchPoketrace(
  query: string,
  opts: SearchOptions = {}
): Promise<NormalizedCard[]> {
  const cleaned = sanitizeQuery(query);
  const params: Record<string, string> = {
    search: cleaned,
    market: opts.market || "US",
    limit: String(opts.limit || 20),
  };
  if (opts.cursor) params.cursor = opts.cursor;
  if (opts.setSlug) params.set = opts.setSlug;

  const response: PoketraceSearchResponse = await apiFetch("/v1/cards", params);
  const cards = response.data || [];

  // Normalize all cards, converting EUR if needed
  const results = await Promise.all(cards.map(normalizeWithConversion));
  return results;
}

/**
 * Search with type filtering. Poketrace returns both in one endpoint,
 * so we filter post-response.
 */
export async function searchPoketraceByType(
  query: string,
  type: "card" | "sealed" | "all" = "all",
  opts: SearchOptions = {}
): Promise<NormalizedCard[]> {
  // Request extra results when filtering so we still get enough after filter
  const fetchLimit = type !== "all" ? (opts.limit || 20) * 2 : opts.limit || 20;
  const results = await searchPoketrace(query, { ...opts, limit: fetchLimit });

  if (type === "all") return results;

  const filtered = results.filter((r) => r.type === type);

  // If filtering by sealed and we got nothing, try adding sealed keywords
  if (type === "sealed" && filtered.length === 0 && !query.toLowerCase().includes("box")) {
    // The search may not have returned sealed products, no extra fetch needed
    return filtered;
  }

  return filtered.slice(0, opts.limit || 20);
}

/**
 * Get a single card by its Poketrace ID.
 */
export async function getPoketraceCardById(
  id: string
): Promise<NormalizedCard | null> {
  try {
    const card: PoketraceCard = await apiFetch(`/v1/cards/${encodeURIComponent(id)}`);
    return await normalizeWithConversion(card);
  } catch (error) {
    console.error(`[poketrace] Failed to fetch card ${id}:`, error instanceof Error ? error.message : error);
    return null;
  }
}

/**
 * Get the raw Poketrace card (unnormalized) by ID.
 * Useful when we need the full graded pricing breakdown.
 */
export async function getRawPoketraceCard(
  id: string
): Promise<PoketraceCard | null> {
  try {
    const response = await apiFetch(`/v1/cards/${encodeURIComponent(id)}`);
    // The API may return the card directly or wrapped in { data: card }
    const card = response?.data || response;
    console.log(`[poketrace] getRawPoketraceCard(${id}) response keys:`, Object.keys(response || {}));
    if (card?.prices) {
      console.log(`[poketrace] Card prices keys:`, Object.keys(card.prices));
    } else {
      console.log(`[poketrace] Card has no 'prices' field. Top-level keys:`, Object.keys(card || {}));
    }
    return card;
  } catch (error) {
    console.error(`[poketrace] Failed to fetch raw card ${id}:`, error instanceof Error ? error.message : error);
    return null;
  }
}

/**
 * Get price history for a card from Poketrace.
 *
 * Poketrace response shape:
 *   { data: [{ date, source, avg, low, high, saleCount, ... }],
 *     pagination: { hasMore, nextCursor, count } }
 *
 * Supported period values: 7d, 30d, 90d, 1y, all
 */
export async function getPoketracePriceHistory(
  cardId: string,
  tier?: string,
  startDate?: string,
  endDate?: string
): Promise<{ date: string; price: number; source: string }[]> {
  const priceTier = tier || "NEAR_MINT";

  // Map requested date range to a Poketrace period value
  let period = "all";
  if (startDate) {
    const diffDays = Math.ceil(
      (Date.now() - new Date(startDate).getTime()) / 86400000
    );
    if (diffDays <= 7) period = "7d";
    else if (diffDays <= 30) period = "30d";
    else if (diffDays <= 90) period = "90d";
    else if (diffDays <= 365) period = "1y";
    else period = "all";
  }

  try {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const fetchWithPeriod = async (p: string): Promise<any[]> => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      let entries: any[] = [];
      let cursor: string | undefined;
      let pageCount = 0;
      const maxPages = 10;

      do {
        const cursorParam = cursor ? `&cursor=${encodeURIComponent(cursor)}` : "";
        const url = `/v1/cards/${encodeURIComponent(cardId)}/prices/${encodeURIComponent(priceTier)}/history?period=${p}&limit=365${cursorParam}`;

        const response = await apiFetch(url);

        const pageEntries = response?.data || [];
        if (pageEntries.length === 0) break;

        entries = entries.concat(pageEntries);

        cursor = response?.pagination?.hasMore ? response.pagination.nextCursor : undefined;
        pageCount++;
      } while (cursor && pageCount < maxPages);

      return entries;
    };

    let allEntries = await fetchWithPeriod(period);

    // If the requested period returned no data, fall back to "all" and filter client-side.
    // This handles graded tiers with sparse data (few sales in a 30d/90d window).
    if (allEntries.length === 0 && period !== "all") {
      console.log(`[poketrace] No data for ${cardId}/${priceTier} period=${period}, falling back to "all"`);
      allEntries = await fetchWithPeriod("all");
    }

    console.log(`[poketrace] Price history for ${cardId}/${priceTier} period=${period}: ${allEntries.length} entries`);

    // Map entries — Poketrace uses "avg" for the price field
    let points = allEntries
      .map((entry) => ({
        date: entry.date,
        price: Number(entry.avg) || 0,
        source: entry.source || "poketrace",
      }))
      .filter((p) => p.price > 0 && p.date);

    // Filter by date range if provided
    if (startDate) points = points.filter((p) => p.date >= startDate);
    if (endDate) points = points.filter((p) => p.date <= endDate);

    return points.sort((a, b) => a.date.localeCompare(b.date));
  } catch (error) {
    console.error(`[poketrace] Failed to fetch price history for ${cardId}:`, error instanceof Error ? error.message : error);
    return [];
  }
}

/**
 * Get all Pokemon sets from Poketrace.
 */
export async function getPoketraceSets(
  sortBy = "releaseDate",
  sortOrder = "desc"
): Promise<{ id: string; name: string; series: string; releaseDate: string; totalCards: number }[]> {
  const all: PoketraceSet[] = [];
  let cursor: string | null | undefined;
  let pages = 0;
  const maxPages = 20; // 2000 sets is well above Poketrace's actual catalogue size

  do {
    const params: Record<string, string> = { limit: "100" };
    if (cursor) params.cursor = cursor;
    const response = await apiFetch("/v1/sets", params);
    const batch: PoketraceSet[] = response?.data || [];
    all.push(...batch);
    cursor = response?.pagination?.hasMore ? response?.pagination?.nextCursor : null;
    pages += 1;
  } while (cursor && pages < maxPages);

  const normalized = all.map((s) => ({
    id: s.slug,
    name: s.name,
    series: s.series || "pokemon",
    releaseDate: s.releaseDate || "",
    totalCards: s.cardCount || 0,
  }));

  const sortKey = sortBy === "releaseDate" ? "releaseDate" : "name";
  normalized.sort((a, b) => {
    const aVal = a[sortKey] || "";
    const bVal = b[sortKey] || "";
    return sortOrder === "desc"
      ? bVal.localeCompare(aVal)
      : aVal.localeCompare(bVal);
  });

  return normalized;
}

/**
 * Search Poketrace's set catalogue by free-text name. Used to discover
 * the actual slug Poketrace's /cards index uses for a given set when
 * our hardcoded alias list comes up empty (e.g. brand-new sets we
 * haven't catalogued yet). Returns up to `limit` matches.
 */
export async function searchPoketraceSetsByName(
  query: string,
  limit = 20
): Promise<{ slug: string; name: string }[]> {
  const trimmed = query.trim();
  if (!trimmed) return [];
  try {
    const response = await apiFetch("/v1/sets", {
      search: trimmed,
      limit: String(limit),
    });
    const batch: PoketraceSet[] = response?.data || [];
    return batch.map((s) => ({ slug: s.slug, name: s.name }));
  } catch (err) {
    console.warn(`[poketrace] searchPoketraceSetsByName("${trimmed}") failed:`, err);
    return [];
  }
}

/**
 * Fetch the current price for a Poketrace-linked asset.
 * Handles graded assets by looking up the grade-specific price tier.
 * Returns { price, currency, isConverted, rate } or null.
 */
export async function fetchPoketracePrice(
  poketraceId: string,
  grade?: string | null,
  source?: PoketraceSource | null
): Promise<{
  price: number;
  currency: string;
  isConverted: boolean;
  rate?: number;
  source?: PoketraceSource;
} | null> {
  const card = await getRawPoketraceCard(poketraceId);
  if (!card) {
    console.warn(`[poketrace] fetchPoketracePrice: no card found for ${poketraceId}`);
    return null;
  }

  // Log the full price structure for debugging
  console.log(`[poketrace] fetchPoketracePrice for ${poketraceId}, grade=${grade || "none"}, source=${source || "auto"}`);
  const cardPrices = card.prices || {};
  console.log(`[poketrace] Available price sources:`, {
    tcgplayer: cardPrices.tcgplayer ? Object.keys(cardPrices.tcgplayer) : "none",
    ebay: cardPrices.ebay ? Object.keys(cardPrices.ebay) : "none",
    cardmarket: cardPrices.cardmarket ? Object.keys(cardPrices.cardmarket) : "none",
  });

  let price: number | null = null;
  let resolvedSource: PoketraceSource | undefined;

  const tier = grade ? gradeToPoketraceTier(grade) : "NEAR_MINT";

  if (source) {
    const breakdown = extractSourcePrices(card, tier);
    const p = breakdown[source];
    if (p != null) {
      price = p;
      resolvedSource = source;
      console.log(`[poketrace] Using preferred source ${source}: ${p}`);
    } else {
      console.log(`[poketrace] Preferred source ${source} has no ${tier} price — returning N/A`);
    }
  } else if (grade) {
    price = extractGradedPrice(card, grade);
    console.log(`[poketrace] Graded price result: ${price ?? "null (not found)"}`);
  } else {
    price = extractBestPrice(card);
    console.log(`[poketrace] Raw/best price: ${price ?? "null"}`);
  }

  if (price == null) return null;

  // Handle EUR conversion
  if (card.currency === "EUR") {
    const converted = await convertToUsd(price, "EUR");
    return {
      price: converted.usd,
      currency: "USD",
      isConverted: true,
      rate: converted.rate,
      source: resolvedSource,
    };
  }

  return { price, currency: card.currency || "USD", isConverted: false, source: resolvedSource };
}

/**
 * Fetch the per-source price breakdown for a card at a given tier.
 * Used by the add-asset form to let users pick TCGPlayer vs eBay vs CardMarket.
 * Converts EUR values to USD so the UI always renders a single currency.
 */
export async function fetchPoketracePriceBreakdown(
  poketraceId: string,
  grade?: string | null
): Promise<{
  tier: string;
  currency: string;
  isConverted: boolean;
  rate?: number;
  prices: Partial<Record<PoketraceSource, number>>;
} | null> {
  const card = await getRawPoketraceCard(poketraceId);
  if (!card) return null;

  const tier = grade ? gradeToPoketraceTier(grade) : "NEAR_MINT";
  const raw = extractSourcePrices(card, tier);

  if (card.currency === "EUR") {
    const entries = await Promise.all(
      (Object.entries(raw) as [PoketraceSource, number][]).map(async ([src, p]) => {
        const { usd } = await convertToUsd(p, "EUR");
        return [src, usd] as [PoketraceSource, number];
      })
    );
    const converted = Object.fromEntries(entries) as Partial<Record<PoketraceSource, number>>;
    const rate = entries.length > 0 ? (await convertToUsd(1, "EUR")).rate : undefined;
    return { tier, currency: "USD", isConverted: true, rate, prices: converted };
  }

  return { tier, currency: card.currency || "USD", isConverted: false, prices: raw };
}
