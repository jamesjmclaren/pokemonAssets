"use client";

import { useState, useCallback, useRef, useEffect } from "react";
import Image from "next/image";
import { Search, X, Loader2 } from "lucide-react";
import { formatCurrency, extractCardPrice } from "@/lib/format";

interface SearchResult {
  id: string;
  name: string;
  number?: string;
  rarity?: string;
  setName?: string;
  set?: string;
  imageUrl?: string;
  image?: string;
  prices?: {
    tcgplayer?: { market?: number; low?: number };
  };
  tcgplayerPrice?: number;
  marketPrice?: number;
}

interface SearchModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelect: (card: SearchResult) => void;
}

export default function SearchModal({
  isOpen,
  onClose,
  onSelect,
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
      const cards: SearchResult[] = Array.isArray(json)
        ? json
        : json.data || json.cards || json.results || [];
      setResults(cards);
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
    <div className="fixed inset-0 z-[100] flex items-start justify-center pt-[10vh]">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="relative bg-surface-elevated border border-border rounded-2xl w-full max-w-2xl max-h-[70vh] flex flex-col shadow-2xl">
        {/* Search input */}
        <div className="flex items-center gap-3 px-6 py-4 border-b border-border">
          <Search className="w-5 h-5 text-text-muted" />
          <input
            ref={inputRef}
            type="text"
            placeholder="Search Pokemon cards or sealed products..."
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
                Start typing to search for Pokemon cards and products
              </p>
            </div>
          )}

          {searched && !loading && results.length === 0 && (
            <div className="flex items-center justify-center py-16">
              <p className="text-text-muted text-sm">
                No results found for &ldquo;{query}&rdquo;
              </p>
            </div>
          )}

          {results.map((card) => {
            const imgUrl = card.imageUrl || card.image || "";
            const setName = card.setName || card.set || "";
            const price = extractCardPrice(card as unknown as Record<string, unknown>);

            return (
              <button
                key={card.id}
                onClick={() => onSelect(card)}
                className="w-full flex items-center gap-4 p-3 rounded-xl hover:bg-surface-hover text-left"
              >
                <div className="w-14 h-20 bg-background rounded-lg overflow-hidden flex-shrink-0 relative">
                  {imgUrl ? (
                    <Image
                      src={imgUrl}
                      alt={card.name}
                      fill
                      className="object-contain p-1"
                      sizes="56px"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-text-muted text-xs">
                      N/A
                    </div>
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-text-primary truncate">
                    {card.name}
                  </p>
                  <p className="text-xs text-text-muted mt-0.5">
                    {setName}
                    {card.number ? ` #${card.number}` : ""}
                    {card.rarity ? ` - ${card.rarity}` : ""}
                  </p>
                </div>
                <div className="text-right flex-shrink-0">
                  <p className="text-sm font-bold text-text-primary">
                    {price ? formatCurrency(price) : "N/A"}
                  </p>
                  <p className="text-xs text-text-muted">Market</p>
                </div>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
