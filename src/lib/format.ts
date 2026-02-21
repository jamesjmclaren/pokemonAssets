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
 * Extract a market price from a card object.
 * Handles multiple API formats including Pokemon TCG API (RapidAPI).
 */
export function extractCardPrice(card: Record<string, unknown>): number | null {
  // Flat price field
  if (typeof card.marketPrice === "number") return card.marketPrice;

  // Nested prices object (Pokemon TCG API format)
  const prices = card.prices as Record<string, unknown> | undefined;
  if (prices) {
    // New format: prices.raw or prices.market
    const raw = prices.raw as number | undefined;
    if (raw != null) return raw;
    
    const market = prices.market as number | undefined;
    if (market != null) return market;

    // Legacy format
    const direct =
      (prices.market as number) ?? (prices.low as number) ?? null;
    if (direct != null) return direct;

    const tcg = prices.tcgplayer as Record<string, unknown> | undefined;
    const nested = (tcg?.market as number) ?? (tcg?.low as number) ?? null;
    if (nested != null) return nested;
  }

  // Other flat fields
  const flat =
    (card.price as number) ??
    (card.latestPrice as number) ??
    null;
  if (flat != null) return flat;

  return null;
}
