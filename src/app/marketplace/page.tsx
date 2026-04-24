"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { Store, Package, ChevronRight, Search } from "lucide-react";
import { clsx } from "clsx";
import VendorCard from "@/components/VendorCard";
import MarketplaceItemCard from "@/components/MarketplaceItemCard";
import type { Vendor, MarketplaceItem } from "@/types";

type Tab = "items" | "vendors";

export default function MarketplacePage() {
  const [tab, setTab] = useState<Tab>("items");
  const [items, setItems] = useState<MarketplaceItem[]>([]);
  const [vendors, setVendors] = useState<Vendor[]>([]);
  const [myVendor, setMyVendor] = useState<Vendor | null | undefined>(undefined);
  const [loading, setLoading] = useState(true);
  const [typeFilter, setTypeFilter] = useState<"" | "card" | "sealed">("");
  const [search, setSearch] = useState("");

  useEffect(() => {
    async function load() {
      setLoading(true);
      const [itemsRes, vendorsRes, meRes] = await Promise.all([
        fetch("/api/marketplace/items"),
        fetch("/api/vendors"),
        fetch("/api/vendors/me"),
      ]);
      setItems(itemsRes.ok ? await itemsRes.json() : []);
      setVendors(vendorsRes.ok ? await vendorsRes.json() : []);
      setMyVendor(meRes.ok ? await meRes.json() : null);
      setLoading(false);
    }
    load();
  }, []);

  const filteredItems = items.filter((item) => {
    if (typeFilter && item.asset_type !== typeFilter) return false;
    if (search) {
      const q = search.toLowerCase();
      return (
        item.name.toLowerCase().includes(q) ||
        item.set_name?.toLowerCase().includes(q) ||
        item.vendor.shop_name.toLowerCase().includes(q)
      );
    }
    return true;
  });

  const filteredVendors = vendors.filter((v) => {
    if (!search) return true;
    const q = search.toLowerCase();
    return v.shop_name.toLowerCase().includes(q) || v.description?.toLowerCase().includes(q);
  });

  return (
    <div className="max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-bold text-text-primary">Marketplace</h1>
          <p className="text-sm text-text-muted mt-0.5">
            Browse items for sale from our vendor community
          </p>
        </div>
        <Link
          href={myVendor ? "/marketplace/my-shop" : "/marketplace/become-vendor"}
          className="inline-flex items-center gap-2 px-4 py-2 bg-accent text-black text-sm font-semibold rounded-xl hover:bg-accent-hover transition-colors"
        >
          <Store className="w-4 h-4" />
          {myVendor ? "My Shop" : "Become a Vendor"}
          <ChevronRight className="w-4 h-4" />
        </Link>
      </div>

      {/* Tabs + filters */}
      <div className="flex flex-col sm:flex-row sm:items-center gap-3 mb-6">
        <div className="flex gap-1 p-1 bg-surface border border-border rounded-xl">
          <button
            onClick={() => setTab("items")}
            className={clsx(
              "flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors",
              tab === "items"
                ? "bg-accent/10 text-accent"
                : "text-text-secondary hover:text-text-primary"
            )}
          >
            <Package className="w-4 h-4" />
            Items
            <span className="px-1.5 py-0.5 bg-surface-hover rounded text-xs">{items.length}</span>
          </button>
          <button
            onClick={() => setTab("vendors")}
            className={clsx(
              "flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors",
              tab === "vendors"
                ? "bg-accent/10 text-accent"
                : "text-text-secondary hover:text-text-primary"
            )}
          >
            <Store className="w-4 h-4" />
            Vendors
            <span className="px-1.5 py-0.5 bg-surface-hover rounded text-xs">{vendors.length}</span>
          </button>
        </div>

        <div className="flex-1 flex gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-muted" />
            <input
              type="text"
              placeholder={tab === "items" ? "Search items or vendors…" : "Search vendors…"}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-9 pr-4 py-2 bg-surface border border-border rounded-xl text-sm text-text-primary placeholder:text-text-muted focus:outline-none focus:border-accent"
            />
          </div>
          {tab === "items" && (
            <select
              value={typeFilter}
              onChange={(e) => setTypeFilter(e.target.value as "" | "card" | "sealed")}
              className="px-3 py-2 bg-surface border border-border rounded-xl text-sm text-text-primary focus:outline-none focus:border-accent"
            >
              <option value="">All types</option>
              <option value="card">Cards</option>
              <option value="sealed">Sealed</option>
            </select>
          )}
        </div>
      </div>

      {/* Content */}
      {loading ? (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="bg-surface border border-border rounded-2xl aspect-[3/4] animate-pulse" />
          ))}
        </div>
      ) : tab === "items" ? (
        filteredItems.length === 0 ? (
          <div className="text-center py-20 text-text-muted">
            <Package className="w-10 h-10 mx-auto mb-3 opacity-40" />
            <p className="text-sm">
              {items.length === 0
                ? "No items for sale yet. Be the first to list something!"
                : "No items match your search."}
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
            {filteredItems.map((item) => (
              <MarketplaceItemCard key={item.id} item={item} />
            ))}
          </div>
        )
      ) : filteredVendors.length === 0 ? (
        <div className="text-center py-20 text-text-muted">
          <Store className="w-10 h-10 mx-auto mb-3 opacity-40" />
          <p className="text-sm">
            {vendors.length === 0
              ? "No vendors yet."
              : "No vendors match your search."}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
          {filteredVendors.map((vendor) => (
            <VendorCard key={vendor.id} vendor={vendor} />
          ))}
        </div>
      )}
    </div>
  );
}
