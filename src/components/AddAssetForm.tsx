"use client";

import { useState, useRef } from "react";
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
} from "lucide-react";
import { formatCurrency, extractCardPrice } from "@/lib/format";
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

export default function AddAssetForm() {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { currentPortfolio, portfolios, setCurrentPortfolio, loading: portfolioLoading, isReadOnly } = usePortfolio();

  const [searchOpen, setSearchOpen] = useState(false);
  const [selectedCard, setSelectedCard] = useState<SelectedCard | null>(null);
  const [customImage, setCustomImage] = useState<File | null>(null);
  const [customImagePreview, setCustomImagePreview] = useState<string | null>(
    null
  );
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);

  const [form, setForm] = useState({
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
  });

  const handleCardSelect = (card: SelectedCard) => {
    setSelectedCard(card);
    setSearchOpen(false);
    const price = card.marketPrice || extractCardPrice(card as unknown as Record<string, unknown>);
    if (price && !form.purchasePrice) {
      setForm((f) => ({ ...f, purchasePrice: price.toFixed(2) }));
    }
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
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedCard || !currentPortfolio) return;

    setSubmitting(true);
    try {
      let customImageUrl: string | null = null;

      if (customImage) {
        const ext = customImage.name.split(".").pop();
        const fileName = `${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;
        const { error: uploadError } = await supabase.storage
          .from("asset-images")
          .upload(fileName, customImage);

        if (!uploadError) {
          const {
            data: { publicUrl },
          } = supabase.storage.from("asset-images").getPublicUrl(fileName);
          customImageUrl = publicUrl;
        }
      }

      const currentPrice = form.manualPrice && form.manualPriceValue
        ? parseFloat(form.manualPriceValue)
        : extractCardPrice(selectedCard as unknown as Record<string, unknown>);

      const res = await fetch("/api/assets", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          portfolio_id: currentPortfolio.id,
          external_id: selectedCard.id,
          name: selectedCard.name,
          set_name: selectedCard.setName || "",
          asset_type: selectedCard.type === "sealed" ? "sealed" : form.assetType,
          image_url: selectedCard.imageUrl || null,
          custom_image_url: customImageUrl,
          purchase_price: form.purchasePrice,
          purchase_date: form.purchaseDate,
          purchase_location: form.purchaseLocation,
          condition: form.condition,
          notes: form.notes || null,
          current_price: currentPrice,
          rarity: selectedCard.rarity || null,
          card_number: selectedCard.number || null,
          psa_grade: form.psaGrade || null,
          manual_price: form.manualPrice,
          quantity: form.quantity,
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
                    alt={selectedCard?.name || "Card preview"}
                    fill
                    className="object-contain p-3 md:p-4"
                    sizes="(max-width: 768px) 220px, 300px"
                  />
                ) : (
                  <div className="w-full h-full flex flex-col items-center justify-center text-text-muted">
                    <Search className="w-8 h-8 md:w-10 md:h-10 mb-2" />
                    <p className="text-sm">Search for a card</p>
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
              {selectedCard && (
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
            </div>
          </div>

          {/* Right: Form */}
          <div className="lg:col-span-3">
            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Search button */}
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
                      onClick={() => setSelectedCard(null)}
                      className="px-3 bg-surface border border-border rounded-xl hover:bg-surface-hover hover:border-border-hover"
                    >
                      <X className="w-4 h-4 text-text-muted" />
                    </button>
                  )}
                </div>
              </div>

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
                  {form.psaGrade && (
                    <p className="text-xs text-gold mt-1.5">
                      Graded: {form.psaGrade}
                    </p>
                  )}
                </div>
              )}

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

              {/* Manual Price Toggle */}
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
                disabled={!selectedCard || !form.purchasePrice || !currentPortfolio || submitting}
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
