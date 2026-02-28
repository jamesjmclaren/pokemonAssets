import {
  searchSealedProducts,
  searchCardsPPT,
  getSealedPriceHistory,
  getCardPriceHistoryPPT,
} from "./pokemon-price-tracker";

// Re-export PPT functions so consumers can import from one place
export {
  searchSealedProducts,
  searchCardsPPT,
  getSealedPriceHistory,
  getCardPriceHistoryPPT,
};

// ---------------------------------------------------------------------------
// JustTCG client (primary for cards)
// ---------------------------------------------------------------------------

const API_BASE = "https://api.justtcg.com/v1";

function getApiKey(): string {
  const key = process.env.JUSTTCG_API_KEY?.trim();
  if (!key) {
    throw new Error("JUSTTCG_API_KEY is not configured");
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

  const apiKey = getApiKey();
  const res = await fetch(url.toString(), {
    headers: {
      "x-api-key": apiKey,
      "Content-Type": "application/json",
    },
    next: { revalidate: 3600 },
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`API error ${res.status}: ${text}`);
  }

  return res.json();
}

// --- JustTCG response types ---

interface JustTCGVariant {
  id: string;
  condition: string;
  printing: string;
  language?: string | null;
  tcgplayerSkuId?: string;
  price: number;
  lastUpdated: number;
  priceChange24hr?: number | null;
  priceChange7d?: number | null;
  priceChange30d?: number | null;
  priceChange90d?: number | null;
  priceHistory?: Array<{ t: number; p: number }> | null;
}

interface JustTCGCard {
  id: string;
  name: string;
  game: string;
  set: string;
  set_name?: string;
  number: string | null;
  rarity: string | null;
  tcgplayerId: string | null;
  variants: JustTCGVariant[];
}

interface JustTCGSet {
  id: string;
  name: string;
  gameId: string;
  game: string;
  count: number;
  variants_count?: number;
  sealed_count?: number;
  release_date: string;
  set_value_usd?: number;
}

// --- Normalization helpers ---

/**
 * Pick the most representative variant for pricing.
 * Prefers Near Mint + Normal/Holofoil, falls back to the highest-priced variant.
 */
function pickBestVariant(variants: JustTCGVariant[]): JustTCGVariant | null {
  if (!variants || variants.length === 0) return null;

  // Try Near Mint first
  const nm = variants.filter(
    (v) => v.condition?.toLowerCase().includes("near mint") && v.price != null
  );
  if (nm.length > 0) {
    // Among NM variants, prefer Normal/Holofoil printing
    const normal = nm.find(
      (v) =>
        v.printing?.toLowerCase() === "normal" ||
        v.printing?.toLowerCase() === "holofoil"
    );
    return normal || nm[0];
  }

  // Fall back to any variant with a price
  const withPrice = variants.filter((v) => v.price != null);
  if (withPrice.length === 0) return variants[0];

  return withPrice.sort((a, b) => (b.price ?? 0) - (a.price ?? 0))[0];
}

/**
 * Transform a JustTCG card into the normalized format the app expects.
 */
function normalizeCard(card: JustTCGCard) {
  const bestVariant = pickBestVariant(card.variants);
  const price = bestVariant?.price ?? null;

  // Construct image URL from tcgplayerId if available
  const imageUrl = card.tcgplayerId
    ? `https://tcgplayer-cdn.tcgplayer.com/product/${card.tcgplayerId}_200w.jpg`
    : undefined;

  // JustTCG returns sealed products (ETBs, booster boxes, tins) through the
  // same /cards endpoint. Sealed products are identified by their variant
  // condition being "Sealed" (or "S") — use that instead of guessing from
  // the absence of number/rarity, which is unreliable.
  const isSealedProduct =
    card.variants?.length > 0 &&
    card.variants.some((v) => {
      const cond = v.condition?.toLowerCase();
      return cond === "sealed" || cond === "s";
    });
  const type = isSealedProduct ? "sealed" : "card";

  return {
    id: card.id,
    name: card.name,
    number: card.number || undefined,
    rarity: card.rarity || undefined,
    setName: card.set_name || card.set || "",
    set: card.set || "",
    imageUrl,
    tcgplayerId: card.tcgplayerId,
    prices: price != null ? { tcgplayer: { market: price } } : undefined,
    marketPrice: price,
    type: type as "card" | "sealed",
    // Attach raw variants for detailed usage
    _variants: card.variants,
  };
}

// --- Query helpers ---

/**
 * Sanitize a user search query for the JustTCG API.
 * - Replaces smart quotes / curly apostrophes with straight ones
 * - Strips trailing card-number suffixes like " - 280" or " #280"
 */
function sanitizeQuery(raw: string): string {
  return raw
    .replace(/[\u2018\u2019\u201A\u201B]/g, "'") // smart single quotes → '
    .replace(/[\u201C\u201D\u201E\u201F]/g, '"') // smart double quotes → "
    .replace(/\s+[-#]\s*\d+\s*$/, "") // strip trailing " - 280" / " #280"
    .trim();
}

// --- Public API functions ---

export async function searchCards(query: string, setId?: string, limit = 20) {
  const cleaned = sanitizeQuery(query);
  const params: Record<string, string> = {
    q: cleaned,
    game: "pokemon",
    limit: String(limit),
    include_null_prices: "true",
  };
  if (setId) {
    params.set = setId;
  }

  const response = await apiFetch("/v1/cards", params);
  const cards: JustTCGCard[] = response.data || [];
  return cards.map(normalizeCard);
}

export async function getCardById(cardId: string) {
  const response = await apiFetch("/v1/cards", {
    q: sanitizeQuery(cardId),
    game: "pokemon",
    limit: "5",
  });
  const cards: JustTCGCard[] = response.data || [];
  return cards.map(normalizeCard);
}

export async function getPriceHistory(
  cardId: string,
  startDate?: string,
  endDate?: string,
  cardName?: string
) {
  // Determine the duration parameter based on date range
  let duration = "90d";
  if (startDate) {
    const start = new Date(startDate);
    const end = endDate ? new Date(endDate) : new Date();
    const days = Math.ceil(
      (end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)
    );
    if (days <= 7) duration = "7d";
    else if (days <= 30) duration = "30d";
    else if (days <= 90) duration = "90d";
    else duration = "180d";
  }

  const searchTerm = sanitizeQuery(cardName || cardId);
  const response = await apiFetch("/v1/cards", {
    q: searchTerm,
    game: "pokemon",
    limit: "5",
    include_price_history: "true",
    priceHistoryDuration: duration,
  });

  const cards: JustTCGCard[] = response.data || [];

  // Find the best matching card
  const card =
    (cardId && cards.find((c) => c.id === cardId)) || cards[0];

  if (!card) return [];

  // Extract price history from the best variant
  const bestVariant = pickBestVariant(card.variants);
  if (!bestVariant?.priceHistory) return [];

  let points = bestVariant.priceHistory.map((entry) => ({
    date: new Date(entry.t * 1000).toISOString().split("T")[0],
    price: entry.p,
    source: "tcgplayer" as const,
  }));

  // Filter by date range if provided
  if (startDate) {
    points = points.filter((p) => p.date >= startDate);
  }
  if (endDate) {
    points = points.filter((p) => p.date <= endDate);
  }

  return points.sort((a, b) => a.date.localeCompare(b.date));
}

export async function getSets(sortBy = "releaseDate", sortOrder = "desc") {
  const response = await apiFetch("/v1/sets", { game: "pokemon" });
  const sets: JustTCGSet[] = response.data || [];

  // Normalize to the format the app expects
  const normalized = sets.map((s) => ({
    id: s.id,
    name: s.name,
    series: s.game || "pokemon",
    releaseDate: s.release_date || "",
    totalCards: s.count || 0,
  }));

  // Sort by the requested field
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

export async function getCardsInSet(setId: string) {
  const response = await apiFetch("/v1/cards", {
    game: "pokemon",
    set: setId,
    limit: "100",
  });
  const cards: JustTCGCard[] = response.data || [];
  return cards.map(normalizeCard);
}

// ---------------------------------------------------------------------------
// Unified search — routes to the right provider based on asset type
// ---------------------------------------------------------------------------

/**
 * Search for assets across providers.
 *
 * - type "card"   → JustTCG
 * - type "sealed" → PokemonPriceTracker
 * - type "all"    → both in parallel, merged
 *
 * To swap cards over to PPT in the future, change the "card" branch
 * to call searchCardsPPT instead of searchCards.
 */
export async function searchAssets(
  query: string,
  type: "card" | "sealed" | "all" = "all",
  setId?: string,
  limit = 20
) {
  if (type === "card") {
    return searchCards(query, setId, limit);
  }

  if (type === "sealed") {
    try {
      return await searchSealedProducts(query, setId, limit);
    } catch (error) {
      // Fall back to JustTCG if PPT is unavailable / not configured
      console.warn(
        "[searchAssets] PokemonPriceTracker sealed search failed, falling back to JustTCG:",
        error instanceof Error ? error.message : error
      );
      return searchCards(query, setId, limit);
    }
  }

  // type === "all" — run both in parallel, merge results
  const [cards, sealed] = await Promise.allSettled([
    searchCards(query, setId, limit),
    searchSealedProducts(query, setId, limit),
  ]);

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const results: any[] = [];

  if (cards.status === "fulfilled") {
    results.push(...cards.value);
  }
  if (sealed.status === "fulfilled") {
    results.push(...sealed.value);
  }

  // If PPT failed but JustTCG succeeded, log but don't break
  if (sealed.status === "rejected") {
    console.warn(
      "[searchAssets] PokemonPriceTracker sealed search failed:",
      sealed.reason instanceof Error ? sealed.reason.message : sealed.reason
    );
  }

  return results;
}

/**
 * Fetch price history, routing to the right provider based on asset type.
 */
export async function getPriceHistoryByType(
  assetType: "card" | "sealed",
  cardId: string,
  cardName?: string,
  startDate?: string,
  endDate?: string
) {
  if (assetType === "sealed") {
    try {
      // Calculate days from date range
      let days = 90;
      if (startDate) {
        const start = new Date(startDate);
        const end = endDate ? new Date(endDate) : new Date();
        days = Math.ceil(
          (end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)
        );
        if (days < 7) days = 7;
      }
      const points = await getSealedPriceHistory(cardName || cardId, days);

      // Apply date filters
      let filtered = points;
      if (startDate) filtered = filtered.filter((p) => p.date >= startDate);
      if (endDate) filtered = filtered.filter((p) => p.date <= endDate);
      return filtered;
    } catch (error) {
      console.warn(
        "[getPriceHistoryByType] PPT sealed history failed, falling back to JustTCG:",
        error instanceof Error ? error.message : error
      );
      return getPriceHistory(cardId, startDate, endDate, cardName);
    }
  }

  // Cards use JustTCG
  return getPriceHistory(cardId, startDate, endDate, cardName);
}
