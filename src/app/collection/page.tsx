"use client";

import { useState, useEffect, useMemo } from "react";
import Link from "next/link";
import {
  PlusCircle,
  Search,
  SlidersHorizontal,
  Grid3X3,
  List,
  ArrowUpDown,
  AlertTriangle,
  MoreVertical,
  Pencil,
  Trash2,
  TrendingUp,
  PenLine,
  ChevronsUpDown,
  ChevronUp,
  ChevronDown,
} from "lucide-react";
import AssetCard from "@/components/AssetCard";
import MiniSparkline from "@/components/MiniSparkline";
import MarketDisclaimer from "@/components/MarketDisclaimer";
import { formatDate, fixStorageUrl } from "@/lib/format";
import { usePortfolio } from "@/lib/portfolio-context";
import { useFormatCurrency } from "@/lib/currency-context";
import type { PortfolioAsset } from "@/types";

type SortField = "name" | "set_name" | "purchase_price" | "current_price" | "profit" | "purchase_date" | "performance" | "quantity" | "gain_7d" | "gain_30d";
type SortDir = "asc" | "desc";
type ViewMode = "grid" | "table";
type TypeTab = "all" | "raw" | "graded" | "sealed" | "sold";

function isPriceStale(asset: PortfolioAsset): boolean {
  if (!asset.price_updated_at) return true;
  const thirtyDays = 30 * 24 * 60 * 60 * 1000;
  return Date.now() - new Date(asset.price_updated_at).getTime() > thirtyDays;
}

function isActive(asset: PortfolioAsset): boolean {
  return !asset.status || asset.status === "ACTIVE";
}

export default function CollectionPage() {
  const { currentPortfolio, loading: portfolioLoading, isReadOnly } = usePortfolio();
  const formatCurrency = useFormatCurrency();
  const [assets, setAssets] = useState<PortfolioAsset[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [typeTab, setTypeTab] = useState<TypeTab>("all");
  const [sortField, setSortField] = useState<SortField>("purchase_date");
  const [sortDir, setSortDir] = useState<SortDir>("desc");
  const [view, setView] = useState<ViewMode>("table");
  const [actionMenuId, setActionMenuId] = useState<string | null>(null);
  const [recentGains, setRecentGains] = useState<Record<string, number | null>>({});
  const [recentGainsLoading, setRecentGainsLoading] = useState(false);

  useEffect(() => {
    async function fetchAssets() {
      if (!currentPortfolio) {
        setAssets([]);
        setLoading(false);
        return;
      }
      try {
        const res = await fetch(`/api/assets?portfolioId=${currentPortfolio.id}`);
        if (!res.ok) throw new Error("Failed to fetch");
        const data = await res.json();
        setAssets(Array.isArray(data) ? data : []);
      } catch (error) {
        console.error("Error fetching assets:", error);
        setAssets([]);
      } finally {
        setLoading(false);
      }
    }
    if (currentPortfolio) {
      setLoading(true);
      fetchAssets();
    } else if (!portfolioLoading) {
      setLoading(false);
    }
  }, [currentPortfolio, portfolioLoading]);

  // Fetch recent gain data when gain sort is selected
  useEffect(() => {
    if (!currentPortfolio || (sortField !== "gain_7d" && sortField !== "gain_30d")) return;
    const days = sortField === "gain_7d" ? 7 : 30;
    setRecentGainsLoading(true);
    fetch(`/api/assets/recent-changes?portfolioId=${currentPortfolio.id}&days=${days}`)
      .then((r) => r.json())
      .then((data: { asset_id: string; change_pct: number | null }[]) => {
        const map: Record<string, number | null> = {};
        for (const item of data) map[item.asset_id] = item.change_pct;
        setRecentGains(map);
      })
      .catch(console.error)
      .finally(() => setRecentGainsLoading(false));
  }, [sortField, currentPortfolio]);

  // Close action menu on outside click
  useEffect(() => {
    if (!actionMenuId) return;
    const handler = () => setActionMenuId(null);
    document.addEventListener("click", handler);
    return () => document.removeEventListener("click", handler);
  }, [actionMenuId]);

  const activeAssets = useMemo(() => assets.filter(isActive), [assets]);

  const rawCardCount = useMemo(() => activeAssets.filter((a) => a.asset_type === "card" && !a.psa_grade).length, [activeAssets]);
  const gradedCardCount = useMemo(() => activeAssets.filter((a) => a.asset_type === "card" && !!a.psa_grade).length, [activeAssets]);
  const sealedCount = useMemo(() => activeAssets.filter((a) => a.asset_type === "sealed").length, [activeAssets]);
  const soldCount = useMemo(() => assets.filter((a) => a.status === "SOLD").length, [assets]);
  const staleCount = useMemo(() => activeAssets.filter(isPriceStale).length, [activeAssets]);

  const filtered = useMemo(() => {
    let result = [...assets];

    if (search) {
      const q = search.toLowerCase();
      result = result.filter(
        (a) =>
          a.name.toLowerCase().includes(q) ||
          a.set_name.toLowerCase().includes(q)
      );
    }

    if (typeTab === "all") {
      // Show all assets (active + sold); sold ones will be greyed in the table
    } else if (typeTab === "raw") {
      result = result.filter((a) => isActive(a) && a.asset_type === "card" && !a.psa_grade);
    } else if (typeTab === "graded") {
      result = result.filter((a) => isActive(a) && a.asset_type === "card" && !!a.psa_grade);
    } else if (typeTab === "sealed") {
      result = result.filter((a) => isActive(a) && a.asset_type === "sealed");
    } else if (typeTab === "sold") {
      result = result.filter((a) => a.status === "SOLD");
    }

    result.sort((a, b) => {
      // In "all" tab, push sold items to the bottom
      if (typeTab === "all") {
        const aSold = a.status === "SOLD";
        const bSold = b.status === "SOLD";
        if (aSold !== bSold) return aSold ? 1 : -1;
      }

      const qtyA = a.quantity || 1;
      const qtyB = b.quantity || 1;
      let valA: number, valB: number;
      switch (sortField) {
        case "name":
          return sortDir === "asc"
            ? a.name.localeCompare(b.name)
            : b.name.localeCompare(a.name);
        case "set_name":
          return sortDir === "asc"
            ? a.set_name.localeCompare(b.set_name)
            : b.set_name.localeCompare(a.set_name);
        case "quantity":
          valA = qtyA;
          valB = qtyB;
          break;
        case "gain_7d":
        case "gain_30d": {
          const gA = recentGains[a.id];
          const gB = recentGains[b.id];
          // Assets with no snapshot data sort to the bottom
          if (gA == null && gB == null) return 0;
          if (gA == null) return 1;
          if (gB == null) return -1;
          return sortDir === "asc" ? gA - gB : gB - gA;
        }
        case "purchase_price":
          valA = a.purchase_price * qtyA;
          valB = b.purchase_price * qtyB;
          break;
        case "current_price":
          valA = (a.current_price ?? a.purchase_price) * qtyA;
          valB = (b.current_price ?? b.purchase_price) * qtyB;
          break;
        case "profit":
          valA = ((a.current_price ?? a.purchase_price) - a.purchase_price) * qtyA;
          valB = ((b.current_price ?? b.purchase_price) - b.purchase_price) * qtyB;
          break;
        case "performance":
          valA = a.purchase_price > 0
            ? ((a.current_price ?? a.purchase_price) - a.purchase_price) / a.purchase_price
            : 0;
          valB = b.purchase_price > 0
            ? ((b.current_price ?? b.purchase_price) - b.purchase_price) / b.purchase_price
            : 0;
          break;
        case "purchase_date":
          valA = new Date(a.purchase_date).getTime();
          valB = new Date(b.purchase_date).getTime();
          break;
        default:
          return 0;
      }
      return sortDir === "asc" ? valA - valB : valB - valA;
    });

    return result;
  }, [assets, search, typeTab, sortField, sortDir, recentGains]);

  // Footer totals — active assets only (or sold tab uses sell prices)
  const footerAssets = typeTab === "sold"
    ? filtered
    : filtered.filter(isActive);

  const totalValue = typeTab === "sold"
    ? footerAssets.reduce((sum, a) => sum + (a.sell_price ?? a.purchase_price) * (a.quantity || 1), 0)
    : footerAssets.reduce((sum, a) => sum + (a.current_price ?? a.purchase_price) * (a.quantity || 1), 0);
  const totalInvested = footerAssets.reduce(
    (sum, a) => sum + a.purchase_price * (a.quantity || 1),
    0
  );

  const handleDelete = async (id: string) => {
    if (!confirm("Remove this asset from your collection?")) return;
    try {
      const res = await fetch(`/api/assets?id=${id}`, { method: "DELETE" });
      if (res.ok) {
        setAssets((prev) => prev.filter((a) => a.id !== id));
      }
    } catch {
      alert("Failed to delete asset");
    }
  };

  if (loading) {
    return (
      <div className="space-y-6 md:space-y-8">
        <div>
          <h1 className="text-xl md:text-2xl font-bold text-text-primary">Collection</h1>
          <p className="text-text-muted mt-1 text-sm">Loading your assets...</p>
        </div>
        <div className="space-y-2">
          {[...Array(8)].map((_, i) => (
            <div key={i} className="skeleton h-14 rounded-xl" />
          ))}
        </div>
      </div>
    );
  }

  const isSoldTab = typeTab === "sold";

  // Table columns change between active and sold tabs
  const activeColumns = [
    { label: "Card", field: "name" as SortField, align: "left" },
    { label: "Purchase Date", field: "purchase_date" as SortField, align: "left" },
    { label: "Market Price", field: "current_price" as SortField, align: "left" },
    { label: "Price Chart", field: null, align: "center" },
    { label: "Qty", field: null, align: "center" },
    { label: "Total", field: "current_price" as SortField, align: "right" },
    { label: "Invested", field: "purchase_price" as SortField, align: "right" },
    { label: "Profit/Loss", field: "profit" as SortField, align: "right" },
    { label: "Performance", field: "performance" as SortField, align: "right" },
  ];

  const soldColumns = [
    { label: "Card", field: "name" as SortField, align: "left" },
    { label: "Purchase Date", field: "purchase_date" as SortField, align: "left" },
    { label: "Sell Date", field: null, align: "left" },
    { label: "Qty", field: null, align: "center" },
    { label: "Sell Price", field: null, align: "right" },
    { label: "Invested", field: "purchase_price" as SortField, align: "right" },
    { label: "Realised P/L", field: "profit" as SortField, align: "right" },
    { label: "Realised %", field: "performance" as SortField, align: "right" },
  ];

  const columns = isSoldTab ? soldColumns : activeColumns;

  return (
    <div className="space-y-4 md:space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between gap-3">
        <div className="min-w-0">
          <h1 className="text-xl md:text-2xl font-bold text-text-primary">Collection</h1>
          <p className="text-text-muted mt-1 text-xs md:text-sm">
            {filtered.length} asset{filtered.length !== 1 ? "s" : ""} &middot;{" "}
            {isSoldTab
              ? `${formatCurrency(totalValue)} sold`
              : `${formatCurrency(totalValue)} total value`}
          </p>
          <MarketDisclaimer variant="long" showIcon className="mt-1" />
        </div>
        {!isReadOnly && (
          <Link
            href="/dashboard/add"
            className="flex items-center gap-2 px-3 md:px-5 py-2.5 md:py-3 bg-accent hover:bg-accent-hover text-black font-semibold rounded-xl text-sm flex-shrink-0"
          >
            <PlusCircle className="w-4 h-4 md:w-5 md:h-5" />
            <span className="hidden md:inline">Add Asset</span>
            <span className="md:hidden">Add</span>
          </Link>
        )}
      </div>

      {/* Search bar */}
      <div className="relative">
        <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-text-muted" />
        <input
          type="text"
          placeholder="Search cards and products..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full pl-11 pr-4 py-3 bg-surface border border-border rounded-xl text-text-primary placeholder-text-muted outline-none focus:border-accent text-sm"
        />
      </div>

      {/* Stale price warning banner — active assets only */}
      {staleCount > 0 && !isSoldTab && (
        <div className="flex items-center gap-3 px-5 py-4 bg-danger/15 border-2 border-danger/50 rounded-xl">
          <div className="w-10 h-10 rounded-full bg-danger/20 flex items-center justify-center flex-shrink-0">
            <AlertTriangle className="w-5 h-5 text-danger" />
          </div>
          <div>
            <p className="text-sm font-bold text-danger">
              Price Update Required
            </p>
            <p className="text-sm text-danger/80 mt-0.5">
              <span className="font-semibold">{staleCount} asset{staleCount !== 1 ? "s" : ""}</span>{" "}
              {staleCount === 1 ? "has" : "have"} not had {staleCount === 1 ? "its" : "their"} price updated in over 30 days.
              Update prices to keep your portfolio accurate.
            </p>
          </div>
        </div>
      )}

      {/* Tabs */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
        <div className="flex gap-1 border-b border-border overflow-x-auto scrollbar-hide" style={{ scrollbarWidth: "none" }}>
          {([
            { key: "all" as TypeTab, label: `All (${assets.length})` },
            { key: "raw" as TypeTab, label: `Raw Cards (${rawCardCount})` },
            { key: "graded" as TypeTab, label: `Graded (${gradedCardCount})` },
            { key: "sealed" as TypeTab, label: `Sealed (${sealedCount})` },
            { key: "sold" as TypeTab, label: `Sold (${soldCount})` },
          ]).map((tab) => (
            <button
              key={tab.key}
              onClick={() => setTypeTab(tab.key)}
              className={`px-3 md:px-4 py-2.5 text-xs md:text-sm font-medium border-b-2 -mb-px whitespace-nowrap ${
                typeTab === tab.key
                  ? "border-gold text-gold"
                  : "border-transparent text-text-muted hover:text-text-secondary"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
        <div className="flex items-center gap-2">
          {/* Sort controls — always on mobile, also on desktop in grid view */}
          <div className={`flex items-center gap-2 ${view === "grid" ? "flex" : "flex md:hidden"}`}>
            {recentGainsLoading && (
              <span className="w-3 h-3 rounded-full border-2 border-accent border-t-transparent animate-spin" />
            )}
            <SlidersHorizontal className="w-4 h-4 text-text-muted" />
            <select
              value={sortField}
              onChange={(e) => setSortField(e.target.value as SortField)}
              className="bg-surface border border-border rounded-xl px-3 py-2 text-text-primary text-xs outline-none"
            >
              <option value="purchase_date">Date Added</option>
              <option value="name">Name</option>
              <option value="set_name">Set</option>
              <option value="quantity">Quantity</option>
              <option value="purchase_price">Invested</option>
              <option value="current_price">Market Price</option>
              <option value="profit">Profit/Loss</option>
              <option value="performance">Performance</option>
              <option value="gain_7d">7-Day Gain</option>
              <option value="gain_30d">30-Day Gain</option>
            </select>
            <button
              onClick={() => setSortDir((d) => (d === "asc" ? "desc" : "asc"))}
              className="p-2 bg-surface border border-border rounded-xl text-text-secondary hover:text-text-primary"
              title={sortDir === "asc" ? "Ascending" : "Descending"}
            >
              {sortDir === "asc" ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
            </button>
          </div>

          {/* View mode */}
          <div className="flex gap-1 bg-surface rounded-xl p-1 border border-border">
            <button
              onClick={() => setView("table")}
              className={`p-2 rounded-lg ${
                view === "table"
                  ? "bg-gold/20 text-gold"
                  : "text-text-secondary hover:text-text-primary"
              }`}
            >
              <List className="w-4 h-4" />
            </button>
            <button
              onClick={() => setView("grid")}
              className={`p-2 rounded-lg ${
                view === "grid"
                  ? "bg-gold/20 text-gold"
                  : "text-text-secondary hover:text-text-primary"
              }`}
            >
              <Grid3X3 className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Grid View */}
      {view === "grid" && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3 md:gap-4">
          {filtered.map((asset) => (
            <div key={asset.id} className={asset.status === "SOLD" ? "opacity-60" : ""}>
              <AssetCard asset={asset} />
            </div>
          ))}
        </div>
      )}

      {/* Table View */}
      {view === "table" && (
        <div className="bg-surface border border-border rounded-2xl overflow-hidden">
          {/* Desktop table */}
          <div className="overflow-x-auto hidden md:block">
            <table className="w-full">
              <thead>
                <tr className="border-b border-border">
                  {columns.map((col, i) => (
                    <th
                      key={i}
                      className={`px-4 py-3 text-xs font-semibold text-text-muted uppercase tracking-wider ${
                        col.align === "right" ? "text-right" : col.align === "center" ? "text-center" : "text-left"
                      } ${col.field ? "cursor-pointer hover:text-text-primary select-none" : ""}`}
                      onClick={col.field ? () => {
                        if (sortField === col.field) {
                          setSortDir((d) => (d === "asc" ? "desc" : "asc"));
                        } else {
                          setSortField(col.field!);
                          setSortDir("desc");
                        }
                      } : undefined}
                    >
                      <span className={`inline-flex items-center gap-1 ${col.align === "right" ? "justify-end" : ""}`}>
                        {col.label}
                        {col.field && (
                          sortField === col.field ? (
                            sortDir === "asc" ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />
                          ) : (
                            <ChevronsUpDown className="w-3 h-3 opacity-40" />
                          )
                        )}
                      </span>
                    </th>
                  ))}
                  <th className="text-center px-2 py-3 text-xs font-semibold text-text-muted uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {filtered.map((asset) => {
                  const qty = asset.quantity || 1;
                  const sold = asset.status === "SOLD";

                  if (isSoldTab && sold) {
                    // Sold tab: dedicated sold column layout
                    const sellTotal = (asset.sell_price ?? asset.purchase_price) * qty;
                    const invested = asset.purchase_price * qty;
                    const realisedPnL = sellTotal - invested;
                    const realisedPct = invested > 0 ? (realisedPnL / invested) * 100 : 0;

                    return (
                      <tr
                        key={asset.id}
                        className="hover:bg-surface-hover cursor-pointer group"
                        onClick={() => (window.location.href = `/asset/${asset.id}`)}
                      >
                        {/* Product */}
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 bg-background rounded-lg overflow-hidden flex-shrink-0 relative">
                              {(asset.custom_image_url || asset.image_url) && (
                                <img
                                  src={fixStorageUrl(asset.custom_image_url) || asset.image_url || ""}
                                  alt=""
                                  className="w-full h-full object-contain p-0.5"
                                  onError={(e) => {
                                    const target = e.currentTarget;
                                    if (asset.custom_image_url && asset.image_url && target.src !== asset.image_url) {
                                      target.src = asset.image_url;
                                    } else {
                                      target.style.display = "none";
                                    }
                                  }}
                                />
                              )}
                            </div>
                            <div className="min-w-0">
                              <p className="text-sm font-semibold text-text-primary truncate max-w-[200px]">
                                {asset.name}
                              </p>
                              <div className="flex items-center gap-1.5 mt-0.5">
                                {asset.psa_grade && (
                                  <span className="text-[10px] text-gold font-medium">{asset.psa_grade}</span>
                                )}
                                <span className="text-[10px] font-bold text-text-muted bg-surface-hover px-1.5 py-0.5 rounded">SOLD</span>
                              </div>
                            </div>
                          </div>
                        </td>

                        {/* Purchase Date */}
                        <td className="px-4 py-3 text-sm text-text-secondary whitespace-nowrap">
                          {formatDate(asset.purchase_date)}
                        </td>

                        {/* Sell Date */}
                        <td className="px-4 py-3 text-sm text-text-secondary whitespace-nowrap">
                          {asset.sell_date ? formatDate(asset.sell_date) : <span className="text-text-muted">—</span>}
                        </td>

                        {/* Qty */}
                        <td className="px-4 py-3 text-sm text-text-primary text-center font-medium">
                          {qty}
                        </td>

                        {/* Sell Price */}
                        <td className="px-4 py-3 text-sm font-bold text-text-primary text-right whitespace-nowrap">
                          {asset.sell_price != null ? formatCurrency(asset.sell_price * qty) : <span className="text-text-muted">—</span>}
                        </td>

                        {/* Invested */}
                        <td className="px-4 py-3 text-right">
                          <p className="text-sm font-semibold text-text-primary">
                            {formatCurrency(invested)}
                          </p>
                        </td>

                        {/* Realised P/L */}
                        <td className="px-4 py-3 text-right">
                          <span className={`text-sm font-bold ${realisedPnL > 0 ? "text-success" : realisedPnL < 0 ? "text-danger" : "text-text-secondary"}`}>
                            {formatCurrency(realisedPnL)}
                          </span>
                        </td>

                        {/* Realised % */}
                        <td className="px-4 py-3 text-right">
                          <span className={`text-sm font-semibold flex items-center justify-end gap-1 ${realisedPct > 0 ? "text-success" : realisedPct < 0 ? "text-danger" : "text-text-secondary"}`}>
                            {realisedPct > 0 ? "+" : ""}{realisedPct.toFixed(1)}%
                            {realisedPct !== 0 && <TrendingUp className={`w-3.5 h-3.5 ${realisedPct < 0 ? "rotate-180" : ""}`} />}
                          </span>
                        </td>

                        {/* Actions */}
                        <td className="px-2 py-3 text-center" onClick={(e) => e.stopPropagation()}>
                          <div className="relative">
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                setActionMenuId(actionMenuId === asset.id ? null : asset.id);
                              }}
                              className="p-1.5 rounded-lg text-text-muted hover:text-text-primary hover:bg-surface-hover"
                            >
                              <MoreVertical className="w-4 h-4" />
                            </button>
                            {actionMenuId === asset.id && (
                              <div className="absolute right-0 top-full mt-1 bg-surface-elevated border border-border rounded-xl shadow-lg z-20 min-w-[140px]">
                                <Link
                                  href={`/asset/${asset.id}`}
                                  className={`flex items-center gap-2 px-3 py-2 text-sm text-text-secondary hover:bg-surface-hover hover:text-text-primary ${isReadOnly ? "rounded-xl" : "rounded-t-xl"}`}
                                >
                                  <Pencil className="w-3.5 h-3.5" />
                                  {isReadOnly ? "View" : "View / Edit"}
                                </Link>
                                {!isReadOnly && (
                                  <button
                                    onClick={() => handleDelete(asset.id)}
                                    className="w-full flex items-center gap-2 px-3 py-2 text-sm text-danger hover:bg-danger-muted rounded-b-xl"
                                  >
                                    <Trash2 className="w-3.5 h-3.5" />
                                    Remove
                                  </button>
                                )}
                              </div>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  }

                  // Active row rendering (also used for sold items in "All" tab)
                  const marketPrice = sold ? (asset.sell_price ?? asset.purchase_price) : (asset.current_price ?? asset.purchase_price);
                  const total = marketPrice * qty;
                  const invested = asset.purchase_price * qty;
                  const avgPer = asset.purchase_price;
                  const profit = total - invested;
                  const perfPct = invested > 0 ? (profit / invested) * 100 : 0;
                  const stale = !sold && isPriceStale(asset);

                  return (
                    <tr
                      key={asset.id}
                      className={`hover:bg-surface-hover cursor-pointer group ${sold ? "opacity-50" : ""}`}
                      onClick={() => (window.location.href = `/asset/${asset.id}`)}
                    >
                      {/* Product */}
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 bg-background rounded-lg overflow-hidden flex-shrink-0 relative">
                            {(asset.custom_image_url || asset.image_url) && (
                              <img
                                src={fixStorageUrl(asset.custom_image_url) || asset.image_url || ""}
                                alt=""
                                className="w-full h-full object-contain p-0.5"
                                onError={(e) => {
                                  const target = e.currentTarget;
                                  if (asset.custom_image_url && asset.image_url && target.src !== asset.image_url) {
                                    target.src = asset.image_url;
                                  } else {
                                    target.style.display = "none";
                                  }
                                }}
                              />
                            )}
                          </div>
                          <div className="min-w-0">
                            <p className="text-sm font-semibold text-text-primary truncate max-w-[200px]">
                              {asset.name}
                            </p>
                            <div className="flex items-center gap-1.5 mt-0.5">
                              {asset.psa_grade && (
                                <span className="text-[10px] text-gold font-medium">
                                  {asset.psa_grade}
                                </span>
                              )}
                              {sold && (
                                <span className="text-[10px] font-bold text-text-muted bg-surface-hover px-1.5 py-0.5 rounded">SOLD</span>
                              )}
                            </div>
                          </div>
                        </div>
                      </td>

                      {/* Purchase Date */}
                      <td className="px-4 py-3 text-sm text-text-secondary whitespace-nowrap">
                        {formatDate(asset.purchase_date)}
                      </td>

                      {/* Market Price (or Sold Price for sold items in All tab) */}
                      <td className="px-4 py-3">
                        <div>
                          {sold ? (
                            <div className="flex items-center gap-1 mb-0.5">
                              <span className="text-[10px] font-semibold text-text-muted">Sold Price</span>
                            </div>
                          ) : asset.manual_price ? (
                            <div className="flex items-center gap-1 mb-0.5">
                              <PenLine className="w-2.5 h-2.5 text-warning" />
                              <span className="text-[10px] font-semibold text-warning">Manual</span>
                            </div>
                          ) : null}
                          <div className="flex items-center gap-1.5">
                            <span className={`text-sm font-semibold ${sold ? "text-text-secondary" : stale ? "text-danger" : asset.manual_price ? "text-warning" : "text-gold"}`}>
                              {formatCurrency(marketPrice)}
                            </span>
                            {!sold && asset.is_converted_price && (
                              <span className="text-[9px] font-medium text-blue-400 bg-blue-500/10 px-1 py-0.5 rounded leading-none" title="Converted from EUR to USD">~USD</span>
                            )}
                            {stale && (
                              <span className="text-[9px] font-bold text-danger bg-danger/15 px-1 py-0.5 rounded leading-none">STALE</span>
                            )}
                          </div>
                        </div>
                      </td>

                      {/* Mini sparkline */}
                      <td className="px-4 py-3" onClick={(e) => e.stopPropagation()}>
                        <div className="w-24 h-8 mx-auto">
                          {sold ? (
                            <span className="text-text-muted text-xs">—</span>
                          ) : (
                            <MiniSparkline
                              assetId={asset.external_id}
                              assetName={asset.name}
                              assetType={asset.asset_type}
                              currentPrice={marketPrice}
                              purchasePrice={asset.purchase_price}
                            />
                          )}
                        </div>
                      </td>

                      {/* Qty */}
                      <td className="px-4 py-3 text-sm text-text-primary text-center font-medium">
                        {qty}
                      </td>

                      {/* Total */}
                      <td className="px-4 py-3 text-sm font-bold text-text-primary text-right whitespace-nowrap">
                        {formatCurrency(total)}
                      </td>

                      {/* Invested */}
                      <td className="px-4 py-3 text-right">
                        <div>
                          <p className="text-sm font-semibold text-text-primary">
                            {formatCurrency(invested)}
                          </p>
                          {qty > 1 && (
                            <p className="text-[10px] text-text-muted">
                              Avg. {formatCurrency(avgPer)} ea
                            </p>
                          )}
                        </div>
                      </td>

                      {/* Profit/Loss */}
                      <td className="px-4 py-3 text-right">
                        <span
                          className={`text-sm font-bold ${
                            profit > 0
                              ? "text-success"
                              : profit < 0
                                ? "text-danger"
                                : "text-text-secondary"
                          }`}
                        >
                          {formatCurrency(profit)}
                        </span>
                      </td>

                      {/* Performance */}
                      <td className="px-4 py-3 text-right">
                        <span
                          className={`text-sm font-semibold flex items-center justify-end gap-1 ${
                            perfPct > 0
                              ? "text-success"
                              : perfPct < 0
                                ? "text-danger"
                                : "text-text-secondary"
                          }`}
                        >
                          {perfPct > 0 ? "+" : ""}{perfPct.toFixed(1)}%
                          {perfPct !== 0 && <TrendingUp className={`w-3.5 h-3.5 ${perfPct < 0 ? "rotate-180" : ""}`} />}
                        </span>
                      </td>

                      {/* Actions */}
                      <td className="px-2 py-3 text-center" onClick={(e) => e.stopPropagation()}>
                        <div className="relative">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              setActionMenuId(actionMenuId === asset.id ? null : asset.id);
                            }}
                            className="p-1.5 rounded-lg text-text-muted hover:text-text-primary hover:bg-surface-hover"
                          >
                            <MoreVertical className="w-4 h-4" />
                          </button>
                          {actionMenuId === asset.id && (
                            <div className="absolute right-0 top-full mt-1 bg-surface-elevated border border-border rounded-xl shadow-lg z-20 min-w-[140px]">
                              <Link
                                href={`/asset/${asset.id}`}
                                className={`flex items-center gap-2 px-3 py-2 text-sm text-text-secondary hover:bg-surface-hover hover:text-text-primary ${isReadOnly ? "rounded-xl" : "rounded-t-xl"}`}
                              >
                                <Pencil className="w-3.5 h-3.5" />
                                {isReadOnly ? "View" : "View / Edit"}
                              </Link>
                              {!isReadOnly && (
                                <button
                                  onClick={() => handleDelete(asset.id)}
                                  className="w-full flex items-center gap-2 px-3 py-2 text-sm text-danger hover:bg-danger-muted rounded-b-xl"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                  Remove
                                </button>
                              )}
                            </div>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
              <tfoot>
                <tr className="border-t border-border bg-surface-hover/50">
                  <td colSpan={isSoldTab ? 4 : 5} className="px-4 py-3 text-sm font-semibold text-text-secondary">
                    Totals
                  </td>
                  <td className="px-4 py-3 text-sm font-bold text-text-primary text-right">
                    {formatCurrency(totalValue)}
                  </td>
                  <td className="px-4 py-3 text-sm font-bold text-text-primary text-right">
                    {formatCurrency(totalInvested)}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <span className={`text-sm font-bold ${
                      totalValue - totalInvested > 0 ? "text-success"
                        : totalValue - totalInvested < 0 ? "text-danger"
                          : "text-text-secondary"
                    }`}>
                      {formatCurrency(totalValue - totalInvested)}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <span className={`text-sm font-bold ${
                      totalValue - totalInvested > 0 ? "text-success"
                        : totalValue - totalInvested < 0 ? "text-danger"
                          : "text-text-secondary"
                    }`}>
                      {totalInvested > 0 ? `${(((totalValue - totalInvested) / totalInvested) * 100).toFixed(1)}%` : "0%"}
                    </span>
                  </td>
                  <td />
                </tr>
              </tfoot>
            </table>
          </div>

          {/* Mobile list */}
          <div className="md:hidden divide-y divide-border">
            {filtered.map((asset) => {
              const qty = asset.quantity || 1;
              const sold = asset.status === "SOLD";

              if (sold) {
                const sellTotal = (asset.sell_price ?? asset.purchase_price) * qty;
                const invested = asset.purchase_price * qty;
                const realisedPnL = sellTotal - invested;
                const realisedPct = invested > 0 ? (realisedPnL / invested) * 100 : 0;

                return (
                  <div
                    key={asset.id}
                    className="flex items-center gap-3 p-3 hover:bg-surface-hover cursor-pointer opacity-70"
                    onClick={() => (window.location.href = `/asset/${asset.id}`)}
                  >
                    <div className="w-10 h-10 bg-background rounded-lg overflow-hidden flex-shrink-0 relative">
                      {(asset.custom_image_url || asset.image_url) && (
                        <img
                          src={fixStorageUrl(asset.custom_image_url) || asset.image_url || ""}
                          alt=""
                          className="w-full h-full object-contain p-0.5"
                          onError={(e) => {
                            const target = e.currentTarget;
                            if (asset.custom_image_url && asset.image_url && target.src !== asset.image_url) {
                              target.src = asset.image_url;
                            } else {
                              target.style.display = "none";
                            }
                          }}
                        />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-text-primary truncate">
                        {asset.name}
                      </p>
                      <div className="flex items-center gap-1.5 mt-0.5">
                        <span className="text-[10px] font-bold text-text-muted bg-surface-hover px-1.5 py-0.5 rounded">SOLD</span>
                        {asset.sell_date && (
                          <span className="text-[10px] text-text-muted">{formatDate(asset.sell_date)}</span>
                        )}
                      </div>
                    </div>
                    <div className="text-right flex-shrink-0">
                      <p className="text-sm font-semibold text-text-primary">
                        {asset.sell_price != null ? formatCurrency(asset.sell_price * qty) : "—"}
                      </p>
                      <p className={`text-xs font-medium ${realisedPnL > 0 ? "text-success" : realisedPnL < 0 ? "text-danger" : "text-text-secondary"}`}>
                        {realisedPnL >= 0 ? "+" : ""}{realisedPct.toFixed(1)}%
                      </p>
                    </div>
                  </div>
                );
              }

              const marketPrice = asset.current_price ?? asset.purchase_price;
              const total = marketPrice * qty;
              const invested = asset.purchase_price * qty;
              const profit = total - invested;
              const perfPct = invested > 0 ? (profit / invested) * 100 : 0;
              const stale = isPriceStale(asset);

              return (
                <div
                  key={asset.id}
                  className="flex items-center gap-3 p-3 hover:bg-surface-hover cursor-pointer"
                  onClick={() => (window.location.href = `/asset/${asset.id}`)}
                >
                  <div className="w-10 h-10 bg-background rounded-lg overflow-hidden flex-shrink-0 relative">
                    {(asset.custom_image_url || asset.image_url) && (
                      <img
                        src={fixStorageUrl(asset.custom_image_url) || asset.image_url || ""}
                        alt=""
                        className="w-full h-full object-contain p-0.5"
                        onError={(e) => {
                          const target = e.currentTarget;
                          if (asset.custom_image_url && asset.image_url && target.src !== asset.image_url) {
                            target.src = asset.image_url;
                          } else {
                            target.style.display = "none";
                          }
                        }}
                      />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-text-primary truncate">
                      {asset.name}
                    </p>
                    <div className="flex items-center gap-1.5 mt-0.5">
                      {asset.psa_grade && (
                        <span className="text-[10px] text-gold font-medium">{asset.psa_grade}</span>
                      )}
                      {qty > 1 && (
                        <span className="text-[10px] text-text-muted">x{qty}</span>
                      )}
                      {asset.manual_price && (
                        <span className="flex items-center gap-0.5">
                          <PenLine className="w-2.5 h-2.5 text-warning" />
                          <span className="text-[10px] font-semibold text-warning">Manual</span>
                        </span>
                      )}
                      {stale && (
                        <span className="text-[8px] font-bold text-danger bg-danger/15 px-1 py-0.5 rounded leading-none">STALE</span>
                      )}
                    </div>
                  </div>
                  <div className="text-right flex-shrink-0">
                    <p className={`text-sm font-semibold ${stale ? "text-danger" : "text-text-primary"}`}>
                      {formatCurrency(total)}
                    </p>
                    <p
                      className={`text-xs font-medium ${
                        profit > 0
                          ? "text-success"
                          : profit < 0
                            ? "text-danger"
                            : "text-text-secondary"
                      }`}
                    >
                      {profit >= 0 ? "+" : ""}
                      {perfPct.toFixed(1)}%
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Empty state */}
      {filtered.length === 0 && assets.length > 0 && (
        <div className="bg-surface border border-border rounded-2xl p-8 md:p-12 text-center">
          <Search className="w-10 h-10 md:w-12 md:h-12 text-text-muted mx-auto mb-3" />
          <p className="text-text-secondary text-sm md:text-base">
            No assets match your current filters
          </p>
        </div>
      )}

      {assets.length === 0 && (
        <div className="bg-surface border border-border rounded-2xl p-10 md:p-16 text-center">
          <Search className="w-12 h-12 md:w-16 md:h-16 text-text-muted mx-auto mb-4" />
          <h2 className="text-lg md:text-xl font-bold text-text-primary">
            Your collection is empty
          </h2>
          <p className="text-text-secondary mt-2 max-w-md mx-auto text-sm">
            Start building your portfolio by adding your first card or sealed product.
          </p>
          <Link
            href="/dashboard/add"
            className="inline-flex items-center gap-2 px-6 py-3 bg-accent hover:bg-accent-hover text-black font-semibold rounded-xl mt-6"
          >
            <PlusCircle className="w-5 h-5" />
            Add Your First Asset
          </Link>
        </div>
      )}
    </div>
  );
}
