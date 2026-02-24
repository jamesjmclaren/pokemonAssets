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
  type: "card" | "sealed";
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

  interface GradedCandidate {
    id: string;
    name: string;
    setName: string;
    url?: string;
    imageUrl?: string;
    currency: string;
    prices: {
      raw?: number;
      psa10?: number;
      psa9?: number;
      grade95?: number;
      grade8?: number;
      grade7?: number;
      cgc10?: number;
      bgs10?: number;
    };
  }

  const [gradedCandidates, setGradedCandidates] = useState<GradedCandidate[]>([]);
  const [selectedGradedCard, setSelectedGradedCard] = useState<GradedCandidate | null>(null);
  const [gradedPriceLoading, setGradedPriceLoading] = useState(false);

  const [form, setForm] = useState({
    manualName: "",
    manualSetName: "",
    purchasePrice: "",
    purchaseDate: new Date().toISOString().split("T")[0],
    purchaseLocation: "",
    condition: "Near Mint",
    assetType: "card" as "card" | "sealed",
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
    if (price && !form.purchasePrice) {
      setForm((f) => ({ ...f, purchasePrice: price.toFixed(2) }));
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

  // Fetch graded price candidates from RapidAPI
  const fetchGradedCandidates = useCallback(async (cardName: string) => {
    if (!cardName) return;
    setGradedPriceLoading(true);
    setSelectedGradedCard(null);
    try {
      const res = await fetch(
        `/api/graded-price?q=${encodeURIComponent(cardName)}`
      );
      if (!res.ok) throw new Error("Failed to fetch graded prices");
      const data = await res.json();
      setGradedCandidates(data.candidates || []);
    } catch (error) {
      console.error("Failed to fetch graded prices:", error);
      setGradedCandidates([]);
    } finally {
      setGradedPriceLoading(false);
    }
  }, []);

  // When user picks a graded card candidate, populate the price
  const handleGradedCardSelect = useCallback((candidate: GradedCandidate) => {
    setSelectedGradedCard(candidate);
    const g = form.psaGrade.toLowerCase();
    let price: number | undefined;

    // Match grade to PriceCharting fields
    if (g.includes("10")) price = candidate.prices.psa10; // PSA 10, CGC 10, BGS 10
    else if (g.includes("9.5")) price = candidate.prices.grade95;
    else if (g.includes("9")) price = candidate.prices.psa9; // PSA 9, CGC 9, BGS 9
    else if (g.includes("8")) price = candidate.prices.grade8;
    else if (g.includes("7")) price = candidate.prices.grade7;
    else price = candidate.prices.psa9; // fallback to grade 9

    if (price != null) {
      setForm((f) => ({
        ...f,
        manualPrice: true,
        manualPriceValue: price.toFixed(2),
      }));
    }
  }, [form.psaGrade]);

  // Trigger graded candidate fetch when grade is selected + card exists
  useEffect(() => {
    if (form.psaGrade && selectedCard && !isManualSubmission) {
      fetchGradedCandidates(selectedCard.name);
    } else if (!form.psaGrade) {
      setGradedCandidates([]);
      setSelectedGradedCard(null);
    }
  }, [form.psaGrade, selectedCard, isManualSubmission, fetchGradedCandidates]);

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
  };

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

      // Determine current market price:
      // 1. Graded card with PriceCharting selection → use graded price
      // 2. Manual price override → use manual value
      // 3. Default → extract raw price from selected card
      const hasGradedPrice = !!selectedGradedCard && !!form.psaGrade;
      let currentPrice: number | null = null;

      if (hasGradedPrice) {
        // Use the graded price from PriceCharting
        const g = form.psaGrade.toLowerCase();
        const p = selectedGradedCard!.prices;
        if (g.includes("10")) currentPrice = p.psa10 ?? null;
        else if (g.includes("9.5")) currentPrice = p.grade95 ?? null;
        else if (g.includes("9")) currentPrice = p.psa9 ?? null;
        else if (g.includes("8")) currentPrice = p.grade8 ?? null;
        else if (g.includes("7")) currentPrice = p.grade7 ?? null;
        else currentPrice = p.psa9 ?? null;
      } else if (form.manualPrice && form.manualPriceValue) {
        currentPrice = parseFloat(form.manualPriceValue);
      } else if (selectedCard) {
        currentPrice = extractCardPrice(selectedCard as unknown as Record<string, unknown>);
      }

      // Graded cards with PriceCharting prices should NOT be marked manual
      // so the refresh route can auto-update them
      const isManualPrice = hasGradedPrice
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
                          : "Search for a card or product..."}
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
                <div className="grid grid-cols-2 gap-3">
                  {["card", "sealed"].map((type) => (
                    <button
                      key={type}
                      type="button"
                      onClick={() =>
                        setForm((f) => ({
                          ...f,
                          assetType: type as "card" | "sealed",
                        }))
                      }
                      className={`px-4 py-3 rounded-xl border text-sm font-medium capitalize ${
                        form.assetType === type
                          ? "bg-accent-muted border-accent text-accent-hover"
                          : "bg-surface border-border text-text-secondary hover:border-border-hover"
                      }`}
                    >
                      {type === "card" ? "Trading Card" : "Sealed Product"}
                    </button>
                  ))}
                </div>
              </div>

              {/* PSA Grade selector - always show for cards */}
              {form.assetType === "card" && (
                <div>
                  <label className="block text-sm font-medium text-text-secondary mb-2">
                    PSA / Grading
                  </label>
                  <select
                    value={form.psaGrade}
                    onChange={(e) =>
                      setForm((f) => ({ ...f, psaGrade: e.target.value }))
                    }
                    className="w-full px-4 py-3 bg-surface border border-border rounded-xl text-text-primary outline-none focus:border-accent text-sm"
                  >
                    {PSA_GRADES.map((grade) => (
                      <option key={grade.value} value={grade.value}>
                        {grade.label}
                      </option>
                    ))}
                  </select>

                  {/* Graded card picker */}
                  {form.psaGrade && selectedCard && !isManualSubmission && (
                    <div className="mt-3">
                      {gradedPriceLoading ? (
                        <div className="flex items-center gap-2 text-xs text-text-muted py-2">
                          <Loader2 className="w-3 h-3 animate-spin" />
                          Searching for graded prices…
                        </div>
                      ) : gradedCandidates.length > 0 ? (
                        <div className="space-y-2">
                          <p className="text-xs font-medium text-text-secondary">
                            Select the correct card for graded pricing:
                          </p>
                          <div className="max-h-64 overflow-y-auto space-y-1 border border-border rounded-xl p-2 bg-surface">
                            {gradedCandidates.map((candidate) => {
                              const isSelected = selectedGradedCard?.id === candidate.id;
                              const hasGraded = candidate.prices.psa10 || candidate.prices.psa9;
                              return (
                                <button
                                  key={candidate.id}
                                  type="button"
                                  onClick={() => handleGradedCardSelect(candidate)}
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
                                    {hasGraded ? (
                                      <div className="flex gap-3 mt-1 flex-wrap">
                                        {candidate.prices.raw != null && (
                                          <span className="text-[10px] text-text-muted">
                                            Ungraded: {formatCurrency(candidate.prices.raw)}
                                          </span>
                                        )}
                                        {candidate.prices.psa9 != null && (
                                          <span className="text-[10px] text-amber-400/70">
                                            Grade 9: {formatCurrency(candidate.prices.psa9)}
                                          </span>
                                        )}
                                        {candidate.prices.psa10 != null && (
                                          <span className="text-[10px] text-amber-400">
                                            PSA 10: {formatCurrency(candidate.prices.psa10)}
                                          </span>
                                        )}
                                      </div>
                                    ) : (
                                      <p className="text-[10px] text-text-muted mt-0.5">
                                        No graded data
                                      </p>
                                    )}
                                  </div>
                                  {isSelected && (
                                    <CheckCircle2 className="w-4 h-4 text-accent flex-shrink-0" />
                                  )}
                                </button>
                              );
                            })}
                          </div>

                          {/* Selected card price summary */}
                          {selectedGradedCard && (
                            <div className="bg-accent-muted/30 border border-accent/30 rounded-xl p-3">
                              <p className="text-xs font-medium text-accent-hover mb-1">
                                {form.psaGrade} price for {selectedGradedCard.name}
                              </p>
                              <div className="flex gap-3 flex-wrap">
                                {selectedGradedCard.prices.raw != null && (
                                  <span className="text-xs text-text-muted">
                                    Ungraded: {formatCurrency(selectedGradedCard.prices.raw)}
                                  </span>
                                )}
                                {selectedGradedCard.prices.grade7 != null && (
                                  <span className="text-xs text-text-secondary">
                                    Grade 7: {formatCurrency(selectedGradedCard.prices.grade7)}
                                  </span>
                                )}
                                {selectedGradedCard.prices.grade8 != null && (
                                  <span className="text-xs text-text-secondary">
                                    Grade 8: {formatCurrency(selectedGradedCard.prices.grade8)}
                                  </span>
                                )}
                                {selectedGradedCard.prices.psa9 != null && (
                                  <span className="text-xs text-amber-400/70">
                                    Grade 9: {formatCurrency(selectedGradedCard.prices.psa9)}
                                  </span>
                                )}
                                {selectedGradedCard.prices.grade95 != null && (
                                  <span className="text-xs text-amber-400/80">
                                    Grade 9.5: {formatCurrency(selectedGradedCard.prices.grade95)}
                                  </span>
                                )}
                                {selectedGradedCard.prices.psa10 != null && (
                                  <span className="text-xs text-amber-400">
                                    PSA 10: {formatCurrency(selectedGradedCard.prices.psa10)}
                                  </span>
                                )}
                              </div>
                              <p className="text-[10px] text-text-muted mt-1">
                                Prices from PriceCharting (eBay sold data, USD)
                              </p>
                            </div>
                          )}
                        </div>
                      ) : (
                        <p className="text-xs text-text-muted">
                          No graded price results found for this card.
                        </p>
                      )}
                    </div>
                  )}

                  {form.psaGrade && (isManualSubmission || !selectedCard) && (
                    <p className="text-xs text-gold mt-1.5">
                      Graded: {form.psaGrade}
                    </p>
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
                          This price will not auto-refresh. You&apos;ll be warned if not updated in 30 days.
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
                    You&apos;ll be reminded to update it every 30 days.
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
