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
} from "lucide-react";
import AssetCard from "@/components/AssetCard";
import { formatCurrency } from "@/lib/format";
import type { PortfolioAsset } from "@/types";

type SortField = "name" | "purchase_price" | "current_price" | "profit" | "purchase_date";
type SortDir = "asc" | "desc";
type ViewMode = "grid" | "list";

export default function CollectionPage() {
  const [assets, setAssets] = useState<PortfolioAsset[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState<"all" | "card" | "sealed">("all");
  const [sortField, setSortField] = useState<SortField>("purchase_date");
  const [sortDir, setSortDir] = useState<SortDir>("desc");
  const [view, setView] = useState<ViewMode>("grid");

  useEffect(() => {
    async function fetchAssets() {
      try {
        const res = await fetch("/api/assets");
        if (!res.ok) throw new Error("Failed to fetch");
        const data = await res.json();
        setAssets(data);
      } catch (error) {
        console.error("Error fetching assets:", error);
      } finally {
        setLoading(false);
      }
    }
    fetchAssets();
  }, []);

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

    if (typeFilter !== "all") {
      result = result.filter((a) => a.asset_type === typeFilter);
    }

    result.sort((a, b) => {
      let valA: number, valB: number;
      switch (sortField) {
        case "name":
          return sortDir === "asc"
            ? a.name.localeCompare(b.name)
            : b.name.localeCompare(a.name);
        case "purchase_price":
          valA = a.purchase_price;
          valB = b.purchase_price;
          break;
        case "current_price":
          valA = a.current_price ?? a.purchase_price;
          valB = b.current_price ?? b.purchase_price;
          break;
        case "profit":
          valA =
            (a.current_price ?? a.purchase_price) - a.purchase_price;
          valB =
            (b.current_price ?? b.purchase_price) - b.purchase_price;
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
  }, [assets, search, typeFilter, sortField, sortDir]);

  const totalValue = filtered.reduce(
    (sum, a) => sum + (a.current_price ?? a.purchase_price),
    0
  );

  if (loading) {
    return (
      <div className="space-y-8">
        <div>
          <h1 className="text-2xl font-bold text-text-primary">Collection</h1>
          <p className="text-text-muted mt-1">Loading your assets...</p>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {[...Array(8)].map((_, i) => (
            <div key={i} className="skeleton h-80 rounded-2xl" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-text-primary">Collection</h1>
          <p className="text-text-muted mt-1">
            {filtered.length} asset{filtered.length !== 1 ? "s" : ""} &middot;{" "}
            {formatCurrency(totalValue)} total value
          </p>
        </div>
        <Link
          href="/dashboard/add"
          className="flex items-center gap-2 px-5 py-3 bg-accent hover:bg-accent-hover text-white font-semibold rounded-xl"
        >
          <PlusCircle className="w-5 h-5" />
          Add Asset
        </Link>
      </div>

      {/* Filters */}
      <div className="bg-surface border border-border rounded-2xl p-4">
        <div className="flex flex-wrap items-center gap-3">
          {/* Search */}
          <div className="flex-1 min-w-[200px] relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-muted" />
            <input
              type="text"
              placeholder="Search your collection..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 bg-background border border-border rounded-xl text-text-primary placeholder-text-muted outline-none focus:border-accent text-sm"
            />
          </div>

          {/* Type filter */}
          <div className="flex gap-1 bg-background rounded-xl p-1">
            {(["all", "card", "sealed"] as const).map((t) => (
              <button
                key={t}
                onClick={() => setTypeFilter(t)}
                className={`px-3 py-2 rounded-lg text-xs font-medium capitalize ${
                  typeFilter === t
                    ? "bg-accent text-white"
                    : "text-text-secondary hover:text-text-primary"
                }`}
              >
                {t === "all" ? "All" : t === "card" ? "Cards" : "Sealed"}
              </button>
            ))}
          </div>

          {/* Sort */}
          <div className="flex items-center gap-2">
            <SlidersHorizontal className="w-4 h-4 text-text-muted" />
            <select
              value={sortField}
              onChange={(e) => setSortField(e.target.value as SortField)}
              className="bg-background border border-border rounded-xl px-3 py-2.5 text-text-primary text-xs outline-none"
            >
              <option value="purchase_date">Date Added</option>
              <option value="name">Name</option>
              <option value="purchase_price">Purchase Price</option>
              <option value="current_price">Current Value</option>
              <option value="profit">Profit/Loss</option>
            </select>
            <button
              onClick={() => setSortDir((d) => (d === "asc" ? "desc" : "asc"))}
              className="p-2.5 bg-background border border-border rounded-xl text-text-secondary hover:text-text-primary"
            >
              <ArrowUpDown className="w-4 h-4" />
            </button>
          </div>

          {/* View mode */}
          <div className="flex gap-1 bg-background rounded-xl p-1">
            <button
              onClick={() => setView("grid")}
              className={`p-2 rounded-lg ${
                view === "grid"
                  ? "bg-accent text-white"
                  : "text-text-secondary hover:text-text-primary"
              }`}
            >
              <Grid3X3 className="w-4 h-4" />
            </button>
            <button
              onClick={() => setView("list")}
              className={`p-2 rounded-lg ${
                view === "list"
                  ? "bg-accent text-white"
                  : "text-text-secondary hover:text-text-primary"
              }`}
            >
              <List className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Grid View */}
      {view === "grid" && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {filtered.map((asset) => (
            <AssetCard key={asset.id} asset={asset} />
          ))}
        </div>
      )}

      {/* List View */}
      {view === "list" && (
        <div className="bg-surface border border-border rounded-2xl overflow-hidden">
          <table className="w-full">
            <thead>
              <tr className="border-b border-border">
                <th className="text-left px-6 py-4 text-xs font-semibold text-text-muted uppercase tracking-wider">
                  Asset
                </th>
                <th className="text-left px-6 py-4 text-xs font-semibold text-text-muted uppercase tracking-wider">
                  Set
                </th>
                <th className="text-right px-6 py-4 text-xs font-semibold text-text-muted uppercase tracking-wider">
                  Paid
                </th>
                <th className="text-right px-6 py-4 text-xs font-semibold text-text-muted uppercase tracking-wider">
                  Value
                </th>
                <th className="text-right px-6 py-4 text-xs font-semibold text-text-muted uppercase tracking-wider">
                  P/L
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {filtered.map((asset) => {
                const curPrice = asset.current_price ?? asset.purchase_price;
                const profit = curPrice - asset.purchase_price;
                const profitPct =
                  asset.purchase_price > 0
                    ? (profit / asset.purchase_price) * 100
                    : 0;
                return (
                  <tr
                    key={asset.id}
                    className="hover:bg-surface-hover cursor-pointer"
                    onClick={() =>
                      (window.location.href = `/asset/${asset.id}`)
                    }
                  >
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-background rounded-lg overflow-hidden flex-shrink-0 relative">
                          {(asset.custom_image_url || asset.image_url) && (
                            <img
                              src={
                                asset.custom_image_url || asset.image_url || ""
                              }
                              alt=""
                              className="w-full h-full object-contain p-0.5"
                            />
                          )}
                        </div>
                        <div>
                          <p className="text-sm font-semibold text-text-primary">
                            {asset.name}
                          </p>
                          <p className="text-xs text-text-muted">
                            {asset.condition}
                          </p>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-sm text-text-secondary">
                      {asset.set_name}
                    </td>
                    <td className="px-6 py-4 text-sm text-text-secondary text-right">
                      {formatCurrency(asset.purchase_price)}
                    </td>
                    <td className="px-6 py-4 text-sm font-semibold text-text-primary text-right">
                      {formatCurrency(curPrice)}
                    </td>
                    <td className="px-6 py-4 text-right">
                      <span
                        className={`text-sm font-medium ${
                          profit > 0
                            ? "text-success"
                            : profit < 0
                              ? "text-danger"
                              : "text-text-secondary"
                        }`}
                      >
                        {profit >= 0 ? "+" : ""}
                        {formatCurrency(profit)} ({profitPct.toFixed(1)}%)
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* Empty state */}
      {filtered.length === 0 && assets.length > 0 && (
        <div className="bg-surface border border-border rounded-2xl p-12 text-center">
          <Search className="w-12 h-12 text-text-muted mx-auto mb-3" />
          <p className="text-text-secondary">
            No assets match your current filters
          </p>
        </div>
      )}
    </div>
  );
}
