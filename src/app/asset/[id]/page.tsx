"use client";

import { useState, useEffect, use } from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  Trash2,
  Calendar,
  MapPin,
  Tag,
  Star,
  TrendingUp,
  TrendingDown,
  Minus,
  ExternalLink,
  AlertTriangle,
  Pencil,
  Save,
  Package,
  Shield,
} from "lucide-react";
import PriceChart from "@/components/PriceChart";
import { formatCurrency, formatPercentage, formatDate } from "@/lib/format";
import { clsx } from "clsx";
import type { PortfolioAsset } from "@/types";

function isPriceStale(asset: PortfolioAsset): boolean {
  if (!asset.manual_price) return false;
  if (!asset.price_updated_at) return true;
  const thirtyDays = 30 * 24 * 60 * 60 * 1000;
  return Date.now() - new Date(asset.price_updated_at).getTime() > thirtyDays;
}

export default function AssetDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const router = useRouter();
  const [asset, setAsset] = useState<PortfolioAsset | null>(null);
  const [loading, setLoading] = useState(true);
  const [deleting, setDeleting] = useState(false);
  const [editingPrice, setEditingPrice] = useState(false);
  const [newPrice, setNewPrice] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    async function fetchAsset() {
      try {
        const res = await fetch("/api/assets");
        if (!res.ok) throw new Error("Failed to fetch");
        const data: PortfolioAsset[] = await res.json();
        const found = data.find((a) => a.id === id);
        setAsset(found || null);
      } catch (error) {
        console.error("Error fetching asset:", error);
      } finally {
        setLoading(false);
      }
    }
    fetchAsset();
  }, [id]);

  const handleDelete = async () => {
    if (!asset) return;
    if (!confirm("Are you sure you want to remove this asset from your collection?"))
      return;

    setDeleting(true);
    try {
      const res = await fetch(`/api/assets?id=${asset.id}`, {
        method: "DELETE",
      });
      if (!res.ok) throw new Error("Failed to delete");
      router.push("/collection");
    } catch {
      alert("Failed to delete asset");
    } finally {
      setDeleting(false);
    }
  };

  const handleSavePrice = async () => {
    if (!asset || !newPrice) return;
    setSaving(true);
    try {
      const res = await fetch("/api/assets", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: asset.id,
          current_price: newPrice,
        }),
      });
      if (!res.ok) throw new Error("Failed to update");
      const updated = await res.json();
      setAsset(updated);
      setEditingPrice(false);
    } catch {
      alert("Failed to update price");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="space-y-6 md:space-y-8">
        <div className="skeleton h-8 w-32 rounded-xl" />
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 md:gap-8">
          <div className="skeleton h-64 md:h-96 rounded-2xl" />
          <div className="lg:col-span-2 skeleton h-64 md:h-96 rounded-2xl" />
        </div>
      </div>
    );
  }

  if (!asset) {
    return (
      <div className="text-center py-20">
        <h2 className="text-xl font-bold text-text-primary">Asset Not Found</h2>
        <Link
          href="/collection"
          className="text-accent hover:text-accent-hover mt-4 inline-block"
        >
          Back to Collection
        </Link>
      </div>
    );
  }

  const qty = asset.quantity || 1;
  const currentPrice = asset.current_price ?? asset.purchase_price;
  const totalValue = currentPrice * qty;
  const totalInvested = asset.purchase_price * qty;
  const profit = totalValue - totalInvested;
  const profitPercent =
    totalInvested > 0 ? (profit / totalInvested) * 100 : 0;
  const imageUrl = asset.custom_image_url || asset.image_url;
  const stale = isPriceStale(asset);

  return (
    <div className="space-y-6 md:space-y-8">
      {/* Back navigation */}
      <div className="flex items-center justify-between">
        <Link
          href="/collection"
          className="flex items-center gap-2 text-text-secondary hover:text-text-primary text-sm font-medium"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Collection
        </Link>
        <button
          onClick={handleDelete}
          disabled={deleting}
          className="flex items-center gap-2 px-3 md:px-4 py-2 text-danger hover:bg-danger-muted rounded-xl text-sm font-medium"
        >
          <Trash2 className="w-4 h-4" />
          {deleting ? "Removing..." : "Remove"}
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 md:gap-8">
        {/* Left: Image and Details */}
        <div className="space-y-4 md:space-y-6">
          {/* Card Image */}
          <div className="bg-surface border border-border rounded-2xl p-4 md:p-6">
            <div className="aspect-[3/4] max-h-[50vh] md:max-h-none bg-background rounded-xl overflow-hidden relative mx-auto max-w-[280px] md:max-w-none">
              {imageUrl ? (
                <Image
                  src={imageUrl}
                  alt={asset.name}
                  fill
                  className="object-contain p-3 md:p-4"
                  sizes="(max-width: 768px) 280px, 400px"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-text-muted">
                  No Image
                </div>
              )}
            </div>
          </div>

          {/* Details */}
          <div className="bg-surface border border-border rounded-2xl p-4 md:p-6 space-y-4">
            <h3 className="text-sm font-semibold text-text-primary">
              Purchase Details
            </h3>
            <div className="space-y-3">
              <div className="flex items-center gap-3">
                <Calendar className="w-4 h-4 text-text-muted flex-shrink-0" />
                <div>
                  <p className="text-xs text-text-muted">Purchase Date</p>
                  <p className="text-sm text-text-primary">
                    {formatDate(asset.purchase_date)}
                  </p>
                </div>
              </div>
              {asset.purchase_location && (
                <div className="flex items-center gap-3">
                  <MapPin className="w-4 h-4 text-text-muted flex-shrink-0" />
                  <div>
                    <p className="text-xs text-text-muted">Purchased From</p>
                    <p className="text-sm text-text-primary">
                      {asset.purchase_location}
                    </p>
                  </div>
                </div>
              )}
              {qty > 1 && (
                <div className="flex items-center gap-3">
                  <Package className="w-4 h-4 text-text-muted flex-shrink-0" />
                  <div>
                    <p className="text-xs text-text-muted">Quantity</p>
                    <p className="text-sm text-text-primary">
                      {qty} units @ {formatCurrency(asset.purchase_price)} each
                    </p>
                  </div>
                </div>
              )}
              <div className="flex items-center gap-3">
                <Tag className="w-4 h-4 text-text-muted flex-shrink-0" />
                <div>
                  <p className="text-xs text-text-muted">Condition</p>
                  <p className="text-sm text-text-primary">{asset.condition}</p>
                </div>
              </div>
              {asset.psa_grade && (
                <div className="flex items-center gap-3">
                  <Shield className="w-4 h-4 text-gold flex-shrink-0" />
                  <div>
                    <p className="text-xs text-text-muted">Grade</p>
                    <p className="text-sm text-gold font-semibold">{asset.psa_grade}</p>
                  </div>
                </div>
              )}
              {asset.rarity && (
                <div className="flex items-center gap-3">
                  <Star className="w-4 h-4 text-text-muted flex-shrink-0" />
                  <div>
                    <p className="text-xs text-text-muted">Rarity</p>
                    <p className="text-sm text-text-primary">{asset.rarity}</p>
                  </div>
                </div>
              )}
              {asset.notes && (
                <div className="pt-3 border-t border-border">
                  <p className="text-xs text-text-muted mb-1">Notes</p>
                  <p className="text-sm text-text-secondary">{asset.notes}</p>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Right: Pricing and Chart */}
        <div className="lg:col-span-2 space-y-4 md:space-y-6">
          {/* Header */}
          <div className="bg-surface border border-border rounded-2xl p-4 md:p-6">
            <div className="flex items-start justify-between">
              <div>
                <div className="flex items-center gap-2">
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
                    <span className="px-2 py-1 rounded-lg text-xs font-semibold bg-gold/10 text-gold">
                      {asset.psa_grade}
                    </span>
                  )}
                  {asset.manual_price && (
                    <span className="px-2 py-1 rounded-lg text-xs font-semibold bg-warning-muted text-warning">
                      Manual Price
                    </span>
                  )}
                </div>
                <h1 className="text-xl md:text-2xl font-bold text-text-primary mt-3">
                  {asset.name}
                </h1>
                <p className="text-text-muted mt-1 text-sm">
                  {asset.set_name}
                  {asset.card_number ? ` #${asset.card_number}` : ""}
                  {qty > 1 ? ` (x${qty})` : ""}
                </p>
              </div>
            </div>

            {/* Stale price warning */}
            {stale && (
              <div className="mt-4 flex items-center gap-2 px-3 py-2 bg-warning-muted rounded-xl">
                <AlertTriangle className="w-4 h-4 text-warning flex-shrink-0" />
                <p className="text-xs text-warning">
                  Market price has not been updated in over 30 days. Please update manually.
                </p>
              </div>
            )}

            {/* Price summary */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4 mt-4 md:mt-6 pt-4 md:pt-6 border-t border-border">
              <div>
                <p className="text-[10px] md:text-xs text-text-muted">
                  Market Price {asset.manual_price && "(Manual)"}
                </p>
                <div className="flex items-center gap-2 mt-1">
                  <p className="text-base md:text-xl font-bold text-text-primary">
                    {formatCurrency(currentPrice)}
                  </p>
                  {asset.manual_price && (
                    <button
                      onClick={() => {
                        setNewPrice(String(currentPrice));
                        setEditingPrice(true);
                      }}
                      className="p-1 rounded-lg text-text-muted hover:text-gold hover:bg-gold/10"
                    >
                      <Pencil className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              </div>
              <div>
                <p className="text-[10px] md:text-xs text-text-muted">
                  {qty > 1 ? "Total Value" : "Current Value"}
                </p>
                <p className="text-base md:text-xl font-bold text-text-primary mt-1">
                  {formatCurrency(totalValue)}
                </p>
              </div>
              <div>
                <p className="text-[10px] md:text-xs text-text-muted">Total Invested</p>
                <p className="text-base md:text-xl font-bold text-text-secondary mt-1">
                  {formatCurrency(totalInvested)}
                </p>
              </div>
              <div>
                <p className="text-[10px] md:text-xs text-text-muted">Profit / Loss</p>
                <div className="flex items-center gap-1 md:gap-2 mt-1">
                  {profit > 0 ? (
                    <TrendingUp className="w-4 h-4 md:w-5 md:h-5 text-success flex-shrink-0" />
                  ) : profit < 0 ? (
                    <TrendingDown className="w-4 h-4 md:w-5 md:h-5 text-danger flex-shrink-0" />
                  ) : (
                    <Minus className="w-4 h-4 md:w-5 md:h-5 text-text-secondary flex-shrink-0" />
                  )}
                  <div>
                    <span
                      className={clsx(
                        "text-base md:text-xl font-bold",
                        profit > 0 && "text-success",
                        profit < 0 && "text-danger",
                        profit === 0 && "text-text-secondary"
                      )}
                    >
                      {profit >= 0 ? "+" : ""}
                      {formatCurrency(profit)}
                    </span>
                    <span
                      className={clsx(
                        "text-xs md:text-sm ml-1",
                        profit > 0 && "text-success",
                        profit < 0 && "text-danger",
                        profit === 0 && "text-text-secondary"
                      )}
                    >
                      ({formatPercentage(profitPercent)})
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* Edit price inline */}
            {editingPrice && (
              <div className="mt-4 p-3 bg-surface-hover rounded-xl">
                <p className="text-xs text-text-muted mb-2">Update Market Price</p>
                <div className="flex gap-2">
                  <div className="relative flex-1">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted">$</span>
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      value={newPrice}
                      onChange={(e) => setNewPrice(e.target.value)}
                      className="w-full pl-7 pr-3 py-2 bg-surface border border-border rounded-lg text-text-primary text-sm outline-none focus:border-gold"
                      autoFocus
                    />
                  </div>
                  <button
                    onClick={handleSavePrice}
                    disabled={saving}
                    className="px-3 py-2 bg-gold hover:bg-accent-hover text-black rounded-lg text-sm font-medium flex items-center gap-1.5"
                  >
                    <Save className="w-3.5 h-3.5" />
                    {saving ? "Saving..." : "Save"}
                  </button>
                  <button
                    onClick={() => setEditingPrice(false)}
                    className="px-3 py-2 bg-surface border border-border rounded-lg text-sm text-text-secondary hover:text-text-primary"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Price Chart */}
          <PriceChart
            externalId={asset.external_id}
            cardName={asset.name}
            purchasePrice={asset.purchase_price}
            assetType={asset.asset_type}
          />

          {/* Price source link */}
          <div className="bg-surface border border-border rounded-2xl p-3 md:p-4">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-2">
              <p className="text-xs text-text-muted">
                {asset.manual_price ? (
                  <>
                    Price manually managed
                    {asset.price_updated_at &&
                      ` · Last updated ${formatDate(asset.price_updated_at)}`}
                  </>
                ) : (
                  <>
                    Price data from{" "}
                    {asset.asset_type === "sealed"
                      ? "PokemonPriceTracker"
                      : "JustTCG"}
                    {asset.price_updated_at &&
                      ` · Updated ${formatDate(asset.price_updated_at)}`}
                  </>
                )}
              </p>
              {!asset.manual_price && (
                <a
                  href={
                    asset.asset_type === "sealed"
                      ? "https://www.pokemonpricetracker.com"
                      : "https://justtcg.com"
                  }
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-1 text-xs text-accent hover:text-accent-hover"
                >
                  View on{" "}
                  {asset.asset_type === "sealed"
                    ? "PokemonPriceTracker"
                    : "JustTCG"}
                  <ExternalLink className="w-3 h-3" />
                </a>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
