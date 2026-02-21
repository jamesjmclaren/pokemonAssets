/**
 * PokemonPriceTracker API client.
 *
 * Used for sealed-product pricing today and ready to take over card
 * pricing if we ever need to move away from JustTCG.
 *
 * API docs: https://www.pokemonpricetracker.com/docs
 * Endpoints used:
 *   GET /api/v2/sealed-products  — sealed product search & pricing
 *   GET /api/v2/cards            — card search & pricing (standby)
 */

const PPT_BASE = "https://www.pokemonpricetracker.com";

function getApiKey(): string {
  const key = process.env.POKEMON_PRICE_API_KEY?.trim();
  if (!key) {
    throw new Error("POKEMON_PRICE_API_KEY is not configured");
  }
  return key;
}

async function pptFetch(path: string, params?: Record<string, string>) {
  const url = new URL(path, PPT_BASE);
  if (params) {
    Object.entries(params).forEach(([key, value]) => {
      if (value) url.searchParams.set(key, value);
    });
  }

  const res = await fetch(url.toString(), {
    headers: {
      Authorization: `Bearer ${getApiKey()}`,
      "Content-Type": "application/json",
    },
    next: { revalidate: 3600 },
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`PokemonPriceTracker API error ${res.status}: ${text}`);
  }

  return res.json();
}

// ---------------------------------------------------------------------------
// Response types (best-effort based on docs + old integration)
// ---------------------------------------------------------------------------

interface PPTSealedProduct {
  id?: string;
  _id?: string;
  name: string;
  set?: string;
  setName?: string;
  productType?: string;
  tcgPlayerId?: string | number;
  imageUrl?: string;
  image?: string;
  prices?: {
    market?: number;
    low?: number;
    mid?: number;
    high?: number;
  };
  latestPrice?: number;
  price?: number;
  priceHistory?: Record<string, number> | Array<{ date: string; price: number }>;
}

interface PPTCard {
  id?: string;
  _id?: string;
  name: string;
  number?: string;
  rarity?: string;
  set?: string;
  setName?: string;
  tcgPlayerId?: string | number;
  imageUrl?: string;
  image?: string;
  prices?: {
    market?: number;
    low?: number;
    mid?: number;
    high?: number;
    tcgplayer?: { market?: number; low?: number; mid?: number; high?: number };
  };
  latestPrice?: number;
  price?: number;
  priceHistory?: Record<string, number> | Array<{ date: string; price: number }>;
}

// ---------------------------------------------------------------------------
// Normalization helpers — output matches the shape pokemon-api.ts produces
// ---------------------------------------------------------------------------

function extractPrice(product: PPTSealedProduct | PPTCard): number | null {
  if (product.prices) {
    const p = product.prices as Record<string, unknown>;
    // Nested tcgplayer object
    const tcg = p.tcgplayer as Record<string, number> | undefined;
    if (tcg?.market != null) return tcg.market;
    if (tcg?.low != null) return tcg.low;
    // Flat prices
    if (typeof p.market === "number") return p.market;
    if (typeof p.low === "number") return p.low;
  }
  if (typeof product.latestPrice === "number") return product.latestPrice;
  if (typeof product.price === "number") return product.price;
  return null;
}

function normalizeSealedProduct(p: PPTSealedProduct) {
  const price = extractPrice(p);
  const id = p.id || p._id || `ppt-sealed-${p.name}`;
  const imageUrl =
    p.imageUrl ||
    p.image ||
    (p.tcgPlayerId
      ? `https://tcgplayer-cdn.tcgplayer.com/product/${p.tcgPlayerId}_200w.jpg`
      : undefined);

  return {
    id,
    name: p.name,
    number: undefined,
    rarity: undefined,
    setName: p.setName || p.set || "",
    set: p.set || "",
    imageUrl,
    tcgplayerId: p.tcgPlayerId ? String(p.tcgPlayerId) : null,
    prices: price != null ? { tcgplayer: { market: price } } : undefined,
    marketPrice: price,
    type: "sealed" as const,
    source: "pokemonpricetracker" as const,
  };
}

function normalizeCard(c: PPTCard) {
  const price = extractPrice(c);
  const id = c.id || c._id || `ppt-card-${c.name}`;
  const imageUrl =
    c.imageUrl ||
    c.image ||
    (c.tcgPlayerId
      ? `https://tcgplayer-cdn.tcgplayer.com/product/${c.tcgPlayerId}_200w.jpg`
      : undefined);

  return {
    id,
    name: c.name,
    number: c.number || undefined,
    rarity: c.rarity || undefined,
    setName: c.setName || c.set || "",
    set: c.set || "",
    imageUrl,
    tcgplayerId: c.tcgPlayerId ? String(c.tcgPlayerId) : null,
    prices: price != null ? { tcgplayer: { market: price } } : undefined,
    marketPrice: price,
    type: "card" as const,
    source: "pokemonpricetracker" as const,
  };
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/** Search sealed products on PokemonPriceTracker */
export async function searchSealedProducts(
  query: string,
  setId?: string,
  limit = 20
) {
  const params: Record<string, string> = {
    search: query,
    limit: String(limit),
  };
  if (setId) params.set = setId;

  const response = await pptFetch("/api/v2/sealed-products", params);
  const products: PPTSealedProduct[] = Array.isArray(response)
    ? response
    : response.data || response.products || [];
  return products.map(normalizeSealedProduct);
}

/** Search cards on PokemonPriceTracker (standby — can replace JustTCG) */
export async function searchCardsPPT(
  query: string,
  setId?: string,
  limit = 20
) {
  const params: Record<string, string> = {
    search: query,
    limit: String(limit),
  };
  if (setId) params.set = setId;

  const response = await pptFetch("/api/v2/cards", params);
  const cards: PPTCard[] = Array.isArray(response)
    ? response
    : response.data || response.cards || [];
  return cards.map(normalizeCard);
}

/** Get price history for a sealed product */
export async function getSealedPriceHistory(
  productName: string,
  days = 90
) {
  const response = await pptFetch("/api/v2/sealed-products", {
    search: productName,
    includeHistory: "true",
    days: String(days),
    limit: "5",
  });

  const products: PPTSealedProduct[] = Array.isArray(response)
    ? response
    : response.data || response.products || [];

  const product = products[0];
  if (!product?.priceHistory) return [];

  // priceHistory may be an array or a date->price object
  let points: { date: string; price: number; source: string }[] = [];
  if (Array.isArray(product.priceHistory)) {
    points = product.priceHistory.map((entry) => ({
      date: entry.date,
      price: entry.price,
      source: "pokemonpricetracker",
    }));
  } else if (typeof product.priceHistory === "object") {
    points = Object.entries(product.priceHistory).map(([date, price]) => ({
      date,
      price: typeof price === "number" ? price : Number(price) || 0,
      source: "pokemonpricetracker",
    }));
  }

  return points.sort((a, b) => a.date.localeCompare(b.date));
}

/** Get price history for a card (standby — can replace JustTCG) */
export async function getCardPriceHistoryPPT(
  cardName: string,
  days = 90
) {
  const response = await pptFetch("/api/v2/cards", {
    search: cardName,
    limit: "5",
  });

  const cards: PPTCard[] = Array.isArray(response)
    ? response
    : response.data || response.cards || [];

  const card = cards[0];
  if (!card?.priceHistory) return [];

  let points: { date: string; price: number; source: string }[] = [];
  if (Array.isArray(card.priceHistory)) {
    points = card.priceHistory.map((entry) => ({
      date: entry.date,
      price: entry.price,
      source: "pokemonpricetracker",
    }));
  } else if (typeof card.priceHistory === "object") {
    points = Object.entries(card.priceHistory).map(([date, price]) => ({
      date,
      price: typeof price === "number" ? price : Number(price) || 0,
      source: "pokemonpricetracker",
    }));
  }

  return points.sort((a, b) => a.date.localeCompare(b.date));
}
