"use client";

import { useState, useEffect } from "react";
import { X, Bell, Loader2, CheckCircle2 } from "lucide-react";
import { formatCurrency } from "@/lib/format";
import type { CreatePriceAlertPayload } from "@/types";

const PSA_GRADES = [
  { value: "NEAR_MINT", label: "Near Mint (Raw)" },
  { value: "LIGHTLY_PLAYED", label: "Lightly Played (Raw)" },
  { value: "MODERATELY_PLAYED", label: "Moderately Played (Raw)" },
  { value: "HEAVILY_PLAYED", label: "Heavily Played (Raw)" },
  { value: "DAMAGED", label: "Damaged (Raw)" },
  { value: "PSA 10", label: "PSA 10 — Gem Mint" },
  { value: "PSA 9", label: "PSA 9 — Mint" },
  { value: "PSA 8", label: "PSA 8 — NM-MT" },
  { value: "PSA 7", label: "PSA 7 — Near Mint" },
  { value: "CGC 10", label: "CGC 10 — Pristine" },
  { value: "CGC 9.5", label: "CGC 9.5 — Gem Mint" },
  { value: "CGC 9", label: "CGC 9 — Mint" },
  { value: "BGS 10", label: "BGS 10 — Pristine" },
  { value: "BGS 9.5", label: "BGS 9.5 — Gem Mint" },
  { value: "BGS 9", label: "BGS 9 — Mint" },
];

// Convert display grade label to Poketrace tier key
function gradeToTierKey(grade: string): string {
  if (grade.startsWith("PSA ") || grade.startsWith("CGC ") || grade.startsWith("BGS ")) {
    const prefix = grade.split(" ")[0];
    const num = grade.split(" ")[1];
    return `${prefix}_${num}`;
  }
  return grade; // already a tier key (NEAR_MINT etc.)
}

export interface TrackCardModalProps {
  card: {
    poketraceId: string;
    name: string;
    setName: string;
    imageUrl?: string;
  };
  onClose: () => void;
  onSuccess: () => void;
}

type PriceSource = "tcgplayer" | "ebay" | "cardmarket";

export default function TrackCardModal({ card, onClose, onSuccess }: TrackCardModalProps) {
  const [conditionTier, setConditionTier] = useState("NEAR_MINT");
  const [market, setMarket] = useState<"US" | "EU">("US");
  const [sources, setSources] = useState<Set<PriceSource>>(new Set(["tcgplayer", "ebay"]));
  const [alertDigest, setAlertDigest] = useState(true);
  const [lowPrice, setLowPrice] = useState("");
  const [highPrice, setHighPrice] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Current prices preview
  const [prices, setPrices] = useState<Partial<Record<PriceSource, number>>>({});
  const [pricesLoading, setPricesLoading] = useState(false);

  useEffect(() => {
    if (!card.poketraceId) return;
    setPricesLoading(true);
    const tierKey = gradeToTierKey(conditionTier);
    const isGraded = conditionTier.startsWith("PSA ") || conditionTier.startsWith("CGC ") || conditionTier.startsWith("BGS ");
    const url = `/api/card-price?poketraceId=${encodeURIComponent(card.poketraceId)}${isGraded ? `&grade=${encodeURIComponent(conditionTier)}` : ""}`;
    fetch(url)
      .then((r) => r.json())
      .then((data) => {
        const breakdown = (data.breakdown || {}) as Partial<Record<PriceSource, number>>;
        setPrices(breakdown);
      })
      .catch(() => setPrices({}))
      .finally(() => setPricesLoading(false));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [card.poketraceId, conditionTier]);

  // When switching to US, uncheck CardMarket
  const handleMarketChange = (m: "US" | "EU") => {
    setMarket(m);
    if (m === "US") {
      setSources((prev) => {
        const next = new Set(prev);
        next.delete("cardmarket");
        return next;
      });
    }
  };

  const toggleSource = (src: PriceSource) => {
    setSources((prev) => {
      const next = new Set(prev);
      if (next.has(src)) {
        next.delete(src);
      } else {
        next.add(src);
      }
      return next;
    });
  };

  const canSubmit =
    sources.size > 0 &&
    (alertDigest || lowPrice !== "" || highPrice !== "") &&
    !submitting;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!canSubmit) return;
    setError(null);
    setSubmitting(true);

    const tierKey = gradeToTierKey(conditionTier);

    const payload: CreatePriceAlertPayload = {
      poketrace_id: card.poketraceId,
      card_name: card.name,
      set_name: card.setName,
      image_url: card.imageUrl || null,
      condition_tier: tierKey,
      track_tcgplayer: sources.has("tcgplayer"),
      track_ebay: sources.has("ebay"),
      track_cardmarket: sources.has("cardmarket"),
      market,
      currency: "USD",
      alert_daily_digest: alertDigest,
      target_low_price: lowPrice ? parseFloat(lowPrice) : null,
      target_high_price: highPrice ? parseFloat(highPrice) : null,
    };

    try {
      const res = await fetch("/api/price-alerts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Failed to create alert");
        return;
      }
      setSuccess(true);
      setTimeout(() => onSuccess(), 1200);
    } catch {
      setError("Failed to create alert. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  const sourceOptions: { key: PriceSource; label: string; euOnly?: boolean }[] = [
    { key: "tcgplayer", label: "TCGPlayer" },
    { key: "ebay", label: "eBay" },
    { key: "cardmarket", label: "CardMarket", euOnly: true },
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="relative bg-surface border border-border rounded-2xl w-full max-w-md shadow-2xl max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-border sticky top-0 bg-surface rounded-t-2xl z-10">
          <div className="flex items-center gap-2">
            <Bell className="w-5 h-5 text-accent" />
            <h2 className="text-base font-bold text-text-primary">Track Card</h2>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-text-muted hover:text-text-primary hover:bg-surface-hover rounded-lg transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {success ? (
          <div className="p-8 flex flex-col items-center gap-3 text-center">
            <CheckCircle2 className="w-12 h-12 text-success" />
            <p className="font-semibold text-text-primary">Tracking started!</p>
            <p className="text-sm text-text-muted">
              You&apos;ll receive alerts for <strong>{card.name}</strong>.
            </p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="p-5 space-y-5">
            {/* Card info */}
            <div className="flex items-center gap-3 p-3 bg-surface-hover rounded-xl">
              {card.imageUrl && (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={card.imageUrl}
                  alt={card.name}
                  className="w-10 h-14 object-contain rounded"
                />
              )}
              <div className="min-w-0">
                <p className="text-sm font-semibold text-text-primary truncate">{card.name}</p>
                <p className="text-xs text-text-muted truncate">{card.setName}</p>
              </div>
            </div>

            {/* Condition / Grade */}
            <div>
              <label className="block text-sm font-medium text-text-secondary mb-2">
                Condition / Grade
              </label>
              <select
                value={conditionTier}
                onChange={(e) => setConditionTier(e.target.value)}
                className="w-full px-4 py-3 bg-surface border border-border rounded-xl text-text-primary outline-none focus:border-accent text-sm"
              >
                {PSA_GRADES.map((g) => (
                  <option key={g.value} value={g.value}>
                    {g.label}
                  </option>
                ))}
              </select>
            </div>

            {/* Market */}
            <div>
              <label className="block text-sm font-medium text-text-secondary mb-2">
                Market
              </label>
              <div className="grid grid-cols-2 gap-2">
                {(["US", "EU"] as const).map((m) => (
                  <button
                    key={m}
                    type="button"
                    onClick={() => handleMarketChange(m)}
                    className={`py-2.5 rounded-xl border text-sm font-medium transition-colors ${
                      market === m
                        ? "bg-accent-muted border-accent text-accent-hover"
                        : "bg-surface border-border text-text-secondary hover:border-border-hover"
                    }`}
                  >
                    {m === "US" ? "🇺🇸 US (TCGPlayer / eBay)" : "🇪🇺 EU (CardMarket / eBay)"}
                  </button>
                ))}
              </div>
            </div>

            {/* Price Sources */}
            <div>
              <label className="block text-sm font-medium text-text-secondary mb-2">
                Price Sources <span className="text-danger">*</span>
              </label>
              <p className="text-xs text-text-muted mb-2">Select all sources you want to track.</p>
              <div className="grid grid-cols-3 gap-2">
                {sourceOptions.map(({ key, label, euOnly }) => {
                  const disabled = euOnly && market === "US";
                  const selected = sources.has(key) && !disabled;
                  const price = prices[key];
                  return (
                    <button
                      key={key}
                      type="button"
                      disabled={disabled}
                      onClick={() => !disabled && toggleSource(key)}
                      className={`px-3 py-2.5 rounded-xl border text-left transition-colors ${
                        disabled
                          ? "bg-surface border-border text-text-muted opacity-40 cursor-not-allowed"
                          : selected
                            ? "bg-accent-muted border-accent text-accent-hover"
                            : "bg-surface border-border text-text-secondary hover:border-border-hover"
                      }`}
                    >
                      <div className="text-xs font-semibold">{label}</div>
                      <div className="text-xs mt-0.5">
                        {pricesLoading ? (
                          <span className="text-text-muted">…</span>
                        ) : price != null ? (
                          <span>{formatCurrency(price)}</span>
                        ) : (
                          <span className="text-text-muted">N/A</span>
                        )}
                      </div>
                    </button>
                  );
                })}
              </div>
              {sources.size === 0 && (
                <p className="mt-1.5 text-xs text-danger">Select at least one source.</p>
              )}
            </div>

            {/* Alert Types */}
            <div className="space-y-3">
              <label className="block text-sm font-medium text-text-secondary">
                Alert Settings <span className="text-danger">*</span>
              </label>

              {/* Daily Digest */}
              <label className="flex items-center gap-3 cursor-pointer p-3 bg-surface-hover rounded-xl hover:bg-surface-hover/80 transition-colors">
                <input
                  type="checkbox"
                  checked={alertDigest}
                  onChange={(e) => setAlertDigest(e.target.checked)}
                  className="w-4 h-4 accent-accent rounded"
                />
                <div>
                  <p className="text-sm font-medium text-text-primary">Daily digest</p>
                  <p className="text-xs text-text-muted">One email per day with this card&apos;s current prices.</p>
                </div>
              </label>

              {/* Low Price */}
              <div className="p-3 bg-surface-hover rounded-xl">
                <p className="text-sm font-medium text-text-primary mb-1.5">Alert when price drops below</p>
                <p className="text-xs text-text-muted mb-2">Fires once per 24h when any selected source hits this.</p>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted text-sm">$</span>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    value={lowPrice}
                    onChange={(e) => setLowPrice(e.target.value)}
                    placeholder="e.g. 45.00"
                    className="w-full pl-7 pr-4 py-2.5 bg-surface border border-border rounded-lg text-text-primary placeholder-text-muted outline-none focus:border-accent text-sm"
                  />
                </div>
              </div>

              {/* High Price */}
              <div className="p-3 bg-surface-hover rounded-xl">
                <p className="text-sm font-medium text-text-primary mb-1.5">Alert when price rises above</p>
                <p className="text-xs text-text-muted mb-2">Fires once per 24h when any selected source hits this.</p>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted text-sm">$</span>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    value={highPrice}
                    onChange={(e) => setHighPrice(e.target.value)}
                    placeholder="e.g. 120.00"
                    className="w-full pl-7 pr-4 py-2.5 bg-surface border border-border rounded-lg text-text-primary placeholder-text-muted outline-none focus:border-accent text-sm"
                  />
                </div>
              </div>

              {!alertDigest && lowPrice === "" && highPrice === "" && (
                <p className="text-xs text-danger">Enable at least one alert type.</p>
              )}
            </div>

            {error && (
              <p className="text-sm text-danger bg-danger/10 border border-danger/30 rounded-xl px-4 py-3">
                {error}
              </p>
            )}

            <button
              type="submit"
              disabled={!canSubmit}
              className="w-full py-3 bg-accent hover:bg-accent-hover disabled:opacity-50 disabled:cursor-not-allowed text-black font-semibold rounded-xl flex items-center justify-center gap-2 transition-colors"
            >
              {submitting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Saving…
                </>
              ) : (
                <>
                  <Bell className="w-4 h-4" />
                  Start Tracking
                </>
              )}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
