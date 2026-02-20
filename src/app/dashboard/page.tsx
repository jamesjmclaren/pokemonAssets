"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import {
  DollarSign,
  TrendingUp,
  Package,
  PlusCircle,
  ArrowUpRight,
  ArrowDownRight,
  RefreshCw,
} from "lucide-react";
import StatCard from "@/components/StatCard";
import PortfolioChart from "@/components/PortfolioChart";
import AssetCard from "@/components/AssetCard";
import { formatCurrency, formatPercentage } from "@/lib/format";
import type { PortfolioAsset } from "@/types";

export default function DashboardPage() {
  const [assets, setAssets] = useState<PortfolioAsset[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    async function fetchAssets() {
      try {
        const res = await fetch("/api/assets");
        if (!res.ok) throw new Error("Failed to fetch");
        setAssets(await res.json());
      } catch (error) {
        console.error("Error fetching assets:", error);
      } finally {
        setLoading(false);
      }
    }
    fetchAssets();
  }, []);

  async function handleRefreshPrices() {
    if (refreshing || assets.length === 0) return;
    setRefreshing(true);
    try {
      const r = await fetch("/api/assets/refresh-prices", { method: "POST" });
      const result = await r.json();
      if (result.updated > 0) {
        const refreshed = await fetch("/api/assets");
        if (refreshed.ok) setAssets(await refreshed.json());
      }
    } catch {
      // silent
    } finally {
      setRefreshing(false);
    }
  }

  const totalInvested = assets.reduce((sum, a) => sum + a.purchase_price, 0);
  const currentValue = assets.reduce(
    (sum, a) => sum + (a.current_price ?? a.purchase_price),
    0
  );
  const totalProfit = currentValue - totalInvested;
  const profitPercent =
    totalInvested > 0 ? (totalProfit / totalInvested) * 100 : 0;

  const chartData = assets.length > 0
    ? [
        {
          date: new Date(
            Math.min(...assets.map((a) => new Date(a.purchase_date).getTime()))
          )
            .toISOString()
            .split("T")[0],
          value: totalInvested,
          invested: totalInvested,
        },
        {
          date: new Date().toISOString().split("T")[0],
          value: currentValue,
          invested: totalInvested,
        },
      ]
    : [];

  const topGainers = [...assets]
    .filter((a) => a.current_price != null)
    .sort(
      (a, b) =>
        (b.current_price! - b.purchase_price) / b.purchase_price -
        (a.current_price! - a.purchase_price) / a.purchase_price
    )
    .slice(0, 3);

  const recentlyAdded = [...assets].slice(0, 4);

  if (loading) {
    return (
      <div className="space-y-8">
        <div>
          <h1 className="text-2xl font-bold text-text-primary">Dashboard</h1>
          <p className="text-text-muted mt-1">Loading your portfolio...</p>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="skeleton h-32 rounded-2xl" />
          ))}
        </div>
        <div className="skeleton h-80 rounded-2xl" />
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-text-primary">Dashboard</h1>
          <p className="text-text-muted mt-1">
            Track your investment portfolio
          </p>
        </div>
        <div className="flex items-center gap-3">
          {assets.length > 0 && (
            <button
              onClick={handleRefreshPrices}
              disabled={refreshing}
              className="flex items-center gap-2 px-4 py-3 bg-surface border border-border hover:border-border-hover text-text-secondary hover:text-text-primary font-medium rounded-xl text-sm disabled:opacity-50"
            >
              <RefreshCw className={`w-4 h-4 ${refreshing ? "animate-spin" : ""}`} />
              {refreshing ? "Updating..." : "Refresh Prices"}
            </button>
          )}
          <Link
            href="/dashboard/add"
            className="flex items-center gap-2 px-5 py-3 bg-accent hover:bg-accent-hover text-white font-semibold rounded-xl"
          >
            <PlusCircle className="w-5 h-5" />
            Add Asset
          </Link>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
        <StatCard
          label="Total Value"
          value={formatCurrency(currentValue)}
          change={
            totalProfit !== 0
              ? `${totalProfit >= 0 ? "+" : ""}${formatCurrency(totalProfit)} (${formatPercentage(profitPercent)})`
              : undefined
          }
          changeType={
            totalProfit > 0
              ? "positive"
              : totalProfit < 0
                ? "negative"
                : "neutral"
          }
          icon={DollarSign}
        />
        <StatCard
          label="Total Invested"
          value={formatCurrency(totalInvested)}
          icon={TrendingUp}
        />
        <StatCard
          label="Total P/L"
          value={formatCurrency(totalProfit)}
          change={formatPercentage(profitPercent)}
          changeType={
            totalProfit > 0
              ? "positive"
              : totalProfit < 0
                ? "negative"
                : "neutral"
          }
          icon={totalProfit >= 0 ? ArrowUpRight : ArrowDownRight}
        />
        <StatCard
          label="Total Assets"
          value={String(assets.length)}
          icon={Package}
        />
      </div>

      {/* Chart */}
      <PortfolioChart data={chartData} />

      {/* Top Gainers */}
      {topGainers.length > 0 && (
        <div>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-text-primary">
              Top Performers
            </h2>
            <Link
              href="/collection"
              className="text-sm text-accent hover:text-accent-hover font-medium"
            >
              View All
            </Link>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {topGainers.map((asset) => (
              <AssetCard key={asset.id} asset={asset} />
            ))}
          </div>
        </div>
      )}

      {/* Recently Added */}
      {recentlyAdded.length > 0 && (
        <div>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-text-primary">
              Recently Added
            </h2>
            <Link
              href="/collection"
              className="text-sm text-accent hover:text-accent-hover font-medium"
            >
              View All
            </Link>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {recentlyAdded.map((asset) => (
              <AssetCard key={asset.id} asset={asset} />
            ))}
          </div>
        </div>
      )}

      {/* Empty state */}
      {assets.length === 0 && (
        <div className="bg-surface border border-border rounded-2xl p-16 text-center">
          <Package className="w-16 h-16 text-text-muted mx-auto mb-4" />
          <h2 className="text-xl font-bold text-text-primary">
            Your collection is empty
          </h2>
          <p className="text-text-secondary mt-2 max-w-md mx-auto">
            Start building your portfolio by adding your first card or
            sealed product.
          </p>
          <Link
            href="/dashboard/add"
            className="inline-flex items-center gap-2 px-6 py-3 bg-accent hover:bg-accent-hover text-white font-semibold rounded-xl mt-6"
          >
            <PlusCircle className="w-5 h-5" />
            Add Your First Asset
          </Link>
        </div>
      )}
    </div>
  );
}
