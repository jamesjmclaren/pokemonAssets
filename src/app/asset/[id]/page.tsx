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
  Globe,
  Archive,
  PenLine,
  X,
  Link2,
  RefreshCw,
} from "lucide-react";
import PriceChart from "@/components/PriceChart";
import { formatCurrency, formatPercentage, formatDate, fixStorageUrl } from "@/lib/format";
import { clsx } from "clsx";
import { usePortfolio } from "@/lib/portfolio-context";
import type { PortfolioAsset } from "@/types";

const PSA_GRADES = [
  { value: "", label: "None (Raw)" },
  { value: "PSA 10", label: "PSA 10 - Gem Mint" },
  { value: "PSA 9", label: "PSA 9 - Mint" },
  { value: "PSA 8", label: "PSA 8 - NM-MT" },
  { value: "PSA 7", label: "PSA 7 - Near Mint" },
  { value: "PSA 6", label: "PSA 6 - EX-MT" },
  { value: "PSA 5", label: "PSA 5 - Excellent" },
  { value: "PSA 4", label: "PSA 4 - VG-EX" },
  { value: "PSA 3", label: "PSA 3 - Very Good" },
  { value: "PSA 2", label: "PSA 2 - Good" },
  { value: "PSA 1", label: "PSA 1 - Poor" },
  { value: "CGC 10", label: "CGC 10 - Pristine" },
  { value: "CGC 9.5", label: "CGC 9.5 - Gem Mint" },
  { value: "CGC 9", label: "CGC 9 - Mint" },
  { value: "BGS 10", label: "BGS 10 - Pristine" },
  { value: "BGS 9.5", label: "BGS 9.5 - Gem Mint" },
  { value: "BGS 9", label: "BGS 9 - Mint" },
];

const LANGUAGES = [
  "English", "Japanese", "Korean", "Chinese (Simplified)", "Chinese (Traditional)",
  "French", "German", "Italian", "Spanish", "Portuguese", "Dutch", "Polish", "Thai", "Indonesian",
];

const CONDITIONS = [
  "Gem Mint", "Mint", "Near Mint", "Lightly Played", "Moderately Played", "Heavily Played", "Damaged", "Sealed",
];

function isPriceStale(asset: PortfolioAsset): boolean {
  if (!asset.price_updated_at) return true;
  const sevenDays = 7 * 24 * 60 * 60 * 1000;
  return Date.now() - new Date(asset.price_updated_at).getTime() > sevenDays;
}

interface EditForm {
  name: string;
  set_name: string;
  asset_type: "card" | "sealed" | "comic";
  purchase_price: string;
  purchase_date: string;
  purchase_location: string;
  condition: string;
  notes: string;
  quantity: string;
  psa_grade: string;
  language: string;
  storage_location: string;
  current_price: string;
  manual_price: boolean;
}

export default function AssetDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const router = useRouter();
  const { currentPortfolio, isReadOnly } = usePortfolio();
  const [asset, setAsset] = useState<PortfolioAsset | null>(null);
  const [loading, setLoading] = useState(true);
  const [deleting, setDeleting] = useState(false);
  const [editing, setEditing] = useState(false);
  const [editingPrice, setEditingPrice] = useState(false);
  const [newPrice, setNewPrice] = useState("");
  const [saving, setSaving] = useState(false);
  const [imgSrc, setImgSrc] = useState<string | null>(null);
  const [editForm, setEditForm] = useState<EditForm | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [refreshResult, setRefreshResult] = useState<{ message: string; type: "success" | "error" | "info" } | null>(null);
  const [chartKey, setChartKey] = useState(0);
  const [showSnapshots, setShowSnapshots] = useState(false);
  const [snapshots, setSnapshots] = useState<{ id: string; price: number; source: string; recorded_at: string }[]>([]);
  const [loadingSnapshots, setLoadingSnapshots] = useState(false);
  const [deletingSnapshotId, setDeletingSnapshotId] = useState<string | null>(null);

  useEffect(() => {
    async function fetchAsset() {
      if (!currentPortfolio) return;
      try {
        const res = await fetch(`/api/assets?portfolioId=${currentPortfolio.id}`);
        if (!res.ok) throw new Error("Failed to fetch");
        const data: PortfolioAsset[] = await res.json();
        const found = data.find((a) => a.id === id);
        setAsset(found || null);
        if (found) {
          setImgSrc(fixStorageUrl(found.custom_image_url) || found.image_url);
        }
      } catch (error) {
        console.error("Error fetching asset:", error);
      } finally {
        setLoading(false);
      }
    }
    fetchAsset();
  }, [id, currentPortfolio]);

  const startEditing = () => {
    if (!asset) return;
    setEditForm({
      name: asset.name,
      set_name: asset.set_name || "",
      asset_type: asset.asset_type,
      purchase_price: String(asset.purchase_price),
      purchase_date: asset.purchase_date,
      purchase_location: asset.purchase_location || "",
      condition: asset.condition || "Near Mint",
      notes: asset.notes || "",
      quantity: String(asset.quantity || 1),
      psa_grade: asset.psa_grade || "",
      language: asset.language || "English",
      storage_location: asset.storage_location || "",
      current_price: String(asset.current_price ?? ""),
      manual_price: asset.manual_price || false,
    });
    setEditing(true);
  };

  const cancelEditing = () => {
    setEditing(false);
    setEditForm(null);
  };

  const handleSaveAll = async () => {
    if (!asset || !editForm) return;
    setSaving(true);
    try {
      const res = await fetch("/api/assets", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: asset.id,
          name: editForm.name,
          set_name: editForm.set_name,
          asset_type: editForm.asset_type,
          purchase_price: editForm.purchase_price,
          purchase_date: editForm.purchase_date,
          purchase_location: editForm.purchase_location,
          condition: editForm.condition,
          notes: editForm.notes,
          quantity: editForm.quantity,
          psa_grade: editForm.psa_grade,
          language: editForm.language,
          storage_location: editForm.storage_location,
          current_price: editForm.current_price || undefined,
          manual_price: editForm.manual_price,
        }),
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to update");
      }
      const updated = await res.json();
      setAsset(updated);
      setEditing(false);
      setEditForm(null);
    } catch (err) {
      alert(err instanceof Error ? err.message : "Failed to update asset");
    } finally {
      setSaving(false);
    }
  };

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
          manual_price: true,
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

  const handleRefreshPrice = async () => {
    if (!asset) return;
    setRefreshing(true);
    setRefreshResult(null);
    try {
      const res = await fetch(`/api/assets/${asset.id}/refresh-price`, {
        method: "POST",
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to refresh");

      if (data.refreshed) {
        setAsset(data.asset);
        setRefreshResult({
          message: `Updated to ${formatCurrency(data.price)} from ${data.source}`,
          type: "success",
        });
        setChartKey((k) => k + 1);
      } else {
        setRefreshResult({
          message: data.message || "No update needed",
          type: "info",
        });
      }
    } catch (err) {
      setRefreshResult({
        message: err instanceof Error ? err.message : "Failed to refresh price",
        type: "error",
      });
    } finally {
      setRefreshing(false);
    }
  };

  const fetchSnapshots = async () => {
    if (!asset) return;
    setLoadingSnapshots(true);
    try {
      const res = await fetch(`/api/assets/${asset.id}/price-snapshots`);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to fetch");
      setSnapshots(data);
    } catch {
      setSnapshots([]);
    } finally {
      setLoadingSnapshots(false);
    }
  };

  const handleToggleSnapshots = () => {
    if (!showSnapshots) {
      fetchSnapshots();
    }
    setShowSnapshots((v) => !v);
  };

  const handleDeleteSnapshot = async (snapshotId: string) => {
    if (!asset) return;
    setDeletingSnapshotId(snapshotId);
    try {
      const res = await fetch(`/api/assets/${asset.id}/price-snapshots?snapshotId=${snapshotId}`, {
        method: "DELETE",
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to delete");

      setSnapshots((prev) => prev.filter((s) => s.id !== snapshotId));
      setChartKey((k) => k + 1);
    } catch (err) {
      alert(err instanceof Error ? err.message : "Failed to delete snapshot");
    } finally {
      setDeletingSnapshotId(null);
    }
  };

  const isAdmin = currentPortfolio?.role === "owner" || currentPortfolio?.role === "admin";

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
  const imageUrl = imgSrc;
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
        <div className="flex items-center gap-2">
          {!isReadOnly && !editing && (
            <button
              onClick={startEditing}
              className="flex items-center gap-2 px-3 md:px-4 py-2 text-accent hover:bg-accent/10 rounded-xl text-sm font-medium"
            >
              <Pencil className="w-4 h-4" />
              Edit
            </button>
          )}
          {!isReadOnly && (
            <button
              onClick={handleDelete}
              disabled={deleting}
              className="flex items-center gap-2 px-3 md:px-4 py-2 text-danger hover:bg-danger-muted rounded-xl text-sm font-medium"
            >
              <Trash2 className="w-4 h-4" />
              {deleting ? "Removing..." : "Remove"}
            </button>
          )}
        </div>
      </div>

      {/* Edit Mode */}
      {editing && editForm && (
        <div className="bg-surface border-2 border-accent/30 rounded-2xl p-4 md:p-6">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-lg font-bold text-text-primary flex items-center gap-2">
              <Pencil className="w-5 h-5 text-accent" />
              Edit Asset
            </h2>
            <button
              onClick={cancelEditing}
              className="p-2 text-text-muted hover:text-text-primary rounded-lg hover:bg-surface-hover"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Name */}
            <div>
              <label className="block text-sm font-medium text-text-secondary mb-1.5">Name</label>
              <input
                type="text"
                value={editForm.name}
                onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
                className="w-full px-4 py-2.5 bg-background border border-border rounded-xl text-text-primary text-sm outline-none focus:border-accent"
              />
            </div>

            {/* Set Name */}
            <div>
              <label className="block text-sm font-medium text-text-secondary mb-1.5">Set Name</label>
              <input
                type="text"
                value={editForm.set_name}
                onChange={(e) => setEditForm({ ...editForm, set_name: e.target.value })}
                className="w-full px-4 py-2.5 bg-background border border-border rounded-xl text-text-primary text-sm outline-none focus:border-accent"
              />
            </div>

            {/* Asset Type */}
            <div>
              <label className="block text-sm font-medium text-text-secondary mb-1.5">Asset Type</label>
              <select
                value={editForm.asset_type}
                onChange={(e) => setEditForm({ ...editForm, asset_type: e.target.value as "card" | "sealed" | "comic" })}
                className="w-full px-4 py-2.5 bg-background border border-border rounded-xl text-text-primary text-sm outline-none focus:border-accent"
              >
                <option value="card">Trading Card</option>
                <option value="sealed">Sealed Product</option>
                <option value="comic">Comic Book</option>
              </select>
            </div>

            {/* PSA Grade */}
            <div>
              <label className="block text-sm font-medium text-text-secondary mb-1.5">Grade</label>
              <select
                value={editForm.psa_grade}
                onChange={(e) => setEditForm({ ...editForm, psa_grade: e.target.value })}
                className="w-full px-4 py-2.5 bg-background border border-border rounded-xl text-text-primary text-sm outline-none focus:border-accent"
              >
                {PSA_GRADES.map((g) => (
                  <option key={g.value} value={g.value}>{g.label}</option>
                ))}
              </select>
            </div>

            {/* Purchase Price */}
            <div>
              <label className="block text-sm font-medium text-text-secondary mb-1.5">Purchase Price (per unit)</label>
              <div className="relative">
                <span className="absolute left-4 top-1/2 -translate-y-1/2 text-text-muted">$</span>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  value={editForm.purchase_price}
                  onChange={(e) => setEditForm({ ...editForm, purchase_price: e.target.value })}
                  className="w-full pl-8 pr-4 py-2.5 bg-background border border-border rounded-xl text-text-primary text-sm outline-none focus:border-accent"
                />
              </div>
            </div>

            {/* Purchase Date */}
            <div>
              <label className="block text-sm font-medium text-text-secondary mb-1.5">Purchase Date</label>
              <input
                type="date"
                value={editForm.purchase_date}
                onChange={(e) => setEditForm({ ...editForm, purchase_date: e.target.value })}
                className="w-full px-4 py-2.5 bg-background border border-border rounded-xl text-text-primary text-sm outline-none focus:border-accent"
              />
            </div>

            {/* Purchase Location */}
            <div>
              <label className="block text-sm font-medium text-text-secondary mb-1.5">Purchased From</label>
              <input
                type="text"
                value={editForm.purchase_location}
                onChange={(e) => setEditForm({ ...editForm, purchase_location: e.target.value })}
                className="w-full px-4 py-2.5 bg-background border border-border rounded-xl text-text-primary text-sm outline-none focus:border-accent"
                placeholder="e.g. eBay, LCS, TCGPlayer..."
              />
            </div>

            {/* Condition */}
            <div>
              <label className="block text-sm font-medium text-text-secondary mb-1.5">Condition</label>
              <select
                value={editForm.condition}
                onChange={(e) => setEditForm({ ...editForm, condition: e.target.value })}
                className="w-full px-4 py-2.5 bg-background border border-border rounded-xl text-text-primary text-sm outline-none focus:border-accent"
              >
                {CONDITIONS.map((c) => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>
            </div>

            {/* Quantity */}
            <div>
              <label className="block text-sm font-medium text-text-secondary mb-1.5">Quantity</label>
              <input
                type="number"
                min="1"
                value={editForm.quantity}
                onChange={(e) => setEditForm({ ...editForm, quantity: e.target.value })}
                className="w-full px-4 py-2.5 bg-background border border-border rounded-xl text-text-primary text-sm outline-none focus:border-accent"
              />
            </div>

            {/* Language */}
            <div>
              <label className="block text-sm font-medium text-text-secondary mb-1.5">Language</label>
              <select
                value={editForm.language}
                onChange={(e) => setEditForm({ ...editForm, language: e.target.value })}
                className="w-full px-4 py-2.5 bg-background border border-border rounded-xl text-text-primary text-sm outline-none focus:border-accent"
              >
                {LANGUAGES.map((l) => (
                  <option key={l} value={l}>{l}</option>
                ))}
              </select>
            </div>

            {/* Storage Location */}
            <div>
              <label className="block text-sm font-medium text-text-secondary mb-1.5">Physical Location</label>
              <input
                type="text"
                value={editForm.storage_location}
                onChange={(e) => setEditForm({ ...editForm, storage_location: e.target.value })}
                className="w-full px-4 py-2.5 bg-background border border-border rounded-xl text-text-primary text-sm outline-none focus:border-accent"
                placeholder="e.g. Binder A, Safe, Display Case..."
              />
            </div>

            {/* Current Market Price */}
            <div>
              <label className="block text-sm font-medium text-text-secondary mb-1.5">Current Market Price</label>
              <div className="relative">
                <span className="absolute left-4 top-1/2 -translate-y-1/2 text-text-muted">$</span>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  value={editForm.current_price}
                  onChange={(e) => setEditForm({ ...editForm, current_price: e.target.value })}
                  className="w-full pl-8 pr-4 py-2.5 bg-background border border-border rounded-xl text-text-primary text-sm outline-none focus:border-accent"
                />
              </div>
            </div>

            {/* Notes - Full width */}
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-text-secondary mb-1.5">Notes</label>
              <textarea
                value={editForm.notes}
                onChange={(e) => setEditForm({ ...editForm, notes: e.target.value })}
                rows={3}
                className="w-full px-4 py-2.5 bg-background border border-border rounded-xl text-text-primary text-sm outline-none focus:border-accent resize-none"
                placeholder="Any additional notes..."
              />
            </div>

            {/* Manual Price Toggle */}
            <div className="md:col-span-2">
              <label className="flex items-center gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={editForm.manual_price}
                  onChange={(e) => setEditForm({ ...editForm, manual_price: e.target.checked })}
                  className="w-4 h-4 accent-gold rounded"
                />
                <div>
                  <span className="text-sm font-medium text-text-primary">Manual price management</span>
                  <p className="text-xs text-text-muted">Price will not auto-refresh from the API</p>
                </div>
              </label>
            </div>
          </div>

          {/* Save / Cancel buttons */}
          <div className="flex items-center gap-3 mt-6 pt-4 border-t border-border">
            <button
              onClick={handleSaveAll}
              disabled={saving || !editForm.name.trim() || !editForm.purchase_price}
              className="flex items-center gap-2 px-6 py-2.5 bg-accent hover:bg-accent-hover disabled:opacity-50 text-black font-semibold rounded-xl text-sm"
            >
              <Save className="w-4 h-4" />
              {saving ? "Saving..." : "Save Changes"}
            </button>
            <button
              onClick={cancelEditing}
              className="px-6 py-2.5 bg-surface border border-border text-text-secondary hover:text-text-primary rounded-xl text-sm font-medium"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

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
                  onError={() => {
                    if (asset.custom_image_url && asset.image_url && imgSrc !== asset.image_url) {
                      setImgSrc(asset.image_url);
                    } else {
                      setImgSrc(null);
                    }
                  }}
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
              {asset.language && asset.language !== "English" && (
                <div className="flex items-center gap-3">
                  <Globe className="w-4 h-4 text-text-muted flex-shrink-0" />
                  <div>
                    <p className="text-xs text-text-muted">Language</p>
                    <p className="text-sm text-text-primary">{asset.language}</p>
                  </div>
                </div>
              )}
              {asset.storage_location && (
                <div className="flex items-center gap-3">
                  <Archive className="w-4 h-4 text-text-muted flex-shrink-0" />
                  <div>
                    <p className="text-xs text-text-muted">Physical Location</p>
                    <p className="text-sm text-text-primary">{asset.storage_location}</p>
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
                      asset.asset_type === "comic"
                        ? "bg-emerald-500/15 text-emerald-400"
                        : asset.asset_type === "card"
                          ? "bg-accent-muted text-accent-hover"
                          : "bg-warning-muted text-warning"
                    )}
                  >
                    {asset.asset_type === "comic" ? "Comic" : asset.asset_type === "card" ? "Card" : "Sealed"}
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
              <div className="mt-4 flex items-center gap-3 px-4 py-3 bg-danger/15 border-2 border-danger/50 rounded-xl">
                <div className="w-8 h-8 rounded-full bg-danger/20 flex items-center justify-center flex-shrink-0">
                  <AlertTriangle className="w-4 h-4 text-danger" />
                </div>
                <div>
                  <p className="text-xs font-bold text-danger">Price Update Required</p>
                  <p className="text-xs text-danger/80">
                    Market price has not been updated in over 7 days. Please update to keep your portfolio accurate.
                  </p>
                </div>
              </div>
            )}

            {/* Manual submission badge */}
            {asset.is_manual_submission && !asset.pc_url && (
              <div className="mt-3 flex items-center gap-2 px-3 py-2 bg-warning/10 border border-warning/30 rounded-xl">
                <PenLine className="w-4 h-4 text-warning flex-shrink-0" />
                <p className="text-xs text-warning">
                  This is a manual submission. Prices will not auto-refresh from the API.
                </p>
              </div>
            )}

            {/* Tether badge */}
            {asset.pc_url && (
              <div className="mt-3 flex items-center gap-2 px-3 py-2 bg-accent/10 border border-accent/30 rounded-xl">
                <Link2 className="w-4 h-4 text-accent flex-shrink-0" />
                <p className="text-xs text-accent">
                  Tethered to PriceCharting — prices auto-refresh daily from eBay sold data.
                </p>
              </div>
            )}

            {/* Price summary */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4 mt-4 md:mt-6 pt-4 md:pt-6 border-t border-border">
              <div className={clsx(
                "rounded-xl px-2 py-1.5 -mx-2 -my-1.5",
                stale && "bg-danger/10 ring-1 ring-danger/30"
              )}>
                {asset.manual_price ? (
                  <div className="flex items-center gap-1.5 mb-0.5">
                    <PenLine className="w-3 h-3 text-warning" />
                    <p className="text-[10px] md:text-xs font-semibold text-warning">Manual Price</p>
                  </div>
                ) : (
                  <p className="text-[10px] md:text-xs text-text-muted">
                    Market Price
                  </p>
                )}
                <div className="flex items-center gap-2 mt-1">
                  <p className={clsx(
                    "text-base md:text-xl font-bold",
                    stale ? "text-danger" : asset.manual_price ? "text-warning" : "text-text-primary"
                  )}>
                    {formatCurrency(currentPrice)}
                  </p>
                  {stale && (
                    <span className="text-[9px] font-semibold text-danger bg-danger/15 px-1.5 py-0.5 rounded">STALE</span>
                  )}
                  {!isReadOnly && (
                    <button
                      onClick={() => {
                        setNewPrice(String(currentPrice));
                        setEditingPrice(true);
                      }}
                      className="p-1 rounded-lg text-text-muted hover:text-gold hover:bg-gold/10"
                      title="Override market price"
                    >
                      <Pencil className="w-3.5 h-3.5" />
                    </button>
                  )}
                  {!isReadOnly && !(asset.manual_price && !asset.pc_url) && (
                    <button
                      onClick={handleRefreshPrice}
                      disabled={refreshing}
                      className="p-1 rounded-lg text-text-muted hover:text-accent hover:bg-accent/10 disabled:opacity-50"
                      title="Refresh market price now"
                    >
                      <RefreshCw className={clsx("w-3.5 h-3.5", refreshing && "animate-spin")} />
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

            {/* Refresh result message */}
            {refreshResult && (
              <div
                className={clsx(
                  "mt-4 flex items-center justify-between px-4 py-2.5 rounded-xl text-xs font-medium",
                  refreshResult.type === "success" && "bg-success/15 text-success border border-success/30",
                  refreshResult.type === "error" && "bg-danger/15 text-danger border border-danger/30",
                  refreshResult.type === "info" && "bg-accent/10 text-accent border border-accent/30"
                )}
              >
                <span>{refreshResult.message}</span>
                <button
                  onClick={() => setRefreshResult(null)}
                  className="ml-2 p-0.5 rounded hover:bg-black/10"
                >
                  <X className="w-3 h-3" />
                </button>
              </div>
            )}
          </div>

          {/* Admin: Manage Price History */}
          {isAdmin && (
            <div className="bg-surface border border-border rounded-2xl p-3 md:p-4">
              <button
                onClick={handleToggleSnapshots}
                className="flex items-center justify-between w-full"
              >
                <div className="text-left">
                  <p className="text-xs font-semibold text-text-primary">Price History Management</p>
                  <p className="text-[10px] text-text-muted mt-0.5">Admin only — view and delete individual price entries</p>
                </div>
                <span className="text-text-muted text-xs">{showSnapshots ? "Hide" : "Show"}</span>
              </button>

              {showSnapshots && (
                <div className="mt-3 pt-3 border-t border-border">
                  {loadingSnapshots ? (
                    <p className="text-xs text-text-muted py-2">Loading snapshots...</p>
                  ) : snapshots.length === 0 ? (
                    <p className="text-xs text-text-muted py-2">No price history entries found.</p>
                  ) : (
                    <div className="space-y-1 max-h-64 overflow-y-auto">
                      {snapshots.map((snap) => (
                        <div
                          key={snap.id}
                          className="flex items-center justify-between px-3 py-2 rounded-lg hover:bg-surface-hover group"
                        >
                          <div className="flex items-center gap-3 min-w-0">
                            <span className="text-sm font-medium text-text-primary w-20 flex-shrink-0">
                              {formatCurrency(snap.price)}
                            </span>
                            <span className="text-[10px] px-1.5 py-0.5 rounded bg-surface-hover text-text-muted flex-shrink-0">
                              {snap.source}
                            </span>
                            <span className="text-xs text-text-muted truncate">
                              {formatDate(snap.recorded_at)}
                            </span>
                          </div>
                          <button
                            onClick={() => handleDeleteSnapshot(snap.id)}
                            disabled={deletingSnapshotId === snap.id}
                            className="p-1 rounded text-text-muted hover:text-danger hover:bg-danger-muted opacity-0 group-hover:opacity-100 transition-opacity disabled:opacity-50 flex-shrink-0"
                            title="Delete this entry"
                          >
                            {deletingSnapshotId === snap.id ? (
                              <RefreshCw className="w-3 h-3 animate-spin" />
                            ) : (
                              <Trash2 className="w-3 h-3" />
                            )}
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {/* Price Chart */}
          <PriceChart
            key={chartKey}
            externalId={asset.external_id}
            assetId={asset.id}
            cardName={asset.name}
            purchasePrice={asset.purchase_price}
            assetType={asset.asset_type}
          />

          {/* Price source link */}
          <div className="bg-surface border border-border rounded-2xl p-3 md:p-4">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-2">
              <p className="text-xs text-text-muted">
                {asset.pc_url ? (
                  <>
                    Tethered to PriceCharting (eBay sold data, USD)
                    {asset.pc_grade_field && asset.pc_grade_field !== "ungraded" && (
                      <> · Using {asset.pc_grade_field} price</>
                    )}
                    {asset.price_updated_at &&
                      ` · Updated ${formatDate(asset.price_updated_at)}`}
                  </>
                ) : asset.manual_price ? (
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
              {asset.pc_url ? (
                <a
                  href={asset.pc_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-1 text-xs text-accent hover:text-accent-hover"
                >
                  View on PriceCharting
                  <ExternalLink className="w-3 h-3" />
                </a>
              ) : !asset.manual_price && (
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
