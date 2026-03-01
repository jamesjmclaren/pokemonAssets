"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import {
  Upload,
  Camera,
  X,
  Loader2,
  CheckCircle2,
  Search,
  AlertTriangle,
  PenLine,
  Link2,
} from "lucide-react";
import { formatCurrency, extractCardPrice, fixStorageUrl } from "@/lib/format";
import { supabase } from "@/lib/supabase";
import { usePortfolio } from "@/lib/portfolio-context";
import SearchModal from "./SearchModal";

interface SelectedCard {
  id: string;
  name: string;
  number?: string;
  rarity?: string;
  setName?: string;
  imageUrl?: string;
  type: "card" | "sealed" | "comic";
  prices?: {
    raw?: number;
    market?: number;
    psa10?: number;
    psa9?: number;
    cgc10?: number;
    bgs10?: number;
  };
  marketPrice?: number;
}

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

const CGC_COMIC_GRADES = [
  { value: "", label: "None (Ungraded)" },
  { value: "CGC 9.8", label: "CGC 9.8 - Near Mint/Mint" },
  { value: "CGC 9.6", label: "CGC 9.6 - Near Mint+" },
  { value: "CGC 9.4", label: "CGC 9.4 - Near Mint" },
  { value: "CGC 9.2", label: "CGC 9.2 - Near Mint-" },
  { value: "CGC 9.0", label: "CGC 9.0 - Very Fine/Near Mint" },
  { value: "CGC 8.5", label: "CGC 8.5 - Very Fine+" },
  { value: "CGC 8.0", label: "CGC 8.0 - Very Fine" },
  { value: "CGC 7.5", label: "CGC 7.5 - Very Fine-" },
  { value: "CGC 7.0", label: "CGC 7.0 - Fine/Very Fine" },
  { value: "CGC 6.5", label: "CGC 6.5 - Fine+" },
  { value: "CGC 6.0", label: "CGC 6.0 - Fine" },
  { value: "CGC 5.5", label: "CGC 5.5 - Fine-" },
  { value: "CGC 5.0", label: "CGC 5.0 - Very Good/Fine" },
  { value: "CGC 4.5", label: "CGC 4.5 - Very Good+" },
  { value: "CGC 4.0", label: "CGC 4.0 - Very Good" },
  { value: "CGC 3.0", label: "CGC 3.0 - Good/Very Good" },
  { value: "CGC 2.0", label: "CGC 2.0 - Good" },
  { value: "CGC 1.0", label: "CGC 1.0 - Fair" },
  { value: "CGC 0.5", label: "CGC 0.5 - Poor" },
  { value: "CBCS 9.8", label: "CBCS 9.8 - Near Mint/Mint" },
  { value: "CBCS 9.6", label: "CBCS 9.6 - Near Mint+" },
  { value: "CBCS 9.4", label: "CBCS 9.4 - Near Mint" },
  { value: "CBCS 9.2", label: "CBCS 9.2 - Near Mint-" },
];

const LANGUAGES = [
  "English",
  "Japanese",
  "Korean",
  "Chinese (Simplified)",
  "Chinese (Traditional)",
  "French",
  "German",
  "Italian",
  "Spanish",
  "Portuguese",
  "Dutch",
  "Polish",
  "Thai",
  "Indonesian",
];

export default function AddAssetForm() {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { currentPortfolio, portfolios, setCurrentPortfolio, loading: portfolioLoading, isReadOnly } = usePortfolio();

  const [searchOpen, setSearchOpen] = useState(false);
  const [selectedCard, setSelectedCard] = useState<SelectedCard | null>(null);
  const [isManualSubmission, setIsManualSubmission] = useState(false);
  const [customImage, setCustomImage] = useState<File | null>(null);
  const [customImagePreview, setCustomImagePreview] = useState<string | null>(
    null
  );
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);

  interface TetherCandidate {
    id: string;
    name: string;
    setName: string;
    url: string;
    imageUrl?: string;
    currency: string;
    prices: {
      ungraded?: number;
      grade7?: number;
      grade8?: number;
      grade9?: number;
      grade95?: number;
      psa10?: number;
      vg4?: number;
      fine6?: number;
      vf8?: number;
      nm92?: number;
      nm98?: number;
    };
  }

  const [tetherCandidates, setTetherCandidates] = useState<TetherCandidate[]>([]);
  const [selectedTether, setSelectedTether] = useState<TetherCandidate | null>(null);
  const [tetherLoading, setTetherLoading] = useState(false);
  const [tetherSearchQuery, setTetherSearchQuery] = useState("");

  const [form, setForm] = useState({
    manualName: "",
    manualSetName: "",
    purchasePrice: "",
    purchaseDate: new Date().toISOString().split("T")[0],
    purchaseLocation: "",
    condition: "Near Mint",
    assetType: "card" as "card" | "sealed" | "comic",
    psaGrade: "",
    manualPrice: false,
    manualPriceValue: "",
    quantity: "1",
    notes: "",
    language: "English",
    storageLocation: "",
  });

  const handleCardSelect = (card: SelectedCard) => {
    setSelectedCard(card);
    setIsManualSubmission(false);
    setSearchOpen(false);
    const price = card.marketPrice || extractCardPrice(card as unknown as Record<string, unknown>);
    const updates: Partial<typeof form> = {};
    if (price && !form.purchasePrice) {
      updates.purchasePrice = price.toFixed(2);
    }
    if (card.type === "comic") {
      updates.assetType = "comic";
      updates.condition = "Near Mint";
    } else if (card.type === "sealed") {
      updates.assetType = "sealed";
      updates.condition = "Sealed";
    } else {
      updates.assetType = "card";
    }
    if (Object.keys(updates).length > 0) {
      setForm((f) => ({ ...f, ...updates }));
    }
  };

  const handleManualEntry = (query: string) => {
    setIsManualSubmission(true);
    setSelectedCard(null);
    setSearchOpen(false);
    setForm((f) => ({
      ...f,
      manualName: query,
      manualPrice: true,
    }));
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 5 * 1024 * 1024) {
      alert("Image must be under 5MB");
      return;
    }

    setCustomImage(file);
    const reader = new FileReader();
    reader.onloadend = () => {
      setCustomImagePreview(reader.result as string);
    };
    reader.readAsDataURL(file);

    // If no card selected and no manual entry yet, switch to manual mode
    if (!selectedCard && !isManualSubmission) {
      setIsManualSubmission(true);
      setForm((f) => ({ ...f, manualPrice: true }));
    }
  };

  const clearSelection = () => {
    setSelectedCard(null);
    setIsManualSubmission(false);
    setForm((f) => ({ ...f, manualName: "", manualSetName: "" }));
    setTetherCandidates([]);
    setSelectedTether(null);
    setTetherSearchQuery("");
  };

  // Search PriceCharting for tether candidates
  const searchTether = useCallback(async (query: string) => {
    if (!query.trim()) return;
    setTetherLoading(true);
    setSelectedTether(null);
    try {
      const endpoint = form.assetType === "comic"
        ? `/api/comic-search?q=${encodeURIComponent(query)}`
        : `/api/pricecharting-search?q=${encodeURIComponent(query)}`;
      const res = await fetch(endpoint);
      if (!res.ok) throw new Error("Failed to search PriceCharting");
      const data = await res.json();
      setTetherCandidates(data.candidates || []);
    } catch (error) {
      console.error("Tether search failed:", error);
      setTetherCandidates([]);
    } finally {
      setTetherLoading(false);
    }
  }, [form.assetType]);

  // Get the price field name for the current grade
  const getTetherGradeField = useCallback((): string => {
    if (!form.psaGrade) return "ungraded";
    if (form.assetType === "comic") {
      const num = parseFloat(form.psaGrade.replace(/[^0-9.]/g, ""));
      if (isNaN(num)) return "ungraded";
      if (num >= 9.8) return "nm98";
      if (num >= 9.0) return "nm92";
      if (num >= 8.0) return "vf8";
      if (num >= 6.0) return "fine6";
      if (num >= 4.0) return "vg4";
      return "ungraded";
    }
    const g = form.psaGrade.toLowerCase();
    if (g.includes("10")) return "psa10";
    if (g.includes("9.5")) return "grade95";
    if (g.includes("9")) return "grade9";
    if (g.includes("8")) return "grade8";
    if (g.includes("7")) return "grade7";
    return "ungraded";
  }, [form.psaGrade, form.assetType]);

  // When user selects a tether candidate, populate the price
  const handleTetherSelect = useCallback((candidate: TetherCandidate) => {
    setSelectedTether(candidate);
    const field = getTetherGradeField();
    const price = candidate.prices[field as keyof typeof candidate.prices];
    if (price != null) {
      setForm((f) => ({
        ...f,
        manualPrice: true,
        manualPriceValue: price.toFixed(2),
      }));
    }
  }, [getTetherGradeField]);

  // Auto-search tether when manual name changes, graded card selected, or comic selected
  useEffect(() => {
    const name = isManualSubmission ? form.manualName : selectedCard?.name;
    if (name && (isManualSubmission || form.psaGrade || form.assetType === "comic")) {
      setTetherSearchQuery(name);
    }
  }, [isManualSubmission, form.manualName, form.psaGrade, form.assetType, selectedCard?.name]);

  // Determine the effective name/id for submission
  const effectiveName = isManualSubmission ? form.manualName : selectedCard?.name || "";
  const canSubmit = isManualSubmission
    ? form.manualName.trim().length > 0 && !!form.purchasePrice && !!currentPortfolio
    : !!selectedCard && !!form.purchasePrice && !!currentPortfolio;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!canSubmit) return;

    setSubmitting(true);
    try {
      let customImageUrl: string | null = null;

      if (customImage) {
        const ext = customImage.name.split(".").pop();
        const fileName = `${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;
        const { error: uploadError } = await supabase.storage
          .from("asset-images")
          .upload(fileName, customImage);

        if (uploadError) {
          throw new Error(`Failed to upload image: ${uploadError.message}`);
        }

        const {
          data: { publicUrl },
        } = supabase.storage.from("asset-images").getPublicUrl(fileName);
        customImageUrl = fixStorageUrl(publicUrl);
      }

      // Determine current market price
      const hasTether = !!selectedTether;
      let currentPrice: number | null = null;

      if (hasTether) {
        const field = getTetherGradeField();
        currentPrice = selectedTether!.prices[field as keyof typeof selectedTether.prices] ?? null;
      } else if (form.manualPrice && form.manualPriceValue) {
        currentPrice = parseFloat(form.manualPriceValue);
      } else if (selectedCard) {
        currentPrice = extractCardPrice(selectedCard as unknown as Record<string, unknown>);
      }

      // Tethered assets should NOT be marked manual so the cron can auto-refresh
      const isManualPrice = hasTether
        ? false
        : (form.manualPrice || isManualSubmission);

      const res = await fetch("/api/assets", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          portfolio_id: currentPortfolio!.id,
          external_id: isManualSubmission
            ? `manual-${Date.now()}-${Math.random().toString(36).slice(2)}`
            : selectedCard!.id,
          name: isManualSubmission ? form.manualName.trim() : selectedCard!.name,
          set_name: isManualSubmission ? form.manualSetName : (selectedCard!.setName || ""),
          asset_type: isManualSubmission
            ? form.assetType
            : (selectedCard!.type === "sealed" ? "sealed" : form.assetType),
          image_url: isManualSubmission ? null : (selectedCard!.imageUrl || null),
          custom_image_url: customImageUrl,
          purchase_price: form.purchasePrice,
          purchase_date: form.purchaseDate,
          purchase_location: form.purchaseLocation,
          condition: form.condition,
          notes: form.notes || null,
          current_price: currentPrice,
          rarity: isManualSubmission ? null : (selectedCard!.rarity || null),
          card_number: isManualSubmission ? null : (selectedCard!.number || null),
          psa_grade: form.psaGrade || null,
          manual_price: isManualPrice,
          quantity: form.quantity,
          language: form.language,
          storage_location: form.storageLocation,
          is_manual_submission: isManualSubmission,
          pc_product_id: selectedTether?.id || null,
          pc_url: selectedTether?.url || null,
          pc_grade_field: hasTether ? getTetherGradeField() : null,
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to add asset");
      }

      setSuccess(true);
      setTimeout(() => {
        router.push("/collection");
      }, 1500);
    } catch (error) {
      console.error("Submit error:", error);
      alert(error instanceof Error ? error.message : "Failed to add asset. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  const cardImage =
    customImagePreview ||
    selectedCard?.imageUrl ||
    "";

  if (isReadOnly) {
    return (
      <div className="max-w-2xl mx-auto">
        <div className="bg-surface border border-border rounded-2xl p-12 text-center">
          <Upload className="w-16 h-16 text-text-muted mx-auto mb-4" />
          <h2 className="text-xl font-bold text-text-primary">
            Read-Only Access
          </h2>
          <p className="text-text-secondary mt-2">
            You don&apos;t have permission to add assets to this portfolio.
          </p>
        </div>
      </div>
    );
  }

  if (success) {
    return (
      <div className="max-w-2xl mx-auto">
        <div className="bg-surface border border-success/30 rounded-2xl p-12 text-center">
          <CheckCircle2 className="w-16 h-16 text-success mx-auto mb-4" />
          <h2 className="text-xl font-bold text-text-primary">
            Asset Added Successfully!
          </h2>
          <p className="text-text-secondary mt-2">
            Redirecting to your collection...
          </p>
        </div>
      </div>
    );
  }

  return (
    <>
      <SearchModal
        isOpen={searchOpen}
        onClose={() => setSearchOpen(false)}
        onSelect={handleCardSelect}
        onManualEntry={handleManualEntry}
      />

      <div className="max-w-4xl mx-auto">
        <div className="grid grid-cols-1 lg:grid-cols-5 gap-6 md:gap-8">
          {/* Left: Preview */}
          <div className="lg:col-span-2">
            <div className="bg-surface border border-border rounded-2xl p-4 md:p-6 sticky top-18 lg:top-6">
              {/* Card preview */}
              <div className="aspect-[3/4] max-h-[40vh] md:max-h-none bg-background rounded-xl overflow-hidden relative mb-4 mx-auto max-w-[220px] md:max-w-none">
                {cardImage ? (
                  <Image
                    src={cardImage}
                    alt={effectiveName || "Card preview"}
                    fill
                    className="object-contain p-3 md:p-4"
                    sizes="(max-width: 768px) 220px, 300px"
                  />
                ) : (
                  <div className="w-full h-full flex flex-col items-center justify-center text-text-muted">
                    {isManualSubmission ? (
                      <>
                        <PenLine className="w-8 h-8 md:w-10 md:h-10 mb-2" />
                        <p className="text-sm">Manual Entry</p>
                        <p className="text-xs mt-1">Upload a photo below</p>
                      </>
                    ) : (
                      <>
                        <Search className="w-8 h-8 md:w-10 md:h-10 mb-2" />
                        <p className="text-sm">Search for a card</p>
                      </>
                    )}
                  </div>
                )}
              </div>

              {/* Upload custom photo */}
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={handleImageUpload}
                className="hidden"
              />
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-surface-hover border border-border rounded-xl text-sm text-text-secondary hover:text-text-primary hover:border-border-hover"
              >
                {customImagePreview ? (
                  <>
                    <CheckCircle2 className="w-4 h-4 text-success" />
                    Photo Uploaded
                  </>
                ) : (
                  <>
                    <Camera className="w-4 h-4" />
                    Upload Your Photo
                  </>
                )}
              </button>
              {customImagePreview && (
                <button
                  type="button"
                  onClick={() => {
                    setCustomImage(null);
                    setCustomImagePreview(null);
                  }}
                  className="w-full mt-2 text-xs text-text-muted hover:text-danger"
                >
                  Remove custom photo
                </button>
              )}

              {/* Selected info */}
              {selectedCard && !isManualSubmission && (
                <div className="mt-4 pt-4 border-t border-border space-y-2">
                  <h3 className="text-sm font-semibold text-text-primary">
                    {selectedCard.name}
                  </h3>
                  <p className="text-xs text-text-muted">
                    {selectedCard.setName}
                    {selectedCard.number ? ` #${selectedCard.number}` : ""}
                  </p>
                  {selectedCard.rarity && (
                    <p className="text-xs text-gold">{selectedCard.rarity}</p>
                  )}
                  {(() => {
                    const p = extractCardPrice(selectedCard as unknown as Record<string, unknown>);
                    return p ? (
                      <p className="text-sm font-bold text-text-primary">
                        Market: {formatCurrency(p)}
                      </p>
                    ) : null;
                  })()}
                </div>
              )}

              {/* Manual submission info */}
              {isManualSubmission && (
                <div className="mt-4 pt-4 border-t border-warning/30 space-y-2">
                  <div className="flex items-center gap-2">
                    <PenLine className="w-4 h-4 text-warning" />
                    <h3 className="text-sm font-semibold text-warning">
                      Manual Submission
                    </h3>
                  </div>
                  <p className="text-xs text-text-muted">
                    This asset was not found in the API. You&apos;ll need to manage the price manually.
                  </p>
                </div>
              )}
            </div>
          </div>

          {/* Right: Form */}
          <div className="lg:col-span-3">
            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Search button / Manual entry toggle */}
              {!isManualSubmission ? (
                <div>
                  <label className="block text-sm font-medium text-text-secondary mb-2">
                    Select Asset *
                  </label>
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => setSearchOpen(true)}
                      className="flex-1 flex items-center gap-3 px-4 py-4 bg-surface border border-border rounded-xl text-left hover:border-border-hover hover:bg-surface-hover"
                    >
                      <Search className="w-5 h-5 text-text-muted" />
                      <span
                        className={
                          selectedCard ? "text-text-primary" : "text-text-muted"
                        }
                      >
                        {selectedCard
                          ? selectedCard.name
                          : "Search for a card, product, or comic..."}
                      </span>
                    </button>
                    {selectedCard && (
                      <button
                        type="button"
                        onClick={clearSelection}
                        className="px-3 bg-surface border border-border rounded-xl hover:bg-surface-hover hover:border-border-hover"
                      >
                        <X className="w-4 h-4 text-text-muted" />
                      </button>
                    )}
                  </div>
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <label className="block text-sm font-medium text-text-secondary">
                      Manual Entry
                    </label>
                    <button
                      type="button"
                      onClick={clearSelection}
                      className="text-xs text-accent hover:text-accent-hover font-medium"
                    >
                      Switch to search
                    </button>
                  </div>

                  <div className="p-3 bg-warning/10 border border-warning/30 rounded-xl">
                    <div className="flex items-center gap-2 text-warning text-xs">
                      <AlertTriangle className="w-3.5 h-3.5 flex-shrink-0" />
                      Manual submission &mdash; prices won&apos;t auto-refresh from the API.
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-text-secondary mb-2">
                      Card / Product Name *
                    </label>
                    <input
                      type="text"
                      required
                      value={form.manualName}
                      onChange={(e) =>
                        setForm((f) => ({ ...f, manualName: e.target.value }))
                      }
                      className="w-full px-4 py-3 bg-surface border border-border rounded-xl text-text-primary placeholder-text-muted outline-none focus:border-accent text-sm"
                      placeholder="e.g. Charizard VMAX 074/073"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-text-secondary mb-2">
                      Set Name
                    </label>
                    <input
                      type="text"
                      value={form.manualSetName}
                      onChange={(e) =>
                        setForm((f) => ({ ...f, manualSetName: e.target.value }))
                      }
                      className="w-full px-4 py-3 bg-surface border border-border rounded-xl text-text-primary placeholder-text-muted outline-none focus:border-accent text-sm"
                      placeholder="e.g. Champion's Path"
                    />
                  </div>
                </div>
              )}

              {/* Asset type */}
              <div>
                <label className="block text-sm font-medium text-text-secondary mb-2">
                  Asset Type
                </label>
                <div className="grid grid-cols-3 gap-3">
                  {([
                    { value: "card", label: "Trading Card" },
                    { value: "sealed", label: "Sealed Product" },
                    { value: "comic", label: "Comic Book" },
                  ] as const).map((type) => (
                    <button
                      key={type.value}
                      type="button"
                      onClick={() =>
                        setForm((f) => ({
                          ...f,
                          assetType: type.value,
                          psaGrade: "",
                        }))
                      }
                      className={`px-4 py-3 rounded-xl border text-sm font-medium ${
                        form.assetType === type.value
                          ? "bg-accent-muted border-accent text-accent-hover"
                          : "bg-surface border-border text-text-secondary hover:border-border-hover"
                      }`}
                    >
                      {type.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Grade selector - show for cards and comics */}
              {(form.assetType === "card" || form.assetType === "comic") && (
                <div>
                  <label className="block text-sm font-medium text-text-secondary mb-2">
                    {form.assetType === "comic" ? "CGC / CBCS Grading" : "PSA / Grading"}
                  </label>
                  <select
                    value={form.psaGrade}
                    onChange={(e) =>
                      setForm((f) => ({ ...f, psaGrade: e.target.value }))
                    }
                    className="w-full px-4 py-3 bg-surface border border-border rounded-xl text-text-primary outline-none focus:border-accent text-sm"
                  >
                    {(form.assetType === "comic" ? CGC_COMIC_GRADES : PSA_GRADES).map((grade) => (
                      <option key={grade.value} value={grade.value}>
                        {grade.label}
                      </option>
                    ))}
                  </select>
                  {form.psaGrade && (
                    <p className="text-xs text-gold mt-1.5">
                      Graded: {form.psaGrade}
                    </p>
                  )}
                </div>
              )}

              {/* PriceCharting Tether - show for manual submissions, graded API cards, or comics */}
              {(isManualSubmission || (selectedCard && form.psaGrade) || form.assetType === "comic") && (
                <div className="bg-surface-hover border border-border rounded-xl p-4">
                  <div className="flex items-center gap-2 mb-3">
                    <Link2 className="w-4 h-4 text-accent" />
                    <span className="text-sm font-medium text-text-primary">
                      Tether to PriceCharting
                    </span>
                  </div>
                  <p className="text-xs text-text-muted mb-3">
                    Link this asset to a PriceCharting listing for automatic price updates from eBay sold data.
                  </p>

                  {/* Search input */}
                  <div className="flex gap-2 mb-3">
                    <input
                      type="text"
                      value={tetherSearchQuery}
                      onChange={(e) => setTetherSearchQuery(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") {
                          e.preventDefault();
                          searchTether(tetherSearchQuery);
                        }
                      }}
                      className="flex-1 px-3 py-2 bg-surface border border-border rounded-lg text-text-primary placeholder-text-muted outline-none focus:border-accent text-sm"
                      placeholder="Search PriceCharting..."
                    />
                    <button
                      type="button"
                      onClick={() => searchTether(tetherSearchQuery)}
                      disabled={tetherLoading || !tetherSearchQuery.trim()}
                      className="px-3 py-2 bg-accent hover:bg-accent-hover disabled:opacity-50 text-black rounded-lg text-sm font-medium flex items-center gap-1.5"
                    >
                      {tetherLoading ? (
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      ) : (
                        <Search className="w-3.5 h-3.5" />
                      )}
                      Search
                    </button>
                  </div>

                  {/* Results */}
                  {tetherLoading && (
                    <div className="flex items-center gap-2 text-xs text-text-muted py-2">
                      <Loader2 className="w-3 h-3 animate-spin" />
                      Searching PriceCharting…
                    </div>
                  )}

                  {!tetherLoading && tetherCandidates.length > 0 && (
                    <div className="space-y-2">
                      <p className="text-xs font-medium text-text-secondary">
                        Select a listing to tether:
                      </p>
                      <div className="max-h-64 overflow-y-auto space-y-1 border border-border rounded-xl p-2 bg-surface">
                        {tetherCandidates.map((candidate) => {
                          const isSelected = selectedTether?.id === candidate.id;
                          const field = getTetherGradeField();
                          const relevantPrice = candidate.prices[field as keyof typeof candidate.prices];
                          return (
                            <button
                              key={candidate.id}
                              type="button"
                              onClick={() => handleTetherSelect(candidate)}
                              className={`w-full flex items-center gap-3 p-2 rounded-lg text-left transition-colors ${
                                isSelected
                                  ? "bg-accent-muted border border-accent"
                                  : "hover:bg-surface-hover border border-transparent"
                              }`}
                            >
                              {candidate.imageUrl && (
                                <div className="w-10 h-14 bg-background rounded-md overflow-hidden flex-shrink-0 relative">
                                  <Image
                                    src={candidate.imageUrl}
                                    alt={candidate.name}
                                    fill
                                    className="object-contain p-0.5"
                                    sizes="40px"
                                    unoptimized
                                  />
                                </div>
                              )}
                              <div className="flex-1 min-w-0">
                                <p className="text-xs font-semibold text-text-primary truncate">
                                  {candidate.name}
                                </p>
                                <p className="text-[10px] text-text-muted truncate">
                                  {candidate.setName}
                                </p>
                                <div className="flex gap-3 mt-1 flex-wrap">
                                  {candidate.prices.ungraded != null && (
                                    <span className="text-[10px] text-text-muted">
                                      Raw: {formatCurrency(candidate.prices.ungraded)}
                                    </span>
                                  )}
                                  {relevantPrice != null && field !== "ungraded" && (
                                    <span className="text-[10px] text-amber-400">
                                      {form.psaGrade || "Selected"}: {formatCurrency(relevantPrice)}
                                    </span>
                                  )}
                                </div>
                              </div>
                              {isSelected && (
                                <CheckCircle2 className="w-4 h-4 text-accent flex-shrink-0" />
                              )}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  {/* Selected tether summary */}
                  {selectedTether && (
                    <div className="mt-3 bg-accent-muted/30 border border-accent/30 rounded-xl p-3">
                      <div className="flex items-center gap-2 mb-1">
                        <Link2 className="w-3.5 h-3.5 text-accent" />
                        <p className="text-xs font-medium text-accent-hover">
                          Tethered to: {selectedTether.name}
                        </p>
                      </div>
                      <div className="flex gap-3 flex-wrap">
                        {form.assetType === "comic" ? (
                          <>
                            {selectedTether.prices.ungraded != null && (
                              <span className="text-xs text-text-muted">
                                Ungraded: {formatCurrency(selectedTether.prices.ungraded)}
                              </span>
                            )}
                            {selectedTether.prices.vg4 != null && (
                              <span className="text-xs text-text-secondary">
                                4.0 VG: {formatCurrency(selectedTether.prices.vg4)}
                              </span>
                            )}
                            {selectedTether.prices.fine6 != null && (
                              <span className="text-xs text-text-secondary">
                                6.0 Fine: {formatCurrency(selectedTether.prices.fine6)}
                              </span>
                            )}
                            {selectedTether.prices.vf8 != null && (
                              <span className="text-xs text-amber-400/70">
                                8.0 VF: {formatCurrency(selectedTether.prices.vf8)}
                              </span>
                            )}
                            {selectedTether.prices.nm92 != null && (
                              <span className="text-xs text-amber-400/80">
                                9.2 NM-: {formatCurrency(selectedTether.prices.nm92)}
                              </span>
                            )}
                            {selectedTether.prices.nm98 != null && (
                              <span className="text-xs text-amber-400">
                                9.8: {formatCurrency(selectedTether.prices.nm98)}
                              </span>
                            )}
                          </>
                        ) : (
                          <>
                            {selectedTether.prices.ungraded != null && (
                              <span className="text-xs text-text-muted">
                                Raw: {formatCurrency(selectedTether.prices.ungraded)}
                              </span>
                            )}
                            {selectedTether.prices.grade7 != null && (
                              <span className="text-xs text-text-secondary">
                                Grade 7: {formatCurrency(selectedTether.prices.grade7)}
                              </span>
                            )}
                            {selectedTether.prices.grade8 != null && (
                              <span className="text-xs text-text-secondary">
                                Grade 8: {formatCurrency(selectedTether.prices.grade8)}
                              </span>
                            )}
                            {selectedTether.prices.grade9 != null && (
                              <span className="text-xs text-amber-400/70">
                                Grade 9: {formatCurrency(selectedTether.prices.grade9)}
                              </span>
                            )}
                            {selectedTether.prices.grade95 != null && (
                              <span className="text-xs text-amber-400/80">
                                Grade 9.5: {formatCurrency(selectedTether.prices.grade95)}
                              </span>
                            )}
                            {selectedTether.prices.psa10 != null && (
                              <span className="text-xs text-amber-400">
                                PSA 10: {formatCurrency(selectedTether.prices.psa10)}
                              </span>
                            )}
                          </>
                        )}
                      </div>
                      <p className="text-[10px] text-text-muted mt-1">
                        Prices from PriceCharting (eBay sold data, USD) · Price will auto-refresh daily
                      </p>
                      <button
                        type="button"
                        onClick={() => {
                          setSelectedTether(null);
                          setTetherCandidates([]);
                        }}
                        className="text-[10px] text-danger hover:text-danger mt-1"
                      >
                        Remove tether
                      </button>
                    </div>
                  )}
                </div>
              )}

              {/* Language */}
              <div>
                <label className="block text-sm font-medium text-text-secondary mb-2">
                  Language
                </label>
                <select
                  value={form.language}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, language: e.target.value }))
                  }
                  className="w-full px-4 py-3 bg-surface border border-border rounded-xl text-text-primary outline-none focus:border-accent text-sm"
                >
                  {LANGUAGES.map((lang) => (
                    <option key={lang} value={lang}>
                      {lang}
                    </option>
                  ))}
                </select>
              </div>

              {/* Quantity */}
              <div>
                <label className="block text-sm font-medium text-text-secondary mb-2">
                  Quantity
                </label>
                <input
                  type="number"
                  min="1"
                  value={form.quantity}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, quantity: e.target.value }))
                  }
                  className="w-full px-4 py-3 bg-surface border border-border rounded-xl text-text-primary outline-none focus:border-accent text-sm"
                />
              </div>

              {/* Purchase details */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-text-secondary mb-2">
                    Purchase Price (per unit) *
                  </label>
                  <div className="relative">
                    <span className="absolute left-4 top-1/2 -translate-y-1/2 text-text-muted">
                      $
                    </span>
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      required
                      value={form.purchasePrice}
                      onChange={(e) =>
                        setForm((f) => ({
                          ...f,
                          purchasePrice: e.target.value,
                        }))
                      }
                      className="w-full pl-8 pr-4 py-3 bg-surface border border-border rounded-xl text-text-primary placeholder-text-muted outline-none focus:border-accent text-sm"
                      placeholder="0.00"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-text-secondary mb-2">
                    Purchase Date *
                  </label>
                  <input
                    type="date"
                    required
                    value={form.purchaseDate}
                    onChange={(e) =>
                      setForm((f) => ({ ...f, purchaseDate: e.target.value }))
                    }
                    className="w-full px-4 py-3 bg-surface border border-border rounded-xl text-text-primary outline-none focus:border-accent text-sm"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-text-secondary mb-2">
                  Where Did You Buy It?
                </label>
                <input
                  type="text"
                  value={form.purchaseLocation}
                  onChange={(e) =>
                    setForm((f) => ({
                      ...f,
                      purchaseLocation: e.target.value,
                    }))
                  }
                  className="w-full px-4 py-3 bg-surface border border-border rounded-xl text-text-primary placeholder-text-muted outline-none focus:border-accent text-sm"
                  placeholder="e.g. eBay, LCS, TCGPlayer..."
                />
              </div>

              {/* Physical Storage Location */}
              <div>
                <label className="block text-sm font-medium text-text-secondary mb-2">
                  Physical Location
                </label>
                <input
                  type="text"
                  value={form.storageLocation}
                  onChange={(e) =>
                    setForm((f) => ({
                      ...f,
                      storageLocation: e.target.value,
                    }))
                  }
                  className="w-full px-4 py-3 bg-surface border border-border rounded-xl text-text-primary placeholder-text-muted outline-none focus:border-accent text-sm"
                  placeholder="e.g. Binder A, Safe, Display Case..."
                />
                <p className="text-xs text-text-muted mt-1">
                  Where the physical card or product is stored
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium text-text-secondary mb-2">
                  Condition
                </label>
                <select
                  value={form.condition}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, condition: e.target.value }))
                  }
                  className="w-full px-4 py-3 bg-surface border border-border rounded-xl text-text-primary outline-none focus:border-accent text-sm"
                >
                  <option value="Gem Mint">Gem Mint</option>
                  <option value="Mint">Mint</option>
                  <option value="Near Mint">Near Mint</option>
                  <option value="Lightly Played">Lightly Played</option>
                  <option value="Moderately Played">Moderately Played</option>
                  <option value="Heavily Played">Heavily Played</option>
                  <option value="Damaged">Damaged</option>
                  <option value="Sealed">Sealed</option>
                </select>
              </div>

              {/* Manual Price Toggle - not shown for manual submissions (always manual) */}
              {!isManualSubmission && (
                <div className="bg-surface-hover border border-border rounded-xl p-4">
                  <label className="flex items-center gap-3 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={form.manualPrice}
                      onChange={(e) =>
                        setForm((f) => ({ ...f, manualPrice: e.target.checked }))
                      }
                      className="w-4 h-4 accent-gold rounded"
                    />
                    <div>
                      <span className="text-sm font-medium text-text-primary">
                        Manually enter market price
                      </span>
                      <p className="text-xs text-text-muted mt-0.5">
                        Override the API price. You will manage this value yourself.
                      </p>
                    </div>
                  </label>
                  {form.manualPrice && (
                    <div className="mt-3">
                      <div className="flex items-center gap-2 mb-2">
                        <AlertTriangle className="w-4 h-4 text-warning" />
                        <span className="text-xs text-warning">
                          This price will not auto-refresh. You&apos;ll be warned if not updated in 7 days.
                        </span>
                      </div>
                      <div className="relative">
                        <span className="absolute left-4 top-1/2 -translate-y-1/2 text-text-muted">
                          $
                        </span>
                        <input
                          type="number"
                          step="0.01"
                          min="0"
                          value={form.manualPriceValue}
                          onChange={(e) =>
                            setForm((f) => ({
                              ...f,
                              manualPriceValue: e.target.value,
                            }))
                          }
                          className="w-full pl-8 pr-4 py-3 bg-surface border border-border rounded-xl text-text-primary placeholder-text-muted outline-none focus:border-accent text-sm"
                          placeholder="Enter current market value..."
                        />
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Manual price for manual submissions */}
              {isManualSubmission && (
                <div className="bg-warning/5 border border-warning/20 rounded-xl p-4">
                  <label className="block text-sm font-medium text-text-secondary mb-2">
                    Current Market Price
                  </label>
                  <p className="text-xs text-text-muted mb-3">
                    Since this is a manual submission, enter the current market value.
                    You&apos;ll be reminded to update it every 7 days.
                  </p>
                  <div className="relative">
                    <span className="absolute left-4 top-1/2 -translate-y-1/2 text-text-muted">
                      $
                    </span>
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      value={form.manualPriceValue}
                      onChange={(e) =>
                        setForm((f) => ({
                          ...f,
                          manualPriceValue: e.target.value,
                        }))
                      }
                      className="w-full pl-8 pr-4 py-3 bg-surface border border-border rounded-xl text-text-primary placeholder-text-muted outline-none focus:border-accent text-sm"
                      placeholder="Enter current market value..."
                    />
                  </div>
                </div>
              )}

              <div>
                <label className="block text-sm font-medium text-text-secondary mb-2">
                  Notes
                </label>
                <textarea
                  value={form.notes}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, notes: e.target.value }))
                  }
                  rows={3}
                  className="w-full px-4 py-3 bg-surface border border-border rounded-xl text-text-primary placeholder-text-muted outline-none focus:border-accent text-sm resize-none"
                  placeholder="Any additional notes about this asset..."
                />
              </div>

              {!currentPortfolio && !portfolioLoading && (
                <div className="p-4 bg-warning/10 border border-warning/30 rounded-xl">
                  <div className="flex items-center gap-2 text-warning text-sm mb-3">
                    <AlertTriangle className="w-4 h-4 flex-shrink-0" />
                    No portfolio selected.
                  </div>
                  {portfolios.length > 0 ? (
                    <select
                      onChange={(e) => {
                        const p = portfolios.find((p) => p.id === e.target.value);
                        if (p) setCurrentPortfolio(p);
                      }}
                      className="w-full px-4 py-3 bg-surface border border-border rounded-xl text-text-primary outline-none focus:border-accent text-sm"
                      defaultValue=""
                    >
                      <option value="" disabled>Select a portfolio...</option>
                      {portfolios.map((p) => (
                        <option key={p.id} value={p.id}>{p.name}</option>
                      ))}
                    </select>
                  ) : (
                    <p className="text-sm text-text-muted">
                      No portfolios found. Please create one first.
                    </p>
                  )}
                </div>
              )}

              <button
                type="submit"
                disabled={!canSubmit || submitting}
                className="w-full py-4 bg-accent hover:bg-accent-hover disabled:opacity-50 disabled:cursor-not-allowed text-black font-semibold rounded-xl flex items-center justify-center gap-2"
              >
                {submitting ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin" />
                    Adding Asset...
                  </>
                ) : (
                  <>
                    <Upload className="w-5 h-5" />
                    Add to Collection
                  </>
                )}
              </button>
            </form>
          </div>
        </div>
      </div>
    </>
  );
}
