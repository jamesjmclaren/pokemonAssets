"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import Image from "next/image";
import {
  Search,
  X,
  Loader2,
  Plus,
  BookmarkX,
  ChevronLeft,
} from "lucide-react";
import { clsx } from "clsx";
import AddAssetForm, { type SelectedCard } from "@/components/AddAssetForm";
import CardAnalytics from "@/components/CardAnalytics";

// ---------------------------------------------------------------------------
// Search result type
// ---------------------------------------------------------------------------

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
// Sub-components
// ---------------------------------------------------------------------------

function SearchResults({
  results,
  loading,
  query,
  onSelect,
}: {
  results: SearchResult[];
  loading: boolean;
  query: string;
  onSelect: (r: SearchResult) => void;
}) {
  if (!query || query.length < 2) return null;

  if (loading) {
    return (
      <div className="mt-4 flex items-center justify-center py-8">
        <Loader2 className="w-5 h-5 animate-spin text-text-muted" />
      </div>
    );
  }
  if (results.length === 0) {
    return (
      <p className="mt-4 text-center text-sm text-text-muted py-8">
        No results for &ldquo;{query}&rdquo;
      </p>
    );
  }

  return (
    <div className="mt-4 bg-surface border border-border rounded-2xl overflow-hidden divide-y divide-border">
      {results.map((r) => (
        <button
          key={r.id}
          onClick={() => onSelect(r)}
          className="w-full flex items-center gap-3 px-4 py-3 hover:bg-surface-hover transition-colors text-left"
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

// ---------------------------------------------------------------------------
// Main page
// ---------------------------------------------------------------------------

export default function SearchAssetPage() {
  const [query, setQuery] = useState("");
  const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
  const [searchLoading, setSearchLoading] = useState(false);
  const [selectedResult, setSelectedResult] = useState<SearchResult | null>(null);
  const [showAddForm, setShowAddForm] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const addFormRef = useRef<HTMLDivElement>(null);

  // Debounced search
  const doSearch = useCallback(async (q: string) => {
    if (q.length < 2) { setSearchResults([]); return; }
    setSearchLoading(true);
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

  const handleSelectResult = useCallback((result: SearchResult) => {
    setSelectedResult(result);
    setSearchResults([]);
  }, []);

  function clearSelection() {
    setSelectedResult(null);
    setShowAddForm(false);
    setQuery("");
    setSearchResults([]);
    setTimeout(() => inputRef.current?.focus(), 50);
  }

  // Build the SelectedCard shape AddAssetForm expects.
  // We spread poketraceId as an extra property because AddAssetForm reads it
  // via an unsafe cast (selectedCard as Record<string, unknown>)?.poketraceId
  // to drive the per-source price breakdown fetch.
  const initialCard = selectedResult
    ? ({
        id: selectedResult.poketraceId,
        poketraceId: selectedResult.poketraceId,
        name: selectedResult.name,
        number: selectedResult.number,
        rarity: selectedResult.rarity,
        setName: selectedResult.setName,
        imageUrl: selectedResult.imageUrl,
        type: selectedResult.type,
        prices: selectedResult.prices,
        marketPrice: selectedResult.marketPrice ?? undefined,
      } as SelectedCard)
    : undefined;

  // ---------------------------------------------------------------------------
  // Render — search state
  // ---------------------------------------------------------------------------
  if (!selectedResult) {
    return (
      <div className="max-w-5xl mx-auto">
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-text-primary">Search Asset</h1>
          <p className="text-sm text-text-muted mt-1">
            Search any card or sealed product to see full pricing data, graded values, and price history.
          </p>
        </div>

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
              onClick={() => { setQuery(""); setSearchResults([]); }}
              className="absolute right-4 p-1 text-text-muted hover:text-text-primary"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>

        <SearchResults
          results={searchResults}
          loading={searchLoading}
          query={query}
          onSelect={handleSelectResult}
        />

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
            onClick={() => {
              setShowAddForm(true);
              setTimeout(() => {
                addFormRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
              }, 50);
            }}
            className="flex items-center gap-2 px-5 py-2.5 bg-accent text-black rounded-xl text-sm font-semibold hover:bg-accent-hover transition-colors"
          >
            <Plus className="w-4 h-4" />
            {showAddForm ? "Jump to Form" : "Add Asset"}
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
          </div>
          <h1 className="text-2xl font-bold text-text-primary leading-tight">{selectedResult.name}</h1>
          <p className="text-sm text-text-muted mt-1">
            {selectedResult.setName}
            {selectedResult.number ? ` · #${selectedResult.number}` : ""}
          </p>
        </div>
      </div>

      <CardAnalytics
        poketraceId={selectedResult.poketraceId}
        cardName={selectedResult.name}
        assetType={selectedResult.type}
      />


      {/* Add Asset — inline section */}
      {showAddForm && (
        <section ref={addFormRef} className="mt-10 pt-8 border-t border-border scroll-mt-6">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h2 className="text-xl font-bold text-text-primary">Add to Collection</h2>
              <p className="text-sm text-text-muted mt-0.5">
                Fill in purchase details to add this asset to your portfolio.
              </p>
            </div>
            <button
              onClick={() => setShowAddForm(false)}
              className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm text-text-muted hover:text-text-primary hover:bg-surface-hover transition-colors"
            >
              <X className="w-4 h-4" />
              Cancel
            </button>
          </div>
          <AddAssetForm
            initialCard={initialCard}
            onSuccess={() => setShowAddForm(false)}
          />
        </section>
      )}
    </div>
  );
}
