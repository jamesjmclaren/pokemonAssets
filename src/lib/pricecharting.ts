/**
 * PriceCharting scraper for graded Pokémon card prices.
 *
 * Prices are sourced from eBay sold listings (USD).
 * No Playwright needed — PriceCharting server-renders prices in HTML.
 *
 * PriceCharting grade mapping for cards:
 *   used_price     → Ungraded
 *   complete_price → Grade 7
 *   new_price      → Grade 8
 *   graded_price   → Grade 9
 *   box_only_price → Grade 9.5
 *   manual_only_price → PSA 10 / Grade 10
 */

const PC_BASE = "https://www.pricecharting.com";
const UA =
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36";

export interface PriceChartingCard {
  id: string;
  name: string;
  setName: string;
  url: string;
  prices: {
    ungraded?: number;
    grade7?: number;
    grade8?: number;
    grade9?: number;
    grade95?: number;
    psa10?: number;
  };
}

function parsePrice(raw: string): number | undefined {
  const cleaned = raw.replace(/[^0-9.]/g, "");
  const val = parseFloat(cleaned);
  return isNaN(val) || val === 0 ? undefined : val;
}

/**
 * Search PriceCharting for Pokémon cards and return results with
 * Ungraded / Grade 7 / Grade 8 prices (from the search results page).
 */
export async function searchPriceCharting(
  query: string
): Promise<PriceChartingCard[]> {
  const url = `${PC_BASE}/search-products?q=${encodeURIComponent(query)}&type=prices&category=pokemon-cards`;

  const res = await fetch(url, {
    headers: { "User-Agent": UA },
    next: { revalidate: 3600 },
  });

  if (!res.ok) {
    throw new Error(`PriceCharting search failed: ${res.status}`);
  }

  const html = await res.text();

  const cards: PriceChartingCard[] = [];
  const rowRegex = new RegExp('<tr id="product-(\\d+)"[^>]*>(.*?)</tr>', "gs");
  let match;

  while ((match = rowRegex.exec(html)) !== null) {
    const [, productId, rowHtml] = match;

    // Extract card URL and name
    const linkMatch = rowHtml.match(
      /href="(https:\/\/www\.pricecharting\.com\/game\/[^"]+)"[^>]*>([^<]+)/
    );
    if (!linkMatch) continue;

    const cardUrl = linkMatch[1];
    const cardName = linkMatch[2].trim();

    // Extract set name
    const setMatch = rowHtml.match(
      /href="\/console\/[^"]*"[^>]*>([^<]+)/
    );
    const setName = setMatch ? setMatch[1].trim() : "";

    // Extract the 3 prices from search results (Ungraded, Grade 7, Grade 8)
    const priceMatches = rowHtml.match(
      /class="js-price"[^>]*>([^<]*)/g
    );
    const priceValues = (priceMatches || []).map((p) => {
      const val = p.match(/>([^<]*)/);
      return val ? val[1].trim() : "";
    });

    cards.push({
      id: productId,
      name: cardName,
      setName,
      url: cardUrl,
      prices: {
        ungraded: priceValues[0] ? parsePrice(priceValues[0]) : undefined,
        grade7: priceValues[1] ? parsePrice(priceValues[1]) : undefined,
        grade8: priceValues[2] ? parsePrice(priceValues[2]) : undefined,
      },
    });
  }

  return cards;
}

/**
 * Fetch full graded prices for a specific card from its detail page.
 * Returns all grades: Ungraded, Grade 7–10, Grade 9.5.
 */
export async function getGradedPrices(
  cardUrl: string
): Promise<PriceChartingCard["prices"]> {
  const res = await fetch(cardUrl, {
    headers: { "User-Agent": UA },
    next: { revalidate: 3600 },
  });

  if (!res.ok) {
    throw new Error(`PriceCharting detail page failed: ${res.status}`);
  }

  const html = await res.text();

  const extractPrice = (id: string): number | undefined => {
    // Match: id="used_price" ...> <span class="price ...">$900.00</span>
    const regex = new RegExp(
      `id="${id}"[^>]*>\\s*<span[^>]*class="price[^"]*"[^>]*>([^<]*)`,
      "s"
    );
    const match = html.match(regex);
    return match ? parsePrice(match[1]) : undefined;
  };

  return {
    ungraded: extractPrice("used_price"),
    grade7: extractPrice("complete_price"),
    grade8: extractPrice("new_price"),
    grade9: extractPrice("graded_price"),
    grade95: extractPrice("box_only_price"),
    psa10: extractPrice("manual_only_price"),
  };
}

/**
 * Search and return cards with full graded prices.
 * Fetches search results, then detail pages for the top matches.
 */
export async function searchWithGradedPrices(
  query: string,
  limit = 5
): Promise<PriceChartingCard[]> {
  const searchResults = await searchPriceCharting(query);
  const topResults = searchResults.slice(0, limit);

  // Fetch detail pages in parallel for full graded prices
  const detailed = await Promise.allSettled(
    topResults.map(async (card) => {
      const prices = await getGradedPrices(card.url);
      return { ...card, prices };
    })
  );

  return detailed
    .filter(
      (r): r is PromiseFulfilledResult<PriceChartingCard> =>
        r.status === "fulfilled"
    )
    .map((r) => r.value);
}
