export function formatCurrency(value: number | null | undefined): string {
  if (value == null) return "N/A";
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value);
}

const CURRENCY_LOCALE: Record<string, string> = {
  USD: "en-US",
  GBP: "en-GB",
  EUR: "en-IE",
};

/**
 * Format a USD value in the chosen display currency using today's rate.
 * The raw value is always treated as USD; pass rate=1 for USD itself.
 * When the display currency is not USD, appends "~GBP" / "~EUR" to signal
 * the figure is a converted estimate, not a native market price.
 */
export function formatCurrencyIn(
  usdValue: number | null | undefined,
  currency: string,
  rate: number
): string {
  if (usdValue == null) return "N/A";
  const locale = CURRENCY_LOCALE[currency] || "en-US";
  const converted = usdValue * rate;
  const formatted = new Intl.NumberFormat(locale, {
    style: "currency",
    currency,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(converted);
  return currency === "USD" ? formatted : `${formatted} ~${currency}`;
}

export function formatPercentage(value: number | null | undefined): string {
  if (value == null) return "N/A";
  const sign = value >= 0 ? "+" : "";
  return `${sign}${value.toFixed(2)}%`;
}

export function formatDate(dateString: string): string {
  return new Date(dateString).toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

export function formatDateShort(dateString: string): string {
  return new Date(dateString).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
  });
}

export function getProfitColor(profit: number): string {
  if (profit > 0) return "text-success";
  if (profit < 0) return "text-danger";
  return "text-text-secondary";
}

export function getProfitBgColor(profit: number): string {
  if (profit > 0) return "bg-success-muted";
  if (profit < 0) return "bg-danger-muted";
  return "bg-surface";
}

/**
 * Fix Supabase storage URLs that are missing the /public/ segment.
 * e.g. /storage/v1/object/asset-images/... → /storage/v1/object/public/asset-images/...
 */
export function fixStorageUrl(url: string | null | undefined): string | null {
  if (!url) return null;
  if (url.includes("/storage/v1/object/") && !url.includes("/storage/v1/object/public/")) {
    return url.replace("/storage/v1/object/", "/storage/v1/object/public/");
  }
  return url;
}

/**
 * Extract a market price from a card object.
 * Handles Poketrace, JustTCG, and legacy API formats.
 */
export function extractCardPrice(card: Record<string, unknown>): number | null {
  // Flat price field (Poketrace normalized and JustTCG normalized)
  if (typeof card.marketPrice === "number") return card.marketPrice;

  // Nested prices object
  const prices = card.prices as Record<string, unknown> | undefined;
  if (prices) {
    // Poketrace format: prices.tcgplayer.NEAR_MINT.avg
    const tcgp = prices.tcgplayer as Record<string, unknown> | undefined;
    if (tcgp) {
      const nm = tcgp["NEAR_MINT"] as Record<string, unknown> | undefined;
      if (nm && typeof nm.avg === "number") return nm.avg;
      // Try first tier
      const firstKey = Object.keys(tcgp)[0];
      if (firstKey) {
        const tier = tcgp[firstKey] as Record<string, unknown> | undefined;
        if (tier && typeof tier.avg === "number") return tier.avg;
        // Legacy nested format: prices.tcgplayer.market
        if (typeof tcgp.market === "number") return tcgp.market;
        if (typeof tcgp.low === "number") return tcgp.low;
      }
    }

    // Poketrace format: prices.ebay.NEAR_MINT.avg
    const ebay = prices.ebay as Record<string, unknown> | undefined;
    if (ebay) {
      const nm = ebay["NEAR_MINT"] as Record<string, unknown> | undefined;
      if (nm && typeof nm.avg === "number") return nm.avg;
    }

    // Legacy flat prices format
    const raw = prices.raw as number | undefined;
    if (raw != null) return raw;

    const market = prices.market as number | undefined;
    if (market != null) return market;

    const direct =
      (prices.market as number) ?? (prices.low as number) ?? null;
    if (direct != null) return direct;
  }

  // Other flat fields
  const flat =
    (card.price as number) ??
    (card.latestPrice as number) ??
    null;
  if (flat != null) return flat;

  return null;
}

/**
 * Format a currency value with a conversion indicator.
 * Shows "~USD" suffix when the price was converted from a foreign currency.
 */
export function formatCurrencyWithNote(
  value: number | null | undefined,
  isConverted?: boolean
): string {
  if (value == null) return "N/A";
  const formatted = formatCurrency(value);
  if (isConverted) return `${formatted} ~USD`;
  return formatted;
}

/**
 * Return a disclaimer string describing which market a Poketrace price comes from.
 * Used to make the US-vs-EU provenance explicit wherever prices render.
 */
export function getMarketDisclaimer(
  market?: string | null,
  variant: "short" | "long" = "short"
): string {
  const isEu = (market || "").toUpperCase() === "EU";
  if (isEu) {
    return variant === "long"
      ? "Based on European market pricing (CardMarket, EUR; converted to USD)."
      : "European market (CardMarket)";
  }
  return variant === "long"
    ? "Based on US market pricing (TCGPlayer + eBay data, USD)."
    : "US market (TCGPlayer + eBay)";
}
