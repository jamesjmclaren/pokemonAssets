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
} from "lucide-react";
import PriceChart from "@/components/PriceChart";
import { formatCurrency, formatPercentage, formatDate } from "@/lib/format";
import { clsx } from "clsx";
import type { PortfolioAsset } from "@/types";

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

  if (loading) {
    return (
      <div className="space-y-8">
        <div className="skeleton h-8 w-32 rounded-xl" />
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="skeleton h-96 rounded-2xl" />
          <div className="lg:col-span-2 skeleton h-96 rounded-2xl" />
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

  const currentPrice = asset.current_price ?? asset.purchase_price;
  const profit = currentPrice - asset.purchase_price;
  const profitPercent =
    asset.purchase_price > 0 ? (profit / asset.purchase_price) * 100 : 0;
  const imageUrl = asset.custom_image_url || asset.image_url;

  return (
    <div className="space-y-8">
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
          className="flex items-center gap-2 px-4 py-2 text-danger hover:bg-danger-muted rounded-xl text-sm font-medium"
        >
          <Trash2 className="w-4 h-4" />
          {deleting ? "Removing..." : "Remove"}
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Left: Image and Details */}
        <div className="space-y-6">
          {/* Card Image */}
          <div className="bg-surface border border-border rounded-2xl p-6">
            <div className="aspect-[3/4] bg-background rounded-xl overflow-hidden relative">
              {imageUrl ? (
                <Image
                  src={imageUrl}
                  alt={asset.name}
                  fill
                  className="object-contain p-4"
                  sizes="400px"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-text-muted">
                  No Image
                </div>
              )}
            </div>
          </div>

          {/* Details */}
          <div className="bg-surface border border-border rounded-2xl p-6 space-y-4">
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
              <div className="flex items-center gap-3">
                <Tag className="w-4 h-4 text-text-muted flex-shrink-0" />
                <div>
                  <p className="text-xs text-text-muted">Condition</p>
                  <p className="text-sm text-text-primary">{asset.condition}</p>
                </div>
              </div>
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
        <div className="lg:col-span-2 space-y-6">
          {/* Header */}
          <div className="bg-surface border border-border rounded-2xl p-6">
            <div className="flex items-start justify-between">
              <div>
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
                <h1 className="text-2xl font-bold text-text-primary mt-3">
                  {asset.name}
                </h1>
                <p className="text-text-muted mt-1">
                  {asset.set_name}
                  {asset.card_number ? ` #${asset.card_number}` : ""}
                </p>
              </div>
            </div>

            {/* Price summary */}
            <div className="grid grid-cols-3 gap-4 mt-6 pt-6 border-t border-border">
              <div>
                <p className="text-xs text-text-muted">Current Value</p>
                <p className="text-xl font-bold text-text-primary mt-1">
                  {formatCurrency(currentPrice)}
                </p>
              </div>
              <div>
                <p className="text-xs text-text-muted">Purchase Price</p>
                <p className="text-xl font-bold text-text-secondary mt-1">
                  {formatCurrency(asset.purchase_price)}
                </p>
              </div>
              <div>
                <p className="text-xs text-text-muted">Profit / Loss</p>
                <div className="flex items-center gap-2 mt-1">
                  {profit > 0 ? (
                    <TrendingUp className="w-5 h-5 text-success" />
                  ) : profit < 0 ? (
                    <TrendingDown className="w-5 h-5 text-danger" />
                  ) : (
                    <Minus className="w-5 h-5 text-text-secondary" />
                  )}
                  <span
                    className={clsx(
                      "text-xl font-bold",
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
                      "text-sm",
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

          {/* Price Chart */}
          <PriceChart
            externalId={asset.external_id}
            purchasePrice={asset.purchase_price}
          />

          {/* Price source link */}
          <div className="bg-surface border border-border rounded-2xl p-4">
            <div className="flex items-center justify-between">
              <p className="text-xs text-text-muted">
                Price data from PokemonPriceTracker
                {asset.price_updated_at &&
                  ` · Updated ${formatDate(asset.price_updated_at)}`}
              </p>
              <a
                href={`https://www.pokemonpricetracker.com`}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-1 text-xs text-accent hover:text-accent-hover"
              >
                View on PokemonPriceTracker
                <ExternalLink className="w-3 h-3" />
              </a>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
