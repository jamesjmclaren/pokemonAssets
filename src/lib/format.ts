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
 * Handles JustTCG normalized format (prices.tcgplayer.market / marketPrice)
 * as well as raw variant arrays.
 */
export function extractCardPrice(card: Record<string, unknown>): number | null {
  // Flat price field set by normalizeCard (JustTCG)
  if (typeof card.marketPrice === "number") return card.marketPrice;

  // Nested prices object (normalized format)
  const prices = card.prices as Record<string, unknown> | undefined;
  if (prices) {
    const direct =
      (prices.market as number) ?? (prices.low as number) ?? null;
    if (direct != null) return direct;

    const tcg = prices.tcgplayer as Record<string, unknown> | undefined;
    const nested = (tcg?.market as number) ?? (tcg?.low as number) ?? null;
    if (nested != null) return nested;
  }

  // JustTCG raw variant array (pick best Near Mint variant)
  const variants = card._variants as
    | Array<{ condition: string; printing: string; price: number }>
    | undefined;
  if (variants && variants.length > 0) {
    const nm = variants.find(
      (v) =>
        v.condition?.toLowerCase().includes("near mint") && v.price != null
    );
    if (nm) return nm.price;
    const withPrice = variants.find((v) => v.price != null);
    if (withPrice) return withPrice.price;
  }

  // Other flat fields
  const flat =
    (card.price as number) ??
    (card.latestPrice as number) ??
    null;
  if (flat != null) return flat;

  return null;
}
