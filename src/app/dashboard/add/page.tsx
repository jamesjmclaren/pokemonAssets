"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import Image from "next/image";
import {
  Search,
  X,
  Loader2,
  Plus,
  BookmarkX,
  TrendingUp,
  TrendingDown,
  Minus,
  ChevronLeft,
  ArrowUpRight,
} from "lucide-react";
import { clsx } from "clsx";
import PriceChart from "@/components/PriceChart";
import AddAssetForm, { type SelectedCard } from "@/components/AddAssetForm";

// ---------------------------------------------------------------------------
// Types matching /api/card-detail response
// ---------------------------------------------------------------------------

interface TierSummary {
  tier: string;
  label: string;
  source: string;
  avg: number;
  low?: number;
  high?: number;
  saleCount?: number;
  avg1d?: number | null;
  avg7d?: number | null;
  avg30d?: number | null;
}

interface CardDetail {
  id: string;
  name: string;
  setName: string;
  cardNumber: string | null;
  rarity: string | null;
  image: string | null;
  type: "card" | "sealed";
  currency: string;
  isConverted: boolean;
  rawPrices: Record<string, TierSummary>;
  gradedPrices: TierSummary[];
}

interface SearchResult {
  id: string;
  name: string;
  setName: string;
  number?: string;
  rarity?: string;
  imageUrl?: string;
  type: "card" | "sealed";
  marketPrice: number | null;
  prices?: {
    raw?: number;
    market?: number;
    psa10?: number;
    psa9?: number;
  };
  poketraceId: string;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function priceDelta(current: number | null | undefined, previous: number | null | undefined): number | null {
  if (current == null || previous == null || previous === 0) return null;
  return ((current - previous) / previous) * 100;
}

function DeltaBadge({ delta }: { delta: number | null }) {
  if (delta == null) return null;
  const abs = Math.abs(delta).toFixed(1);
  if (delta > 0.5) return <span className="text-xs text-green-400 flex items-center gap-0.5"><TrendingUp className="w-3 h-3" />+{abs}%</span>;
  if (delta < -0.5) return <span className="text-xs text-red-400 flex items-center gap-0.5"><TrendingDown className="w-3 h-3" />-{abs}%</span>;
  return <span className="text-xs text-text-muted flex items-center gap-0.5"><Minus className="w-3 h-3" />{abs}%</span>;
}

// ---------------------------------------------------------------------------
// Sub-components
// ---------------------------------------------------------------------------

function SearchDropdown({
  results,
  loading,
  onSelect,
}: {
  results: SearchResult[];
  loading: boolean;
  onSelect: (r: SearchResult) => void;
}) {
  if (loading) {
    return (
      <div className="absolute top-full left-0 right-0 mt-1 bg-surface border border-border rounded-xl shadow-lg z-30 p-4 flex items-center justify-center">
        <Loader2 className="w-5 h-5 animate-spin text-text-muted" />
      </div>
    );
  }
  if (results.length === 0) return null;

  return (
    <div className="absolute top-full left-0 right-0 mt-1 bg-surface border border-border rounded-xl shadow-lg z-30 overflow-hidden max-h-96 overflow-y-auto">
      {results.map((r) => (
        <button
          key={r.id}
          onClick={() => onSelect(r)}
          className="w-full flex items-center gap-3 px-4 py-3 hover:bg-surface-hover transition-colors text-left border-b border-border last:border-0"
        >
          <div className="relative w-10 h-12 flex-shrink-0 bg-background rounded overflow-hidden">
            {r.imageUrl ? (
              <Image src={r.imageUrl} alt={r.name} fill className="object-contain" />
            ) : (
              <div className="absolute inset-0 bg-surface-hover" />
            )}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-text-primary truncate">{r.name}</p>
            <p className="text-xs text-text-muted truncate">
              {r.setName}
              {r.number ? ` · #${r.number}` : ""}
              {r.rarity ? ` · ${r.rarity}` : ""}
            </p>
          </div>
          <div className="text-right flex-shrink-0">
            <span className={clsx(
              "text-xs px-1.5 py-0.5 rounded-full font-medium",
              r.type === "card" ? "bg-blue-500/15 text-blue-400" : "bg-purple-500/15 text-purple-400"
            )}>
              {r.type}
            </span>
            {r.marketPrice != null && (
              <p className="text-xs font-semibold text-text-primary mt-0.5">${r.marketPrice.toFixed(2)}</p>
            )}
          </div>
        </button>
      ))}
    </div>
  );
}

function RawPriceCard({ label, data }: { label: string; data?: TierSummary }) {
  if (!data) {
    return (
      <div className="bg-surface-hover border border-border rounded-xl p-4 opacity-40">
        <p className="text-xs text-text-muted mb-1">{label}</p>
        <p className="text-lg font-bold text-text-muted">—</p>
      </div>
    );
  }
  const delta7d = priceDelta(data.avg, data.avg7d);
  return (
    <div className="bg-surface border border-border rounded-xl p-4">
      <p className="text-xs text-text-muted mb-1">{label}</p>
      <p className="text-xl font-bold text-text-primary">${data.avg.toFixed(2)}</p>
      <div className="mt-1 flex items-center justify-between">
        <p className="text-xs text-text-muted">
          {data.low != null && data.high != null ? `$${data.low.toFixed(2)} – $${data.high.toFixed(2)}` : ""}
        </p>
        <DeltaBadge delta={delta7d} />
      </div>
      {data.saleCount != null && (
        <p className="text-xs text-text-muted mt-1">~{data.saleCount} sales</p>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Main page
// ---------------------------------------------------------------------------

export default function SearchAssetPage() {
  const [query, setQuery] = useState("");
  const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
  const [searchLoading, setSearchLoading] = useState(false);
  const [selectedResult, setSelectedResult] = useState<SearchResult | null>(null);
  const [cardDetail, setCardDetail] = useState<CardDetail | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [showAddForm, setShowAddForm] = useState(false);
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Debounced search
  const doSearch = useCallback(async (q: string) => {
    if (q.length < 2) { setSearchResults([]); setDropdownOpen(false); return; }
    setSearchLoading(true);
    setDropdownOpen(true);
    try {
      const res = await fetch(`/api/search?q=${encodeURIComponent(q)}&type=all`);
      const data = res.ok ? await res.json() : [];
      setSearchResults(data);
    } catch {
      setSearchResults([]);
    }
    setSearchLoading(false);
  }, []);

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => doSearch(query), 400);
    return () => { if (debounceRef.current) clearTimeout(debounceRef.current); };
  }, [query, doSearch]);

  // Load full card detail when a result is selected
  const handleSelectResult = useCallback(async (result: SearchResult) => {
    setSelectedResult(result);
    setDropdownOpen(false);
    setSearchResults([]);
    setCardDetail(null);
    setDetailLoading(true);
    try {
      const res = await fetch(`/api/card-detail?poketraceId=${encodeURIComponent(result.poketraceId)}`);
      if (res.ok) setCardDetail(await res.json());
    } catch {
      // keep null
    }
    setDetailLoading(false);
  }, []);

  function clearSelection() {
    setSelectedResult(null);
    setCardDetail(null);
    setShowAddForm(false);
    setTimeout(() => inputRef.current?.focus(), 50);
  }

  // Build the SelectedCard shape AddAssetForm expects
  const initialCard: SelectedCard | undefined = selectedResult
    ? {
        id: selectedResult.poketraceId,
        name: selectedResult.name,
        number: selectedResult.number,
        rarity: selectedResult.rarity,
        setName: selectedResult.setName,
        imageUrl: selectedResult.imageUrl,
        type: selectedResult.type,
        prices: selectedResult.prices,
        marketPrice: selectedResult.marketPrice ?? undefined,
      }
    : undefined;

  // ---------------------------------------------------------------------------
  // Render — search state
  // ---------------------------------------------------------------------------
  if (!selectedResult) {
    return (
      <div className="max-w-3xl mx-auto">
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-text-primary">Search Asset</h1>
          <p className="text-sm text-text-muted mt-1">
            Search any card or sealed product to see full pricing data, graded values, and price history.
          </p>
        </div>

        <div className="relative">
          <div className="relative flex items-center">
            <Search className="absolute left-4 w-5 h-5 text-text-muted pointer-events-none" />
            <input
              ref={inputRef}
              autoFocus
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search cards or sealed products…"
              className="w-full pl-12 pr-10 py-4 bg-surface border border-border rounded-2xl text-base text-text-primary placeholder:text-text-muted focus:outline-none focus:border-accent transition-colors shadow-sm"
            />
            {query && (
              <button
                onClick={() => { setQuery(""); setSearchResults([]); setDropdownOpen(false); }}
                className="absolute right-4 p-1 text-text-muted hover:text-text-primary"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>

          {dropdownOpen && (
            <SearchDropdown
              results={searchResults}
              loading={searchLoading}
              onSelect={handleSelectResult}
            />
          )}
        </div>

        {!query && (
          <p className="text-center text-sm text-text-muted mt-12 opacity-60">
            Start typing to search over the full Poketrace catalogue
          </p>
        )}
      </div>
    );
  }

  // ---------------------------------------------------------------------------
  // Render — card detail state
  // ---------------------------------------------------------------------------
  const detail = cardDetail;

  return (
    <div className="max-w-5xl mx-auto">
      {/* Top bar */}
      <div className="flex items-center justify-between gap-4 mb-6 flex-wrap">
        <button
          onClick={clearSelection}
          className="flex items-center gap-1.5 text-sm text-text-muted hover:text-text-primary transition-colors"
        >
          <ChevronLeft className="w-4 h-4" />
          Search again
        </button>

        {/* Action buttons */}
        <div className="flex items-center gap-3">
          <button
            disabled
            className="flex items-center gap-2 px-5 py-2.5 border border-border rounded-xl text-sm font-semibold text-text-muted bg-surface-hover opacity-50 cursor-not-allowed"
            title="Coming soon"
          >
            <BookmarkX className="w-4 h-4" />
            Track Card
          </button>
          <button
            onClick={() => setShowAddForm(true)}
            className="flex items-center gap-2 px-5 py-2.5 bg-accent text-black rounded-xl text-sm font-semibold hover:bg-accent-hover transition-colors"
          >
            <Plus className="w-4 h-4" />
            Add Asset
          </button>
        </div>
      </div>

      {/* Card header */}
      <div className="flex flex-col sm:flex-row gap-5 mb-6">
        {/* Card image */}
        <div className="relative w-36 h-48 flex-shrink-0 bg-surface border border-border rounded-xl overflow-hidden mx-auto sm:mx-0">
          {selectedResult.imageUrl ? (
            <Image
              src={selectedResult.imageUrl}
              alt={selectedResult.name}
              fill
              className="object-contain p-2"
            />
          ) : (
            <div className="absolute inset-0 flex items-center justify-center text-text-muted text-xs">No image</div>
          )}
        </div>

        {/* Card info */}
        <div className="flex-1 min-w-0">
          <div className="flex flex-wrap gap-2 mb-2">
            <span className={clsx(
              "px-2.5 py-1 rounded-full text-xs font-bold uppercase tracking-wide",
              selectedResult.type === "card" ? "bg-blue-500/15 text-blue-400" : "bg-purple-500/15 text-purple-400"
            )}>
              {selectedResult.type}
            </span>
            {selectedResult.rarity && (
              <span className="px-2.5 py-1 rounded-full text-xs bg-surface-hover text-text-muted">{selectedResult.rarity}</span>
            )}
            {detail?.isConverted && (
              <span className="px-2.5 py-1 rounded-full text-xs bg-surface-hover text-text-muted">EUR→USD</span>
            )}
          </div>
          <h1 className="text-2xl font-bold text-text-primary leading-tight">{selectedResult.name}</h1>
          <p className="text-sm text-text-muted mt-1">
            {selectedResult.setName}
            {selectedResult.number ? ` · #${selectedResult.number}` : ""}
          </p>
          {detail && (
            <p className="text-xs text-text-muted mt-1">
              Poketrace ID: <span className="font-mono">{detail.id}</span>
            </p>
          )}
        </div>
      </div>

      {detailLoading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="w-6 h-6 animate-spin text-text-muted" />
        </div>
      ) : detail ? (
        <div className="space-y-6">
          {/* Raw prices */}
          <section>
            <h2 className="text-sm font-semibold text-text-secondary uppercase tracking-wide mb-3">
              Raw / Ungraded Prices
            </h2>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              <RawPriceCard label="TCGPlayer" data={detail.rawPrices["tcgplayer"]} />
              <RawPriceCard label="eBay" data={detail.rawPrices["ebay"]} />
              <RawPriceCard label="CardMarket" data={detail.rawPrices["cardmarket"]} />
            </div>
          </section>

          {/* Graded prices */}
          {detail.gradedPrices.length > 0 && (
            <section>
              <h2 className="text-sm font-semibold text-text-secondary uppercase tracking-wide mb-3">
                Graded Prices
              </h2>
              <div className="bg-surface border border-border rounded-2xl overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-border">
                        <th className="text-left px-4 py-3 text-xs font-medium text-text-muted">Grade</th>
                        <th className="text-right px-4 py-3 text-xs font-medium text-text-muted">Avg Price</th>
                        <th className="text-right px-4 py-3 text-xs font-medium text-text-muted hidden sm:table-cell">Low</th>
                        <th className="text-right px-4 py-3 text-xs font-medium text-text-muted hidden sm:table-cell">High</th>
                        <th className="text-right px-4 py-3 text-xs font-medium text-text-muted hidden md:table-cell">7d Avg</th>
                        <th className="text-right px-4 py-3 text-xs font-medium text-text-muted hidden md:table-cell">30d Avg</th>
                        <th className="text-right px-4 py-3 text-xs font-medium text-text-muted">Sales</th>
                        <th className="text-left px-4 py-3 text-xs font-medium text-text-muted hidden lg:table-cell">Source</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border">
                      {detail.gradedPrices.map((tier) => {
                        const delta7d = priceDelta(tier.avg, tier.avg7d);
                        return (
                          <tr key={tier.tier} className="hover:bg-surface-hover transition-colors">
                            <td className="px-4 py-3">
                              <span className="font-semibold text-text-primary">{tier.label}</span>
                            </td>
                            <td className="px-4 py-3 text-right">
                              <div className="flex flex-col items-end gap-0.5">
                                <span className="font-bold text-text-primary">${tier.avg.toFixed(2)}</span>
                                <DeltaBadge delta={delta7d} />
                              </div>
                            </td>
                            <td className="px-4 py-3 text-right text-text-muted hidden sm:table-cell">
                              {tier.low != null ? `$${tier.low.toFixed(2)}` : "—"}
                            </td>
                            <td className="px-4 py-3 text-right text-text-muted hidden sm:table-cell">
                              {tier.high != null ? `$${tier.high.toFixed(2)}` : "—"}
                            </td>
                            <td className="px-4 py-3 text-right text-text-muted hidden md:table-cell">
                              {tier.avg7d != null ? `$${tier.avg7d.toFixed(2)}` : "—"}
                            </td>
                            <td className="px-4 py-3 text-right text-text-muted hidden md:table-cell">
                              {tier.avg30d != null ? `$${tier.avg30d.toFixed(2)}` : "—"}
                            </td>
                            <td className="px-4 py-3 text-right text-text-muted">
                              {tier.saleCount != null ? `~${tier.saleCount}` : "—"}
                            </td>
                            <td className="px-4 py-3 hidden lg:table-cell">
                              <span className="text-xs text-text-muted capitalize">{tier.source}</span>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            </section>
          )}

          {/* Price history chart */}
          <section>
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-sm font-semibold text-text-secondary uppercase tracking-wide">
                Price History (Near Mint)
              </h2>
              <a
                href={`https://poketrace.com/cards/${detail.id}`}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-1 text-xs text-text-muted hover:text-accent transition-colors"
              >
                View on Poketrace <ArrowUpRight className="w-3 h-3" />
              </a>
            </div>
            <PriceChart
              externalId={detail.id}
              poketraceId={detail.id}
              cardName={detail.name}
              assetType={detail.type}
              className="h-64"
            />
          </section>
        </div>
      ) : (
        <div className="text-center py-12 text-text-muted text-sm">
          Failed to load card details.
        </div>
      )}

      {/* Add Asset slide-over */}
      {showAddForm && (
        <>
          <div
            className="fixed inset-0 bg-black/50 z-40"
            onClick={() => setShowAddForm(false)}
          />
          <div className="fixed right-0 top-0 h-full w-full max-w-xl bg-surface border-l border-border z-50 overflow-y-auto shadow-2xl">
            <div className="sticky top-0 bg-surface border-b border-border px-5 py-4 flex items-center justify-between z-10">
              <h2 className="font-semibold text-text-primary">Add Asset</h2>
              <button
                onClick={() => setShowAddForm(false)}
                className="p-1.5 rounded-lg hover:bg-surface-hover transition-colors text-text-muted hover:text-text-primary"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-5">
              <AddAssetForm
                initialCard={initialCard}
                onSuccess={() => setShowAddForm(false)}
              />
            </div>
          </div>
        </>
      )}
    </div>
  );
}
