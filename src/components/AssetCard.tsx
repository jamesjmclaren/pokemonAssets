"use client";

import { useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { clsx } from "clsx";
import { TrendingUp, TrendingDown, Minus, AlertTriangle } from "lucide-react";
import { formatCurrency, formatPercentage, fixStorageUrl } from "@/lib/format";
import type { PortfolioAsset } from "@/types";

interface AssetCardProps {
  asset: PortfolioAsset;
}

export default function AssetCard({ asset }: AssetCardProps) {
  const qty = asset.quantity || 1;
  const currentPrice = asset.current_price ?? asset.purchase_price;
  const totalValue = currentPrice * qty;
  const totalInvested = asset.purchase_price * qty;
  const profit = totalValue - totalInvested;
  const profitPercent =
    totalInvested > 0 ? (profit / totalInvested) * 100 : 0;

  const [imgSrc, setImgSrc] = useState(fixStorageUrl(asset.custom_image_url) || asset.image_url);

  const handleImageError = () => {
    if (asset.custom_image_url && asset.image_url && imgSrc !== asset.image_url) {
      setImgSrc(asset.image_url);
    } else {
      setImgSrc(null);
    }
  };

  const imageUrl = imgSrc;

  const stale = !asset.price_updated_at
    || Date.now() - new Date(asset.price_updated_at).getTime() > 30 * 24 * 60 * 60 * 1000;

  return (
    <Link href={`/asset/${asset.id}`}>
      <div className="bg-surface border border-border rounded-2xl overflow-hidden hover:border-border-hover hover:bg-surface-hover group cursor-pointer">
        {/* Mobile: horizontal row layout / Desktop: vertical card layout */}
        <div className="flex md:block">
          {/* Image */}
          <div className="relative w-24 h-28 md:w-full md:h-auto md:aspect-[4/3] bg-background overflow-hidden flex-shrink-0">
            {imageUrl ? (
              <Image
                src={imageUrl}
                alt={asset.name}
                fill
                className="object-contain p-2 md:p-3 group-hover:scale-105 transition-transform duration-300"
                sizes="(max-width: 768px) 96px, (max-width: 1200px) 33vw, 25vw"
                onError={handleImageError}
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center">
                <div className="text-text-muted text-xs md:text-sm">No Image</div>
              </div>
            )}
            {/* Badges - hidden on mobile row, shown on desktop */}
            <div className="absolute top-2 left-2 hidden md:flex gap-1">
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
              {asset.psa_grade && (
                <span className="px-2 py-1 rounded-lg text-xs font-semibold bg-gold/20 text-gold">
                  {asset.psa_grade}
                </span>
              )}
            </div>
            {qty > 1 && (
              <div className="absolute top-2 right-2 hidden md:block">
                <span className="px-2 py-1 rounded-lg text-xs font-bold bg-surface/80 text-text-primary backdrop-blur-sm">
                  x{qty}
                </span>
              </div>
            )}
            {stale && (
              <div className="absolute bottom-2 right-2 hidden md:block">
                <AlertTriangle className="w-4 h-4 text-danger" />
              </div>
            )}
          </div>

          {/* Info */}
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
              {/* Mobile badges */}
              <div className="md:hidden flex gap-1 flex-shrink-0">
                <span
                  className={clsx(
                    "px-1.5 py-0.5 rounded text-[10px] font-semibold",
                    asset.asset_type === "card"
                      ? "bg-accent-muted text-accent-hover"
                      : "bg-warning-muted text-warning"
                  )}
                >
                  {asset.asset_type === "card" ? "Card" : "Sealed"}
                </span>
                {qty > 1 && (
                  <span className="px-1.5 py-0.5 rounded text-[10px] font-semibold bg-surface-hover text-text-secondary">
                    x{qty}
                  </span>
                )}
              </div>
            </div>

            <div className="flex items-end justify-between mt-2 md:mt-3">
              <div>
                <p className="text-[10px] md:text-xs text-text-muted">
                  {qty > 1 ? "Total Value" : "Current Value"}
                </p>
                <p className="text-sm md:text-lg font-bold text-text-primary">
                  {formatCurrency(totalValue)}
                </p>
              </div>
              <div
                className={clsx(
                  "flex items-center gap-1 px-1.5 md:px-2 py-0.5 md:py-1 rounded-lg text-[10px] md:text-xs font-semibold",
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

            <div className="flex items-center justify-between mt-1.5 md:mt-2 pt-1.5 md:pt-2 border-t border-border">
              <span className="text-[10px] md:text-xs text-text-muted">
                Invested {formatCurrency(totalInvested)}
              </span>
              <span
                className={clsx(
                  "text-[10px] md:text-xs font-medium",
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
      </div>
    </Link>
  );
}
