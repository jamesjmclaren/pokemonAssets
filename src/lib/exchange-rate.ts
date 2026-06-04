/**
 * Exchange rate service for EUR → USD conversion.
 *
 * Fetches daily rates from a free API and caches in memory with a 24h TTL.
 * Falls back to a hardcoded rate if the API is unreachable.
 */

const FALLBACK_EUR_USD_RATE = 1.08; // Last updated: April 2026
const FALLBACK_GBP_USD_RATE = 1.27; // Last updated: April 2026
const CACHE_TTL_MS = 24 * 60 * 60 * 1000; // 24 hours

// Rates are expressed relative to a USD base (USD → X).
const FALLBACK_USD_RATES: Record<string, number> = {
  USD: 1,
  EUR: 1 / FALLBACK_EUR_USD_RATE,
  GBP: 1 / FALLBACK_GBP_USD_RATE,
};

interface CachedRates {
  rates: Record<string, number>;
  fetchedAt: number;
}

let rateCache: CachedRates | null = null;

/**
 * Fetch exchange rates from the free API.
 * Uses open.er-api.com which requires no API key.
 */
async function fetchRates(): Promise<Record<string, number>> {
  // Return cached rates if still fresh
  if (rateCache && Date.now() - rateCache.fetchedAt < CACHE_TTL_MS) {
    return rateCache.rates;
  }

  try {
    const res = await fetch("https://open.er-api.com/v6/latest/USD", {
      next: { revalidate: 86400 }, // Cache for 24h in Next.js
    });

    if (!res.ok) {
      throw new Error(`Exchange rate API returned ${res.status}`);
    }

    const data = await res.json();
    const rates = data.rates as Record<string, number>;

    if (!rates || typeof rates.EUR !== "number") {
      throw new Error("Invalid exchange rate response format");
    }

    rateCache = { rates, fetchedAt: Date.now() };
    return rates;
  } catch (error) {
    console.warn(
      "[exchange-rate] Failed to fetch rates, using fallback:",
      error instanceof Error ? error.message : error
    );

    // Return fallback rates
    return { ...FALLBACK_USD_RATES };
  }
}

/**
 * Return USD-based rates for a fixed subset of currencies used by the UI.
 * e.g. { USD: 1, GBP: 0.787..., EUR: 0.925... }.
 */
export async function getDisplayRates(): Promise<Record<string, number>> {
  const rates = await fetchRates();
  const pick = (code: string) =>
    typeof rates[code] === "number" ? rates[code] : FALLBACK_USD_RATES[code] ?? 1;
  return {
    USD: 1,
    EUR: pick("EUR"),
    GBP: pick("GBP"),
  };
}

/**
 * Convert a USD amount into the target currency using today's cached rate.
 */
export async function convertFromUsd(
  amount: number,
  toCurrency: string
): Promise<{ value: number; rate: number }> {
  if (toCurrency === "USD") return { value: amount, rate: 1 };
  const rate = await getExchangeRate("USD", toCurrency);
  return { value: Math.round(amount * rate * 100) / 100, rate };
}

/**
 * Get the exchange rate between two currencies.
 * Rates are relative to USD (base currency).
 */
export async function getExchangeRate(
  from: string,
  to: string
): Promise<number> {
  if (from === to) return 1;

  const rates = await fetchRates();

  if (to === "USD") {
    // rates are USD-based, so rates.EUR = how many EUR per 1 USD
    // To convert EUR → USD: amount / rates.EUR
    const fromRate = rates[from];
    if (!fromRate) {
      console.warn(`[exchange-rate] Unknown currency: ${from}, using fallback`);
      return from === "EUR" ? FALLBACK_EUR_USD_RATE : 1;
    }
    return 1 / fromRate;
  }

  if (from === "USD") {
    const toRate = rates[to];
    if (!toRate) {
      console.warn(`[exchange-rate] Unknown currency: ${to}, using fallback`);
      return 1;
    }
    return toRate;
  }

  // Cross rate via USD
  const fromRate = rates[from];
  const toRate = rates[to];
  if (!fromRate || !toRate) {
    console.warn(`[exchange-rate] Unknown currency pair: ${from}/${to}`);
    return 1;
  }
  return toRate / fromRate;
}

/**
 * Convert an amount to USD from a given currency.
 * Returns the converted amount, the rate used, and whether a conversion occurred.
 */
export async function convertToUsd(
  amount: number,
  fromCurrency: string
): Promise<{ usd: number; rate: number; converted: boolean }> {
  if (fromCurrency === "USD") {
    return { usd: amount, rate: 1, converted: false };
  }

  const rate = await getExchangeRate(fromCurrency, "USD");
  const usd = Math.round(amount * rate * 100) / 100; // Round to 2 decimal places

  return { usd, rate, converted: true };
}
