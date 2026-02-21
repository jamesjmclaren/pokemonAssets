const API_BASE = "https://pokemon-tcg-api.p.rapidapi.com";

function getApiKey(): string {
  const key = process.env.RAPIDAPI_KEY?.trim();
  if (!key) {
    throw new Error("RAPIDAPI_KEY is not configured");
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
      "X-RapidAPI-Key": getApiKey(),
      "X-RapidAPI-Host": "pokemon-tcg-api.p.rapidapi.com",
    },
    next: { revalidate: 3600 },
  });

  if (!res.ok) {
    if (res.status === 429) {
      console.warn("Pokemon TCG API rate limit hit");
      throw new Error("Rate limit exceeded. Please try again in a moment.");
    }
    const text = await res.text();
    throw new Error(`API error ${res.status}: ${text}`);
  }

  return res.json();
}

// --- API Response Types ---

interface GradedPrices {
  psa?: { psa10?: number; psa9?: number; psa8?: number };
  cgc?: { cgc10?: number; cgc9?: number };
  bgs?: { bgs10?: number; bgs9?: number };
}

interface CardmarketPrices {
  currency: string;
  lowest_near_mint?: number;
  lowest_near_mint_DE?: number;
  lowest_near_mint_FR?: number;
  "30d_average"?: number;
  "7d_average"?: number;
  graded?: GradedPrices;
}

interface TcgPlayerPrices {
  currency: string;
  market_price?: number;
  mid_price?: number;
}

interface ApiPrices {
  cardmarket?: CardmarketPrices;
  tcg_player?: TcgPlayerPrices;
}

interface ApiCard {
  id: number;
  name: string;
  name_numbered?: string;
  card_number?: string;
  rarity?: string;
  prices?: ApiPrices;
  episode?: {
    id: number;
    name: string;
    code?: string;
  };
  artist?: { name: string };
  image?: string;
  tcgid?: string;
  cardmarket_id?: number;
}

interface ApiProduct {
  id: number;
  name: string;
  type?: string;
  prices?: ApiPrices;
  episode?: {
    id: number;
    name: string;
    code?: string;
  };
  image?: string;
  release_date?: string;
}

interface ApiEpisode {
  id: number;
  name: string;
  code?: string;
  release_date?: string;
  cards_count?: number;
  products_count?: number;
  logo?: string;
}

// --- Normalized Types for App ---

export interface NormalizedCard {
  id: string;
  name: string;
  number?: string;
  rarity?: string;
  setName: string;
  setCode?: string;
  imageUrl?: string;
  type: "card";
  prices: {
    raw?: number;
    psa10?: number;
    psa9?: number;
    cgc10?: number;
    bgs10?: number;
  };
  marketPrice?: number;
  currency: string;
}

export interface NormalizedProduct {
  id: string;
  name: string;
  setName: string;
  setCode?: string;
  imageUrl?: string;
  type: "sealed";
  productType?: string;
  prices: {
    market?: number;
  };
  marketPrice?: number;
  currency: string;
}

export type NormalizedItem = NormalizedCard | NormalizedProduct;

// --- Normalization Functions ---

function normalizeCard(card: ApiCard): NormalizedCard {
  const tcgPrice = card.prices?.tcg_player?.market_price;
  const cmPrice = card.prices?.cardmarket?.lowest_near_mint;
  const graded = card.prices?.cardmarket?.graded;

  return {
    id: `card-${card.id}`,
    name: card.name,
    number: card.card_number,
    rarity: card.rarity,
    setName: card.episode?.name || "",
    setCode: card.episode?.code,
    imageUrl: card.image,
    type: "card",
    prices: {
      raw: tcgPrice || cmPrice,
      psa10: graded?.psa?.psa10,
      psa9: graded?.psa?.psa9,
      cgc10: graded?.cgc?.cgc10,
      bgs10: graded?.bgs?.bgs10,
    },
    marketPrice: tcgPrice || cmPrice,
    currency: tcgPrice ? "USD" : "EUR",
  };
}

function normalizeProduct(product: ApiProduct): NormalizedProduct {
  const tcgPrice = product.prices?.tcg_player?.market_price;
  const cmPrice = product.prices?.cardmarket?.lowest_near_mint;

  return {
    id: `product-${product.id}`,
    name: product.name,
    setName: product.episode?.name || "",
    setCode: product.episode?.code,
    imageUrl: product.image,
    type: "sealed",
    productType: product.type,
    prices: {
      market: tcgPrice || cmPrice,
    },
    marketPrice: tcgPrice || cmPrice,
    currency: tcgPrice ? "USD" : "EUR",
  };
}

// --- Public API Functions ---

export async function searchCards(query: string, limit = 20): Promise<NormalizedCard[]> {
  const data = await apiFetch("/cards", {
    search: query,
    limit: String(limit),
    sort: "price_highest",
  });

  const cards: ApiCard[] = Array.isArray(data) ? data : data.data || [];
  return cards.map(normalizeCard);
}

export async function searchAll(query: string, limit = 20): Promise<NormalizedItem[]> {
  // Only search cards to avoid rate limits - products require too many API calls
  // Users can search for sealed products by name and they'll appear in card results
  const cards = await searchCards(query, limit);
  return cards;
}

export async function getCardById(id: string): Promise<NormalizedCard | null> {
  const numericId = id.replace("card-", "");
  const data = await apiFetch(`/cards/${numericId}`);
  
  if (!data) return null;
  return normalizeCard(data);
}

export async function getEpisodes(): Promise<Array<{
  id: number;
  name: string;
  code?: string;
  releaseDate?: string;
  cardsCount?: number;
}>> {
  const data = await apiFetch("/episodes");
  const episodes: ApiEpisode[] = Array.isArray(data) ? data : data.data || [];
  
  return episodes.map(ep => ({
    id: ep.id,
    name: ep.name,
    code: ep.code,
    releaseDate: ep.release_date,
    cardsCount: ep.cards_count,
  }));
}

export async function getCardsInEpisode(episodeId: number, limit = 50): Promise<NormalizedCard[]> {
  const data = await apiFetch(`/episodes/${episodeId}/cards`, {
    limit: String(limit),
    sort: "price_highest",
  });

  const cards: ApiCard[] = Array.isArray(data) ? data : data.data || [];
  return cards.map(normalizeCard);
}

export async function getProductsInEpisode(episodeId: number): Promise<NormalizedProduct[]> {
  const data = await apiFetch(`/episodes/${episodeId}/products`, {
    sort: "price_highest",
  });

  const products: ApiProduct[] = Array.isArray(data) ? data : data.data || [];
  return products.map(normalizeProduct);
}

export async function getPriceHistory(
  itemId: string,
  dateFrom?: string,
  dateTo?: string
): Promise<Array<{ date: string; price: number }>> {
  const numericId = itemId.replace(/^(card|product)-/, "");
  
  const params: Record<string, string> = { id: numericId };
  if (dateFrom) params.date_from = dateFrom;
  if (dateTo) params.date_to = dateTo;
  
  const data = await apiFetch("/pokemon/history-prices", params);
  
  // The API returns an array of price history entries
  const history = Array.isArray(data) ? data : data.data || [];
  
  return history.map((entry: { date: string; price: number }) => ({
    date: entry.date,
    price: entry.price,
  }));
}
