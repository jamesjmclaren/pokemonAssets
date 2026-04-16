"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import {
  DollarSign,
  TrendingUp,
  TrendingDown,
  Package,
  PlusCircle,
  ArrowUpRight,
  ArrowDownRight,
  RefreshCw,
  AlertTriangle,
  Bell,
  Wallet,
} from "lucide-react";
import StatCard from "@/components/StatCard";
import PortfolioChart from "@/components/PortfolioChart";
import AssetCard from "@/components/AssetCard";
import { formatCurrency, formatPercentage } from "@/lib/format";
import { usePortfolio } from "@/lib/portfolio-context";
import type { PortfolioAsset } from "@/types";

export default function DashboardPage() {
  const { currentPortfolio, loading: portfolioLoading, isReadOnly } = usePortfolio();
  const [assets, setAssets] = useState<PortfolioAsset[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    async function fetchData() {
      if (!currentPortfolio) {
        setLoading(false);
        return;
      }
      try {
        const assetsRes = await fetch(`/api/assets?portfolioId=${currentPortfolio.id}`);
        if (!assetsRes.ok) throw new Error("Failed to fetch assets");
        const data = await assetsRes.json();
        setAssets(Array.isArray(data) ? data : []);
      } catch (error) {
        console.error("Error fetching data:", error);
        setAssets([]);
      } finally {
        setLoading(false);
      }
    }
    if (currentPortfolio) {
      setLoading(true);
      fetchData();
    } else if (!portfolioLoading) {
      setLoading(false);
    }
  }, [currentPortfolio, portfolioLoading]);

  async function handleRefreshPrices() {
    if (refreshing || assets.length === 0) return;
    setRefreshing(true);
    try {
      const r = await fetch("/api/assets/refresh-prices", { method: "POST" });
      const result = await r.json();
      if (result.updated > 0) {
        const refreshed = await fetch(`/api/assets?portfolioId=${currentPortfolio?.id}`);
        if (refreshed.ok) setAssets(await refreshed.json());
      }
    } catch {
      // silent
    } finally {
      setRefreshing(false);
    }
  }

  const activeAssets = assets.filter((a) => !a.status || a.status === "ACTIVE");
  const soldAssets = assets.filter((a) => a.status === "SOLD");

  const activeValue = activeAssets.reduce(
    (sum, a) => sum + (a.current_price ?? a.purchase_price) * (a.quantity || 1),
    0
  );
  const totalPortfolioValue = activeValue;

  // Compute cash from sales directly from sold assets to avoid stale cached values
  const computedCashBalance = soldAssets.reduce(
    (sum, a) => sum + (a.sell_price ?? 0) * (a.quantity || 1),
    0
  );

  const unrealisedPnL = activeAssets.reduce((sum, a) => {
    const qty = a.quantity || 1;
    return sum + ((a.current_price ?? a.purchase_price) - a.purchase_price) * qty;
  }, 0);

  const realisedPnL = soldAssets.reduce((sum, a) => {
    const qty = a.quantity || 1;
    return sum + ((a.sell_price ?? a.purchase_price) - a.purchase_price) * qty;
  }, 0);

  const totalInvested = assets.reduce((sum, a) => sum + a.purchase_price * (a.quantity || 1), 0);
  const netProfit = unrealisedPnL + realisedPnL;
  const overallReturnPct = totalInvested > 0 ? (netProfit / totalInvested) * 100 : 0;

  // Stale price detection (30 days) — active assets only
  const thirtyDaysMs = 30 * 24 * 60 * 60 * 1000;
  const staleAssets = activeAssets.filter((a) => {
    if (!a.price_updated_at) return true;
    return Date.now() - new Date(a.price_updated_at).getTime() > thirtyDaysMs;
  });

  const topGainers = [...activeAssets]
    .filter((a) => a.current_price != null)
    .sort(
      (a, b) =>
        (b.current_price! - b.purchase_price) / b.purchase_price -
        (a.current_price! - a.purchase_price) / a.purchase_price
    )
    .slice(0, 3);

  const recentlyAdded = [...activeAssets].slice(0, 4);

  if (portfolioLoading || loading) {
    return (
      <div className="space-y-6 md:space-y-8">
        <div>
          <h1 className="text-xl md:text-2xl font-bold text-text-primary">Dashboard</h1>
          <p className="text-text-muted mt-1 text-sm">Loading your portfolio...</p>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-2 xl:grid-cols-4 gap-3 md:gap-4">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="skeleton h-28 md:h-32 rounded-2xl" />
          ))}
        </div>
        <div className="skeleton h-60 md:h-80 rounded-2xl" />
      </div>
    );
  }

  return (
    <div className="space-y-6 md:space-y-8">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
        <div>
          <h1 className="text-xl md:text-2xl font-bold text-text-primary">Dashboard</h1>
          <p className="text-text-muted mt-1 text-sm">
            Track your investment portfolio
          </p>
        </div>
        <div className="flex items-center gap-2 md:gap-3">
          {activeAssets.length > 0 && !isReadOnly && (
            <button
              onClick={handleRefreshPrices}
              disabled={refreshing}
              className="flex items-center gap-2 px-3 md:px-4 py-2.5 md:py-3 bg-surface border border-border hover:border-border-hover text-text-secondary hover:text-text-primary font-medium rounded-xl text-xs md:text-sm disabled:opacity-50"
            >
              <RefreshCw className={`w-4 h-4 ${refreshing ? "animate-spin" : ""}`} />
              <span className="hidden md:inline">{refreshing ? "Updating..." : "Refresh Prices"}</span>
              <span className="md:hidden">{refreshing ? "..." : "Refresh"}</span>
            </button>
          )}
          {!isReadOnly && (
            <Link
              href="/dashboard/add"
              className="flex items-center gap-2 px-3 md:px-5 py-2.5 md:py-3 bg-accent hover:bg-accent-hover text-black font-semibold rounded-xl text-sm"
            >
              <PlusCircle className="w-4 h-4 md:w-5 md:h-5" />
              <span className="hidden md:inline">Add Asset</span>
              <span className="md:hidden">Add</span>
            </Link>
          )}
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 xl:grid-cols-4 gap-3 md:gap-4">
        <StatCard
          label="Total Value"
          value={formatCurrency(totalPortfolioValue)}
          change={
            computedCashBalance > 0
              ? `+ ${formatCurrency(computedCashBalance)} cash from sales`
              : undefined
          }
          changeType="neutral"
          icon={DollarSign}
        />
        <StatCard
          label="Unrealised P/L"
          value={formatCurrency(unrealisedPnL)}
          change={
            activeAssets.length > 0
              ? formatPercentage(
                  activeAssets.reduce((s, a) => s + a.purchase_price * (a.quantity || 1), 0) > 0
                    ? (unrealisedPnL /
                        activeAssets.reduce((s, a) => s + a.purchase_price * (a.quantity || 1), 0)) *
                        100
                    : 0
                )
              : undefined
          }
          changeType={
            unrealisedPnL > 0 ? "positive" : unrealisedPnL < 0 ? "negative" : "neutral"
          }
          icon={unrealisedPnL >= 0 ? ArrowUpRight : ArrowDownRight}
        />
        <StatCard
          label="Realised P/L"
          value={formatCurrency(realisedPnL)}
          change={soldAssets.length > 0 ? `${soldAssets.length} sale${soldAssets.length !== 1 ? "s" : ""}` : undefined}
          changeType={
            realisedPnL > 0 ? "positive" : realisedPnL < 0 ? "negative" : "neutral"
          }
          icon={realisedPnL >= 0 ? TrendingUp : TrendingDown}
        />
        <StatCard
          label="Cash Balance"
          value={formatCurrency(computedCashBalance)}
          change={
            totalInvested > 0
              ? `Net return: ${overallReturnPct >= 0 ? "+" : ""}${overallReturnPct.toFixed(1)}%`
              : undefined
          }
          changeType={netProfit > 0 ? "positive" : netProfit < 0 ? "negative" : "neutral"}
          icon={Wallet}
        />
      </div>

      {/* Summary bar */}
      {assets.length > 0 && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 bg-surface border border-border rounded-2xl p-4">
          <div className="text-center">
            <p className="text-xs text-text-muted font-medium uppercase tracking-wider">Total Invested</p>
            <p className="text-sm font-bold text-text-primary mt-1">{formatCurrency(totalInvested)}</p>
          </div>
          <div className="text-center">
            <p className="text-xs text-text-muted font-medium uppercase tracking-wider">Active Assets</p>
            <p className="text-sm font-bold text-text-primary mt-1">{formatCurrency(activeValue)}</p>
          </div>
          <div className="text-center">
            <p className="text-xs text-text-muted font-medium uppercase tracking-wider">Sales Returned</p>
            <p className="text-sm font-bold text-text-primary mt-1">
              {formatCurrency(soldAssets.reduce((s, a) => s + (a.sell_price ?? 0) * (a.quantity || 1), 0))}
            </p>
          </div>
          <div className="text-center">
            <p className="text-xs text-text-muted font-medium uppercase tracking-wider">Overall Return</p>
            <p className={`text-sm font-bold mt-1 ${netProfit > 0 ? "text-success" : netProfit < 0 ? "text-danger" : "text-text-primary"}`}>
              {netProfit >= 0 ? "+" : ""}{formatCurrency(netProfit)} ({overallReturnPct >= 0 ? "+" : ""}{overallReturnPct.toFixed(1)}%)
            </p>
          </div>
        </div>
      )}

      {/* Stale Price Alert for Admins */}
      {!isReadOnly && staleAssets.length > 0 && (
        <div className="bg-danger/10 border-2 border-danger/40 rounded-2xl p-5">
          <div className="flex items-start gap-4">
            <div className="w-12 h-12 rounded-full bg-danger/20 flex items-center justify-center flex-shrink-0">
              <Bell className="w-6 h-6 text-danger" />
            </div>
            <div className="flex-1 min-w-0">
              <h3 className="text-base font-bold text-danger flex items-center gap-2">
                <AlertTriangle className="w-4 h-4" />
                Price Update Required
              </h3>
              <p className="text-sm text-danger/80 mt-1">
                {staleAssets.length} asset{staleAssets.length !== 1 ? "s have" : " has"} not had {staleAssets.length === 1 ? "its" : "their"} price
                updated in over 30 days. Update prices to maintain accurate portfolio valuations.
              </p>
              <div className="mt-3 flex flex-wrap gap-2">
                {staleAssets.slice(0, 5).map((a) => (
                  <Link
                    key={a.id}
                    href={`/asset/${a.id}`}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-danger/15 hover:bg-danger/25 rounded-lg text-xs font-medium text-danger"
                  >
                    <AlertTriangle className="w-3 h-3" />
                    {a.name.length > 25 ? a.name.slice(0, 25) + "..." : a.name}
                  </Link>
                ))}
                {staleAssets.length > 5 && (
                  <Link
                    href="/collection"
                    className="inline-flex items-center px-3 py-1.5 bg-danger/15 hover:bg-danger/25 rounded-lg text-xs font-medium text-danger"
                  >
                    +{staleAssets.length - 5} more
                  </Link>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Chart */}
      {currentPortfolio && (
        <PortfolioChart portfolioId={currentPortfolio.id} />
      )}

      {/* Top Gainers */}
      {topGainers.length > 0 && (
        <div>
          <div className="flex items-center justify-between mb-3 md:mb-4">
            <h2 className="text-base md:text-lg font-semibold text-text-primary">
              Top Performers
            </h2>
            <Link
              href="/collection"
              className="text-sm text-accent hover:text-accent-hover font-medium"
            >
              View All
            </Link>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 md:gap-4">
            {topGainers.map((asset) => (
              <AssetCard key={asset.id} asset={asset} />
            ))}
          </div>
        </div>
      )}

      {/* Recently Added */}
      {recentlyAdded.length > 0 && (
        <div>
          <div className="flex items-center justify-between mb-3 md:mb-4">
            <h2 className="text-base md:text-lg font-semibold text-text-primary">
              Recently Added
            </h2>
            <Link
              href="/collection"
              className="text-sm text-accent hover:text-accent-hover font-medium"
            >
              View All
            </Link>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4">
            {recentlyAdded.map((asset) => (
              <AssetCard key={asset.id} asset={asset} />
            ))}
          </div>
        </div>
      )}

      {/* Empty state */}
      {assets.length === 0 && (
        <div className="bg-surface border border-border rounded-2xl p-10 md:p-16 text-center">
          <Package className="w-12 h-12 md:w-16 md:h-16 text-text-muted mx-auto mb-4" />
          <h2 className="text-lg md:text-xl font-bold text-text-primary">
            Your collection is empty
          </h2>
          <p className="text-text-secondary mt-2 max-w-md mx-auto text-sm">
            Start building your portfolio by adding your first card or
            sealed product.
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
