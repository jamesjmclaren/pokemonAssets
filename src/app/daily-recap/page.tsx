"use client";

import { useEffect, useMemo, useState } from "react";
import Image from "next/image";
import { Clock, Info } from "lucide-react";
import { useFormatCurrency } from "@/lib/currency-context";
import { formatPercentage, fixStorageUrl, getMarketDisclaimer } from "@/lib/format";

interface SetOption {
  slug: string;
  name: string;
  series: string;
  totalCards: number;
}

interface SetCardRow {
  id: string;
  name: string;
  number: string | null;
  rarity: string | null;
  imageUrl: string | null;
  variant: string | null;
  price: number;
  previousPrice: number | null;
  absChange: number | null;
  pctChange: number | null;
  saleCount: number | null;
  source: string;
}

interface SetMoversResponse {
  setSlug: string;
  raw: SetCardRow[];
  psa10: SetCardRow[];
  fetchedAt: string;
}

// Default to the newest Mega Evolution set so the page isn't empty on first load.
const DEFAULT_SLUG = "me03-perfect-order";

export default function DailyRecapPage() {
  const formatCurrency = useFormatCurrency();
  const [sets, setSets] = useState<SetOption[]>([]);
  const [setsLoading, setSetsLoading] = useState(true);
  const [selectedSlug, setSelectedSlug] = useState<string>(DEFAULT_SLUG);
  const [block, setBlock] = useState<SetMoversResponse | null>(null);
  const [blockLoading, setBlockLoading] = useState(false);
  const [view, setView] = useState<"raw" | "psa10">("raw");
  const [query, setQuery] = useState("");

  useEffect(() => {
    async function fetchSets() {
      setSetsLoading(true);
      try {
        const res = await fetch("/api/poketrace-sets");
        if (!res.ok) throw new Error("Failed");
        const data = await res.json();
        setSets(Array.isArray(data.sets) ? data.sets : []);
      } catch (err) {
        console.error("[daily-recap] sets fetch failed:", err);
      } finally {
        setSetsLoading(false);
      }
    }
    fetchSets();
  }, []);

  useEffect(() => {
    if (!selectedSlug) return;
    let cancelled = false;
    async function fetchBlock() {
      setBlockLoading(true);
      try {
        const res = await fetch(`/api/set-movers?slug=${encodeURIComponent(selectedSlug)}`);
        if (!res.ok) throw new Error("Failed");
        const data: SetMoversResponse = await res.json();
        if (!cancelled) setBlock(data);
      } catch (err) {
        console.error("[daily-recap] block fetch failed:", err);
        if (!cancelled) setBlock(null);
      } finally {
        if (!cancelled) setBlockLoading(false);
      }
    }
    fetchBlock();
    return () => {
      cancelled = true;
    };
  }, [selectedSlug]);

  const filteredSets = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return sets;
    return sets.filter(
      (s) => s.name.toLowerCase().includes(q) || s.slug.toLowerCase().includes(q)
    );
  }, [sets, query]);

  const selectedSet = useMemo(
    () => sets.find((s) => s.slug === selectedSlug),
    [sets, selectedSlug]
  );

  const rows = view === "raw" ? block?.raw ?? [] : block?.psa10 ?? [];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl md:text-2xl font-bold text-text-primary flex items-center gap-2">
          <Clock className="w-6 h-6 text-accent" />
          Daily Movers
        </h1>
        <p className="text-text-muted text-sm mt-1">
          Browse the top Holofoil cards (NM, US market) and PSA 10 copies for any
          Poketrace set, with the latest 7-day price change.
          {block?.fetchedAt && ` Updated ${new Date(block.fetchedAt).toLocaleString()}.`}
        </p>
        <p className="text-[11px] text-text-muted mt-1 flex items-start gap-1">
          <Info className="w-3 h-3 mt-0.5 flex-shrink-0" aria-hidden />
          <span>{getMarketDisclaimer("US", "long")}</span>
        </p>
      </div>

      <div className="bg-surface border border-border rounded-2xl p-4 md:p-6 space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-[1fr_auto_auto] gap-3 items-end">
          <div>
            <label htmlFor="set-search" className="block text-[11px] text-text-muted mb-1 uppercase tracking-wider">
              Search sets
            </label>
            <input
              id="set-search"
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Filter by name or slug"
              className="w-full bg-background border border-border rounded-lg px-3 py-2 text-sm text-text-primary placeholder:text-text-muted focus:outline-none focus:border-accent"
            />
          </div>
          <div>
            <label htmlFor="set-select" className="block text-[11px] text-text-muted mb-1 uppercase tracking-wider">
              Set
            </label>
            <select
              id="set-select"
              value={selectedSlug}
              onChange={(e) => setSelectedSlug(e.target.value)}
              disabled={setsLoading}
              className="w-full md:min-w-[280px] bg-background border border-border rounded-lg px-3 py-2 text-sm text-text-primary focus:outline-none focus:border-accent disabled:opacity-50"
            >
              {setsLoading ? (
                <option value="">Loading sets…</option>
              ) : filteredSets.length === 0 ? (
                <option value="">No sets match "{query}"</option>
              ) : (
                filteredSets.map((s) => (
                  <option key={s.slug} value={s.slug}>
                    {s.name}
                    {s.totalCards ? ` (${s.totalCards})` : ""}
                  </option>
                ))
              )}
            </select>
          </div>
          <div>
            <label className="block text-[11px] text-text-muted mb-1 uppercase tracking-wider">
              Condition
            </label>
            <div className="inline-flex rounded-lg border border-border overflow-hidden text-xs">
              <button
                onClick={() => setView("raw")}
                className={`px-3 py-2 ${view === "raw" ? "bg-accent text-background" : "text-text-secondary hover:bg-surface-hover"}`}
              >
                Raw NM
              </button>
              <button
                onClick={() => setView("psa10")}
                className={`px-3 py-2 ${view === "psa10" ? "bg-accent text-background" : "text-text-secondary hover:bg-surface-hover"}`}
              >
                PSA 10
              </button>
            </div>
          </div>
        </div>

        <div className="pt-2 border-t border-border">
          <h2 className="text-base md:text-lg font-semibold text-text-primary">
            {selectedSet?.name || (setsLoading ? "Loading…" : "Select a set")}
          </h2>
          <p className="text-[11px] text-text-muted">
            Top 10 Holofoil · sorted by price (high → low) · US market
          </p>
        </div>

        {blockLoading ? (
          <div className="skeleton h-96 rounded-xl" />
        ) : rows.length === 0 ? (
          <p className="text-sm text-text-muted">
            No {view === "raw" ? "raw NM" : "PSA 10"} pricing available for this set yet.
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-text-muted text-xs uppercase tracking-wider border-b border-border">
                  <th className="py-2 pr-3 font-medium w-8">#</th>
                  <th className="py-2 pr-3 font-medium">Card</th>
                  <th className="py-2 pr-3 font-medium text-right">Price</th>
                  <th className="py-2 pr-3 font-medium text-right">7d Avg</th>
                  <th className="py-2 pr-3 font-medium text-right">Δ</th>
                  <th className="py-2 font-medium text-right">%</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((r, i) => {
                  const src = fixStorageUrl(r.imageUrl) || r.imageUrl;
                  const pct = r.pctChange;
                  const abs = r.absChange;
                  const positive = (pct ?? 0) >= 0;
                  return (
                    <tr key={r.id} className="border-b border-border/50 last:border-0">
                      <td className="py-2 pr-3 text-text-muted text-xs">{i + 1}</td>
                      <td className="py-2 pr-3">
                        <div className="flex items-center gap-3">
                          <div className="relative w-8 h-10 bg-background rounded flex-shrink-0 overflow-hidden">
                            {src && (
                              <Image
                                src={src}
                                alt={r.name}
                                fill
                                className="object-contain p-0.5"
                                sizes="32px"
                                unoptimized={src.includes("tcgplayer-cdn")}
                              />
                            )}
                          </div>
                          <div className="min-w-0">
                            <p className="text-text-primary truncate">{r.name}</p>
                            <p className="text-[10px] text-text-muted">
                              {r.number && `#${r.number}`}
                              {r.rarity && (r.number ? ` · ${r.rarity}` : r.rarity)}
                              {r.variant && ` · ${r.variant}`}
                            </p>
                          </div>
                        </div>
                      </td>
                      <td className="py-2 pr-3 text-right text-text-primary whitespace-nowrap">
                        {formatCurrency(r.price)}
                      </td>
                      <td className="py-2 pr-3 text-right text-text-secondary whitespace-nowrap">
                        {r.previousPrice != null ? formatCurrency(r.previousPrice) : "—"}
                      </td>
                      <td
                        className={`py-2 pr-3 text-right whitespace-nowrap ${
                          abs == null ? "text-text-muted" : positive ? "text-success" : "text-danger"
                        }`}
                      >
                        {abs == null ? "—" : `${positive ? "+" : ""}${formatCurrency(abs)}`}
                      </td>
                      <td
                        className={`py-2 text-right font-semibold whitespace-nowrap ${
                          pct == null ? "text-text-muted" : positive ? "text-success" : "text-danger"
                        }`}
                      >
                        {pct == null ? "—" : formatPercentage(pct)}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
