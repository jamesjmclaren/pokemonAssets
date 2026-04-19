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

interface SetCardRow {
  id: string;
  name: string;
  number: string | null;
  rarity: string | null;
  imageUrl: string | null;
  variant: string | null;
  price: number;
  previousPrice: number | null;
  absChange: number | null;
  pctChange: number | null;
  saleCount: number | null;
  source: string;
}

interface SetBlock {
  setSlug: string;
  setName: string;
  releaseDate: string;
  raw: SetCardRow[];
  psa10: SetCardRow[];
}

export default function DailyRecapPage() {
  const { currentPortfolio, loading: portfolioLoading } = usePortfolio();
  const formatCurrency = useFormatCurrency();
  const [rows, setRows] = useState<MoverRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [fetchedAt, setFetchedAt] = useState<string | null>(null);
  const [setBlocks, setSetBlocks] = useState<SetBlock[]>([]);
  const [setMoversLoading, setSetMoversLoading] = useState(true);
  const [setMoversFetchedAt, setSetMoversFetchedAt] = useState<string | null>(null);
  const [setMoversMissing, setSetMoversMissing] = useState<string[]>([]);
  const [setMoversAvailable, setSetMoversAvailable] = useState<
    { slug: string; name: string; releaseDate?: string }[]
  >([]);

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

  useEffect(() => {
    async function fetchSetMovers() {
      setSetMoversLoading(true);
      try {
        const res = await fetch("/api/set-movers");
        if (!res.ok) throw new Error("Failed");
        const data = await res.json();
        setSetBlocks(Array.isArray(data.sets) ? data.sets : []);
        setSetMoversFetchedAt(data.fetchedAt || null);
        setSetMoversMissing(Array.isArray(data.missing) ? data.missing : []);
        setSetMoversAvailable(
          Array.isArray(data.availableSets) ? data.availableSets : []
        );
      } catch (err) {
        console.error("[daily-recap] set-movers fetch failed:", err);
        setSetBlocks([]);
      } finally {
        setSetMoversLoading(false);
      }
    }
    fetchSetMovers();
  }, []);

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

      <SetMoversSection
        blocks={setBlocks}
        loading={setMoversLoading}
        fetchedAt={setMoversFetchedAt}
        missing={setMoversMissing}
        availableSets={setMoversAvailable}
        formatCurrency={formatCurrency}
      />
    </div>
  );
}

interface SetMoversSectionProps {
  blocks: SetBlock[];
  loading: boolean;
  fetchedAt: string | null;
  missing: string[];
  availableSets: { slug: string; name: string; releaseDate?: string }[];
  formatCurrency: (v: number | null | undefined) => string;
}

function SetMoversSection({
  blocks,
  loading,
  fetchedAt,
  missing,
  availableSets,
  formatCurrency,
}: SetMoversSectionProps) {
  return (
    <section className="space-y-4">
      <div>
        <h2 className="text-lg md:text-xl font-semibold text-text-primary">
          Top Cards · Mega Evolution Series
        </h2>
        <p className="text-text-muted text-sm mt-1">
          The 10 most valuable Holofoil cards (NM, US market) and PSA 10 copies for
          ME03 Perfect Order, ME02 Phantasmal Flames, ME01 Mega Evolution, and ME
          Ascended Heroes, with the latest 24-hour price change.
          {fetchedAt && ` Updated ${new Date(fetchedAt).toLocaleString()}.`}
        </p>
        {missing.length > 0 && (
          <div className="mt-2 space-y-1">
            <p className="text-[11px] text-warning">
              Could not resolve a Poketrace match for: {missing.join(", ")}
            </p>
            {availableSets.length > 0 && (
              <details className="text-[11px] text-text-muted">
                <summary className="cursor-pointer hover:text-text-primary">
                  Show 30 most recent Poketrace sets (click to inspect naming)
                </summary>
                <ul className="mt-1 ml-4 list-disc space-y-0.5">
                  {availableSets.map((s) => (
                    <li key={s.slug}>
                      <span className="text-text-primary">{s.name}</span>
                      <span className="text-text-muted"> — slug: {s.slug}</span>
                    </li>
                  ))}
                </ul>
              </details>
            )}
          </div>
        )}
      </div>

      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="skeleton h-80 rounded-2xl" />
          <div className="skeleton h-80 rounded-2xl" />
        </div>
      ) : blocks.length === 0 ? (
        <div className="bg-surface border border-border rounded-2xl p-6 text-center">
          <p className="text-text-secondary text-sm">
            Could not load set data right now — please refresh in a minute.
          </p>
        </div>
      ) : (
        blocks.map((b) => (
          <SetBlockView key={b.setSlug} block={b} formatCurrency={formatCurrency} />
        ))
      )}
    </section>
  );
}

function SetBlockView({
  block,
  formatCurrency,
}: {
  block: SetBlock;
  formatCurrency: (v: number | null | undefined) => string;
}) {
  const [view, setView] = useState<"raw" | "psa10">("raw");
  const rows = view === "raw" ? block.raw : block.psa10;

  return (
    <div className="bg-surface border border-border rounded-2xl p-4 md:p-6">
      <div className="flex items-center justify-between flex-wrap gap-3 mb-4">
        <div>
          <h3 className="text-base md:text-lg font-semibold text-text-primary">
            {block.setName}
          </h3>
          {block.releaseDate && (
            <p className="text-[11px] text-text-muted">
              Released {new Date(block.releaseDate).toLocaleDateString()}
            </p>
          )}
        </div>
        <div className="inline-flex rounded-lg border border-border overflow-hidden text-xs">
          <button
            onClick={() => setView("raw")}
            className={`px-3 py-1.5 ${view === "raw" ? "bg-accent text-background" : "text-text-secondary hover:bg-surface-hover"}`}
          >
            Raw NM
          </button>
          <button
            onClick={() => setView("psa10")}
            className={`px-3 py-1.5 ${view === "psa10" ? "bg-accent text-background" : "text-text-secondary hover:bg-surface-hover"}`}
          >
            PSA 10
          </button>
        </div>
      </div>

      {rows.length === 0 ? (
        <p className="text-sm text-text-muted">
          No {view === "raw" ? "raw NM" : "PSA 10"} pricing available for this set yet.
        </p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-text-muted text-xs uppercase tracking-wider border-b border-border">
                <th className="py-2 pr-3 font-medium w-8">#</th>
                <th className="py-2 pr-3 font-medium">Card</th>
                <th className="py-2 pr-3 font-medium text-right">Price</th>
                <th className="py-2 pr-3 font-medium text-right">Prev 24h</th>
                <th className="py-2 pr-3 font-medium text-right">Δ</th>
                <th className="py-2 font-medium text-right">%</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r, i) => {
                const src = fixStorageUrl(r.imageUrl) || r.imageUrl;
                const pct = r.pctChange;
                const abs = r.absChange;
                const positive = (pct ?? 0) >= 0;
                return (
                  <tr key={r.id} className="border-b border-border/50 last:border-0">
                    <td className="py-2 pr-3 text-text-muted text-xs">{i + 1}</td>
                    <td className="py-2 pr-3">
                      <div className="flex items-center gap-3">
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
                        <div className="min-w-0">
                          <p className="text-text-primary truncate">{r.name}</p>
                          <p className="text-[10px] text-text-muted">
                            {r.number && `#${r.number}`}
                            {r.rarity && (r.number ? ` · ${r.rarity}` : r.rarity)}
                            {r.variant && ` · ${r.variant}`}
                          </p>
                        </div>
                      </div>
                    </td>
                    <td className="py-2 pr-3 text-right text-text-primary whitespace-nowrap">
                      {formatCurrency(r.price)}
                    </td>
                    <td className="py-2 pr-3 text-right text-text-secondary whitespace-nowrap">
                      {r.previousPrice != null ? formatCurrency(r.previousPrice) : "—"}
                    </td>
                    <td
                      className={`py-2 pr-3 text-right whitespace-nowrap ${
                        abs == null ? "text-text-muted" : positive ? "text-success" : "text-danger"
                      }`}
                    >
                      {abs == null
                        ? "—"
                        : `${positive ? "+" : ""}${formatCurrency(abs)}`}
                    </td>
                    <td
                      className={`py-2 text-right font-semibold whitespace-nowrap ${
                        pct == null ? "text-text-muted" : positive ? "text-success" : "text-danger"
                      }`}
                    >
                      {pct == null ? "—" : formatPercentage(pct)}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
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
