"use client";

import { useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { Store } from "lucide-react";
import { clsx } from "clsx";
import { fixStorageUrl } from "@/lib/format";
import type { MarketplaceItem } from "@/types";

interface MarketplaceItemCardProps {
  item: MarketplaceItem;
}

export default function MarketplaceItemCard({ item }: MarketplaceItemCardProps) {
  const [imgSrc, setImgSrc] = useState(fixStorageUrl(item.custom_image_url) || item.image_url);

  const handleImageError = () => {
    if (item.custom_image_url && item.image_url && imgSrc !== item.image_url) {
      setImgSrc(item.image_url);
    } else {
      setImgSrc(null);
    }
  };

  const displayPrice = item.sale_price ?? item.current_price ?? item.purchase_price;

  return (
    <Link href={`/marketplace/items/${item.id}`}>
      <div className="bg-surface border border-border rounded-2xl overflow-hidden hover:border-border-hover hover:bg-surface-hover transition-colors cursor-pointer group">
        {/* Card image */}
        <div className="relative w-full aspect-[4/3] bg-background overflow-hidden">
          {imgSrc ? (
            <Image
              src={imgSrc}
              alt={item.name}
              fill
              className="object-contain group-hover:scale-105 transition-transform duration-300 p-2"
              sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
              onError={handleImageError}
            />
          ) : (
            <div className="absolute inset-0 flex items-center justify-center">
              <span className="text-text-muted text-xs">No image</span>
            </div>
          )}
          {/* Type badge */}
          <div className="absolute top-2 left-2">
            <span className={clsx(
              "px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wide",
              item.asset_type === "card"
                ? "bg-blue-500/20 text-blue-400"
                : "bg-purple-500/20 text-purple-400"
            )}>
              {item.asset_type}
            </span>
          </div>
          {item.psa_grade && (
            <div className="absolute top-2 right-2">
              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-yellow-500/20 text-yellow-400 uppercase tracking-wide">
                {item.psa_grade}
              </span>
            </div>
          )}
        </div>

        {/* Info */}
        <div className="p-3">
          <p className="text-sm font-semibold text-text-primary line-clamp-1">{item.name}</p>
          {item.set_name && (
            <p className="text-xs text-text-muted mt-0.5 line-clamp-1">{item.set_name}</p>
          )}
          <div className="mt-2 flex items-center justify-between">
            <span className="text-base font-bold text-accent">
              ${displayPrice?.toFixed(2) ?? "—"}
            </span>
            {item.condition && (
              <span className="text-[10px] text-text-muted bg-surface-hover px-2 py-0.5 rounded-full">
                {item.condition}
              </span>
            )}
          </div>

          {/* Vendor */}
          <div className="mt-2 pt-2 border-t border-border flex items-center gap-1.5">
            {item.vendor.shop_image_url ? (
              <div className="relative w-4 h-4 rounded-full overflow-hidden flex-shrink-0">
                <Image
                  src={item.vendor.shop_image_url}
                  alt={item.vendor.shop_name}
                  fill
                  className="object-cover"
                />
              </div>
            ) : (
              <Store className="w-3.5 h-3.5 text-text-muted flex-shrink-0" />
            )}
            <span className="text-xs text-text-muted truncate">{item.vendor.shop_name}</span>
          </div>
        </div>
      </div>
    </Link>
  );
}
