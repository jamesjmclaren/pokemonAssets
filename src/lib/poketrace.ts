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

async function apiFetch(path: string, params?: Record<string, string>) {
  const url = new URL(path, API_BASE);
  if (params) {
    Object.entries(params).forEach(([key, value]) => {
      if (value) url.searchParams.set(key, value);
    });
  }

  const res = await fetch(url.toString(), {
    headers: {
      "X-API-Key": getApiKey(),
      "Content-Type": "application/json",
    },
    next: { revalidate: 3600 },
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Poketrace API error ${res.status}: ${text}`);
  }

  return res.json();
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
  const { prices } = card;

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
  const { prices } = card;

  // Check TCGPlayer first, then eBay
  for (const source of [prices.tcgplayer, prices.ebay, prices.cardmarket]) {
    if (!source) continue;
    const tierData = source[tier];
    if (tierData?.avg != null) return tierData.avg;
  }

  return null;
}

/**
 * Extract all available graded prices from a Poketrace card.
 * Returns a map of grade labels to prices.
 */
export function extractAllGradedPrices(card: PoketraceCard): Record<string, number> {
  const result: Record<string, number> = {};
  const { prices } = card;

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
  prices?: { tcgplayer?: { market: number } };
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

  return {
    id: card.id,
    name: card.name,
    number: card.cardNumber || undefined,
    rarity: card.rarity || undefined,
    setName: card.set?.name || "",
    set: card.set?.slug || "",
    imageUrl: card.image || undefined,
    tcgplayerId: card.refs?.tcgplayerId || null,
    prices: price != null ? { tcgplayer: { market: price } } : undefined,
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
    return await apiFetch(`/v1/cards/${encodeURIComponent(id)}`);
  } catch (error) {
    console.error(`[poketrace] Failed to fetch raw card ${id}:`, error instanceof Error ? error.message : error);
    return null;
  }
}

/**
 * Get price history for a card from Poketrace.
 */
export async function getPoketracePriceHistory(
  cardId: string,
  tier?: string,
  startDate?: string,
  endDate?: string
): Promise<{ date: string; price: number; source: string }[]> {
  const priceTier = tier || "NEAR_MINT";

  try {
    const response = await apiFetch(
      `/v1/cards/${encodeURIComponent(cardId)}/prices/${encodeURIComponent(priceTier)}/history`
    );

    // Normalize the response — expect an array of { date, price } or similar
    const history: { date: string; price: number }[] = Array.isArray(response)
      ? response
      : response.data || response.history || [];

    let points = history.map((entry) => ({
      date: typeof entry.date === "number"
        ? new Date(entry.date * 1000).toISOString().split("T")[0]
        : entry.date,
      price: entry.price,
      source: "poketrace",
    }));

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
  const response = await apiFetch("/v1/sets");
  const sets: PoketraceSet[] = response.data || response || [];

  const normalized = sets.map((s) => ({
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
 * Fetch the current price for a Poketrace-linked asset.
 * Handles graded assets by looking up the grade-specific price tier.
 * Returns { price, currency, isConverted, rate } or null.
 */
export async function fetchPoketracePrice(
  poketraceId: string,
  grade?: string | null
): Promise<{
  price: number;
  currency: string;
  isConverted: boolean;
  rate?: number;
} | null> {
  const card = await getRawPoketraceCard(poketraceId);
  if (!card) return null;

  let price: number | null = null;

  // Try graded price first if a grade is specified
  if (grade) {
    price = extractGradedPrice(card, grade);
  }

  // Fall back to best raw price
  if (price == null) {
    price = extractBestPrice(card);
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
    };
  }

  return { price, currency: card.currency || "USD", isConverted: false };
}
