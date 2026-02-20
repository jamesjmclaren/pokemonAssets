const API_BASE = "https://www.pokemonpricetracker.com";

function getApiKey(): string {
  const key = process.env.POKEMON_PRICE_API_KEY?.trim();
  if (!key) {
    throw new Error("POKEMON_PRICE_API_KEY is not configured");
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
      Authorization: `Bearer ${apiKey}`,
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

export async function searchCards(query: string, setId?: string, limit = 20) {
  const params: Record<string, string> = {
    search: query,
    limit: String(limit),
  };
  if (setId) {
    params.setId = setId;
  }
  return apiFetch("/api/v2/cards", params);
}

export async function getCardById(cardId: string) {
  return apiFetch(`/api/v2/cards`, { search: cardId, limit: "1" });
}

export async function getPriceHistory(
  cardId: string,
  startDate?: string,
  endDate?: string
) {
  // Price history is embedded in the card response from /api/v2/cards
  const results = await apiFetch("/api/v2/cards", {
    search: cardId,
    limit: "1",
  });

  const cards = Array.isArray(results)
    ? results
    : results.data || results.cards || [];
  const card = cards.find((c: { id?: string }) => c.id === cardId) || cards[0];
  if (!card) return [];

  const history = card.priceHistory || card.price_history || {};

  // Convert priceHistory object (date->price map or array) into PriceHistoryPoint[]
  let points: { date: string; price: number; source?: string }[] = [];
  if (Array.isArray(history)) {
    points = history;
  } else if (typeof history === "object") {
    points = Object.entries(history).map(([date, price]) => ({
      date,
      price: typeof price === "number" ? price : Number(price) || 0,
      source: "tcgplayer",
    }));
  }

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
  return apiFetch("/api/v2/sets", { sortBy, sortOrder });
}

export async function getCardsInSet(setId: string) {
  return apiFetch("/api/v2/cards", {
    set: setId,
    fetchAllInSet: "true",
  });
}
