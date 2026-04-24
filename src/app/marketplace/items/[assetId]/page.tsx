"use client";

import { useState, useEffect } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { ArrowLeft, Store, Globe, ShoppingBag, MessageCircle, Loader2, Package, AlertTriangle, Info } from "lucide-react";
import { clsx } from "clsx";
import { fixStorageUrl } from "@/lib/format";
import type { MarketplaceItem } from "@/types";

export default function MarketplaceItemPage() {
  const { assetId } = useParams<{ assetId: string }>();
  const [item, setItem] = useState<MarketplaceItem | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [imgSrc, setImgSrc] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/marketplace/items")
      .then(async (res) => {
        if (!res.ok) { setNotFound(true); setLoading(false); return; }
        const items: MarketplaceItem[] = await res.json();
        const found = items.find((i) => i.id === assetId);
        if (!found) { setNotFound(true); setLoading(false); return; }
        setItem(found);
        setImgSrc(fixStorageUrl(found.custom_image_url) || found.image_url);
        setLoading(false);
      })
      .catch(() => { setNotFound(true); setLoading(false); });
  }, [assetId]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="w-6 h-6 animate-spin text-text-muted" />
      </div>
    );
  }

  if (notFound || !item) {
    return (
      <div className="text-center py-20 text-text-muted">
        <Package className="w-10 h-10 mx-auto mb-3 opacity-40" />
        <p className="text-sm">Item not found or no longer available.</p>
        <Link href="/marketplace" className="mt-3 inline-block text-sm text-accent hover:underline">
          Back to Marketplace
        </Link>
      </div>
    );
  }

  const displayPrice = item.sale_price ?? item.current_price ?? item.purchase_price;
  const vendor = item.vendor;

  const priceSourceLabel = item.manual_price
    ? "Manually set"
    : item.price_source === "tcgplayer"
    ? "TCGPlayer (via Poketrace)"
    : item.price_source === "ebay"
    ? "eBay (via Poketrace)"
    : item.price_source === "cardmarket"
    ? "CardMarket (via Poketrace)"
    : "Poketrace (auto)";

  return (
    <div className="max-w-4xl mx-auto">
      <Link
        href="/marketplace"
        className="inline-flex items-center gap-1.5 text-sm text-text-muted hover:text-text-primary mb-4 transition-colors"
      >
        <ArrowLeft className="w-4 h-4" />
        Marketplace
      </Link>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Image */}
        <div className="relative aspect-[3/4] bg-surface border border-border rounded-2xl overflow-hidden flex items-center justify-center">
          {imgSrc ? (
            <Image
              src={imgSrc}
              alt={item.name}
              fill
              className="object-contain p-6"
              onError={() => {
                if (item.custom_image_url && imgSrc !== item.image_url) {
                  setImgSrc(item.image_url);
                } else {
                  setImgSrc(null);
                }
              }}
            />
          ) : (
            <Package className="w-16 h-16 text-text-muted opacity-30" />
          )}
        </div>

        {/* Details */}
        <div className="flex flex-col gap-4">
          {/* Badges */}
          <div className="flex flex-wrap gap-2">
            <span className={clsx(
              "px-2.5 py-1 rounded-full text-xs font-bold uppercase tracking-wide",
              item.asset_type === "card"
                ? "bg-blue-500/15 text-blue-400"
                : "bg-purple-500/15 text-purple-400"
            )}>
              {item.asset_type}
            </span>
            {item.psa_grade && (
              <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-yellow-500/15 text-yellow-400 uppercase tracking-wide">
                {item.psa_grade}
              </span>
            )}
            {item.rarity && (
              <span className="px-2.5 py-1 rounded-full text-xs bg-surface-hover text-text-muted">
                {item.rarity}
              </span>
            )}
          </div>

          <div>
            <h1 className="text-2xl font-bold text-text-primary">{item.name}</h1>
            {item.set_name && (
              <p className="text-sm text-text-muted mt-0.5">{item.set_name}{item.card_number ? ` · #${item.card_number}` : ""}</p>
            )}
          </div>

          {/* Price */}
          <div className="p-4 bg-surface border border-border rounded-xl">
            <p className="text-xs text-text-muted mb-0.5">Asking Price</p>
            <p className="text-3xl font-bold text-accent">
              ${displayPrice?.toFixed(2) ?? "—"}
            </p>
            {item.quantity && item.quantity > 1 && (
              <p className="text-xs text-text-muted mt-1">{item.quantity} available</p>
            )}
          </div>

          {/* Details table */}
          <div className="space-y-2 text-sm">
            {item.condition && (
              <div className="flex justify-between py-2 border-b border-border">
                <span className="text-text-muted">Condition</span>
                <span className="text-text-primary font-medium">{item.condition}</span>
              </div>
            )}
            {item.language && (
              <div className="flex justify-between py-2 border-b border-border">
                <span className="text-text-muted">Language</span>
                <span className="text-text-primary font-medium">{item.language}</span>
              </div>
            )}
            {item.current_price != null && (
              <div className="flex justify-between py-2 border-b border-border">
                <span className="text-text-muted">Market Price</span>
                <div className="text-right">
                  <span className="text-text-secondary">${item.current_price.toFixed(2)}</span>
                  <p className="text-xs text-text-muted mt-0.5 flex items-center justify-end gap-1">
                    <Info className="w-3 h-3" />
                    {priceSourceLabel}
                  </p>
                </div>
              </div>
            )}
          </div>

          {/* Manual price warning */}
          {item.manual_price && (
            <div className="p-3 bg-amber-500/10 border border-amber-500/30 rounded-xl flex gap-2.5">
              <AlertTriangle className="w-4 h-4 text-amber-400 flex-shrink-0 mt-0.5" />
              <div className="text-xs text-amber-300">
                <p className="font-semibold mb-0.5">Market price was manually set by the vendor</p>
                <p className="text-amber-300/80">
                  This is not an auto-sourced market rate. Please do your own research before purchasing — check TCGPlayer, eBay sold listings, or Poketrace to verify a fair price.
                </p>
              </div>
            </div>
          )}

          {/* Vendor card */}
          <div className="p-4 bg-surface border border-border rounded-xl">
            <p className="text-xs text-text-muted mb-3 uppercase tracking-wide font-medium">Sold by</p>
            <div className="flex items-center gap-3 mb-4">
              {vendor.shop_image_url ? (
                <div className="relative w-10 h-10 rounded-lg overflow-hidden flex-shrink-0">
                  <Image
                    src={fixStorageUrl(vendor.shop_image_url) || vendor.shop_image_url}
                    alt={vendor.shop_name}
                    fill
                    className="object-cover"
                  />
                </div>
              ) : (
                <div className="w-10 h-10 rounded-lg bg-surface-hover flex items-center justify-center flex-shrink-0">
                  <Store className="w-5 h-5 text-text-muted" />
                </div>
              )}
              <div className="min-w-0">
                <Link
                  href={`/marketplace/vendors/${vendor.id}`}
                  className="font-semibold text-text-primary hover:text-accent transition-colors"
                >
                  {vendor.shop_name}
                </Link>
                {vendor.description && (
                  <p className="text-xs text-text-muted line-clamp-1">{vendor.description}</p>
                )}
              </div>
            </div>

            {/* Contact buttons */}
            <div className="flex flex-wrap gap-2">
              {vendor.whatsapp_number && (
                <a
                  href={`https://wa.me/${vendor.whatsapp_number}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-2 px-4 py-2 bg-green-600 hover:bg-green-700 text-white text-sm font-medium rounded-xl transition-colors"
                >
                  <MessageCircle className="w-4 h-4" />
                  WhatsApp
                </a>
              )}
              {vendor.ebay_url && (
                <a
                  href={vendor.ebay_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-2 px-4 py-2 bg-[#e53238] hover:bg-[#c0272d] text-white text-sm font-medium rounded-xl transition-colors"
                >
                  <ShoppingBag className="w-4 h-4" />
                  eBay
                </a>
              )}
              {vendor.website_url && (
                <a
                  href={vendor.website_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-2 px-4 py-2 bg-surface-hover border border-border text-text-primary text-sm font-medium rounded-xl hover:bg-border transition-colors"
                >
                  <Globe className="w-4 h-4" />
                  Website
                </a>
              )}
              <Link
                href={`/marketplace/vendors/${vendor.id}`}
                className="flex items-center gap-2 px-4 py-2 bg-surface-hover border border-border text-text-primary text-sm font-medium rounded-xl hover:bg-border transition-colors"
              >
                View Shop
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
