"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { Store, Upload, X, Loader2 } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { fixStorageUrl } from "@/lib/format";

export default function BecomeVendorPage() {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [shopName, setShopName] = useState("");
  const [description, setDescription] = useState("");
  const [websiteUrl, setWebsiteUrl] = useState("");
  const [ebayUrl, setEbayUrl] = useState("");
  const [whatsappNumber, setWhatsappNumber] = useState("");
  const [shopImageUrl, setShopImageUrl] = useState<string | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);

  useEffect(() => {
    // If already a vendor, pre-fill the form
    fetch("/api/vendors/me")
      .then((r) => r.json())
      .then((vendor) => {
        if (vendor) {
          setShopName(vendor.shop_name || "");
          setDescription(vendor.description || "");
          setWebsiteUrl(vendor.website_url || "");
          setEbayUrl(vendor.ebay_url || "");
          setWhatsappNumber(vendor.whatsapp_number || "");
          setShopImageUrl(vendor.shop_image_url || null);
          setImagePreview(fixStorageUrl(vendor.shop_image_url));
        }
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  async function handleImageSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) {
      setError("Image must be under 5MB");
      return;
    }

    setUploading(true);
    setError(null);

    const ext = file.name.split(".").pop() || "jpg";
    const fileName = `vendor-${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;

    const { error: uploadError } = await supabase.storage
      .from("asset-images")
      .upload(fileName, file);

    if (uploadError) {
      setError("Failed to upload image");
      setUploading(false);
      return;
    }

    const { data: { publicUrl } } = supabase.storage.from("asset-images").getPublicUrl(fileName);
    const fixed = fixStorageUrl(publicUrl) || publicUrl;
    setShopImageUrl(fixed);
    setImagePreview(fixed);
    setUploading(false);
  }

  function removeImage() {
    setShopImageUrl(null);
    setImagePreview(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!shopName.trim()) {
      setError("Shop name is required");
      return;
    }

    setSaving(true);
    setError(null);

    const res = await fetch("/api/vendors", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        shop_name: shopName,
        description,
        shop_image_url: shopImageUrl,
        website_url: websiteUrl,
        ebay_url: ebayUrl,
        whatsapp_number: whatsappNumber,
      }),
    });

    if (!res.ok) {
      const data = await res.json();
      setError(data.error || "Failed to save profile");
      setSaving(false);
      return;
    }

    router.push("/marketplace/my-shop");
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="w-6 h-6 animate-spin text-text-muted" />
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-text-primary flex items-center gap-2">
          <Store className="w-6 h-6" />
          Set Up Your Shop
        </h1>
        <p className="text-sm text-text-muted mt-1">
          Create your vendor profile so buyers can find and contact you.
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-5">
        {/* Shop image */}
        <div>
          <label className="block text-sm font-medium text-text-primary mb-2">Shop Image</label>
          {imagePreview ? (
            <div className="relative w-full aspect-[3/1] rounded-xl overflow-hidden border border-border bg-background">
              <Image src={imagePreview} alt="Shop" fill className="object-cover" />
              <button
                type="button"
                onClick={removeImage}
                className="absolute top-2 right-2 p-1 bg-black/60 rounded-full text-white hover:bg-black/80"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          ) : (
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              disabled={uploading}
              className="w-full flex flex-col items-center justify-center gap-2 py-8 border-2 border-dashed border-border rounded-xl text-text-muted hover:border-accent hover:text-accent transition-colors"
            >
              {uploading ? (
                <Loader2 className="w-6 h-6 animate-spin" />
              ) : (
                <>
                  <Upload className="w-6 h-6" />
                  <span className="text-sm">Upload shop banner (optional, max 5MB)</span>
                </>
              )}
            </button>
          )}
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={handleImageSelect}
          />
        </div>

        {/* Shop name */}
        <div>
          <label className="block text-sm font-medium text-text-primary mb-1.5">
            Shop Name <span className="text-danger">*</span>
          </label>
          <input
            type="text"
            value={shopName}
            onChange={(e) => setShopName(e.target.value)}
            placeholder="e.g. Pikachu's Paradise"
            required
            className="w-full px-4 py-2.5 bg-surface border border-border rounded-xl text-sm text-text-primary placeholder:text-text-muted focus:outline-none focus:border-accent"
          />
        </div>

        {/* Description */}
        <div>
          <label className="block text-sm font-medium text-text-primary mb-1.5">Description</label>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Tell buyers about your shop, what you specialise in, etc."
            rows={3}
            className="w-full px-4 py-2.5 bg-surface border border-border rounded-xl text-sm text-text-primary placeholder:text-text-muted focus:outline-none focus:border-accent resize-none"
          />
        </div>

        {/* Contact links */}
        <div className="space-y-3">
          <p className="text-sm font-medium text-text-primary">Contact &amp; Links</p>

          <div>
            <label className="block text-xs text-text-muted mb-1">Website URL</label>
            <input
              type="url"
              value={websiteUrl}
              onChange={(e) => setWebsiteUrl(e.target.value)}
              placeholder="https://yourwebsite.com"
              className="w-full px-4 py-2.5 bg-surface border border-border rounded-xl text-sm text-text-primary placeholder:text-text-muted focus:outline-none focus:border-accent"
            />
          </div>

          <div>
            <label className="block text-xs text-text-muted mb-1">eBay Store URL</label>
            <input
              type="url"
              value={ebayUrl}
              onChange={(e) => setEbayUrl(e.target.value)}
              placeholder="https://ebay.com/usr/yourusername"
              className="w-full px-4 py-2.5 bg-surface border border-border rounded-xl text-sm text-text-primary placeholder:text-text-muted focus:outline-none focus:border-accent"
            />
          </div>

          <div>
            <label className="block text-xs text-text-muted mb-1">WhatsApp Number</label>
            <input
              type="tel"
              value={whatsappNumber}
              onChange={(e) => setWhatsappNumber(e.target.value)}
              placeholder="447911123456 (include country code, digits only)"
              className="w-full px-4 py-2.5 bg-surface border border-border rounded-xl text-sm text-text-primary placeholder:text-text-muted focus:outline-none focus:border-accent"
            />
          </div>
        </div>

        {error && (
          <p className="text-sm text-danger bg-danger/10 px-4 py-2.5 rounded-xl">{error}</p>
        )}

        <div className="flex gap-3 pt-2">
          <button
            type="button"
            onClick={() => router.push("/marketplace")}
            className="flex-1 px-4 py-2.5 border border-border rounded-xl text-sm font-medium text-text-secondary hover:bg-surface-hover transition-colors"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={saving || uploading}
            className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 bg-accent text-black rounded-xl text-sm font-semibold hover:bg-accent-hover transition-colors disabled:opacity-60"
          >
            {saving && <Loader2 className="w-4 h-4 animate-spin" />}
            {saving ? "Saving…" : "Save Shop"}
          </button>
        </div>
      </form>
    </div>
  );
}
