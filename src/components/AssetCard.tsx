"use client";

import Link from "next/link";
import Image from "next/image";
import { clsx } from "clsx";
import { TrendingUp, TrendingDown, Minus } from "lucide-react";
import { formatCurrency, formatPercentage } from "@/lib/format";
import type { PortfolioAsset } from "@/types";

interface AssetCardProps {
  asset: PortfolioAsset;
}

export default function AssetCard({ asset }: AssetCardProps) {
  const currentPrice = asset.current_price ?? asset.purchase_price;
  const profit = currentPrice - asset.purchase_price;
  const profitPercent =
    asset.purchase_price > 0 ? (profit / asset.purchase_price) * 100 : 0;

  const imageUrl = asset.custom_image_url || asset.image_url;

  return (
    <Link href={`/asset/${asset.id}`}>
      <div className="bg-surface border border-border rounded-2xl overflow-hidden hover:border-border-hover hover:bg-surface-hover group cursor-pointer">
        {/* Image */}
        <div className="relative aspect-[3/4] bg-background overflow-hidden">
          {imageUrl ? (
            <Image
              src={imageUrl}
              alt={asset.name}
              fill
              className="object-contain p-4 group-hover:scale-105 transition-transform duration-300"
              sizes="(max-width: 768px) 50vw, (max-width: 1200px) 33vw, 25vw"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center">
              <div className="text-text-muted text-sm">No Image</div>
            </div>
          )}
          {/* Type badge */}
          <div className="absolute top-3 left-3">
            <span
              className={clsx(
                "px-2 py-1 rounded-lg text-xs font-semibold",
                asset.asset_type === "card"
                  ? "bg-accent-muted text-accent-hover"
                  : "bg-warning-muted text-warning"
              )}
            >
              {asset.asset_type === "card" ? "Card" : "Sealed"}
            </span>
          </div>
        </div>

        {/* Info */}
        <div className="p-4">
          <h3 className="text-sm font-semibold text-text-primary truncate">
            {asset.name}
          </h3>
          <p className="text-xs text-text-muted mt-0.5 truncate">
            {asset.set_name}
          </p>

          <div className="flex items-end justify-between mt-3">
            <div>
              <p className="text-xs text-text-muted">Current Value</p>
              <p className="text-lg font-bold text-text-primary">
                {formatCurrency(currentPrice)}
              </p>
            </div>
            <div
              className={clsx(
                "flex items-center gap-1 px-2 py-1 rounded-lg text-xs font-semibold",
                profit > 0 && "bg-success-muted text-success",
                profit < 0 && "bg-danger-muted text-danger",
                profit === 0 && "bg-surface-hover text-text-secondary"
              )}
            >
              {profit > 0 ? (
                <TrendingUp className="w-3 h-3" />
              ) : profit < 0 ? (
                <TrendingDown className="w-3 h-3" />
              ) : (
                <Minus className="w-3 h-3" />
              )}
              {formatPercentage(profitPercent)}
            </div>
          </div>

          <div className="flex items-center justify-between mt-2 pt-2 border-t border-border">
            <span className="text-xs text-text-muted">
              Paid {formatCurrency(asset.purchase_price)}
            </span>
            <span
              className={clsx(
                "text-xs font-medium",
                profit > 0 && "text-success",
                profit < 0 && "text-danger",
                profit === 0 && "text-text-secondary"
              )}
            >
              {profit >= 0 ? "+" : ""}
              {formatCurrency(profit)}
            </span>
          </div>
        </div>
      </div>
    </Link>
  );
}
