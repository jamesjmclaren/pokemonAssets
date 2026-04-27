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
import { formatPercentage, formatDate, fixStorageUrl, getMarketDisclaimer } from "@/lib/format";
import { useFormatCurrency, useCurrency, SUPPORTED_CURRENCIES, type DisplayCurrency } from "@/lib/currency-context";

const CURRENCY_SYMBOL: Record<DisplayCurrency, string> = { USD: "$", GBP: "£", EUR: "€" };
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
  const thirtyDays = 30 * 24 * 60 * 60 * 1000;
  return Date.now() - new Date(asset.price_updated_at).getTime() > thirtyDays;
}

interface EditForm {
  name: string;
  set_name: string;
  asset_type: "card" | "sealed";
  purchase_price: string;
  purchase_currency: DisplayCurrency;
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
  poketrace_id: string;
  poketrace_market: string;
  price_source: string;
}

interface PoketraceCandidate {
  id: string;
  name: string;
  setName: string;
  poketraceId: string;
  poketraceMarket: string;
  imageUrl?: string;
  currency: string;
  prices: {
    ungraded?: number;
    grade7?: number;
    grade8?: number;
    grade9?: number;
    grade95?: number;
    psa10?: number;
  };
}

const GRADE_OPTIONS = [
  { value: "ungraded", label: "Ungraded" },
  { value: "grade7", label: "Grade 7" },
  { value: "grade8", label: "Grade 8" },
  { value: "grade9", label: "Grade 9" },
  { value: "grade95", label: "Grade 9.5" },
  { value: "psa10", label: "PSA 10 / Grade 10" },
];

export default function AssetDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const router = useRouter();
  const { currentPortfolio, isReadOnly } = usePortfolio();
  const formatCurrency = useFormatCurrency();
  const { rates: fxRates } = useCurrency();

  const editToUsd = (amount: number, fromCurrency: DisplayCurrency): number => {
    if (!Number.isFinite(amount)) return 0;
    if (fromCurrency === "USD") return amount;
    const rate = fxRates[fromCurrency];
    if (!rate || rate <= 0) return amount;
    return Math.round((amount / rate) * 100) / 100;
  };

  const editFromUsd = (usd: number, toCurrency: DisplayCurrency): number => {
    if (!Number.isFinite(usd)) return 0;
    if (toCurrency === "USD") return usd;
    const rate = fxRates[toCurrency];
    if (!rate || rate <= 0) return usd;
    return Math.round(usd * rate * 100) / 100;
  };

  const handleEditCurrencyChange = (next: DisplayCurrency) => {
    setEditForm((f) => {
      if (!f || f.purchase_currency === next) return f;
      const amount = parseFloat(f.purchase_price);
      if (!Number.isFinite(amount) || amount <= 0) {
        return { ...f, purchase_currency: next };
      }
      const usd = editToUsd(amount, f.purchase_currency);
      const converted = editFromUsd(usd, next);
      return {
        ...f,
        purchase_currency: next,
        purchase_price: converted ? converted.toFixed(2) : "",
      };
    });
  };
  const [asset, setAsset] = useState<PortfolioAsset | null>(null);
  const [loading, setLoading] = useState(true);
  const [deleting, setDeleting] = useState(false);
  const [editing, setEditing] = useState(false);
  const [editingPrice, setEditingPrice] = useState(false);
  const [newPrice, setNewPrice] = useState("");
  const [newEvidenceUrl, setNewEvidenceUrl] = useState("");
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
  const [poketraceSearching, setPoketraceSearching] = useState(false);
  const [poketraceCandidates, setPoketraceCandidates] = useState<PoketraceCandidate[]>([]);
  const [poketraceShowSearch, setPoketraceShowSearch] = useState(false);
  const [sellPrice, setSellPrice] = useState("");
  const [sellDate, setSellDate] = useState("");
  const [savingSell, setSavingSell] = useState(false);
  const [suggestedPrice, setSuggestedPrice] = useState<number | null>(null);
  const [loadingSuggested, setLoadingSuggested] = useState(false);
  const [gradedValues, setGradedValues] = useState<{
    tier: string;
    label: string;
    avg: number;
    low: number | null;
    high: number | null;
    saleCount: number | null;
    source: string;
  }[]>([]);
  const [gradedCurrentGrade, setGradedCurrentGrade] = useState<string | null>(null);
  const [loadingGraded, setLoadingGraded] = useState(false);
  type PriceSource = "tcgplayer" | "ebay" | "cardmarket";
  const [sourceBreakdown, setSourceBreakdown] = useState<Partial<Record<PriceSource, number>>>({});
  const [breakdownLoading, setBreakdownLoading] = useState(false);

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

  // Fetch suggested Poketrace price when asset uses manual pricing
  useEffect(() => {
    if (!asset?.manual_price) {
      setSuggestedPrice(null);
      return;
    }
    let cancelled = false;
    async function fetchSuggested() {
      setLoadingSuggested(true);
      try {
        const res = await fetch(`/api/assets/${asset!.id}/suggested-price`);
        if (!res.ok) return;
        const data = await res.json();
        if (!cancelled && data.suggestedPrice != null) {
          setSuggestedPrice(data.suggestedPrice);
        }
      } catch {
        // Silently fail — suggestion is optional
      } finally {
        if (!cancelled) setLoadingSuggested(false);
      }
    }
    fetchSuggested();
    return () => { cancelled = true; };
  }, [asset?.id, asset?.manual_price]);

  // Fetch graded values when asset has a Poketrace link
  useEffect(() => {
    if (!asset?.poketrace_id) {
      setGradedValues([]);
      return;
    }
    let cancelled = false;
    async function fetchGradedValues() {
      setLoadingGraded(true);
      try {
        const res = await fetch(`/api/assets/${asset!.id}/graded-values`);
        if (!res.ok) return;
        const data = await res.json();
        if (!cancelled) {
          setGradedValues(data.gradedValues || []);
          setGradedCurrentGrade(data.currentGrade || null);
        }
      } catch {
        // Silently fail — graded values are supplementary
      } finally {
        if (!cancelled) setLoadingGraded(false);
      }
    }
    fetchGradedValues();
    return () => { cancelled = true; };
  }, [asset?.id, asset?.poketrace_id]);

  // Fetch per-source price breakdown while editing a Poketrace-linked asset
  useEffect(() => {
    if (!editing || !editForm?.poketrace_id) {
      setSourceBreakdown({});
      return;
    }
    const poketraceId = editForm.poketrace_id;
    const grade = editForm.psa_grade;
    setBreakdownLoading(true);
    const url = `/api/card-price?poketraceId=${encodeURIComponent(poketraceId)}${
      grade ? `&grade=${encodeURIComponent(grade)}` : ""
    }`;
    let cancelled = false;
    fetch(url)
      .then((r) => r.json())
      .then((data) => {
        if (cancelled) return;
        setSourceBreakdown((data.breakdown || {}) as Partial<Record<PriceSource, number>>);
      })
      .catch(() => { if (!cancelled) setSourceBreakdown({}); })
      .finally(() => { if (!cancelled) setBreakdownLoading(false); });
    return () => { cancelled = true; };
  }, [editing, editForm?.poketrace_id, editForm?.psa_grade]);

  const startEditing = () => {
    if (!asset) return;
    setEditForm({
      name: asset.name,
      set_name: asset.set_name || "",
      asset_type: asset.asset_type,
      purchase_price: String(asset.purchase_price),
      purchase_currency: "USD",
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
      poketrace_id: asset.poketrace_id || "",
      poketrace_market: asset.poketrace_market || "US",
      price_source: asset.price_source || "",
    });
    setPoketraceCandidates([]);
    setPoketraceShowSearch(false);
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
      const chosenSource = editForm.price_source as PriceSource | "";
      const chosenSourcePrice = chosenSource ? sourceBreakdown[chosenSource] : undefined;
      const priceSourceChanged = (asset.price_source || "") !== (editForm.price_source || "");
      const nextPrice =
        priceSourceChanged && chosenSourcePrice != null
          ? chosenSourcePrice.toString()
          : (editForm.current_price || undefined);

      const purchasePriceUsd = editToUsd(parseFloat(editForm.purchase_price) || 0, editForm.purchase_currency);

      const res = await fetch("/api/assets", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: asset.id,
          name: editForm.name,
          set_name: editForm.set_name,
          asset_type: editForm.asset_type,
          purchase_price: purchasePriceUsd,
          purchase_date: editForm.purchase_date,
          purchase_location: editForm.purchase_location,
          condition: editForm.condition,
          notes: editForm.notes,
          quantity: editForm.quantity,
          psa_grade: editForm.psa_grade,
          language: editForm.language,
          storage_location: editForm.storage_location,
          current_price: nextPrice,
          manual_price: editForm.manual_price,
          poketrace_id: editForm.poketrace_id || null,
          poketrace_market: editForm.poketrace_market || "US",
          price_source: editForm.price_source || null,
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
          ...(newEvidenceUrl.trim() && { evidence_url: newEvidenceUrl.trim() }),
        }),
      });
      if (!res.ok) throw new Error("Failed to update");
      const updated = await res.json();
      setAsset(updated);
      setEditingPrice(false);
      setNewEvidenceUrl("");
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

  const handleMarkAsSold = async () => {
    if (!asset || !sellPrice) return;
    setSavingSell(true);
    try {
      const res = await fetch("/api/assets", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: asset.id,
          status: "SOLD",
          sell_price: sellPrice,
          sell_date: sellDate || null,
        }),
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to update");
      }
      const updated = await res.json();
      setAsset(updated);
      setSellPrice("");
      setSellDate("");
    } catch (err) {
      alert(err instanceof Error ? err.message : "Failed to mark as sold");
    } finally {
      setSavingSell(false);
    }
  };

  const handleReactivate = async () => {
    if (!asset) return;
    if (!confirm("Reactivate this asset? It will be moved back to your active collection and the sale proceeds will be removed from your cash balance.")) return;
    setSavingSell(true);
    try {
      const res = await fetch("/api/assets", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: asset.id,
          status: "ACTIVE",
          sell_price: null,
          sell_date: null,
        }),
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to update");
      }
      const updated = await res.json();
      setAsset(updated);
    } catch (err) {
      alert(err instanceof Error ? err.message : "Failed to reactivate");
    } finally {
      setSavingSell(false);
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
                onChange={(e) => setEditForm({ ...editForm, asset_type: e.target.value as "card" | "sealed" })}
                className="w-full px-4 py-2.5 bg-background border border-border rounded-xl text-text-primary text-sm outline-none focus:border-accent"
              >
                <option value="card">Trading Card</option>
                <option value="sealed">Sealed Product</option>
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
              <div className="flex">
                <select
                  value={editForm.purchase_currency}
                  onChange={(e) => handleEditCurrencyChange(e.target.value as DisplayCurrency)}
                  className="bg-background border border-border border-r-0 rounded-l-xl px-3 text-text-primary text-sm outline-none focus:border-accent cursor-pointer"
                  aria-label="Purchase price currency"
                >
                  {SUPPORTED_CURRENCIES.map((c) => (
                    <option key={c} value={c}>{c}</option>
                  ))}
                </select>
                <div className="relative flex-1">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted">
                    {CURRENCY_SYMBOL[editForm.purchase_currency]}
                  </span>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    value={editForm.purchase_price}
                    onChange={(e) => setEditForm({ ...editForm, purchase_price: e.target.value })}
                    className="w-full pl-7 pr-3 py-2.5 bg-background border border-border rounded-r-xl text-text-primary text-sm outline-none focus:border-accent"
                  />
                </div>
              </div>
              {editForm.purchase_currency !== "USD" && parseFloat(editForm.purchase_price) > 0 && (
                <p className="mt-1 text-[11px] text-accent/80">
                  ≈ ${editToUsd(parseFloat(editForm.purchase_price), editForm.purchase_currency).toFixed(2)} USD will be saved at today&apos;s rate.
                </p>
              )}
              <p className="mt-1.5 text-[11px] text-text-muted leading-relaxed">
                All market prices are sourced from Poketrace in USD. Enter your purchase price in any currency — it will be converted and stored in USD at today&apos;s exchange rate.
              </p>
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

            {/* Poketrace Link */}
            <div className="md:col-span-2 border-t border-border pt-4 mt-2">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <Link2 className="w-4 h-4 text-accent" />
                  <span className="text-sm font-medium text-text-primary">Poketrace Link</span>
                </div>
                {editForm.poketrace_id && (
                  <button
                    type="button"
                    onClick={() => {
                      setEditForm({ ...editForm, poketrace_id: "", poketrace_market: "US" });
                      setPoketraceCandidates([]);
                      setPoketraceShowSearch(false);
                    }}
                    className="text-xs text-danger hover:text-danger/80 font-medium"
                  >
                    Remove Link
                  </button>
                )}
              </div>

              {editForm.poketrace_id ? (
                <div className="bg-accent/5 border border-accent/20 rounded-xl p-3 space-y-3">
                  <div className="flex items-center gap-2">
                    <Link2 className="w-3.5 h-3.5 text-accent flex-shrink-0" />
                    <p className="text-xs text-accent truncate">Poketrace ID: {editForm.poketrace_id} ({editForm.poketrace_market})</p>
                  </div>
                  <p className="text-[10px] text-text-muted">
                    {getMarketDisclaimer(editForm.poketrace_market, "long")} Prices auto-refresh daily.
                  </p>

                  <div className="pt-2 border-t border-accent/10">
                    <div className="flex items-center justify-between mb-2">
                      <p className="text-xs font-medium text-text-primary">Price source</p>
                      {breakdownLoading && (
                        <RefreshCw className="w-3 h-3 animate-spin text-text-muted" />
                      )}
                    </div>
                    <p className="text-[10px] text-text-muted mb-2">
                      {editForm.psa_grade
                        ? `Pick which marketplace's ${editForm.psa_grade} price to use.`
                        : "Pick which marketplace's price to use."}
                    </p>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-1.5">
                      {(["auto", "tcgplayer", "ebay", "cardmarket"] as const).map((opt) => {
                        const isAuto = opt === "auto";
                        const currentValue = editForm.price_source || "";
                        const isSelected = isAuto ? currentValue === "" : currentValue === opt;
                        const price = isAuto ? null : sourceBreakdown[opt as PriceSource];
                        const unavailable = !isAuto && price == null;
                        const label =
                          opt === "tcgplayer" ? "TCGPlayer"
                            : opt === "ebay" ? "eBay"
                            : opt === "cardmarket" ? "CardMarket"
                            : "Auto";
                        return (
                          <button
                            key={opt}
                            type="button"
                            disabled={unavailable}
                            onClick={() =>
                              setEditForm({
                                ...editForm,
                                price_source: isAuto ? "" : opt,
                              })
                            }
                            className={clsx(
                              "px-2 py-1.5 rounded-lg border text-left transition-colors",
                              isSelected
                                ? "bg-accent-muted border-accent text-accent-hover"
                                : unavailable
                                  ? "bg-surface border-border text-text-muted opacity-50 cursor-not-allowed"
                                  : "bg-surface border-border text-text-secondary hover:border-border-hover"
                            )}
                          >
                            <div className="text-[10px] font-semibold">{label}</div>
                            <div className="text-[10px] mt-0.5">
                              {isAuto
                                ? <span className="text-text-muted">Best available</span>
                                : price != null
                                  ? <span>{formatCurrency(price)}</span>
                                  : <span className="text-text-muted">N/A</span>}
                            </div>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                </div>
              ) : (
                <div>
                  <p className="text-xs text-text-muted mb-2">
                    Link this asset to a Poketrace listing for automatic daily price updates.
                  </p>
                  {!poketraceShowSearch ? (
                    <button
                      type="button"
                      onClick={() => {
                        setPoketraceShowSearch(true);
                        setPoketraceCandidates([]);
                      }}
                      className="flex items-center gap-2 px-3 py-2 bg-accent/10 hover:bg-accent/20 text-accent rounded-lg text-sm font-medium"
                    >
                      <Link2 className="w-3.5 h-3.5" />
                      Search Poketrace
                    </button>
                  ) : (
                    <div className="space-y-3">
                      <div className="flex gap-2">
                        <input
                          type="text"
                          id="poketrace-search-input"
                          defaultValue={editForm.name}
                          placeholder="Search Poketrace..."
                          className="flex-1 px-3 py-2 bg-background border border-border rounded-lg text-text-primary text-sm outline-none focus:border-accent"
                          onKeyDown={(e) => {
                            if (e.key === "Enter") {
                              e.preventDefault();
                              const input = e.currentTarget;
                              if (!input.value.trim()) return;
                              setPoketraceSearching(true);
                              fetch(`/api/graded-search?q=${encodeURIComponent(input.value.trim())}`)
                                .then((r) => r.json())
                                .then((data) => setPoketraceCandidates(data.candidates || []))
                                .catch(() => setPoketraceCandidates([]))
                                .finally(() => setPoketraceSearching(false));
                            }
                          }}
                        />
                        <button
                          type="button"
                          disabled={poketraceSearching}
                          onClick={() => {
                            const input = document.getElementById("poketrace-search-input") as HTMLInputElement | null;
                            const q = input?.value.trim();
                            if (!q) return;
                            setPoketraceSearching(true);
                            fetch(`/api/graded-search?q=${encodeURIComponent(q)}`)
                              .then((r) => r.json())
                              .then((data) => setPoketraceCandidates(data.candidates || []))
                              .catch(() => setPoketraceCandidates([]))
                              .finally(() => setPoketraceSearching(false));
                          }}
                          className="px-3 py-2 bg-accent hover:bg-accent-hover disabled:opacity-50 text-black rounded-lg text-sm font-medium"
                        >
                          {poketraceSearching ? "Searching..." : "Search"}
                        </button>
                        <button
                          type="button"
                          onClick={() => { setPoketraceShowSearch(false); setPoketraceCandidates([]); }}
                          className="px-2 py-2 text-text-muted hover:text-text-primary rounded-lg hover:bg-surface-hover"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      </div>

                      {poketraceSearching && (
                        <p className="text-xs text-text-muted py-2">Searching Poketrace...</p>
                      )}

                      {!poketraceSearching && poketraceCandidates.length > 0 && (
                        <div className="space-y-1.5 max-h-64 overflow-y-auto">
                          {poketraceCandidates.map((c) => (
                            <button
                              key={c.id}
                              type="button"
                              onClick={() => {
                                setEditForm({
                                  ...editForm,
                                  poketrace_id: c.poketraceId || c.id,
                                  poketrace_market: c.poketraceMarket || "US",
                                  manual_price: false,
                                });
                                setPoketraceCandidates([]);
                                setPoketraceShowSearch(false);
                              }}
                              className="w-full flex items-center gap-3 px-3 py-2.5 bg-background hover:bg-surface-hover border border-border rounded-lg text-left"
                            >
                              {c.imageUrl && (
                                <Image
                                  src={c.imageUrl}
                                  alt={c.name}
                                  width={40}
                                  height={40}
                                  className="rounded object-contain flex-shrink-0"
                                />
                              )}
                              <div className="flex-1 min-w-0">
                                <p className="text-sm font-medium text-text-primary truncate">{c.name}</p>
                                <p className="text-[10px] text-text-muted truncate">{c.setName}</p>
                              </div>
                              <div className="text-right flex-shrink-0">
                                {(() => {
                                  const g = editForm.psa_grade?.toLowerCase() || "";
                                  const gradeKey = g.includes("10") ? "psa10" : g.includes("9.5") ? "grade95" : g.includes("9") ? "grade9" : g.includes("8") ? "grade8" : g.includes("7") ? "grade7" : "";
                                  const gradeLabel = g.includes("10") ? "PSA 10" : g.includes("9.5") ? "Grade 9.5" : g.includes("9") ? "Grade 9" : g.includes("8") ? "Grade 8" : g.includes("7") ? "Grade 7" : "";
                                  const gradePrice = gradeKey ? c.prices[gradeKey as keyof typeof c.prices] : undefined;
                                  return gradePrice != null ? (
                                    <>
                                      <p className="text-xs text-accent font-semibold">${gradePrice.toFixed(2)}</p>
                                      <p className="text-[10px] text-accent">{gradeLabel}</p>
                                      {c.prices.ungraded != null && (
                                        <p className="text-[10px] text-text-muted">${c.prices.ungraded.toFixed(2)} raw</p>
                                      )}
                                    </>
                                  ) : (
                                    <>
                                      {c.prices.ungraded != null && (
                                        <p className="text-xs text-text-primary font-medium">${c.prices.ungraded.toFixed(2)}</p>
                                      )}
                                      <p className="text-[10px] text-text-muted">Ungraded</p>
                                    </>
                                  );
                                })()}
                              </div>
                            </button>
                          ))}
                        </div>
                      )}

                      {!poketraceSearching && poketraceCandidates.length === 0 && poketraceShowSearch && (
                        <p className="text-xs text-text-muted py-1">
                          Press Search or Enter to find matching products on Poketrace.
                        </p>
                      )}
                    </div>
                  )}
                </div>
              )}
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
                  unoptimized={imageUrl.includes("tcgplayer-cdn.tcgplayer.com")}
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
              <div className="mt-4 flex items-center gap-3 px-4 py-3 bg-danger/15 border-2 border-danger/50 rounded-xl">
                <div className="w-8 h-8 rounded-full bg-danger/20 flex items-center justify-center flex-shrink-0">
                  <AlertTriangle className="w-4 h-4 text-danger" />
                </div>
                <div>
                  <p className="text-xs font-bold text-danger">Price Update Required</p>
                  <p className="text-xs text-danger/80">
                    Market price has not been updated in over 30 days. Please update to keep your portfolio accurate.
                  </p>
                </div>
              </div>
            )}

            {/* Manual submission badge */}
            {asset.is_manual_submission && !asset.poketrace_id && (
              <div className="mt-3 flex items-center gap-2 px-3 py-2 bg-warning/10 border border-warning/30 rounded-xl">
                <PenLine className="w-4 h-4 text-warning flex-shrink-0" />
                <p className="text-xs text-warning">
                  This is a manual submission. Prices will not auto-refresh from the API.
                </p>
              </div>
            )}

            {/* Tether badge */}
            {asset.poketrace_id && (
              <div className="mt-3 flex items-center gap-2 px-3 py-2 bg-accent/10 border border-accent/30 rounded-xl">
                <Link2 className="w-4 h-4 text-accent flex-shrink-0" />
                <p className="text-xs text-accent">
                  Linked to Poketrace — prices auto-refresh daily via Poketrace.
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
                <div className="flex items-center gap-2 mt-1 flex-wrap">
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
                  {!isReadOnly && !(asset.manual_price && !asset.poketrace_id) && (
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
                {asset.manual_price && suggestedPrice != null && (
                  <p className="text-[10px] text-text-muted mt-1">
                    Poketrace suggests{" "}
                    <span className={clsx(
                      "font-semibold",
                      suggestedPrice > currentPrice ? "text-success" : suggestedPrice < currentPrice ? "text-danger" : "text-text-secondary"
                    )}>
                      {formatCurrency(suggestedPrice)}
                    </span>
                  </p>
                )}
                {asset.manual_price && loadingSuggested && (
                  <p className="text-[10px] text-text-muted mt-1 animate-pulse">
                    Checking Poketrace...
                  </p>
                )}
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
                  <div className="min-w-0">
                    <p
                      className={clsx(
                        "text-base md:text-xl font-bold truncate",
                        profit > 0 && "text-success",
                        profit < 0 && "text-danger",
                        profit === 0 && "text-text-secondary"
                      )}
                    >
                      {profit >= 0 ? "+" : ""}
                      {formatCurrency(profit)}
                    </p>
                    <p
                      className={clsx(
                        "text-xs md:text-sm",
                        profit > 0 && "text-success",
                        profit < 0 && "text-danger",
                        profit === 0 && "text-text-secondary"
                      )}
                    >
                      ({formatPercentage(profitPercent)})
                    </p>
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
                    onClick={() => { setEditingPrice(false); setNewEvidenceUrl(""); }}
                    className="px-3 py-2 bg-surface border border-border rounded-lg text-sm text-text-secondary hover:text-text-primary"
                  >
                    Cancel
                  </button>
                </div>
                <div className="mt-2">
                  <input
                    type="url"
                    value={newEvidenceUrl}
                    onChange={(e) => setNewEvidenceUrl(e.target.value)}
                    className="w-full px-3 py-2 bg-surface border border-border rounded-lg text-text-primary text-sm outline-none focus:border-gold placeholder-text-muted"
                    placeholder="Evidence URL (optional) — e.g. eBay listing, TCGPlayer sale..."
                  />
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

          {/* Graded Values */}
          {asset.poketrace_id && asset.asset_type === "card" && (
            <div className="bg-surface border border-border rounded-2xl p-4 md:p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-sm font-semibold text-text-primary flex items-center gap-2">
                  <Shield className="w-4 h-4 text-gold" />
                  All Conditions
                  {gradedValues.length > 0 && (
                    <span className="text-xs font-normal text-text-muted">({gradedValues.length})</span>
                  )}
                </h3>
                {gradedValues.length > 4 && (
                  <span className="text-[10px] text-text-muted hidden md:block">scroll &rarr;</span>
                )}
              </div>

              {loadingGraded ? (
                <div className="flex gap-3 overflow-x-auto pb-2">
                  {[1, 2, 3, 4].map((i) => (
                    <div key={i} className="skeleton h-20 w-28 rounded-xl flex-shrink-0" />
                  ))}
                </div>
              ) : gradedValues.length === 0 ? (
                <p className="text-xs text-text-muted py-2">No graded pricing data available for this card.</p>
              ) : (
                <div className="flex gap-3 overflow-x-auto pb-2 -mx-1 px-1">
                  {gradedValues.map((gv) => {
                    const isCurrentGrade = gradedCurrentGrade && gv.label.toUpperCase() === gradedCurrentGrade.toUpperCase();
                    return (
                      <div
                        key={gv.tier}
                        className={clsx(
                          "flex-shrink-0 rounded-xl px-4 py-3 min-w-[120px] border",
                          isCurrentGrade
                            ? "bg-gold/10 border-gold/40"
                            : "bg-surface-hover/50 border-border"
                        )}
                      >
                        <div className="flex items-center gap-1.5 mb-1.5">
                          {isCurrentGrade && (
                            <div className="w-1.5 h-1.5 rounded-full bg-gold flex-shrink-0" />
                          )}
                          <p className={clsx(
                            "text-[10px] font-semibold uppercase tracking-wide",
                            isCurrentGrade ? "text-gold" : "text-text-muted"
                          )}>
                            {gv.label}
                          </p>
                        </div>
                        <p className={clsx(
                          "text-sm font-bold",
                          isCurrentGrade ? "text-gold" : "text-text-primary"
                        )}>
                          {formatCurrency(gv.avg)}
                        </p>
                        {(gv.low != null || gv.high != null) && (
                          <div className="flex items-center gap-1 mt-1">
                            {gv.low != null && (
                              <span className="text-[10px] text-text-muted">
                                L: {formatCurrency(gv.low)}
                              </span>
                            )}
                            {gv.low != null && gv.high != null && (
                              <span className="text-[10px] text-text-muted">·</span>
                            )}
                            {gv.high != null && (
                              <span className="text-[10px] text-text-muted">
                                H: {formatCurrency(gv.high)}
                              </span>
                            )}
                          </div>
                        )}
                        <p className="text-[9px] text-text-muted mt-1">{gv.source}</p>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

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
            poketraceId={asset.poketrace_id}
          />

          {/* Price source link */}
          <div className="bg-surface border border-border rounded-2xl p-3 md:p-4">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-2">
              <p className="text-xs text-text-muted">
                {asset.poketrace_id ? (
                  <>
                    Linked to Poketrace · {getMarketDisclaimer(asset.poketrace_market, "short")}
                    {asset.is_converted_price && (
                      <> · <span className="text-warning">Converted from EUR to USD</span></>
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
                    Price data from Poketrace · {getMarketDisclaimer(asset.poketrace_market, "short")}
                    {asset.is_converted_price && (
                      <> · <span className="text-warning">Converted from EUR to USD</span></>
                    )}
                    {asset.price_updated_at &&
                      ` · Updated ${formatDate(asset.price_updated_at)}`}
                  </>
                )}
              </p>
              {!asset.manual_price && (
                <a
                  href="https://poketrace.com"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-1 text-xs text-accent hover:text-accent-hover"
                >
                  View on Poketrace
                  <ExternalLink className="w-3 h-3" />
                </a>
              )}
            </div>
          </div>

          {/* Sell / Sold section */}
          {!isReadOnly && (
            <div className={clsx(
              "border rounded-2xl p-4 md:p-6",
              asset.status === "SOLD"
                ? "bg-surface-hover/40 border-border"
                : "bg-surface border border-border"
            )}>
              {asset.status === "SOLD" ? (
                /* Already sold — show summary + reactivate */
                <div>
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-sm font-semibold text-text-primary flex items-center gap-2">
                      <span className="px-2 py-0.5 rounded-lg text-xs font-bold bg-surface-hover text-text-muted border border-border">SOLD</span>
                      Sale Record
                    </h3>
                    <button
                      onClick={handleReactivate}
                      disabled={savingSell}
                      className="text-xs text-accent hover:text-accent-hover font-medium disabled:opacity-50"
                    >
                      {savingSell ? "Updating..." : "Reactivate"}
                    </button>
                  </div>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                    <div>
                      <p className="text-[10px] text-text-muted">Sell Price</p>
                      <p className="text-base font-bold text-text-primary mt-0.5">
                        {asset.sell_price != null ? formatCurrency(asset.sell_price * qty) : "—"}
                      </p>
                    </div>
                    <div>
                      <p className="text-[10px] text-text-muted">Sell Date</p>
                      <p className="text-base font-bold text-text-primary mt-0.5">
                        {asset.sell_date ? formatDate(asset.sell_date) : "—"}
                      </p>
                    </div>
                    <div>
                      <p className="text-[10px] text-text-muted">Realised P/L</p>
                      {(() => {
                        const sellTotal = (asset.sell_price ?? asset.purchase_price) * qty;
                        const pnl = sellTotal - totalInvested;
                        return (
                          <p className={clsx("text-base font-bold mt-0.5", pnl > 0 ? "text-success" : pnl < 0 ? "text-danger" : "text-text-secondary")}>
                            {pnl >= 0 ? "+" : ""}{formatCurrency(pnl)}
                          </p>
                        );
                      })()}
                    </div>
                    <div>
                      <p className="text-[10px] text-text-muted">Realised %</p>
                      {(() => {
                        const sellTotal = (asset.sell_price ?? asset.purchase_price) * qty;
                        const pnl = sellTotal - totalInvested;
                        const pct = totalInvested > 0 ? (pnl / totalInvested) * 100 : 0;
                        return (
                          <p className={clsx("text-base font-bold mt-0.5", pnl > 0 ? "text-success" : pnl < 0 ? "text-danger" : "text-text-secondary")}>
                            {pct >= 0 ? "+" : ""}{pct.toFixed(1)}%
                          </p>
                        );
                      })()}
                    </div>
                  </div>
                </div>
              ) : (
                /* Active — show sell form */
                <div>
                  <h3 className="text-sm font-semibold text-text-primary mb-4">Mark as Sold</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-medium text-text-secondary mb-1.5">
                        Sell Price {qty > 1 ? "(per unit)" : ""} <span className="text-danger">*</span>
                      </label>
                      <div className="relative">
                        <span className="absolute left-4 top-1/2 -translate-y-1/2 text-text-muted">$</span>
                        <input
                          type="number"
                          step="0.01"
                          min="0"
                          value={sellPrice}
                          onChange={(e) => setSellPrice(e.target.value)}
                          placeholder="0.00"
                          className="w-full pl-8 pr-4 py-2.5 bg-background border border-border rounded-xl text-text-primary text-sm outline-none focus:border-accent"
                        />
                      </div>
                      {qty > 1 && sellPrice && (
                        <p className="text-[10px] text-text-muted mt-1">
                          Total: {formatCurrency(parseFloat(sellPrice) * qty)}
                        </p>
                      )}
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-text-secondary mb-1.5">Sell Date</label>
                      <input
                        type="date"
                        value={sellDate}
                        onChange={(e) => setSellDate(e.target.value)}
                        className="w-full px-4 py-2.5 bg-background border border-border rounded-xl text-text-primary text-sm outline-none focus:border-accent"
                      />
                    </div>
                  </div>
                  {sellPrice && (
                    <div className="mt-3 p-3 bg-surface-hover rounded-xl text-xs text-text-secondary">
                      Realised P/L:{" "}
                      {(() => {
                        const sp = parseFloat(sellPrice) * qty;
                        const pnl = sp - totalInvested;
                        const pct = totalInvested > 0 ? (pnl / totalInvested) * 100 : 0;
                        return (
                          <span className={clsx("font-semibold", pnl > 0 ? "text-success" : pnl < 0 ? "text-danger" : "text-text-secondary")}>
                            {pnl >= 0 ? "+" : ""}{formatCurrency(pnl)} ({pct >= 0 ? "+" : ""}{pct.toFixed(1)}%)
                          </span>
                        );
                      })()}
                    </div>
                  )}
                  <div className="flex items-center gap-3 mt-4">
                    <button
                      onClick={handleMarkAsSold}
                      disabled={savingSell || !sellPrice}
                      className="flex items-center gap-2 px-5 py-2.5 bg-surface border border-border hover:border-border-hover text-text-primary disabled:opacity-50 font-semibold rounded-xl text-sm"
                    >
                      {savingSell ? "Saving..." : "Mark as Sold"}
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
