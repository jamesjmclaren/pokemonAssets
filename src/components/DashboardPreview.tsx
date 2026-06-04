"use client";

import Link from "next/link";
import {
  DollarSign,
  TrendingUp,
  Package,
  PlusCircle,
  ArrowUpRight,
  RefreshCw,
} from "lucide-react";
import StatCard from "@/components/StatCard";
import PortfolioChart from "@/components/PortfolioChart";
import ExampleAssetCard from "@/components/ExampleAssetCard";
import type { ExampleAsset } from "@/components/ExampleAssetCard";
import { formatCurrency, formatPercentage } from "@/lib/format";

const PREVIEW_STATS = {
  totalValue: 47820,
  totalInvested: 39580,
  totalProfit: 8240,
  profitPercent: 20.8,
  totalAssets: 34,
};

const PREVIEW_CHART_DATA = (() => {
  const costBasis = PREVIEW_STATS.totalInvested;
  // Final breakdown: sealed 11K, raw 14K, graded 22.82K = 47.82K total
  const finalSealed = 11000;
  const finalRaw = 14000;
  const finalGraded = 22820;
  const points = 8;
  const result = [];
  const now = new Date();
  for (let i = points - 1; i >= 0; i--) {
    const d = new Date(now);
    d.setMonth(d.getMonth() - i);
    const t = 1 - i / (points - 1);
    // Grow each category from ~60% of final to full value
    const scale = 0.6 + 0.4 * t;
    const sealed = Math.round(finalSealed * scale);
    const raw = Math.round(finalRaw * scale);
    const graded = Math.round(finalGraded * scale);
    result.push({
      date: d.toISOString().split("T")[0],
      total: sealed + raw + graded,
      sealed,
      raw,
      graded,
      costBasis,
    });
  }
  return result;
})();

const PREVIEW_TOP_PERFORMERS: ExampleAsset[] = [
  {
    name: "Charizard VMAX",
    set_name: "Champions Path",
    asset_type: "card",
    image_url: "https://images.pokemontcg.io/swsh3/79.png",
    purchase_price: 2200,
    current_price: 4850,
    psa_grade: "10",
  },
  {
    name: "Umbreon VMAX",
    set_name: "Evolving Skies",
    asset_type: "card",
    image_url: "https://images.pokemontcg.io/swsh7/215.png",
    purchase_price: 1850,
    current_price: 3200,
    psa_grade: "10",
  },
  {
    name: "Pikachu VMAX",
    set_name: "Vivid Voltage",
    asset_type: "card",
    image_url: "https://images.pokemontcg.io/swsh4/188.png",
    purchase_price: 420,
    current_price: 890,
    psa_grade: "9",
  },
];

export default function DashboardPreview() {
  return (
    <div className="mt-16 mx-auto max-w-5xl">
      <h2 className="text-center text-2xl md:text-3xl font-bold text-accent mb-10">
        Your portfolio, at a glance
      </h2>
      <div className="rounded-2xl border border-border bg-surface p-4 md:p-6 lg:p-8 shadow-2xl shadow-black/40 space-y-6 md:space-y-8">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
          <div>
            <h3 className="text-xl md:text-2xl font-bold text-text-primary">Dashboard</h3>
            <p className="text-text-muted mt-1 text-sm">Track your investment portfolio.</p>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              className="flex items-center gap-2 px-3 md:px-4 py-2.5 md:py-3 bg-surface border border-border text-text-secondary font-medium rounded-xl text-xs md:text-sm cursor-default"
              aria-hidden
            >
              <RefreshCw className="w-4 h-4" />
              <span className="hidden md:inline">Refresh Prices</span>
            </button>
            <Link
              href="/dashboard/add"
              className="flex items-center gap-2 px-3 md:px-5 py-2.5 md:py-3 bg-accent hover:bg-accent-hover text-black font-semibold rounded-xl text-sm"
            >
              <PlusCircle className="w-4 h-4 md:w-5 md:h-5" />
              Add Asset
            </Link>
          </div>
        </div>

        <div className="grid grid-cols-2 xl:grid-cols-4 gap-3 md:gap-4">
          <StatCard
            label="Total Value"
            value={formatCurrency(PREVIEW_STATS.totalValue)}
            change={`+${formatCurrency(PREVIEW_STATS.totalProfit)} (${formatPercentage(PREVIEW_STATS.profitPercent)})`}
            changeType="positive"
            icon={DollarSign}
          />
          <StatCard
            label="Total Invested"
            value={formatCurrency(PREVIEW_STATS.totalInvested)}
            icon={TrendingUp}
          />
          <StatCard
            label="Total P/L"
            value={formatCurrency(PREVIEW_STATS.totalProfit)}
            change={formatPercentage(PREVIEW_STATS.profitPercent)}
            changeType="positive"
            icon={ArrowUpRight}
          />
          <StatCard
            label="Total Assets"
            value={String(PREVIEW_STATS.totalAssets)}
            icon={Package}
          />
        </div>

        <PortfolioChart data={PREVIEW_CHART_DATA} />

        <div>
          <div className="flex items-center justify-between mb-3 md:mb-4">
            <h4 className="text-base md:text-lg font-semibold text-text-primary">
              Top Performers
            </h4>
            <Link
              href="/collection"
              className="text-sm text-accent hover:text-accent-hover font-medium"
            >
              View All
            </Link>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3 md:gap-4">
            {PREVIEW_TOP_PERFORMERS.map((asset, i) => (
              <ExampleAssetCard key={i} asset={asset} />
            ))}
          </div>
        </div>
      </div>
      <p className="mt-4 text-center text-sm text-text-muted">
        How we track value, performance, and report on your portfolio—managed on your behalf.
      </p>
    </div>
  );
}
