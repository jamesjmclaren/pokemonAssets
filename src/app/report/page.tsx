"use client";

import { useState, useEffect, useMemo } from "react";
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from "recharts";
import {
  Printer,
  ExternalLink,
  TrendingUp,
  TrendingDown,
  FileText,
} from "lucide-react";
import {
  formatCurrency,
  formatPercentage,
  formatDate,
  fixStorageUrl,
} from "@/lib/format";
import { usePortfolio } from "@/lib/portfolio-context";
import type { PortfolioAsset } from "@/types";

function getEvidenceLink(asset: PortfolioAsset): {
  label: string;
  url: string | null;
  color: string;
} {
  if (asset.pc_url) {
    return {
      label: "PriceCharting",
      url: asset.pc_url,
      color: "text-blue-400 bg-blue-500/10",
    };
  }

  if (
    asset.image_url &&
    asset.image_url.includes("tcgplayer-cdn.tcgplayer.com/product/")
  ) {
    const match = asset.image_url.match(/\/product\/(\d+)/);
    if (match) {
      return {
        label: "TCGPlayer",
        url: `https://www.tcgplayer.com/product/${match[1]}`,
        color: "text-orange-400 bg-orange-500/10",
      };
    }
  }

  if (asset.is_manual_submission) {
    return {
      label: "Manual Entry",
      url: null,
      color: "text-text-muted bg-surface-hover",
    };
  }

  return { label: "API", url: null, color: "text-text-muted bg-surface-hover" };
}

const TYPE_COLORS: Record<string, string> = {
  card: "#D4AF37",
  sealed: "#f59e0b",
  comic: "#22c55e",
};

const TYPE_BADGE_CLASSES: Record<string, string> = {
  card: "text-gold bg-accent-muted",
  sealed: "text-amber-400 bg-amber-500/10",
  comic: "text-emerald-400 bg-emerald-500/10",
};

export default function ReportPage() {
  const { currentPortfolio, loading: portfolioLoading } = usePortfolio();
  const [assets, setAssets] = useState<PortfolioAsset[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchAssets() {
      if (!currentPortfolio) {
        setLoading(false);
        return;
      }
      try {
        const res = await fetch(
          `/api/assets?portfolioId=${currentPortfolio.id}`
        );
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

  const totalInvested = useMemo(
    () => assets.reduce((sum, a) => sum + a.purchase_price * (a.quantity || 1), 0),
    [assets]
  );

  const currentValue = useMemo(
    () =>
      assets.reduce(
        (sum, a) => sum + (a.current_price ?? a.purchase_price) * (a.quantity || 1),
        0
      ),
    [assets]
  );

  const totalProfit = currentValue - totalInvested;
  const profitPercent = totalInvested > 0 ? (totalProfit / totalInvested) * 100 : 0;

  const breakdownData = useMemo(() => {
    const map: Record<string, { type: string; count: number; value: number }> = {};
    assets.forEach((a) => {
      const t = a.asset_type;
      if (!map[t]) map[t] = { type: t, count: 0, value: 0 };
      map[t].count += a.quantity || 1;
      map[t].value += (a.current_price ?? a.purchase_price) * (a.quantity || 1);
    });
    return Object.values(map);
  }, [assets]);

  const assetRows = useMemo(() => {
    return assets.map((a) => {
      const qty = a.quantity || 1;
      const cost = a.purchase_price * qty;
      const value = (a.current_price ?? a.purchase_price) * qty;
      const pl = value - cost;
      const roi = cost > 0 ? (pl / cost) * 100 : 0;
      return { asset: a, qty, cost, value, pl, roi };
    });
  }, [assets]);

  const topGainers = useMemo(
    () =>
      [...assetRows]
        .filter((r) => r.asset.current_price != null)
        .sort((a, b) => b.roi - a.roi)
        .slice(0, 5),
    [assetRows]
  );

  const topLosers = useMemo(
    () =>
      [...assetRows]
        .filter((r) => r.asset.current_price != null)
        .sort((a, b) => a.roi - b.roi)
        .slice(0, 5),
    [assetRows]
  );

  if (portfolioLoading || loading) {
    return (
      <div className="space-y-6 md:space-y-8">
        <div>
          <h1 className="text-xl md:text-2xl font-bold text-text-primary">
            Portfolio Report
          </h1>
          <p className="text-text-muted mt-1 text-sm">
            Loading your portfolio...
          </p>
        </div>
        <div className="grid grid-cols-2 xl:grid-cols-4 gap-3 md:gap-4">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="skeleton h-28 md:h-32 rounded-2xl" />
          ))}
        </div>
        <div className="skeleton h-60 md:h-80 rounded-2xl" />
        <div className="skeleton h-96 rounded-2xl" />
      </div>
    );
  }

  const generatedDate = new Date().toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  return (
    <>
      <style jsx global>{`
        @media print {
          aside,
          .lg\\:ml-64,
          nav {
            display: none !important;
          }
          main {
            margin-left: 0 !important;
            padding: 16px !important;
          }
          body,
          main,
          div {
            background: white !important;
            color: black !important;
          }
          .text-text-primary,
          .text-text-secondary,
          .text-text-muted {
            color: #1a1a1a !important;
          }
          .text-success {
            color: #16a34a !important;
          }
          .text-danger {
            color: #dc2626 !important;
          }
          .text-gold,
          .text-accent {
            color: #b8860b !important;
          }
          .border-border {
            border-color: #e5e7eb !important;
          }
          .bg-surface,
          .bg-surface-hover,
          .bg-surface-elevated,
          .bg-background {
            background: white !important;
          }
          .bg-accent-muted,
          .bg-success-muted,
          .bg-danger-muted,
          .bg-warning-muted {
            background: #f3f4f6 !important;
          }
          .print\\:hidden {
            display: none !important;
          }
          .hidden.print\\:block {
            display: block !important;
          }
          .hidden.print\\:table-cell {
            display: table-cell !important;
          }
          table {
            page-break-inside: auto;
          }
          tr {
            page-break-inside: avoid;
          }
        }
      `}</style>

      <div className="space-y-6 md:space-y-8">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-start justify-between gap-3">
          <div>
            <p className="text-text-muted text-sm">
              {currentPortfolio?.name}
            </p>
            <h1 className="text-2xl font-bold text-text-primary flex items-center gap-2">
              <FileText className="w-6 h-6 text-accent" />
              Portfolio Report
            </h1>
            <p className="text-text-muted text-sm mt-1">
              Generated {generatedDate}
            </p>
          </div>
          <button
            onClick={() => window.print()}
            className="print:hidden flex items-center gap-2 px-4 py-2.5 bg-accent hover:bg-accent-hover text-black font-semibold rounded-xl text-sm"
          >
            <Printer className="w-4 h-4" />
            Print / Save PDF
          </button>
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-2 xl:grid-cols-4 gap-3 md:gap-4">
          <div className="bg-surface border border-border rounded-2xl p-4 md:p-5">
            <p className="text-text-muted text-xs font-medium uppercase tracking-wider">
              Total Assets
            </p>
            <p className="text-3xl font-bold text-text-primary mt-1">
              {assets.length}
            </p>
          </div>
          <div className="bg-surface border border-border rounded-2xl p-4 md:p-5">
            <p className="text-text-muted text-xs font-medium uppercase tracking-wider">
              Total Invested
            </p>
            <p className="text-3xl font-bold text-text-primary mt-1">
              {formatCurrency(totalInvested)}
            </p>
          </div>
          <div className="bg-surface border border-border rounded-2xl p-4 md:p-5">
            <p className="text-text-muted text-xs font-medium uppercase tracking-wider">
              Current Value
            </p>
            <p className="text-3xl font-bold text-text-primary mt-1">
              {formatCurrency(currentValue)}
            </p>
          </div>
          <div className="bg-surface border border-border rounded-2xl p-4 md:p-5">
            <p className="text-text-muted text-xs font-medium uppercase tracking-wider">
              Total P/L
            </p>
            <p
              className={`text-3xl font-bold mt-1 ${
                totalProfit >= 0 ? "text-success" : "text-danger"
              }`}
            >
              {formatCurrency(totalProfit)}
            </p>
            <p
              className={`text-sm ${
                totalProfit >= 0 ? "text-success" : "text-danger"
              }`}
            >
              {formatPercentage(profitPercent)}
            </p>
          </div>
        </div>

        {/* Breakdown by Type */}
        {breakdownData.length > 0 && (
          <div className="bg-surface border border-border rounded-2xl p-4 md:p-6">
            <h2 className="text-lg font-semibold text-text-primary mb-4">
              Breakdown by Type
            </h2>
            <div className="flex flex-col md:flex-row items-center gap-6">
              {/* Pie Chart (hidden on print) */}
              <div className="print:hidden w-full md:w-1/2 h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={breakdownData}
                      dataKey="value"
                      nameKey="type"
                      cx="50%"
                      cy="50%"
                      outerRadius={100}
                      innerRadius={50}
                      strokeWidth={2}
                      stroke="var(--color-surface)"
                    >
                      {breakdownData.map((entry) => (
                        <Cell
                          key={entry.type}
                          fill={TYPE_COLORS[entry.type] || "#6b7280"}
                        />
                      ))}
                    </Pie>
                    <Tooltip
                      formatter={(value: number) => formatCurrency(value)}
                      contentStyle={{
                        backgroundColor: "var(--color-surface-elevated)",
                        border: "1px solid var(--color-border)",
                        borderRadius: "0.75rem",
                        color: "var(--color-text-primary)",
                      }}
                    />
                  </PieChart>
                </ResponsiveContainer>
              </div>

              {/* Print fallback table */}
              <div className="hidden print:block w-full md:w-1/2">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-border">
                      <th className="text-left py-2 text-text-secondary font-medium">
                        Type
                      </th>
                      <th className="text-right py-2 text-text-secondary font-medium">
                        Count
                      </th>
                      <th className="text-right py-2 text-text-secondary font-medium">
                        Value
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {breakdownData.map((d) => (
                      <tr key={d.type} className="border-b border-border/50">
                        <td className="py-2 capitalize text-text-primary">
                          {d.type}
                        </td>
                        <td className="py-2 text-right text-text-secondary">
                          {d.count}
                        </td>
                        <td className="py-2 text-right text-text-primary">
                          {formatCurrency(d.value)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Legend */}
              <div className="w-full md:w-1/2 space-y-3">
                {breakdownData.map((d) => (
                  <div
                    key={d.type}
                    className="flex items-center justify-between"
                  >
                    <div className="flex items-center gap-2">
                      <span
                        className="w-3 h-3 rounded-full"
                        style={{
                          backgroundColor:
                            TYPE_COLORS[d.type] || "#6b7280",
                        }}
                      />
                      <span className="text-sm text-text-primary capitalize">
                        {d.type}
                      </span>
                      <span className="text-xs text-text-muted">
                        ({d.count})
                      </span>
                    </div>
                    <span className="text-sm font-medium text-text-primary">
                      {formatCurrency(d.value)}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Assets Detail Table */}
        {assetRows.length > 0 && (
          <div className="bg-surface border border-border rounded-2xl overflow-hidden">
            <div className="p-4 md:p-6 pb-0">
              <h2 className="text-lg font-semibold text-text-primary mb-4">
                Assets Detail
              </h2>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border text-text-secondary">
                    <th className="text-left px-4 py-3 font-medium">#</th>
                    <th className="text-left px-4 py-3 font-medium">Asset</th>
                    <th className="text-left px-4 py-3 font-medium">Type</th>
                    <th className="text-left px-4 py-3 font-medium">
                      Purchase Date
                    </th>
                    <th className="text-right px-4 py-3 font-medium">Cost</th>
                    <th className="text-right px-4 py-3 font-medium">
                      Current Value
                    </th>
                    <th className="text-right px-4 py-3 font-medium">P/L</th>
                    <th className="text-right px-4 py-3 font-medium">ROI %</th>
                    <th className="text-left px-4 py-3 font-medium">
                      Evidence
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {assetRows.map((row, i) => {
                    const evidence = getEvidenceLink(row.asset);
                    const imgUrl =
                      fixStorageUrl(row.asset.custom_image_url) ||
                      fixStorageUrl(row.asset.image_url);
                    const typeBadge =
                      TYPE_BADGE_CLASSES[row.asset.asset_type] ||
                      "text-text-muted bg-surface-hover";

                    return (
                      <tr
                        key={row.asset.id}
                        className="border-b border-border/50 hover:bg-surface-hover/50"
                      >
                        <td className="px-4 py-3 text-text-muted">{i + 1}</td>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-3">
                            {imgUrl ? (
                              <img
                                src={imgUrl}
                                alt={row.asset.name}
                                className="w-8 h-8 rounded-lg object-cover flex-shrink-0"
                              />
                            ) : (
                              <div className="w-8 h-8 rounded-lg bg-surface-hover flex-shrink-0" />
                            )}
                            <div className="min-w-0">
                              <p className="text-text-primary font-medium truncate max-w-[200px]">
                                {row.asset.name}
                              </p>
                              <p className="text-text-muted text-xs truncate max-w-[200px]">
                                {row.asset.set_name}
                              </p>
                              {row.asset.psa_grade && (
                                <span className="inline-block mt-0.5 px-1.5 py-0.5 text-[10px] font-bold bg-accent-muted text-gold rounded">
                                  PSA {row.asset.psa_grade}
                                </span>
                              )}
                            </div>
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          <span
                            className={`px-2 py-1 text-xs font-medium rounded-lg capitalize ${typeBadge}`}
                          >
                            {row.asset.asset_type}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-text-secondary">
                          {formatDate(row.asset.purchase_date)}
                        </td>
                        <td className="px-4 py-3 text-right text-text-primary">
                          <span>{formatCurrency(row.cost)}</span>
                          {row.qty > 1 && (
                            <span className="block text-xs text-text-muted">
                              {formatCurrency(row.asset.purchase_price)} × {row.qty}
                            </span>
                          )}
                        </td>
                        <td className="px-4 py-3 text-right text-text-primary">
                          {formatCurrency(row.value)}
                        </td>
                        <td
                          className={`px-4 py-3 text-right font-medium ${
                            row.pl >= 0 ? "text-success" : "text-danger"
                          }`}
                        >
                          {formatCurrency(row.pl)}
                        </td>
                        <td
                          className={`px-4 py-3 text-right font-medium ${
                            row.roi >= 0 ? "text-success" : "text-danger"
                          }`}
                        >
                          {formatPercentage(row.roi)}
                        </td>
                        <td className="px-4 py-3">
                          {evidence.url ? (
                            <a
                              href={evidence.url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className={`inline-flex items-center gap-1 px-2 py-1 text-xs font-medium rounded-lg ${evidence.color}`}
                            >
                              {evidence.label}
                              <ExternalLink className="w-3 h-3" />
                            </a>
                          ) : (
                            <span
                              className={`inline-block px-2 py-1 text-xs font-medium rounded-lg ${evidence.color}`}
                            >
                              {evidence.label}
                            </span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
                {/* Totals Footer */}
                <tfoot>
                  <tr className="border-t-2 border-border font-semibold">
                    <td className="px-4 py-3" colSpan={4}>
                      <span className="text-text-primary">Totals</span>
                    </td>
                    <td className="px-4 py-3 text-right text-text-primary">
                      {formatCurrency(totalInvested)}
                    </td>
                    <td className="px-4 py-3 text-right text-text-primary">
                      {formatCurrency(currentValue)}
                    </td>
                    <td
                      className={`px-4 py-3 text-right ${
                        totalProfit >= 0 ? "text-success" : "text-danger"
                      }`}
                    >
                      {formatCurrency(totalProfit)}
                    </td>
                    <td
                      className={`px-4 py-3 text-right ${
                        profitPercent >= 0 ? "text-success" : "text-danger"
                      }`}
                    >
                      {formatPercentage(profitPercent)}
                    </td>
                    <td className="px-4 py-3" />
                  </tr>
                </tfoot>
              </table>
            </div>
          </div>
        )}

        {/* Top Performers */}
        {assetRows.length > 0 && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Top Gainers */}
            <div className="bg-surface border border-border rounded-2xl p-4 md:p-6">
              <h2 className="text-lg font-semibold text-text-primary flex items-center gap-2 mb-4">
                <TrendingUp className="w-5 h-5 text-success" />
                Top 5 Gainers
              </h2>
              <div className="space-y-3">
                {topGainers.map((row, i) => (
                  <div
                    key={row.asset.id}
                    className="flex items-center justify-between gap-2"
                  >
                    <div className="flex items-center gap-2 min-w-0">
                      <span className="text-xs text-text-muted font-medium w-5">
                        {i + 1}.
                      </span>
                      <span className="text-sm text-text-primary truncate">
                        {row.asset.name}
                      </span>
                    </div>
                    <div className="flex items-center gap-3 flex-shrink-0">
                      <span className="text-sm font-medium text-success">
                        {formatPercentage(row.roi)}
                      </span>
                      <span className="text-xs text-success">
                        {formatCurrency(row.pl)}
                      </span>
                    </div>
                  </div>
                ))}
                {topGainers.length === 0 && (
                  <p className="text-sm text-text-muted">No data available</p>
                )}
              </div>
            </div>

            {/* Top Losers */}
            <div className="bg-surface border border-border rounded-2xl p-4 md:p-6">
              <h2 className="text-lg font-semibold text-text-primary flex items-center gap-2 mb-4">
                <TrendingDown className="w-5 h-5 text-danger" />
                Top 5 Losers
              </h2>
              <div className="space-y-3">
                {topLosers.map((row, i) => (
                  <div
                    key={row.asset.id}
                    className="flex items-center justify-between gap-2"
                  >
                    <div className="flex items-center gap-2 min-w-0">
                      <span className="text-xs text-text-muted font-medium w-5">
                        {i + 1}.
                      </span>
                      <span className="text-sm text-text-primary truncate">
                        {row.asset.name}
                      </span>
                    </div>
                    <div className="flex items-center gap-3 flex-shrink-0">
                      <span className="text-sm font-medium text-danger">
                        {formatPercentage(row.roi)}
                      </span>
                      <span className="text-xs text-danger">
                        {formatCurrency(row.pl)}
                      </span>
                    </div>
                  </div>
                ))}
                {topLosers.length === 0 && (
                  <p className="text-sm text-text-muted">No data available</p>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </>
  );
}
