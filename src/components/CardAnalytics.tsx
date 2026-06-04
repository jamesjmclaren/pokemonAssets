"use client";

import { useEffect, useState } from "react";
import { Loader2, TrendingUp, TrendingDown, Minus, ArrowUpRight } from "lucide-react";
import PriceChart from "@/components/PriceChart";

export interface TierSummary {
  tier: string;
  label: string;
  source: string;
  avg: number;
  low?: number;
  high?: number;
  saleCount?: number;
  avg1d?: number | null;
  avg7d?: number | null;
  avg30d?: number | null;
}

export interface CardDetail {
  id: string;
  name: string;
  setName: string;
  cardNumber: string | null;
  rarity: string | null;
  image: string | null;
  type: "card" | "sealed";
  currency: string;
  isConverted: boolean;
  rawPrices: Record<string, TierSummary>;
  gradedPrices: TierSummary[];
}

function priceDelta(current: number | null | undefined, previous: number | null | undefined): number | null {
  if (current == null || previous == null || previous === 0) return null;
  return ((current - previous) / previous) * 100;
}

export function DeltaBadge({ delta }: { delta: number | null }) {
  if (delta == null) return null;
  const abs = Math.abs(delta).toFixed(1);
  if (delta > 0.5) return <span className="text-xs text-green-400 flex items-center gap-0.5"><TrendingUp className="w-3 h-3" />+{abs}%</span>;
  if (delta < -0.5) return <span className="text-xs text-red-400 flex items-center gap-0.5"><TrendingDown className="w-3 h-3" />-{abs}%</span>;
  return <span className="text-xs text-text-muted flex items-center gap-0.5"><Minus className="w-3 h-3" />{abs}%</span>;
}

function RawPriceCard({ label, data }: { label: string; data?: TierSummary }) {
  if (!data) {
    return (
      <div className="bg-surface-hover border border-border rounded-xl p-4 opacity-40">
        <p className="text-xs text-text-muted mb-1">{label}</p>
        <p className="text-lg font-bold text-text-muted">—</p>
      </div>
    );
  }
  const delta7d = priceDelta(data.avg, data.avg7d);
  return (
    <div className="bg-surface border border-border rounded-xl p-4">
      <p className="text-xs text-text-muted mb-1">{label}</p>
      <p className="text-xl font-bold text-text-primary">${data.avg.toFixed(2)}</p>
      <div className="mt-1 flex items-center justify-between">
        <p className="text-xs text-text-muted">
          {data.low != null && data.high != null ? `$${data.low.toFixed(2)} – $${data.high.toFixed(2)}` : ""}
        </p>
        <DeltaBadge delta={delta7d} />
      </div>
      {data.saleCount != null && (
        <p className="text-xs text-text-muted mt-1">~{data.saleCount} sales</p>
      )}
    </div>
  );
}

interface CardAnalyticsProps {
  poketraceId: string;
  cardName?: string;
  assetType?: "card" | "sealed";
  showPoketraceLink?: boolean;
}

export default function CardAnalytics({
  poketraceId,
  cardName,
  assetType,
  showPoketraceLink = true,
}: CardAnalyticsProps) {
  const [detail, setDetail] = useState<CardDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setFailed(false);
    fetch(`/api/card-detail?poketraceId=${encodeURIComponent(poketraceId)}`)
      .then(async (res) => {
        if (cancelled) return;
        if (res.ok) setDetail(await res.json());
        else setFailed(true);
      })
      .catch(() => { if (!cancelled) setFailed(true); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [poketraceId]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="w-6 h-6 animate-spin text-text-muted" />
      </div>
    );
  }

  if (failed || !detail) {
    return (
      <div className="text-center py-12 text-text-muted text-sm">
        Could not load market analytics for this item.
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Raw prices */}
      <section>
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-semibold text-text-secondary uppercase tracking-wide">
            Raw / Ungraded Prices
          </h3>
          {detail.isConverted && (
            <span className="text-xs text-text-muted bg-surface-hover px-2 py-0.5 rounded-full">EUR→USD</span>
          )}
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
          <RawPriceCard label="TCGPlayer" data={detail.rawPrices["tcgplayer"]} />
          <RawPriceCard label="eBay" data={detail.rawPrices["ebay"]} />
          <RawPriceCard label="CardMarket" data={detail.rawPrices["cardmarket"]} />
        </div>
      </section>

      {/* Graded prices */}
      {detail.gradedPrices.length > 0 && (
        <section>
          <h3 className="text-sm font-semibold text-text-secondary uppercase tracking-wide mb-3">
            Graded Prices
          </h3>
          <div className="bg-surface border border-border rounded-2xl overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border">
                    <th className="text-left px-4 py-3 text-xs font-medium text-text-muted">Grade</th>
                    <th className="text-right px-4 py-3 text-xs font-medium text-text-muted">Avg Price</th>
                    <th className="text-right px-4 py-3 text-xs font-medium text-text-muted hidden sm:table-cell">Low</th>
                    <th className="text-right px-4 py-3 text-xs font-medium text-text-muted hidden sm:table-cell">High</th>
                    <th className="text-right px-4 py-3 text-xs font-medium text-text-muted hidden md:table-cell">7d Avg</th>
                    <th className="text-right px-4 py-3 text-xs font-medium text-text-muted hidden md:table-cell">30d Avg</th>
                    <th className="text-right px-4 py-3 text-xs font-medium text-text-muted">Sales</th>
                    <th className="text-left px-4 py-3 text-xs font-medium text-text-muted hidden lg:table-cell">Source</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {detail.gradedPrices.map((tier) => {
                    const delta7d = priceDelta(tier.avg, tier.avg7d);
                    return (
                      <tr key={tier.tier} className="hover:bg-surface-hover transition-colors">
                        <td className="px-4 py-3">
                          <span className="font-semibold text-text-primary">{tier.label}</span>
                        </td>
                        <td className="px-4 py-3 text-right">
                          <div className="flex flex-col items-end gap-0.5">
                            <span className="font-bold text-text-primary">${tier.avg.toFixed(2)}</span>
                            <DeltaBadge delta={delta7d} />
                          </div>
                        </td>
                        <td className="px-4 py-3 text-right text-text-muted hidden sm:table-cell">
                          {tier.low != null ? `$${tier.low.toFixed(2)}` : "—"}
                        </td>
                        <td className="px-4 py-3 text-right text-text-muted hidden sm:table-cell">
                          {tier.high != null ? `$${tier.high.toFixed(2)}` : "—"}
                        </td>
                        <td className="px-4 py-3 text-right text-text-muted hidden md:table-cell">
                          {tier.avg7d != null ? `$${tier.avg7d.toFixed(2)}` : "—"}
                        </td>
                        <td className="px-4 py-3 text-right text-text-muted hidden md:table-cell">
                          {tier.avg30d != null ? `$${tier.avg30d.toFixed(2)}` : "—"}
                        </td>
                        <td className="px-4 py-3 text-right text-text-muted">
                          {tier.saleCount != null ? `~${tier.saleCount}` : "—"}
                        </td>
                        <td className="px-4 py-3 hidden lg:table-cell">
                          <span className="text-xs text-text-muted capitalize">{tier.source}</span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </section>
      )}

      {/* Price history chart */}
      <section>
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-semibold text-text-secondary uppercase tracking-wide">
            Price History (Near Mint)
          </h3>
          {showPoketraceLink && (
            <a
              href={`https://poketrace.com/cards/${detail.id}`}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1 text-xs text-text-muted hover:text-accent transition-colors"
            >
              View on Poketrace <ArrowUpRight className="w-3 h-3" />
            </a>
          )}
        </div>
        <PriceChart
          externalId={detail.id}
          poketraceId={detail.id}
          cardName={cardName ?? detail.name}
          assetType={assetType ?? detail.type}
        />
      </section>
    </div>
  );
}
