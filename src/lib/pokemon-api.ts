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
  console.log(`[API] Calling: ${url.toString()}`);
  console.log(`[API] Key prefix: ${apiKey.substring(0, 20)}...`);
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
  const params: Record<string, string> = {};
  if (startDate) params.startDate = startDate;
  if (endDate) params.endDate = endDate;
  return apiFetch(`/api/cards/${cardId}/history`, params);
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
