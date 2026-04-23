"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import Link from "next/link";
import { Store, Pencil, Tag, X, Loader2, ChevronRight } from "lucide-react";
import { clsx } from "clsx";
import { fixStorageUrl } from "@/lib/format";
import type { Vendor, PortfolioAsset } from "@/types";

type ListingFilter = "all" | "listed" | "unlisted";

export default function MyShopPage() {
  const router = useRouter();

  const [vendor, setVendor] = useState<Vendor | null>(null);
  const [assets, setAssets] = useState<PortfolioAsset[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<ListingFilter>("all");
  const [savingId, setSavingId] = useState<string | null>(null);
  const [salePrices, setSalePrices] = useState<Record<string, string>>({});

  const loadData = useCallback(async () => {
    setLoading(true);
    const [vendorRes, listingsRes] = await Promise.all([
      fetch("/api/vendors/me"),
      fetch("/api/marketplace/my-listings"),
    ]);
    const v = vendorRes.ok ? await vendorRes.json() : null;
    const a = listingsRes.ok ? await listingsRes.json() : [];

    if (!v) {
      router.push("/marketplace/become-vendor");
      return;
    }

    setVendor(v);
    setAssets(a);
    // Pre-fill sale price inputs from existing data
    const prices: Record<string, string> = {};
    for (const asset of a) {
      if (asset.sale_price != null) prices[asset.id] = String(asset.sale_price);
    }
    setSalePrices(prices);
    setLoading(false);
  }, [router]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  async function toggleForSale(asset: PortfolioAsset) {
    setSavingId(asset.id);
    const newForSale = !asset.for_sale;
    const salePrice = salePrices[asset.id] ? parseFloat(salePrices[asset.id]) : null;

    const res = await fetch("/api/assets", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        id: asset.id,
        for_sale: newForSale,
        sale_price: newForSale ? salePrice : null,
      }),
    });

    if (res.ok) {
      setAssets((prev) =>
        prev.map((a) =>
          a.id === asset.id
            ? { ...a, for_sale: newForSale, sale_price: newForSale ? salePrice : null }
            : a
        )
      );
    }
    setSavingId(null);
  }

  async function updateSalePrice(asset: PortfolioAsset, price: string) {
    if (!asset.for_sale) return;
    setSavingId(asset.id);
    await fetch("/api/assets", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: asset.id, sale_price: price ? parseFloat(price) : null }),
    });
    setAssets((prev) =>
      prev.map((a) =>
        a.id === asset.id ? { ...a, sale_price: price ? parseFloat(price) : null } : a
      )
    );
    setSavingId(null);
  }

  const filtered = assets.filter((a) => {
    if (filter === "listed") return a.for_sale;
    if (filter === "unlisted") return !a.for_sale;
    return true;
  });

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="w-6 h-6 animate-spin text-text-muted" />
      </div>
    );
  }

  if (!vendor) return null;

  return (
    <div className="max-w-5xl mx-auto">
      {/* Vendor profile summary */}
      <div className="flex flex-col sm:flex-row gap-4 items-start mb-6 p-4 bg-surface border border-border rounded-2xl">
        <div className="relative w-16 h-16 rounded-xl overflow-hidden bg-background flex-shrink-0">
          {vendor.shop_image_url ? (
            <Image
              src={fixStorageUrl(vendor.shop_image_url) || vendor.shop_image_url}
              alt={vendor.shop_name}
              fill
              className="object-cover"
            />
          ) : (
            <div className="absolute inset-0 flex items-center justify-center">
              <Store className="w-7 h-7 text-text-muted" />
            </div>
          )}
        </div>
        <div className="flex-1 min-w-0">
          <h1 className="text-xl font-bold text-text-primary">{vendor.shop_name}</h1>
          {vendor.description && (
            <p className="text-sm text-text-muted mt-0.5 line-clamp-2">{vendor.description}</p>
          )}
          <div className="mt-1.5 flex items-center gap-3 text-xs text-text-muted flex-wrap">
            {vendor.whatsapp_number && <span>WhatsApp: {vendor.whatsapp_number}</span>}
            {vendor.ebay_url && <span>eBay listed</span>}
            {vendor.website_url && <span>Website linked</span>}
          </div>
        </div>
        <div className="flex items-center gap-2 flex-shrink-0">
          <Link
            href="/marketplace/become-vendor"
            className="flex items-center gap-1.5 px-3 py-2 border border-border rounded-xl text-xs font-medium text-text-secondary hover:bg-surface-hover transition-colors"
          >
            <Pencil className="w-3.5 h-3.5" />
            Edit Profile
          </Link>
          <Link
            href={`/marketplace/vendors/${vendor.id}`}
            className="flex items-center gap-1.5 px-3 py-2 border border-border rounded-xl text-xs font-medium text-text-secondary hover:bg-surface-hover transition-colors"
          >
            View Shop
            <ChevronRight className="w-3.5 h-3.5" />
          </Link>
        </div>
      </div>

      {/* Filter tabs */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex gap-1 p-1 bg-surface border border-border rounded-xl">
          {(["all", "listed", "unlisted"] as ListingFilter[]).map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={clsx(
                "px-3 py-1.5 rounded-lg text-sm font-medium capitalize transition-colors",
                filter === f
                  ? "bg-accent/10 text-accent"
                  : "text-text-secondary hover:text-text-primary"
              )}
            >
              {f}
              <span className="ml-1.5 text-xs opacity-60">
                {f === "all" ? assets.length : f === "listed" ? assets.filter((a) => a.for_sale).length : assets.filter((a) => !a.for_sale).length}
              </span>
            </button>
          ))}
        </div>
        <p className="text-xs text-text-muted">
          {assets.filter((a) => a.for_sale).length} of {assets.length} listed
        </p>
      </div>

      {/* Assets table */}
      {filtered.length === 0 ? (
        <div className="text-center py-16 text-text-muted">
          <Tag className="w-8 h-8 mx-auto mb-3 opacity-40" />
          <p className="text-sm">
            {filter === "listed"
              ? "You haven't listed any items yet."
              : filter === "unlisted"
              ? "All your items are listed!"
              : "No active assets in your portfolios."}
          </p>
          {filter !== "listed" && (
            <Link
              href="/dashboard/add"
              className="inline-block mt-3 text-sm text-accent hover:underline"
            >
              Add assets to your collection
            </Link>
          )}
        </div>
      ) : (
        <div className="bg-surface border border-border rounded-2xl overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border">
                <th className="text-left px-4 py-3 text-xs font-medium text-text-muted">Item</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-text-muted hidden sm:table-cell">Condition</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-text-muted hidden md:table-cell">Market Price</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-text-muted">Sale Price</th>
                <th className="text-center px-4 py-3 text-xs font-medium text-text-muted">Listed</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {filtered.map((asset) => (
                <tr key={asset.id} className="hover:bg-surface-hover transition-colors">
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-3">
                      <div className="relative w-8 h-10 flex-shrink-0 bg-background rounded overflow-hidden">
                        {(asset.custom_image_url || asset.image_url) && (
                          <Image
                            src={fixStorageUrl(asset.custom_image_url) || asset.image_url || ""}
                            alt={asset.name}
                            fill
                            className="object-contain"
                          />
                        )}
                      </div>
                      <div className="min-w-0">
                        <p className="font-medium text-text-primary truncate max-w-[140px] sm:max-w-xs">{asset.name}</p>
                        <p className="text-xs text-text-muted truncate">{asset.set_name}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3 hidden sm:table-cell text-text-secondary">
                    {asset.psa_grade ? `PSA ${asset.psa_grade}` : asset.condition || "—"}
                  </td>
                  <td className="px-4 py-3 hidden md:table-cell text-text-secondary">
                    {asset.current_price != null ? `$${asset.current_price.toFixed(2)}` : "—"}
                  </td>
                  <td className="px-4 py-3">
                    <input
                      type="number"
                      min="0"
                      step="0.01"
                      placeholder="0.00"
                      value={salePrices[asset.id] ?? ""}
                      onChange={(e) => setSalePrices((prev) => ({ ...prev, [asset.id]: e.target.value }))}
                      onBlur={(e) => {
                        if (asset.for_sale) updateSalePrice(asset, e.target.value);
                      }}
                      className="w-24 px-2 py-1 bg-background border border-border rounded-lg text-sm text-text-primary focus:outline-none focus:border-accent"
                    />
                  </td>
                  <td className="px-4 py-3 text-center">
                    {savingId === asset.id ? (
                      <Loader2 className="w-4 h-4 animate-spin text-text-muted mx-auto" />
                    ) : (
                      <button
                        onClick={() => toggleForSale(asset)}
                        className={clsx(
                          "relative inline-flex h-5 w-9 items-center rounded-full transition-colors focus:outline-none",
                          asset.for_sale ? "bg-accent" : "bg-border"
                        )}
                      >
                        <span
                          className={clsx(
                            "inline-block h-3.5 w-3.5 rounded-full bg-white shadow transition-transform",
                            asset.for_sale ? "translate-x-4.5" : "translate-x-0.5"
                          )}
                        />
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Deactivate shop */}
      <div className="mt-8 pt-6 border-t border-border">
        <button
          onClick={async () => {
            if (!confirm("Are you sure you want to deactivate your shop? Your listings will be hidden from the marketplace.")) return;
            await fetch(`/api/vendors/${vendor.id}`, { method: "DELETE" });
            router.push("/marketplace");
          }}
          className="flex items-center gap-2 text-sm text-danger hover:text-danger/80 transition-colors"
        >
          <X className="w-4 h-4" />
          Deactivate Shop
        </button>
      </div>
    </div>
  );
}
