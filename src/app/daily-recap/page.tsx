"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { TrendingUp, TrendingDown, Clock, Info } from "lucide-react";
import { usePortfolio } from "@/lib/portfolio-context";
import { useFormatCurrency } from "@/lib/currency-context";
import { formatPercentage, fixStorageUrl, getMarketDisclaimer } from "@/lib/format";

interface MoverRow {
  assetId: string;
  name: string;
  setName: string | null;
  imageUrl: string | null;
  poketraceId: string;
  poketraceMarket: string;
  grade: string | null;
  latestDate: string | null;
  latestPrice: number | null;
  previousDate: string | null;
  previousPrice: number | null;
  absChange: number | null;
  pctChange: number | null;
}

export default function DailyRecapPage() {
  const { currentPortfolio, loading: portfolioLoading } = usePortfolio();
  const formatCurrency = useFormatCurrency();
  const [rows, setRows] = useState<MoverRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [fetchedAt, setFetchedAt] = useState<string | null>(null);

  useEffect(() => {
    async function fetchMovers() {
      if (!currentPortfolio) {
        setLoading(false);
        return;
      }
      setLoading(true);
      try {
        const res = await fetch(`/api/daily-movers?portfolioId=${currentPortfolio.id}`);
        if (!res.ok) throw new Error("Failed");
        const data = await res.json();
        setRows(Array.isArray(data.rows) ? data.rows : []);
        setFetchedAt(data.fetchedAt || null);
      } catch (err) {
        console.error("[daily-recap] fetch failed:", err);
        setRows([]);
      } finally {
        setLoading(false);
      }
    }
    fetchMovers();
  }, [currentPortfolio]);

  const tracked = useMemo(
    () => rows.filter((r) => r.pctChange != null),
    [rows]
  );
  const unchanged = useMemo(
    () => rows.filter((r) => r.pctChange == null),
    [rows]
  );

  const topUp = useMemo(
    () => [...tracked].filter((r) => (r.pctChange ?? 0) > 0).sort((a, b) => (b.pctChange ?? 0) - (a.pctChange ?? 0)).slice(0, 10),
    [tracked]
  );
  const topDown = useMemo(
    () => [...tracked].filter((r) => (r.pctChange ?? 0) < 0).sort((a, b) => (a.pctChange ?? 0) - (b.pctChange ?? 0)).slice(0, 10),
    [tracked]
  );

  if (portfolioLoading || loading) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-xl md:text-2xl font-bold text-text-primary">Daily Movers</h1>
          <p className="text-text-muted text-sm mt-1">Loading latest price changes...</p>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="skeleton h-80 rounded-2xl" />
          <div className="skeleton h-80 rounded-2xl" />
        </div>
      </div>
    );
  }

  if (!currentPortfolio) {
    return (
      <div className="space-y-4">
        <h1 className="text-xl md:text-2xl font-bold text-text-primary">Daily Movers</h1>
        <p className="text-text-muted text-sm">Select a portfolio to see daily price changes.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl md:text-2xl font-bold text-text-primary flex items-center gap-2">
          <Clock className="w-6 h-6 text-accent" />
          Daily Movers
        </h1>
        <p className="text-text-muted text-sm mt-1">
          Latest day-over-day price changes across your linked Poketrace assets.
          {fetchedAt && ` Updated ${new Date(fetchedAt).toLocaleString()}.`}
        </p>
        <p className="text-[11px] text-text-muted mt-1 flex items-start gap-1">
          <Info className="w-3 h-3 mt-0.5 flex-shrink-0" aria-hidden />
          <span>
            {getMarketDisclaimer("US", "long")} Moves reflect daily aggregated market data, not individual verified sales.
            European-market assets are converted from EUR.
          </span>
        </p>
      </div>

      {tracked.length === 0 ? (
        <div className="bg-surface border border-border rounded-2xl p-6 text-center">
          <p className="text-text-secondary">
            No day-over-day movement yet. Link more assets to Poketrace or check back tomorrow.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <MoversPanel
            title="Top Movers Up"
            icon={<TrendingUp className="w-5 h-5 text-success" />}
            rows={topUp}
            emptyLabel="No upward movement today."
            formatCurrency={formatCurrency}
            direction="up"
          />
          <MoversPanel
            title="Top Movers Down"
            icon={<TrendingDown className="w-5 h-5 text-danger" />}
            rows={topDown}
            emptyLabel="No downward movement today."
            formatCurrency={formatCurrency}
            direction="down"
          />
        </div>
      )}

      {tracked.length > 0 && (
        <div className="bg-surface border border-border rounded-2xl p-4 md:p-6">
          <h2 className="text-lg font-semibold text-text-primary mb-4">All Tracked Assets</h2>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-text-muted text-xs uppercase tracking-wider border-b border-border">
                  <th className="py-2 pr-3 font-medium">Asset</th>
                  <th className="py-2 pr-3 font-medium">Market</th>
                  <th className="py-2 pr-3 font-medium text-right">Previous</th>
                  <th className="py-2 pr-3 font-medium text-right">Latest</th>
                  <th className="py-2 pr-3 font-medium text-right">Δ</th>
                  <th className="py-2 font-medium text-right">%</th>
                </tr>
              </thead>
              <tbody>
                {[...tracked]
                  .sort((a, b) => Math.abs(b.pctChange ?? 0) - Math.abs(a.pctChange ?? 0))
                  .map((r) => {
                    const positive = (r.pctChange ?? 0) >= 0;
                    return (
                      <tr key={r.assetId} className="border-b border-border/50 last:border-0">
                        <td className="py-2 pr-3">
                          <Link href={`/asset/${r.assetId}`} className="text-text-primary hover:text-accent">
                            {r.name}
                          </Link>
                          {r.grade && <span className="ml-1 text-[10px] text-text-muted">({r.grade})</span>}
                        </td>
                        <td className="py-2 pr-3 text-text-muted">{r.poketraceMarket}</td>
                        <td className="py-2 pr-3 text-right text-text-secondary">{formatCurrency(r.previousPrice ?? 0)}</td>
                        <td className="py-2 pr-3 text-right text-text-primary">{formatCurrency(r.latestPrice ?? 0)}</td>
                        <td className={`py-2 pr-3 text-right ${positive ? "text-success" : "text-danger"}`}>
                          {positive ? "+" : ""}
                          {formatCurrency(r.absChange ?? 0)}
                        </td>
                        <td className={`py-2 text-right font-semibold ${positive ? "text-success" : "text-danger"}`}>
                          {formatPercentage(r.pctChange ?? 0)}
                        </td>
                      </tr>
                    );
                  })}
              </tbody>
            </table>
          </div>
          {unchanged.length > 0 && (
            <p className="text-[11px] text-text-muted mt-3">
              {unchanged.length} linked asset{unchanged.length === 1 ? "" : "s"} had no day-over-day change (insufficient history or no recorded sales).
            </p>
          )}
        </div>
      )}
    </div>
  );
}

interface PanelProps {
  title: string;
  icon: React.ReactNode;
  rows: MoverRow[];
  emptyLabel: string;
  formatCurrency: (v: number | null | undefined) => string;
  direction: "up" | "down";
}

function MoversPanel({ title, icon, rows, emptyLabel, formatCurrency, direction }: PanelProps) {
  return (
    <div className="bg-surface border border-border rounded-2xl p-4 md:p-6">
      <h2 className="text-lg font-semibold text-text-primary flex items-center gap-2 mb-4">
        {icon}
        {title}
      </h2>
      <div className="space-y-3">
        {rows.length === 0 ? (
          <p className="text-sm text-text-muted">{emptyLabel}</p>
        ) : (
          rows.map((r, i) => {
            const src = fixStorageUrl(r.imageUrl) || r.imageUrl;
            return (
              <Link
                key={r.assetId}
                href={`/asset/${r.assetId}`}
                className="flex items-center gap-3 group"
              >
                <span className="text-xs text-text-muted font-medium w-4">{i + 1}.</span>
                <div className="relative w-8 h-10 bg-background rounded flex-shrink-0 overflow-hidden">
                  {src && (
                    <Image
                      src={src}
                      alt={r.name}
                      fill
                      className="object-contain p-0.5"
                      sizes="32px"
                      unoptimized={src.includes("tcgplayer-cdn")}
                    />
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-text-primary truncate group-hover:text-accent">{r.name}</p>
                  <p className="text-[10px] text-text-muted">
                    {formatCurrency(r.previousPrice ?? 0)} → {formatCurrency(r.latestPrice ?? 0)}
                  </p>
                </div>
                <div className="text-right flex-shrink-0">
                  <p className={`text-sm font-semibold ${direction === "up" ? "text-success" : "text-danger"}`}>
                    {formatPercentage(r.pctChange ?? 0)}
                  </p>
                  <p className={`text-[10px] ${direction === "up" ? "text-success" : "text-danger"}`}>
                    {(r.absChange ?? 0) >= 0 ? "+" : ""}
                    {formatCurrency(r.absChange ?? 0)}
                  </p>
                </div>
              </Link>
            );
          })
        )}
      </div>
    </div>
  );
}
