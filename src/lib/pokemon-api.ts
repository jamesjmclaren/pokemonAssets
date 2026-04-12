/**
 * Unified Pokemon pricing API — powered by Poketrace.
 *
 * This module provides the same exported function signatures as before
 * so all consumers (API routes, components) continue to work without changes.
 * Under the hood, everything now routes through the Poketrace API.
 *
 * Previously used:
 *   - JustTCG for cards
 *   - PokemonPriceTracker for sealed products
 *   - PriceCharting for graded prices (scraping)
 *
 * Now all handled by Poketrace.
 */

import {
  searchPoketrace,
  searchPoketraceByType,
  getPoketraceCardById,
  getPoketracePriceHistory,
  getPoketraceSets,
  fetchPoketracePrice,
  gradeToPoketraceTier,
  type NormalizedCard,
} from "./poketrace";

// Re-export Poketrace functions for direct usage
export {
  fetchPoketracePrice,
  getPoketraceCardById,
  gradeToPoketraceTier,
  searchPoketrace,
  searchPoketraceByType,
  type NormalizedCard,
};

// ---------------------------------------------------------------------------
// Query helpers (preserved from original)
// ---------------------------------------------------------------------------

/**
 * Sanitize a user search query.
 */
function sanitizeQuery(raw: string): string {
  return raw
    .replace(/[\u2018\u2019\u201A\u201B]/g, "'")
    .replace(/[\u201C\u201D\u201E\u201F]/g, '"')
    .replace(/\s+[-#]\s*\d+\s*$/, "")
    .trim();
}

// ---------------------------------------------------------------------------
// Public API functions — same signatures as before
// ---------------------------------------------------------------------------

/**
 * Search for cards (and sealed products detected as cards by Poketrace).
 */
export async function searchCards(query: string, setId?: string, limit = 20) {
  const cleaned = sanitizeQuery(query);
  return searchPoketrace(cleaned, {
    setSlug: setId,
    limit,
    market: "US",
  });
}

/**
 * Search for sealed products via Poketrace.
 * Poketrace merges cards and sealed, so we filter post-response.
 */
export async function searchSealedProducts(
  query: string,
  setId?: string,
  limit = 20
) {
  const cleaned = sanitizeQuery(query);
  return searchPoketraceByType(cleaned, "sealed", {
    setSlug: setId,
    limit,
    market: "US",
  });
}

/**
 * Get cards by ID search.
 */
export async function getCardById(cardId: string) {
  const cleaned = sanitizeQuery(cardId);
  return searchPoketrace(cleaned, { limit: 5, market: "US" });
}

/**
 * Get price history for a card.
 */
export async function getPriceHistory(
  cardId: string,
  startDate?: string,
  endDate?: string,
  cardName?: string
) {
  // Try direct ID lookup first
  const history = await getPoketracePriceHistory(cardId, "NEAR_MINT", startDate, endDate);

  if (history.length > 0) return history;

  // If no history by ID, try searching by name and getting history for first match
  if (cardName) {
    const results = await searchPoketrace(cardName, { limit: 1, market: "US" });
    if (results.length > 0) {
      return getPoketracePriceHistory(results[0].poketraceId, "NEAR_MINT", startDate, endDate);
    }
  }

  return [];
}

/**
 * Get all Pokemon sets.
 */
export async function getSets(sortBy = "releaseDate", sortOrder = "desc") {
  return getPoketraceSets(sortBy, sortOrder);
}

/**
 * Get cards in a specific set.
 */
export async function getCardsInSet(setId: string) {
  return searchPoketrace("", { setSlug: setId, limit: 100, market: "US" });
}

// ---------------------------------------------------------------------------
// Unified search — same interface as before
// ---------------------------------------------------------------------------

/**
 * Search for assets across all types.
 *
 * - type "card"   → Poketrace filtered to cards
 * - type "sealed" → Poketrace filtered to sealed
 * - type "all"    → Poketrace unfiltered
 */
export async function searchAssets(
  query: string,
  type: "card" | "sealed" | "all" = "all",
  setId?: string,
  limit = 20
) {
  const cleaned = sanitizeQuery(query);
  return searchPoketraceByType(cleaned, type, {
    setSlug: setId,
    limit,
    market: "US",
  });
}

/**
 * Fetch price history, routing to the right tier based on asset type.
 * Since Poketrace handles both cards and sealed, this is simplified.
 */
export async function getPriceHistoryByType(
  assetType: "card" | "sealed",
  cardId: string,
  cardName?: string,
  startDate?: string,
  endDate?: string
) {
  // Poketrace handles both types through the same endpoint
  return getPriceHistory(cardId, startDate, endDate, cardName);
}
