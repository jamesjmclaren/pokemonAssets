/**
 * PriceCharting scraper for Pokémon card/product prices.
 *
 * Prices are sourced from eBay sold listings (USD).
 * No Playwright needed — PriceCharting server-renders prices in HTML.
 *
 * PriceCharting grade mapping for cards:
 *   used_price       → Ungraded
 *   complete_price   → Grade 7
 *   new_price        → Grade 8
 *   graded_price     → Grade 9
 *   box_only_price   → Grade 9.5
 *   manual_only_price → PSA 10 / Grade 10
 */

const PC_BASE = "https://www.pricecharting.com";
const UA =
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36";

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

export interface PriceChartingCard {
  id: string;
  name: string;
  setName: string;
  url: string;
  imageUrl?: string;
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
 * Parse a PriceCharting detail page into a single card result.
 * Used when search redirects directly to a product page (exact match).
 */
function parseDetailPage(html: string, pageUrl: string): PriceChartingCard | null {
  // Extract product ID from the URL or page content
  const idMatch = html.match(/product_id['":\s]+(\d+)/) ||
    pageUrl.match(/\/game\/[^/]+\/[^?]+/);
  const productId = idMatch?.[1] || pageUrl.split("/").pop()?.split("?")[0] || "unknown";

  // Extract title — <h1> or <title> tag
  const h1Match = html.match(/<h1[^>]*id="product_name"[^>]*>([^<]+)/);
  const titleMatch = html.match(/<title>([^|<]+)/);
  const name = (h1Match?.[1] || titleMatch?.[1] || "").replace(/ Prices$/, "").trim();
  if (!name) return null;

  // Extract set name from console link
  const setMatch = html.match(/href="\/console\/[^"]*"[^>]*>([^<]+)/);
  const setName = setMatch ? setMatch[1].trim() : "";

  // Extract image
  const imgMatch = html.match(
    /src="(https:\/\/storage\.googleapis\.com\/images\.pricecharting\.com\/[^"]+)"/
  );
  const imageUrl = imgMatch ? imgMatch[1] : undefined;

  // Extract prices from detail page
  const extractPrice = (id: string): number | undefined => {
    const regex = new RegExp(
      `id="${id}"[^>]*>\\s*<span[^>]*class="price[^"]*"[^>]*>([^<]*)`,
      "s"
    );
    const match = html.match(regex);
    return match ? parsePrice(match[1]) : undefined;
  };

  return {
    id: productId,
    name,
    setName,
    url: pageUrl.split("?")[0],
    imageUrl,
    prices: {
      ungraded: extractPrice("used_price"),
      grade7: extractPrice("complete_price"),
      grade8: extractPrice("new_price"),
      grade9: extractPrice("graded_price"),
      grade95: extractPrice("box_only_price"),
      psa10: extractPrice("manual_only_price"),
    },
  };
}

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
  const finalUrl = res.url;

  // PriceCharting redirects to a detail page on exact match — detect this
  if (html.includes('id="used_price"') || html.includes('id="graded_price"')) {
    const card = parseDetailPage(html, finalUrl);
    return card ? [card] : [];
  }

  // Otherwise parse the search results table
  const cards: PriceChartingCard[] = [];
  const rowRegex = new RegExp('<tr id="product-(\\d+)"[^>]*>(.*?)</tr>', "gs");
  let match;

  while ((match = rowRegex.exec(html)) !== null) {
    const [, productId, rowHtml] = match;

    const anchorRegex = new RegExp(
      '<a[^>]*href="(https://www\\.pricecharting\\.com/game/[^"]+)"[^>]*>(.*?)</a>',
      "gs"
    );
    let cardUrl = "";
    let cardName = "";
    let anchorMatch;
    while ((anchorMatch = anchorRegex.exec(rowHtml)) !== null) {
      const href = anchorMatch[1];
      const text = anchorMatch[2].replace(/<[^>]+>/g, "").trim();
      if (!cardUrl) cardUrl = href;
      if (text && !cardName) cardName = text;
    }
    if (!cardUrl) continue;

    const setMatch = rowHtml.match(
      /href="\/console\/[^"]*"[^>]*>([^<]+)/
    );
    const setName = setMatch ? setMatch[1].trim() : "";

    const imgMatch = rowHtml.match(
      /src="(https:\/\/storage\.googleapis\.com\/images\.pricecharting\.com\/[^"]+)"/
    );
    const imageUrl = imgMatch ? imgMatch[1] : undefined;

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
      imageUrl,
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
  console.log(`[pricecharting] Fetching detail page: ${cardUrl}`);

  const res = await fetch(cardUrl, {
    headers: { "User-Agent": UA },
    next: { revalidate: 3600 },
  });

  if (!res.ok) {
    console.error(`[pricecharting] Detail page failed with status ${res.status} for ${cardUrl}`);
    throw new Error(`PriceCharting detail page failed: ${res.status}`);
  }

  const html = await res.text();
  console.log(`[pricecharting] Received ${html.length} bytes of HTML from ${cardUrl}`);

  const extractPrice = (id: string): number | undefined => {
    const regex = new RegExp(
      `id="${id}"[^>]*>\\s*<span[^>]*class="price[^"]*"[^>]*>([^<]*)`,
      "s"
    );
    const match = html.match(regex);
    return match ? parsePrice(match[1]) : undefined;
  };

  const prices = {
    ungraded: extractPrice("used_price"),
    grade7: extractPrice("complete_price"),
    grade8: extractPrice("new_price"),
    grade9: extractPrice("graded_price"),
    grade95: extractPrice("box_only_price"),
    psa10: extractPrice("manual_only_price"),
  };

  console.log(`[pricecharting] Parsed prices from ${cardUrl}:`, JSON.stringify(prices));

  return prices;
}

/**
 * Search and return cards with full graded prices.
 * Fetches search results, then detail pages for the top matches.
 */
export async function searchWithGradedPrices(
  query: string,
  limit = 3
): Promise<PriceChartingCard[]> {
  const searchResults = await searchPriceCharting(query);
  const topResults = searchResults.slice(0, limit);

  // If a redirect gave us a detail page result, it already has full prices
  const hasFullPrices = (card: PriceChartingCard) =>
    card.prices.grade9 !== undefined || card.prices.psa10 !== undefined;

  // Fetch detail pages sequentially with a delay to avoid 429s
  const detailed: PriceChartingCard[] = [];
  for (const card of topResults) {
    if (hasFullPrices(card)) {
      detailed.push(card);
      continue;
    }
    try {
      if (detailed.length > 0) await sleep(500);
      const prices = await getGradedPrices(card.url);
      detailed.push({ ...card, prices });
    } catch {
      detailed.push(card);
    }
  }

  return detailed;
}

/**
 * Fetch the current price for a specific PriceCharting product by URL.
 * Used by the refresh-prices cron to update tethered assets.
 *
 * @param pcUrl - The PriceCharting product URL
 * @param gradeField - Which price field to use (e.g. "psa10", "grade9", "ungraded")
 */
export async function fetchTetheredPrice(
  pcUrl: string,
  gradeField?: string
): Promise<number | undefined> {
  console.log(`[pricecharting] fetchTetheredPrice called — url: ${pcUrl}, gradeField: ${gradeField || "ungraded"}`);

  const prices = await getGradedPrices(pcUrl);

  let selectedPrice: number | undefined;
  let selectedField: string;

  if (!gradeField || gradeField === "ungraded") {
    selectedPrice = prices.ungraded;
    selectedField = "ungraded";
  } else {
    selectedPrice = prices[gradeField as keyof typeof prices];
    selectedField = gradeField;
    if (selectedPrice == null) {
      console.warn(`[pricecharting] Grade field "${gradeField}" returned null, falling back to ungraded ($${prices.ungraded})`);
      selectedPrice = prices.ungraded;
      selectedField = "ungraded (fallback)";
    }
  }

  console.log(`[pricecharting] fetchTetheredPrice result — field: ${selectedField}, price: $${selectedPrice ?? "null"}`);
  return selectedPrice;
}

/**
 * Map a PSA/CGC/BGS grade string to the corresponding PriceCharting price field key.
 */
export function gradeToField(grade: string): keyof PriceChartingCard["prices"] {
  const g = grade.toLowerCase();
  if (g.includes("10")) return "psa10";
  if (g.includes("9.5")) return "grade95";
  if (g.includes("9")) return "grade9";
  if (g.includes("8")) return "grade8";
  if (g.includes("7")) return "grade7";
  return "ungraded";
}

/**
 * Comic book grade mapping for PriceCharting.
 * PriceCharting reuses the same HTML IDs but they map to comic grades:
 *   used_price       → Ungraded
 *   complete_price   → 4.0 / VG (Very Good)
 *   new_price        → 6.0 / Fine
 *   graded_price     → 8.0 / VF (Very Fine)
 *   box_only_price   → 9.2 / NM- (Near Mint Minus)
 *   manual_only_price → 9.8
 */

export interface PriceChartingComic {
  id: string;
  name: string;
  setName: string;
  url: string;
  imageUrl?: string;
  prices: {
    ungraded?: number;
    vg4?: number;
    fine6?: number;
    vf8?: number;
    nm92?: number;
    nm98?: number;
  };
}

function parseComicDetailPage(html: string, pageUrl: string): PriceChartingComic | null {
  const idMatch = html.match(/product_id['":\s]+(\d+)/) ||
    pageUrl.match(/\/game\/[^/]+\/[^?]+/);
  const productId = idMatch?.[1] || pageUrl.split("/").pop()?.split("?")[0] || "unknown";

  const h1Match = html.match(/<h1[^>]*id="product_name"[^>]*>([^<]+)/);
  const titleMatch = html.match(/<title>([^|<]+)/);
  const name = (h1Match?.[1] || titleMatch?.[1] || "").replace(/ Prices$/, "").trim();
  if (!name) return null;

  const setMatch = html.match(/href="\/console\/[^"]*"[^>]*>([^<]+)/);
  const setName = setMatch ? setMatch[1].trim() : "";

  const imgMatch = html.match(
    /src="(https:\/\/storage\.googleapis\.com\/images\.pricecharting\.com\/[^"]+)"/
  );
  const imageUrl = imgMatch ? imgMatch[1] : undefined;

  const extractPrice = (id: string): number | undefined => {
    const regex = new RegExp(
      `id="${id}"[^>]*>\\s*<span[^>]*class="price[^"]*"[^>]*>([^<]*)`,
      "s"
    );
    const match = html.match(regex);
    return match ? parsePrice(match[1]) : undefined;
  };

  return {
    id: productId,
    name,
    setName,
    url: pageUrl.split("?")[0],
    imageUrl,
    prices: {
      ungraded: extractPrice("used_price"),
      vg4: extractPrice("complete_price"),
      fine6: extractPrice("new_price"),
      vf8: extractPrice("graded_price"),
      nm92: extractPrice("box_only_price"),
      nm98: extractPrice("manual_only_price"),
    },
  };
}

export async function searchComicsPriceCharting(
  query: string
): Promise<PriceChartingComic[]> {
  const url = `${PC_BASE}/search-products?q=${encodeURIComponent(query)}&type=prices&category=comic-books`;

  const res = await fetch(url, {
    headers: { "User-Agent": UA },
    next: { revalidate: 3600 },
  });

  if (!res.ok) {
    throw new Error(`PriceCharting comic search failed: ${res.status}`);
  }

  const html = await res.text();
  const finalUrl = res.url;

  // PriceCharting redirects to a detail page on exact match
  if (html.includes('id="used_price"') || html.includes('id="graded_price"')) {
    const comic = parseComicDetailPage(html, finalUrl);
    return comic ? [comic] : [];
  }

  const comics: PriceChartingComic[] = [];
  const rowRegex = new RegExp('<tr id="product-(\\d+)"[^>]*>(.*?)</tr>', "gs");
  let match;

  while ((match = rowRegex.exec(html)) !== null) {
    const [, productId, rowHtml] = match;

    const anchorRegex = new RegExp(
      '<a[^>]*href="(https://www\\.pricecharting\\.com/game/[^"]+)"[^>]*>(.*?)</a>',
      "gs"
    );
    let comicUrl = "";
    let comicName = "";
    let anchorMatch;
    while ((anchorMatch = anchorRegex.exec(rowHtml)) !== null) {
      const href = anchorMatch[1];
      const text = anchorMatch[2].replace(/<[^>]+>/g, "").trim();
      if (!comicUrl) comicUrl = href;
      if (text && !comicName) comicName = text;
    }
    if (!comicUrl) continue;

    const setMatch = rowHtml.match(
      /href="\/console\/[^"]*"[^>]*>([^<]+)/
    );
    const setName = setMatch ? setMatch[1].trim() : "";

    const imgMatch = rowHtml.match(
      /src="(https:\/\/storage\.googleapis\.com\/images\.pricecharting\.com\/[^"]+)"/
    );
    const imageUrl = imgMatch ? imgMatch[1] : undefined;

    // Search results show: Low (used_price), Mid (cib_price), High (new_price)
    const priceMatches = rowHtml.match(
      /class="js-price"[^>]*>([^<]*)/g
    );
    const priceValues = (priceMatches || []).map((p) => {
      const val = p.match(/>([^<]*)/);
      return val ? val[1].trim() : "";
    });

    comics.push({
      id: productId,
      name: comicName,
      setName,
      url: comicUrl,
      imageUrl,
      prices: {
        ungraded: priceValues[0] ? parsePrice(priceValues[0]) : undefined,
        vg4: priceValues[1] ? parsePrice(priceValues[1]) : undefined,
        fine6: priceValues[2] ? parsePrice(priceValues[2]) : undefined,
      },
    });
  }

  return comics;
}

export async function getComicGradedPrices(
  comicUrl: string
): Promise<PriceChartingComic["prices"]> {
  const res = await fetch(comicUrl, {
    headers: { "User-Agent": UA },
    next: { revalidate: 3600 },
  });

  if (!res.ok) {
    throw new Error(`PriceCharting comic detail page failed: ${res.status}`);
  }

  const html = await res.text();

  const extractPrice = (id: string): number | undefined => {
    const regex = new RegExp(
      `id="${id}"[^>]*>\\s*<span[^>]*class="price[^"]*"[^>]*>([^<]*)`,
      "s"
    );
    const match = html.match(regex);
    return match ? parsePrice(match[1]) : undefined;
  };

  return {
    ungraded: extractPrice("used_price"),
    vg4: extractPrice("complete_price"),
    fine6: extractPrice("new_price"),
    vf8: extractPrice("graded_price"),
    nm92: extractPrice("box_only_price"),
    nm98: extractPrice("manual_only_price"),
  };
}

export async function searchComicsWithGradedPrices(
  query: string,
  limit = 3
): Promise<PriceChartingComic[]> {
  const searchResults = await searchComicsPriceCharting(query);
  const topResults = searchResults.slice(0, limit);

  const hasFullPrices = (comic: PriceChartingComic) =>
    comic.prices.vf8 !== undefined || comic.prices.nm98 !== undefined;

  const detailed: PriceChartingComic[] = [];
  for (const comic of topResults) {
    if (hasFullPrices(comic)) {
      detailed.push(comic);
      continue;
    }
    try {
      if (detailed.length > 0) await sleep(500);
      const prices = await getComicGradedPrices(comic.url);
      detailed.push({ ...comic, prices });
    } catch {
      detailed.push(comic);
    }
  }

  return detailed;
}

/**
 * Map a CGC/CBCS comic grade to the corresponding PriceCharting price field key.
 */
export function comicGradeToField(grade: string): keyof PriceChartingComic["prices"] {
  const g = grade.replace(/[^0-9.]/g, "");
  const num = parseFloat(g);
  if (isNaN(num)) return "ungraded";
  if (num >= 9.8) return "nm98";
  if (num >= 9.0) return "nm92";
  if (num >= 8.0) return "vf8";
  if (num >= 6.0) return "fine6";
  if (num >= 4.0) return "vg4";
  return "ungraded";
}
