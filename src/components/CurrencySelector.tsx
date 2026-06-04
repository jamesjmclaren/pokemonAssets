"use client";

import { Info } from "lucide-react";
import { useCurrency, SUPPORTED_CURRENCIES, type DisplayCurrency } from "@/lib/currency-context";

const LABELS: Record<DisplayCurrency, string> = {
  USD: "USD $",
  GBP: "GBP £",
  EUR: "EUR €",
};

export default function CurrencySelector() {
  const { currency, setCurrency } = useCurrency();

  return (
    <div className="border border-border rounded-xl p-3 bg-surface/60">
      <p className="text-[10px] font-semibold uppercase tracking-wider text-text-muted mb-2">
        Display currency
      </p>
      <div className="grid grid-cols-3 gap-1.5">
        {SUPPORTED_CURRENCIES.map((c) => {
          const active = c === currency;
          return (
            <button
              key={c}
              type="button"
              onClick={() => setCurrency(c)}
              className={`px-2 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
                active
                  ? "bg-accent text-black"
                  : "bg-surface border border-border text-text-secondary hover:text-text-primary hover:border-border-hover"
              }`}
            >
              {LABELS[c]}
            </button>
          );
        })}
      </div>
      <p className="mt-2 flex items-start gap-1 text-[10px] text-text-muted leading-snug">
        <Info className="w-3 h-3 mt-0.5 flex-shrink-0" aria-hidden />
        <span>
          Prices are US market prices converted at today&apos;s FX rate. Not a
          reflection of UK or EU market prices.
        </span>
      </p>
    </div>
  );
}
