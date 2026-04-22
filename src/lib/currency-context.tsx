"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import { useUser } from "@clerk/nextjs";
import { formatCurrencyIn } from "./format";

export type DisplayCurrency = "USD" | "GBP" | "EUR";

export const SUPPORTED_CURRENCIES: DisplayCurrency[] = ["USD", "GBP", "EUR"];

const STORAGE_KEY = "displayCurrency";

const FALLBACK_RATES: Record<DisplayCurrency, number> = {
  USD: 1,
  GBP: 0.787,
  EUR: 0.925,
};

interface CurrencyState {
  currency: DisplayCurrency;
  rates: Record<DisplayCurrency, number>;
  setCurrency: (c: DisplayCurrency) => void;
  format: (usdValue: number | null | undefined) => string;
  rateFetchedAt: string | null;
}

const CurrencyContext = createContext<CurrencyState | null>(null);

function isDisplayCurrency(v: unknown): v is DisplayCurrency {
  return v === "USD" || v === "GBP" || v === "EUR";
}

export function CurrencyProvider({ children }: { children: React.ReactNode }) {
  const { user, isSignedIn } = useUser();
  const [currency, setCurrencyState] = useState<DisplayCurrency>("USD");
  const [rates, setRates] = useState<Record<DisplayCurrency, number>>(FALLBACK_RATES);
  const [rateFetchedAt, setRateFetchedAt] = useState<string | null>(null);

  // Initial hydration: prefer localStorage → Clerk publicMetadata → default USD.
  useEffect(() => {
    if (typeof window === "undefined") return;
    const stored = window.localStorage.getItem(STORAGE_KEY);
    if (isDisplayCurrency(stored)) {
      setCurrencyState(stored);
      return;
    }
    const clerkPref = user?.unsafeMetadata?.displayCurrency;
    if (isDisplayCurrency(clerkPref)) {
      setCurrencyState(clerkPref);
      window.localStorage.setItem(STORAGE_KEY, clerkPref);
    }
  }, [user?.unsafeMetadata?.displayCurrency]);

  // Fetch rates once per session.
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch("/api/exchange-rates");
        if (!res.ok) return;
        const data = await res.json();
        const r = data?.rates || {};
        if (cancelled) return;
        setRates({
          USD: 1,
          GBP: typeof r.GBP === "number" ? r.GBP : FALLBACK_RATES.GBP,
          EUR: typeof r.EUR === "number" ? r.EUR : FALLBACK_RATES.EUR,
        });
        setRateFetchedAt(typeof data?.fetchedAt === "string" ? data.fetchedAt : null);
      } catch {
        // keep fallback rates
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const setCurrency = useCallback(
    (c: DisplayCurrency) => {
      setCurrencyState(c);
      if (typeof window !== "undefined") {
        window.localStorage.setItem(STORAGE_KEY, c);
      }
      if (isSignedIn && user) {
        // best-effort sync; ignore failures
        user
          .update({ unsafeMetadata: { ...(user.unsafeMetadata || {}), displayCurrency: c } })
          .catch(() => {});
      }
    },
    [isSignedIn, user]
  );

  const format = useCallback(
    (usdValue: number | null | undefined) => {
      return formatCurrencyIn(usdValue, currency, rates[currency] ?? 1);
    },
    [currency, rates]
  );

  const value = useMemo(
    () => ({ currency, rates, setCurrency, format, rateFetchedAt }),
    [currency, rates, setCurrency, format, rateFetchedAt]
  );

  return <CurrencyContext.Provider value={value}>{children}</CurrencyContext.Provider>;
}

export function useCurrency(): CurrencyState {
  const ctx = useContext(CurrencyContext);
  if (!ctx) {
    // Safe fallback — render USD if a caller is outside the provider.
    return {
      currency: "USD",
      rates: FALLBACK_RATES,
      setCurrency: () => {},
      format: (usd) => formatCurrencyIn(usd, "USD", 1),
      rateFetchedAt: null,
    };
  }
  return ctx;
}

/**
 * Convenience hook for rendering prices. Returns a format function that
 * takes a USD value and returns the localised display string (plus ~GBP/~EUR).
 */
export function useFormatCurrency() {
  return useCurrency().format;
}
