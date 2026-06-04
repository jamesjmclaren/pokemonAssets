"use client";

import { useState, useCallback, useRef, useEffect } from "react";
import Image from "next/image";
import { Search, X, Loader2, Package, CreditCard, PlusCircle } from "lucide-react";
import { useFormatCurrency } from "@/lib/currency-context";

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
  assetType?: "card" | "sealed";
}

export default function SearchModal({
  isOpen,
  onClose,
  onSelect,
  onManualEntry,
  assetType,
}: SearchModalProps) {
  const formatCurrency = useFormatCurrency();
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
      const typeParam = assetType ? `&type=${assetType}` : "";
      const res = await fetch(
        `/api/search?q=${encodeURIComponent(q.trim())}${typeParam}`
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
  }, [assetType]);

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
      <div className="relative bg-surface-elevated border border-border rounded-2xl w-full max-w-3xl max-h-[85vh] sm:max-h-[80vh] flex flex-col shadow-2xl">
        {/* Search input */}
        <div className="flex items-center gap-3 px-6 py-4 border-b border-border">
          <Search className="w-5 h-5 text-text-muted" />
          <input
            ref={inputRef}
            type="text"
            placeholder="e.g. mega charizard x ex 125"
            value={query}
            onChange={(e) => handleInputChange(e.target.value)}
            onKeyDown={handleKeyDown}
            className="flex-1 bg-transparent text-text-primary placeholder-text-muted outline-none text-sm"
          />
          {loading && <Loader2 className="w-5 h-5 text-accent animate-spin" />}
          {results.length > 0 && !loading && (
            <span className="text-xs text-text-muted">{results.length} results</span>
          )}
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-text-muted hover:text-text-primary hover:bg-surface-hover"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Results */}
        <div className="flex-1 overflow-y-auto p-4">
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

          {/* Grid of results */}
          {(searched && !loading && results.length > 0) && (
            <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-3">
              {/* Manual entry tile */}
              {onManualEntry && (
                <button
                  onClick={() => onManualEntry(query)}
                  className="flex flex-col items-center gap-2 p-2 rounded-xl border border-dashed border-border hover:bg-surface-hover text-center"
                >
                  <div className="w-full aspect-[2/3] bg-warning/10 rounded-lg flex items-center justify-center">
                    <PlusCircle className="w-7 h-7 text-warning" />
                  </div>
                  <div>
                    <p className="text-xs font-semibold text-warning leading-tight">
                      Add manually
                    </p>
                    <p className="text-[10px] text-text-muted mt-0.5 leading-tight">
                      Custom title &amp; photo
                    </p>
                  </div>
                </button>
              )}

              {results.map((item) => {
                const isCard = item.type === "card";
                const rawPrice = item.prices?.raw || item.prices?.market || item.marketPrice;
                const psa10 = item.prices?.psa10;

                return (
                  <button
                    key={item.id}
                    onClick={() => onSelect(item)}
                    className="flex flex-col gap-2 p-2 rounded-xl hover:bg-surface-hover text-left group"
                  >
                    {/* Card image */}
                    <div className="w-full aspect-[2/3] bg-background rounded-lg overflow-hidden relative flex-shrink-0">
                      {item.imageUrl ? (
                        <Image
                          src={item.imageUrl}
                          alt={item.name}
                          fill
                          className="object-contain p-1 group-hover:scale-105 transition-transform duration-200"
                          sizes="(max-width: 640px) 30vw, 160px"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-text-muted">
                          {isCard ? (
                            <CreditCard className="w-8 h-8" />
                          ) : (
                            <Package className="w-8 h-8" />
                          )}
                        </div>
                      )}
                      {/* Type badge */}
                      <span className={`absolute top-1 right-1 text-[9px] px-1 py-0.5 rounded font-medium leading-none ${
                        isCard
                          ? "bg-blue-500/80 text-white"
                          : "bg-purple-500/80 text-white"
                      }`}>
                        {isCard ? "Card" : "Sealed"}
                      </span>
                    </div>

                    {/* Info below image */}
                    <div className="w-full min-w-0">
                      <p className="text-xs font-semibold text-text-primary leading-tight line-clamp-2">
                        {item.name}
                      </p>
                      {item.setName && (
                        <p className="text-[10px] text-text-muted mt-0.5 truncate">
                          {item.setName}{item.number ? ` #${item.number}` : ""}
                        </p>
                      )}
                      <div className="mt-1 flex flex-col gap-0.5">
                        {rawPrice && (
                          <p className="text-xs font-bold text-text-primary">
                            {formatCurrency(rawPrice)}
                          </p>
                        )}
                        {psa10 && (
                          <p className="text-[10px] text-text-muted">
                            <span className="text-amber-400">PSA 10</span>{" "}
                            {formatCurrency(psa10)}
                          </p>
                        )}
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
