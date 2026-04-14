"use client";

import { useState, useEffect, useCallback } from "react";
import {
  Search,
  CheckCircle2,
  Clock,
  ArrowRight,
  X,
  Loader2,
  RefreshCw,
  Filter,
  Image as ImageIcon,
} from "lucide-react";
import { useUser } from "@clerk/nextjs";
import { formatCurrency } from "@/lib/format";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface MigrationAsset {
  id: string;
  external_id: string;
  name: string;
  set_name: string;
  asset_type: "card" | "sealed";
  image_url: string | null;
  custom_image_url: string | null;
  current_price: number | null;
  psa_grade: string | null;
  condition: string | null;
  poketrace_id: string | null;
  poketrace_market: string | null;
  pc_url: string | null;
  portfolio_id: string;
  portfolio_name: string;
  migration_status: "migrated" | "pending";
  status: string;
}

interface PoketraceResult {
  poketraceId: string;
  name: string;
  setName: string;
  number?: string;
  rarity?: string;
  imageUrl?: string;
  marketPrice: number | null;
  currency: string;
  market: string;
  type: "card" | "sealed";
  tcgplayerId?: string;
  gradedPrices?: Record<string, number>;
}

interface Summary {
  total: number;
  migrated: number;
  pending: number;
}

// ---------------------------------------------------------------------------
// Grade options (same as AddAssetForm)
// ---------------------------------------------------------------------------

const GRADE_OPTIONS = [
  { value: "", label: "None (Raw)" },
  { value: "PSA 10", label: "PSA 10 - Gem Mint" },
  { value: "PSA 9", label: "PSA 9 - Mint" },
  { value: "PSA 8", label: "PSA 8 - NM-MT" },
  { value: "PSA 7", label: "PSA 7 - Near Mint" },
  { value: "PSA 6", label: "PSA 6 - EX-MT" },
  { value: "PSA 5", label: "PSA 5 - Excellent" },
  { value: "PSA 4", label: "PSA 4 - VG-EX" },
  { value: "PSA 3", label: "PSA 3 - Very Good" },
  { value: "PSA 2", label: "PSA 2 - Good" },
  { value: "PSA 1", label: "PSA 1 - Poor" },
  { value: "CGC 10", label: "CGC 10 - Pristine" },
  { value: "CGC 9.5", label: "CGC 9.5 - Gem Mint" },
  { value: "CGC 9", label: "CGC 9 - Mint" },
  { value: "BGS 10", label: "BGS 10 - Pristine" },
  { value: "BGS 9.5", label: "BGS 9.5 - Gem Mint" },
  { value: "BGS 9", label: "BGS 9 - Mint" },
];

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Map a grade string like "PSA 10" to a Poketrace tier key like "PSA_10". */
function gradeToTierKey(grade: string): string | null {
  if (!grade) return null;
  const g = grade.toUpperCase().trim();
  for (const prefix of ["PSA", "CGC", "BGS", "SGC", "ACE", "TAG"]) {
    if (g.includes(prefix)) {
      const num = g.replace(/[^0-9.]/g, "");
      if (num) return `${prefix}_${num.replace(".", "_")}`;
    }
  }
  return null;
}

/** Get the display price for a result: graded price if grade selected, else market. */
function getDisplayPrice(
  result: PoketraceResult,
  grade: string
): { price: number | null; isGraded: boolean } {
  if (grade && result.gradedPrices) {
    const key = gradeToTierKey(grade);
    if (key && result.gradedPrices[key] != null) {
      return { price: result.gradedPrices[key], isGraded: true };
    }
    // Also try without underscore in decimal (e.g. CGC_9.5 vs CGC_9_5)
    const altKey = key?.replace("_5", ".5");
    if (altKey && result.gradedPrices[altKey] != null) {
      return { price: result.gradedPrices[altKey], isGraded: true };
    }
  }
  return { price: result.marketPrice, isGraded: false };
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export default function AdminMigratePage() {
  const { user, isLoaded } = useUser();

  // State
  const [assets, setAssets] = useState<MigrationAsset[]>([]);
  const [summary, setSummary] = useState<Summary>({ total: 0, migrated: 0, pending: 0 });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [forbidden, setForbidden] = useState(false);

  // Filters
  const [filterStatus, setFilterStatus] = useState<"all" | "migrated" | "pending">("all");
  const [filterType, setFilterType] = useState<"all" | "card" | "sealed">("all");
  const [searchQuery, setSearchQuery] = useState("");

  // Migration modal
  const [selectedAsset, setSelectedAsset] = useState<MigrationAsset | null>(null);
  const [searchResults, setSearchResults] = useState<PoketraceResult[]>([]);
  const [modalSearch, setModalSearch] = useState("");
  const [modalSearching, setModalSearching] = useState(false);
  const [migrating, setMigrating] = useState(false);
  const [selectedGrade, setSelectedGrade] = useState("");

  // ---------------------------------------------------------------------------
  // Fetch assets
  // ---------------------------------------------------------------------------

  const fetchAssets = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/admin/migrate");
      if (res.status === 403) {
        setForbidden(true);
        return;
      }
      if (!res.ok) throw new Error("Failed to load assets");
      const data = await res.json();
      setAssets(data.assets || []);
      setSummary(data.summary || { total: 0, migrated: 0, pending: 0 });
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load assets");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (isLoaded) fetchAssets();
  }, [isLoaded, fetchAssets]);

  // ---------------------------------------------------------------------------
  // Search Poketrace
  // ---------------------------------------------------------------------------

  const searchPoketrace = async (query: string) => {
    if (!query.trim()) return;
    setModalSearching(true);
    try {
      const res = await fetch(`/api/admin/search-poketrace?q=${encodeURIComponent(query)}&market=US`);
      if (!res.ok) throw new Error("Search failed");
      const data = await res.json();
      setSearchResults(data.results || []);
    } catch {
      setSearchResults([]);
    } finally {
      setModalSearching(false);
    }
  };

  // ---------------------------------------------------------------------------
  // Link asset to Poketrace
  // ---------------------------------------------------------------------------

  const linkAsset = async (asset: MigrationAsset, result: PoketraceResult) => {
    setMigrating(true);
    try {
      const res = await fetch("/api/admin/migrate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          assetId: asset.id,
          poketraceId: result.poketraceId,
          poketraceMarket: result.market,
          updatePrice: true,
          grade: selectedGrade || null,
        }),
      });
      if (!res.ok) throw new Error("Migration failed");

      // Refresh the list
      await fetchAssets();
      setSelectedAsset(null);
      setSearchResults([]);
      setModalSearch("");
    } catch (e) {
      alert(e instanceof Error ? e.message : "Failed to migrate asset");
    } finally {
      setMigrating(false);
    }
  };

  // ---------------------------------------------------------------------------
  // Filtered assets
  // ---------------------------------------------------------------------------

  const filteredAssets = assets.filter((a) => {
    if (filterStatus !== "all" && a.migration_status !== filterStatus) return false;
    if (filterType !== "all" && a.asset_type !== filterType) return false;
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      return a.name.toLowerCase().includes(q) || a.set_name?.toLowerCase().includes(q);
    }
    return true;
  });

  // ---------------------------------------------------------------------------
  // Render
  // ---------------------------------------------------------------------------

  if (!isLoaded) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="w-6 h-6 animate-spin text-text-secondary" />
      </div>
    );
  }

  if (forbidden) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-text-primary mb-2">Access Denied</h1>
          <p className="text-text-secondary">You do not have admin access to this page.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-text-primary mb-2">
          API Migration: Link Assets to Poketrace
        </h1>
        <p className="text-text-secondary">
          Manually link existing portfolio assets to Poketrace products for accurate pricing.
        </p>
      </div>

      {/* Progress Bar */}
      <div className="bg-surface rounded-xl p-4 mb-6 border border-border">
        <div className="flex justify-between text-sm mb-2">
          <span className="text-text-secondary">Migration Progress</span>
          <span className="text-text-primary font-medium">
            {summary.migrated} / {summary.total} assets
          </span>
        </div>
        <div className="w-full bg-border rounded-full h-3">
          <div
            className="bg-success h-3 rounded-full transition-all duration-500"
            style={{ width: summary.total > 0 ? `${(summary.migrated / summary.total) * 100}%` : "0%" }}
          />
        </div>
        <div className="flex gap-4 mt-3 text-xs">
          <span className="flex items-center gap-1">
            <CheckCircle2 className="w-3 h-3 text-success" />
            {summary.migrated} migrated
          </span>
          <span className="flex items-center gap-1">
            <Clock className="w-3 h-3 text-warning" />
            {summary.pending} pending
          </span>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3 mb-6">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-secondary" />
          <input
            type="text"
            placeholder="Search assets..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2 bg-surface border border-border rounded-lg text-sm text-text-primary placeholder:text-text-secondary focus:outline-none focus:ring-2 focus:ring-accent"
          />
        </div>
        <select
          value={filterStatus}
          onChange={(e) => setFilterStatus(e.target.value as "all" | "migrated" | "pending")}
          className="bg-surface border border-border rounded-lg px-3 py-2 text-sm text-text-primary"
        >
          <option value="all">All Status</option>
          <option value="pending">Pending</option>
          <option value="migrated">Migrated</option>
        </select>
        <select
          value={filterType}
          onChange={(e) => setFilterType(e.target.value as "all" | "card" | "sealed")}
          className="bg-surface border border-border rounded-lg px-3 py-2 text-sm text-text-primary"
        >
          <option value="all">All Types</option>
          <option value="card">Cards</option>
          <option value="sealed">Sealed</option>
        </select>
        <button
          onClick={fetchAssets}
          className="flex items-center gap-2 bg-surface border border-border rounded-lg px-3 py-2 text-sm text-text-primary hover:bg-border transition-colors"
        >
          <RefreshCw className="w-4 h-4" />
          Refresh
        </button>
      </div>

      {/* Error / Loading */}
      {error && (
        <div className="bg-danger-muted text-danger p-4 rounded-lg mb-6">{error}</div>
      )}

      {loading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="w-6 h-6 animate-spin text-text-secondary" />
        </div>
      ) : (
        /* Asset Table */
        <div className="bg-surface rounded-xl border border-border overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border">
                  <th className="text-left px-4 py-3 text-text-secondary font-medium">Asset</th>
                  <th className="text-left px-4 py-3 text-text-secondary font-medium">Set</th>
                  <th className="text-left px-4 py-3 text-text-secondary font-medium">Type</th>
                  <th className="text-left px-4 py-3 text-text-secondary font-medium">Grade</th>
                  <th className="text-right px-4 py-3 text-text-secondary font-medium">Price</th>
                  <th className="text-left px-4 py-3 text-text-secondary font-medium">Portfolio</th>
                  <th className="text-center px-4 py-3 text-text-secondary font-medium">Status</th>
                  <th className="text-center px-4 py-3 text-text-secondary font-medium">Action</th>
                </tr>
              </thead>
              <tbody>
                {filteredAssets.map((asset) => (
                  <tr key={asset.id} className="border-b border-border last:border-0 hover:bg-border/30">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        {asset.image_url || asset.custom_image_url ? (
                          <img
                            src={asset.custom_image_url || asset.image_url || ""}
                            alt={asset.name}
                            className="w-8 h-8 rounded object-cover"
                          />
                        ) : (
                          <div className="w-8 h-8 rounded bg-border flex items-center justify-center">
                            <ImageIcon className="w-4 h-4 text-text-secondary" />
                          </div>
                        )}
                        <span className="text-text-primary font-medium truncate max-w-[200px]">
                          {asset.name}
                        </span>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-text-secondary truncate max-w-[150px]">
                      {asset.set_name}
                    </td>
                    <td className="px-4 py-3">
                      <span className={`text-xs px-2 py-0.5 rounded-full ${
                        asset.asset_type === "sealed"
                          ? "bg-purple-500/10 text-purple-400"
                          : "bg-blue-500/10 text-blue-400"
                      }`}>
                        {asset.asset_type}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-text-secondary text-xs">
                      {asset.psa_grade || "—"}
                    </td>
                    <td className="px-4 py-3 text-right text-text-primary">
                      {asset.current_price != null ? formatCurrency(asset.current_price) : "—"}
                    </td>
                    <td className="px-4 py-3 text-text-secondary text-xs truncate max-w-[120px]">
                      {asset.portfolio_name}
                    </td>
                    <td className="px-4 py-3 text-center">
                      {asset.poketrace_id ? (
                        <span className="inline-flex items-center gap-1 text-xs text-success">
                          <CheckCircle2 className="w-3.5 h-3.5" />
                          Migrated
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-xs text-warning">
                          <Clock className="w-3.5 h-3.5" />
                          Pending
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-center">
                      <button
                        onClick={() => {
                          setSelectedAsset(asset);
                          setModalSearch(asset.name);
                          setSearchResults([]);
                          setSelectedGrade(asset.psa_grade || "");
                          // Auto-search
                          setTimeout(() => searchPoketrace(asset.name), 100);
                        }}
                        className={`text-xs px-3 py-1.5 rounded-lg transition-colors ${
                          asset.poketrace_id
                            ? "bg-border text-text-secondary hover:bg-border/80"
                            : "bg-accent text-white hover:bg-accent/80"
                        }`}
                      >
                        {asset.poketrace_id ? "Re-link" : "Migrate"}
                      </button>
                    </td>
                  </tr>
                ))}
                {filteredAssets.length === 0 && (
                  <tr>
                    <td colSpan={8} className="px-4 py-8 text-center text-text-secondary">
                      {assets.length === 0
                        ? "No assets found."
                        : "No assets match the current filters."}
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Migration Modal */}
      {selectedAsset && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
          <div className="bg-surface rounded-2xl border border-border w-full max-w-2xl max-h-[80vh] flex flex-col">
            {/* Modal Header */}
            <div className="flex items-center justify-between p-4 border-b border-border">
              <div>
                <h3 className="text-lg font-semibold text-text-primary">
                  Link to Poketrace
                </h3>
                <p className="text-xs text-text-secondary mt-0.5">
                  {selectedAsset.name} — {selectedAsset.set_name}
                </p>
              </div>
              <button
                onClick={() => {
                  setSelectedAsset(null);
                  setSearchResults([]);
                  setModalSearch("");
                }}
                className="p-1.5 rounded-lg hover:bg-border"
              >
                <X className="w-5 h-5 text-text-secondary" />
              </button>
            </div>

            {/* Grade Selection */}
            {selectedAsset?.asset_type === "card" && (
              <div className="px-4 pt-3 pb-0 border-b border-border">
                <label className="block text-xs font-medium text-text-secondary mb-1.5">
                  Grade (affects price tier)
                </label>
                <select
                  value={selectedGrade}
                  onChange={(e) => setSelectedGrade(e.target.value)}
                  className="w-full bg-background border border-border rounded-lg px-3 py-2 text-sm text-text-primary mb-3 focus:outline-none focus:ring-2 focus:ring-accent"
                >
                  {GRADE_OPTIONS.map((g) => (
                    <option key={g.value} value={g.value}>
                      {g.label}
                    </option>
                  ))}
                </select>
              </div>
            )}

            {/* Search */}
            <div className="p-4 border-b border-border">
              <div className="flex gap-2">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-secondary" />
                  <input
                    type="text"
                    value={modalSearch}
                    onChange={(e) => setModalSearch(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && searchPoketrace(modalSearch)}
                    placeholder="Search Poketrace..."
                    className="w-full pl-10 pr-4 py-2 bg-background border border-border rounded-lg text-sm text-text-primary focus:outline-none focus:ring-2 focus:ring-accent"
                  />
                </div>
                <button
                  onClick={() => searchPoketrace(modalSearch)}
                  disabled={modalSearching}
                  className="bg-accent text-white px-4 py-2 rounded-lg text-sm hover:bg-accent/80 disabled:opacity-50"
                >
                  {modalSearching ? <Loader2 className="w-4 h-4 animate-spin" /> : "Search"}
                </button>
              </div>
            </div>

            {/* Results */}
            <div className="flex-1 overflow-y-auto p-4 space-y-2">
              {modalSearching ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="w-5 h-5 animate-spin text-text-secondary" />
                </div>
              ) : searchResults.length === 0 ? (
                <p className="text-center text-text-secondary py-8 text-sm">
                  {modalSearch ? "No results found. Try a different search." : "Enter a search query above."}
                </p>
              ) : (
                searchResults.map((result) => (
                  <div
                    key={result.poketraceId}
                    className="flex items-center gap-4 p-3 rounded-lg border border-border hover:bg-border/30 transition-colors"
                  >
                    {result.imageUrl ? (
                      <img
                        src={result.imageUrl}
                        alt={result.name}
                        className="w-12 h-12 rounded object-cover flex-shrink-0"
                      />
                    ) : (
                      <div className="w-12 h-12 rounded bg-border flex items-center justify-center flex-shrink-0">
                        <ImageIcon className="w-6 h-6 text-text-secondary" />
                      </div>
                    )}
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-text-primary truncate">{result.name}</p>
                      <p className="text-xs text-text-secondary">
                        {result.setName}
                        {result.number && ` #${result.number}`}
                        {result.rarity && ` · ${result.rarity}`}
                      </p>
                      <div className="flex gap-2 mt-1">
                        {(() => {
                          const { price, isGraded } = getDisplayPrice(result, selectedGrade);
                          return (
                            <span className={`text-xs ${isGraded ? "text-accent font-medium" : "text-text-secondary"}`}>
                              {price != null ? formatCurrency(price) : "No price"}
                              {isGraded && ` (${selectedGrade})`}
                            </span>
                          );
                        })()}
                        <span className={`text-xs px-1.5 py-0.5 rounded ${
                          result.type === "sealed"
                            ? "bg-purple-500/10 text-purple-400"
                            : "bg-blue-500/10 text-blue-400"
                        }`}>
                          {result.type}
                        </span>
                        <span className="text-xs text-text-secondary">{result.market}</span>
                      </div>
                    </div>
                    <button
                      onClick={() => linkAsset(selectedAsset, result)}
                      disabled={migrating}
                      className="flex items-center gap-1.5 bg-success text-white px-3 py-1.5 rounded-lg text-xs font-medium hover:bg-success/80 disabled:opacity-50 flex-shrink-0"
                    >
                      {migrating ? (
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      ) : (
                        <ArrowRight className="w-3.5 h-3.5" />
                      )}
                      Link
                    </button>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
