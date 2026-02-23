"use client";

import { useState, useCallback, useRef, useEffect } from "react";
import Image from "next/image";
import { Search, X, Loader2, Package, CreditCard, PlusCircle } from "lucide-react";
import { formatCurrency } from "@/lib/format";

interface SearchResult {
  id: string;
  name: string;
  number?: string;
  rarity?: string;
  setName?: string;
  imageUrl?: string;
  type: "card" | "sealed";
  prices?: {
    raw?: number;
    market?: number;
    psa10?: number;
    psa9?: number;
    cgc10?: number;
    bgs10?: number;
  };
  marketPrice?: number;
  currency?: string;
}

interface SearchModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelect: (card: SearchResult) => void;
  onManualEntry?: (query: string) => void;
}

export default function SearchModal({
  isOpen,
  onClose,
  onSelect,
  onManualEntry,
}: SearchModalProps) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [searched, setSearched] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout>>(undefined);

  useEffect(() => {
    if (isOpen && inputRef.current) {
      inputRef.current.focus();
    }
  }, [isOpen]);

  const doSearch = useCallback(async (q: string) => {
    if (q.trim().length < 2) {
      setResults([]);
      setSearched(false);
      return;
    }

    setLoading(true);
    setSearched(true);
    try {
      const res = await fetch(
        `/api/search?q=${encodeURIComponent(q.trim())}`
      );
      if (!res.ok) throw new Error("Search failed");
      const json = await res.json();
      const items: SearchResult[] = Array.isArray(json)
        ? json
        : json.data || json.cards || json.results || [];
      setResults(items);
    } catch {
      setResults([]);
    } finally {
      setLoading(false);
    }
  }, []);

  const handleInputChange = (value: string) => {
    setQuery(value);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => doSearch(value), 400);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Escape") onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-start justify-center pt-[5vh] sm:pt-[10vh] px-3 sm:px-4">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="relative bg-surface-elevated border border-border rounded-2xl w-full max-w-2xl max-h-[80vh] sm:max-h-[70vh] flex flex-col shadow-2xl">
        {/* Search input */}
        <div className="flex items-center gap-3 px-6 py-4 border-b border-border">
          <Search className="w-5 h-5 text-text-muted" />
          <input
            ref={inputRef}
            type="text"
            placeholder="Search cards or sealed products..."
            value={query}
            onChange={(e) => handleInputChange(e.target.value)}
            onKeyDown={handleKeyDown}
            className="flex-1 bg-transparent text-text-primary placeholder-text-muted outline-none text-sm"
          />
          {loading && <Loader2 className="w-5 h-5 text-accent animate-spin" />}
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-text-muted hover:text-text-primary hover:bg-surface-hover"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Results */}
        <div className="flex-1 overflow-y-auto p-2">
          {!searched && (
            <div className="flex items-center justify-center py-16">
              <p className="text-text-muted text-sm">
                Start typing to search for cards and products
              </p>
            </div>
          )}

          {searched && !loading && results.length === 0 && (
            <div className="flex flex-col items-center justify-center py-12 gap-4">
              <p className="text-text-muted text-sm">
                No results found for &ldquo;{query}&rdquo;
              </p>
              {onManualEntry && (
                <button
                  onClick={() => onManualEntry(query)}
                  className="flex items-center gap-2 px-4 py-2.5 bg-warning-muted border border-warning/30 text-warning hover:bg-warning/20 rounded-xl text-sm font-medium"
                >
                  <PlusCircle className="w-4 h-4" />
                  Add &ldquo;{query}&rdquo; manually
                </button>
              )}
            </div>
          )}

          {/* Manual entry option at top when results exist */}
          {searched && !loading && results.length > 0 && onManualEntry && (
            <button
              onClick={() => onManualEntry(query)}
              className="w-full flex items-center gap-4 p-3 rounded-xl hover:bg-surface-hover text-left border border-dashed border-border mb-1"
            >
              <div className="w-14 h-20 bg-warning/10 rounded-lg flex items-center justify-center flex-shrink-0">
                <PlusCircle className="w-6 h-6 text-warning" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-warning">
                  Can&apos;t find your card?
                </p>
                <p className="text-xs text-text-muted mt-0.5">
                  Add it manually with your own title and photo
                </p>
              </div>
            </button>
          )}

          {results.map((item) => {
            const isCard = item.type === "card";
            const rawPrice = item.prices?.raw || item.prices?.market || item.marketPrice;
            const psa10 = item.prices?.psa10;
            const psa9 = item.prices?.psa9;

            return (
              <button
                key={item.id}
                onClick={() => onSelect(item)}
                className="w-full flex items-center gap-4 p-3 rounded-xl hover:bg-surface-hover text-left"
              >
                {/* Image */}
                <div className="w-14 h-20 bg-background rounded-lg overflow-hidden flex-shrink-0 relative">
                  {item.imageUrl ? (
                    <Image
                      src={item.imageUrl}
                      alt={item.name}
                      fill
                      className="object-contain p-1"
                      sizes="56px"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-text-muted">
                      {isCard ? (
                        <CreditCard className="w-6 h-6" />
                      ) : (
                        <Package className="w-6 h-6" />
                      )}
                    </div>
                  )}
                </div>

                {/* Info */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="text-sm font-semibold text-text-primary truncate">
                      {item.name}
                    </p>
                    <span className={`text-xs px-1.5 py-0.5 rounded ${
                      isCard 
                        ? "bg-blue-500/10 text-blue-400" 
                        : "bg-purple-500/10 text-purple-400"
                    }`}>
                      {isCard ? "Card" : "Sealed"}
                    </span>
                  </div>
                  <p className="text-xs text-text-muted mt-0.5">
                    {item.setName}
                    {item.number ? ` #${item.number}` : ""}
                    {item.rarity ? ` · ${item.rarity}` : ""}
                  </p>
                  
                  {/* Graded prices for cards */}
                  {isCard && (psa10 || psa9) && (
                    <div className="flex gap-3 mt-1.5">
                      {psa10 && (
                        <span className="text-xs text-text-muted">
                          <span className="text-amber-400">PSA 10:</span>{" "}
                          {formatCurrency(psa10)}
                        </span>
                      )}
                      {psa9 && (
                        <span className="text-xs text-text-muted">
                          <span className="text-amber-400/70">PSA 9:</span>{" "}
                          {formatCurrency(psa9)}
                        </span>
                      )}
                    </div>
                  )}
                </div>

                {/* Raw/Market Price */}
                <div className="text-right flex-shrink-0">
                  <p className="text-sm font-bold text-text-primary">
                    {rawPrice ? formatCurrency(rawPrice) : "N/A"}
                  </p>
                  <p className="text-xs text-text-muted">
                    {isCard ? "Raw" : "Market"}
                  </p>
                </div>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
