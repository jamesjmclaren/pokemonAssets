"use client";

import Image from "next/image";
import { clsx } from "clsx";
import TrendBadge from "@/components/TrendBadge";
import type { TrendCard } from "@/app/api/set-trends/route";

interface SetTrendsListProps {
  title: string;
  subtitle: string;
  cards: TrendCard[];
  loading?: boolean;
  accentColor?: "gold" | "blue";
}

function SkeletonRow() {
  return (
    <div className="flex items-center gap-3 py-3 border-b border-border last:border-0 animate-pulse">
      <div className="w-6 text-center shrink-0">
        <div className="h-4 w-4 bg-border rounded mx-auto" />
      </div>
      <div className="w-10 h-14 bg-border rounded-lg shrink-0" />
      <div className="flex-1 min-w-0 space-y-2">
        <div className="h-4 bg-border rounded w-3/4" />
        <div className="h-3 bg-border rounded w-1/2" />
      </div>
      <div className="text-right space-y-2 shrink-0">
        <div className="h-4 bg-border rounded w-16" />
        <div className="h-3 bg-border rounded w-20" />
      </div>
    </div>
  );
}

function EmptyState({ label }: { label: string }) {
  return (
    <div className="py-10 text-center text-text-muted text-sm">
      No {label} price data available for this set.
    </div>
  );
}

export default function SetTrendsList({
  title,
  subtitle,
  cards,
  loading = false,
  accentColor = "gold",
}: SetTrendsListProps) {
  const borderAccent = accentColor === "gold" ? "border-accent" : "border-blue-500";
  const textAccent = accentColor === "gold" ? "text-accent" : "text-blue-400";

  return (
    <div className="bg-surface border border-border rounded-2xl overflow-hidden">
      <div className={clsx("px-5 py-4 border-b border-border border-l-4", borderAccent)}>
        <h3 className="font-semibold text-text-primary">{title}</h3>
        <p className="text-xs text-text-muted mt-0.5">{subtitle}</p>
      </div>

      <div className="px-5">
        {loading ? (
          Array.from({ length: 5 }).map((_, i) => <SkeletonRow key={i} />)
        ) : cards.length === 0 ? (
          <EmptyState label={title.toLowerCase()} />
        ) : (
          cards.map((card, i) => (
            <div
              key={card.id}
              className="flex items-center gap-3 py-3 border-b border-border last:border-0 hover:bg-surface-hover transition-colors rounded"
            >
              {/* Rank */}
              <div className={clsx("w-6 text-center text-xs font-bold shrink-0", i < 3 ? textAccent : "text-text-muted")}>
                {i + 1}
              </div>

              {/* Card image */}
              <div className="w-10 h-14 relative shrink-0 rounded-lg overflow-hidden bg-border">
                {card.image ? (
                  <Image
                    src={card.image}
                    alt={card.name}
                    fill
                    className="object-cover"
                    sizes="40px"
                    unoptimized
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-text-muted text-xs">
                    ?
                  </div>
                )}
              </div>

              {/* Card info */}
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-text-primary truncate leading-tight">
                  {card.name}
                </p>
                <p className="text-xs text-text-muted mt-0.5">
                  {[card.cardNumber && `#${card.cardNumber}`, card.rarity]
                    .filter(Boolean)
                    .join(" · ")}
                </p>
              </div>

              {/* Price + trend */}
              <div className="text-right shrink-0">
                <p className="text-sm font-bold text-text-primary">
                  ${card.currentPrice.toFixed(2)}
                </p>
                <div className="mt-0.5">
                  <TrendBadge
                    absChange={card.absChange}
                    pctChange={card.pctChange}
                    size="sm"
                  />
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
