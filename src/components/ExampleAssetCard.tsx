"use client";

import Image from "next/image";
import { TrendingUp, TrendingDown, Minus } from "lucide-react";
import { formatCurrency } from "@/lib/format";

export interface ExampleAsset {
  name: string;
  set_name: string;
  asset_type: "card" | "sealed";
  image_url: string;
  purchase_price: number;
  current_price: number;
  psa_grade?: string | null;
}

export default function ExampleAssetCard({ asset }: { asset: ExampleAsset }) {
  const totalValue = asset.current_price;
  const totalInvested = asset.purchase_price;
  const profit = totalValue - totalInvested;
  const profitPercent =
    totalInvested > 0 ? (profit / totalInvested) * 100 : 0;

  return (
    <div className="bg-surface border border-border rounded-2xl overflow-hidden hover:border-border-hover transition-colors">
      <div className="flex md:block">
        <div className="relative w-24 h-28 md:w-full md:h-auto md:aspect-[4/3] bg-background overflow-hidden flex-shrink-0">
          <Image
            src={asset.image_url}
            alt={asset.name}
            fill
            className="object-contain p-2 md:p-3"
            sizes="(max-width: 768px) 96px, (max-width: 1200px) 33vw, 25vw"
          />
        </div>
        <div className="p-3 md:p-4 flex-1 min-w-0">
          <div className="flex items-start gap-2 md:block">
            <div className="flex-1 min-w-0">
              <h3 className="text-xs md:text-sm font-semibold text-text-primary truncate">
                {asset.name}
              </h3>
              <p className="text-xs text-text-muted mt-0.5 truncate">
                {asset.set_name}
              </p>
            </div>
            <div className="flex gap-1 flex-shrink-0 md:mt-1.5">
              <span
                className={
                  asset.asset_type === "card"
                    ? "px-1.5 py-0.5 md:px-2 md:py-1 rounded md:rounded-lg text-[10px] md:text-xs font-semibold bg-accent-muted text-accent-hover"
                    : "px-1.5 py-0.5 md:px-2 md:py-1 rounded md:rounded-lg text-[10px] md:text-xs font-semibold bg-warning-muted text-warning"
                }
              >
                {asset.asset_type === "card" ? "Card" : "Sealed"}
              </span>
              {asset.psa_grade && (
                <span className="px-1.5 py-0.5 md:px-2 md:py-1 rounded md:rounded-lg text-[10px] md:text-xs font-semibold bg-gold/20 text-gold">
                  PSA {asset.psa_grade}
                </span>
              )}
            </div>
          </div>
          <div className="flex items-end justify-between mt-2 md:mt-3">
            <div>
              <p className="text-[10px] md:text-xs text-text-muted">
                Current Value
              </p>
              <p className="text-sm md:text-lg font-bold text-text-primary">
                {formatCurrency(totalValue)}
              </p>
            </div>
            <div
              className={
                profit > 0
                  ? "flex items-center gap-1 px-1.5 md:px-2 py-0.5 md:py-1 rounded-lg text-[10px] md:text-xs font-semibold bg-success-muted text-success"
                  : profit < 0
                    ? "flex items-center gap-1 px-1.5 md:px-2 py-0.5 md:py-1 rounded-lg text-[10px] md:text-xs font-semibold bg-danger-muted text-danger"
                    : "flex items-center gap-1 px-1.5 md:px-2 py-0.5 md:py-1 rounded-lg text-[10px] md:text-xs font-semibold bg-surface-hover text-text-secondary"
              }
            >
              {profit > 0 ? (
                <TrendingUp className="w-3 h-3" />
              ) : profit < 0 ? (
                <TrendingDown className="w-3 h-3" />
              ) : (
                <Minus className="w-3 h-3" />
              )}
              {formatCurrency(profit)}
            </div>
          </div>
          <div className="flex items-center justify-between mt-1.5 md:mt-2 pt-1.5 md:pt-2 border-t border-border">
            <span className="text-[10px] md:text-xs text-text-muted">
              Invested {formatCurrency(totalInvested)}
            </span>
            <span
              className={
                profit > 0
                  ? "text-[10px] md:text-xs font-medium text-success"
                  : profit < 0
                    ? "text-[10px] md:text-xs font-medium text-danger"
                    : "text-[10px] md:text-xs font-medium text-text-secondary"
              }
            >
              {profit >= 0 ? "+" : ""}
              {profitPercent.toFixed(1)}%
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
