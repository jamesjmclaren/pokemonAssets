"use client";

import { useState, useEffect } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { Store, Globe, ShoppingBag, MessageCircle, ArrowLeft, Loader2, Package, BadgeCheck } from "lucide-react";
import { fixStorageUrl } from "@/lib/format";
import MarketplaceItemCard from "@/components/MarketplaceItemCard";
import type { Vendor, MarketplaceItem } from "@/types";

export default function VendorStorefrontPage() {
  const { id } = useParams<{ id: string }>();
  const [vendor, setVendor] = useState<Vendor | null>(null);
  const [items, setItems] = useState<MarketplaceItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    fetch(`/api/vendors/${id}`)
      .then(async (res) => {
        if (!res.ok) { setNotFound(true); setLoading(false); return; }
        const { vendor: v, items: i } = await res.json();
        setVendor(v);
        // Attach vendor to each item so MarketplaceItemCard gets the right shape
        setItems((i || []).map((item: MarketplaceItem) => ({ ...item, vendor: v })));
        setLoading(false);
      })
      .catch(() => { setNotFound(true); setLoading(false); });
  }, [id]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="w-6 h-6 animate-spin text-text-muted" />
      </div>
    );
  }

  if (notFound || !vendor) {
    return (
      <div className="text-center py-20 text-text-muted">
        <Store className="w-10 h-10 mx-auto mb-3 opacity-40" />
        <p className="text-sm">Vendor not found.</p>
        <Link href="/marketplace" className="mt-3 inline-block text-sm text-accent hover:underline">
          Back to Marketplace
        </Link>
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto">
      <Link href="/marketplace" className="inline-flex items-center gap-1.5 text-sm text-text-muted hover:text-text-primary mb-4 transition-colors">
        <ArrowLeft className="w-4 h-4" />
        Marketplace
      </Link>

      {/* Shop hero */}
      <div className="bg-surface border border-border rounded-2xl overflow-hidden mb-6">
        {vendor.shop_image_url ? (
          <div className="relative w-full h-40 sm:h-56">
            <Image
              src={fixStorageUrl(vendor.shop_image_url) || vendor.shop_image_url}
              alt={vendor.shop_name}
              fill
              className="object-cover"
            />
          </div>
        ) : (
          <div className="w-full h-24 bg-gradient-to-r from-accent/10 to-accent/5 flex items-center justify-center">
            <Store className="w-10 h-10 text-accent/40" />
          </div>
        )}

        <div className="p-5">
          <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-2xl font-bold text-text-primary">{vendor.shop_name}</h1>
                {vendor.is_verified && (
                  <BadgeCheck className="w-6 h-6 text-blue-400 shrink-0" title="Verified Vendor" />
                )}
              </div>
              {vendor.description && (
                <p className="mt-1 text-sm text-text-muted max-w-xl">{vendor.description}</p>
              )}
              <p className="mt-2 text-xs text-text-muted">
                {items.length} {items.length === 1 ? "item" : "items"} for sale
              </p>
            </div>

            {/* Contact buttons */}
            <div className="flex flex-wrap gap-2">
              {vendor.whatsapp_number && (
                <a
                  href={`https://wa.me/${vendor.whatsapp_number}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 px-4 py-2 bg-green-600 hover:bg-green-700 text-white text-sm font-medium rounded-xl transition-colors"
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
                  className="inline-flex items-center gap-2 px-4 py-2 bg-[#e53238] hover:bg-[#c0272d] text-white text-sm font-medium rounded-xl transition-colors"
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
                  className="inline-flex items-center gap-2 px-4 py-2 bg-surface-hover border border-border text-text-primary text-sm font-medium rounded-xl hover:bg-border transition-colors"
                >
                  <Globe className="w-4 h-4" />
                  Website
                </a>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Items grid */}
      <h2 className="text-sm font-semibold text-text-secondary uppercase tracking-wide mb-3">
        Items for Sale
      </h2>
      {items.length === 0 ? (
        <div className="text-center py-16 text-text-muted border border-border rounded-2xl">
          <Package className="w-8 h-8 mx-auto mb-3 opacity-40" />
          <p className="text-sm">This vendor has no items listed yet.</p>
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
          {items.map((item) => (
            <MarketplaceItemCard key={item.id} item={item} />
          ))}
        </div>
      )}
    </div>
  );
}
