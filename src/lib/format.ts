export function formatCurrency(value: number | null | undefined): string {
  if (value == null) return "N/A";
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value);
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
 * Extract a market price from an API card object.
 * Checks multiple field name conventions since the API response format varies.
 */
export function extractCardPrice(card: Record<string, unknown>): number | null {
  const prices = card.prices as Record<string, unknown> | undefined;

  // Direct prices.market / prices.low (pokemonpricetracker.com format)
  if (prices) {
    const direct =
      (prices.market as number) ?? (prices.low as number) ?? null;
    if (direct != null) return direct;

    // Nested under tcgplayer/cardmarket/ebay
    const tcg = prices.tcgplayer as Record<string, unknown> | undefined;
    const cm = prices.cardmarket as Record<string, unknown> | undefined;
    const ebay = prices.ebay as Record<string, unknown> | undefined;
    const nested =
      (tcg?.market as number) ??
      (tcg?.low as number) ??
      (cm?.average as number) ??
      (cm?.trend as number) ??
      (ebay?.average as number) ??
      null;
    if (nested != null) return nested;
  }

  // Flat price fields on the card object itself
  const flat =
    (card.tcgplayerPrice as number) ??
    (card.marketPrice as number) ??
    (card.price as number) ??
    (card.latestPrice as number) ??
    (card.value as number) ??
    (card.averagePrice as number) ??
    null;
  if (flat != null) return flat;

  // Fall back to most recent price history entry
  const history = (card.priceHistory || card.price_history) as
    | Record<string, number>
    | Array<{ date: string; price: number }>
    | undefined;
  if (history) {
    if (Array.isArray(history) && history.length > 0) {
      const sorted = [...history].sort((a, b) => b.date.localeCompare(a.date));
      return sorted[0].price ?? null;
    }
    if (typeof history === "object" && !Array.isArray(history)) {
      const entries = Object.entries(history);
      if (entries.length > 0) {
        const sorted = entries.sort((a, b) => b[0].localeCompare(a[0]));
        const val = Number(sorted[0][1]);
        return isNaN(val) ? null : val;
      }
    }
  }

  return null;
}
