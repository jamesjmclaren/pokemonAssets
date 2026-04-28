"use client";

import { useState, useEffect, useCallback } from "react";
import Image from "next/image";
import { Bell, Trash2, Edit2, X, Loader2, Plus, ArrowUpRight, ArrowDownLeft } from "lucide-react";
import Link from "next/link";
import { formatCurrency } from "@/lib/format";
import type { PriceAlert } from "@/types";

function tierLabel(tier: string): string {
  // Convert Poketrace tier key to display label
  if (tier.startsWith("PSA_")) return `PSA ${tier.slice(4)}`;
  if (tier.startsWith("CGC_")) return `CGC ${tier.slice(4)}`;
  if (tier.startsWith("BGS_")) return `BGS ${tier.slice(4)}`;
  return tier.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

function SourceBadge({ label, price }: { label: string; price: number | null }) {
  return (
    <div className="flex flex-col items-center px-3 py-1.5 bg-surface-hover rounded-lg min-w-[80px]">
      <span className="text-[10px] text-text-muted uppercase tracking-wide">{label}</span>
      <span className="text-sm font-semibold text-text-primary mt-0.5">
        {price != null ? formatCurrency(price) : <span className="text-text-muted text-xs">N/A</span>}
      </span>
    </div>
  );
}

interface EditModalProps {
  alert: PriceAlert;
  onClose: () => void;
  onSave: (updated: Partial<PriceAlert>) => Promise<void>;
}

function EditModal({ alert, onClose, onSave }: EditModalProps) {
  const [lowPrice, setLowPrice] = useState(alert.target_low_price?.toString() ?? "");
  const [highPrice, setHighPrice] = useState(alert.target_high_price?.toString() ?? "");
  const [digest, setDigest] = useState(alert.alert_daily_digest);
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    setSaving(true);
    await onSave({
      alert_daily_digest: digest,
      target_low_price: lowPrice ? parseFloat(lowPrice) : null,
      target_high_price: highPrice ? parseFloat(highPrice) : null,
    });
    setSaving(false);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-surface border border-border rounded-2xl w-full max-w-sm shadow-2xl">
        <div className="flex items-center justify-between p-5 border-b border-border">
          <h3 className="font-bold text-text-primary text-sm">Edit Alert — {alert.card_name}</h3>
          <button onClick={onClose} className="p-1.5 text-text-muted hover:text-text-primary rounded-lg">
            <X className="w-4 h-4" />
          </button>
        </div>
        <div className="p-5 space-y-4">
          <label className="flex items-center gap-3 cursor-pointer p-3 bg-surface-hover rounded-xl">
            <input
              type="checkbox"
              checked={digest}
              onChange={(e) => setDigest(e.target.checked)}
              className="w-4 h-4 accent-accent"
            />
            <div>
              <p className="text-sm font-medium text-text-primary">Daily digest</p>
              <p className="text-xs text-text-muted">One email per day with current prices.</p>
            </div>
          </label>

          <div className="space-y-2">
            <label className="text-sm font-medium text-text-secondary flex items-center gap-1.5">
              <ArrowDownLeft className="w-3.5 h-3.5 text-success" />
              Alert when drops below
            </label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted">$</span>
              <input
                type="number"
                step="0.01"
                min="0"
                value={lowPrice}
                onChange={(e) => setLowPrice(e.target.value)}
                placeholder="No threshold"
                className="w-full pl-7 pr-4 py-2.5 bg-surface border border-border rounded-lg text-text-primary placeholder-text-muted outline-none focus:border-accent text-sm"
              />
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium text-text-secondary flex items-center gap-1.5">
              <ArrowUpRight className="w-3.5 h-3.5 text-warning" />
              Alert when rises above
            </label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted">$</span>
              <input
                type="number"
                step="0.01"
                min="0"
                value={highPrice}
                onChange={(e) => setHighPrice(e.target.value)}
                placeholder="No threshold"
                className="w-full pl-7 pr-4 py-2.5 bg-surface border border-border rounded-lg text-text-primary placeholder-text-muted outline-none focus:border-accent text-sm"
              />
            </div>
          </div>

          <div className="flex gap-2 pt-1">
            <button
              onClick={onClose}
              className="flex-1 py-2.5 border border-border rounded-xl text-sm text-text-secondary hover:bg-surface-hover transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleSave}
              disabled={saving}
              className="flex-1 py-2.5 bg-accent hover:bg-accent-hover text-black rounded-xl text-sm font-semibold flex items-center justify-center gap-2 transition-colors disabled:opacity-50"
            >
              {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
              Save
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function TrackingPage() {
  const [alerts, setAlerts] = useState<PriceAlert[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingAlert, setEditingAlert] = useState<PriceAlert | null>(null);

  const fetchAlerts = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/price-alerts");
      if (res.ok) {
        const data = await res.json();
        setAlerts(data);
      }
    } catch {
      // silently fail
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchAlerts();
  }, [fetchAlerts]);

  const handleDelete = async (id: string) => {
    if (!confirm("Remove this price alert?")) return;
    await fetch(`/api/price-alerts/${id}`, { method: "DELETE" });
    setAlerts((prev) => prev.filter((a) => a.id !== id));
  };

  const handleSave = async (id: string, updates: Partial<PriceAlert>) => {
    const res = await fetch(`/api/price-alerts/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(updates),
    });
    if (res.ok) {
      const updated = await res.json();
      setAlerts((prev) => prev.map((a) => (a.id === id ? updated : a)));
    }
    setEditingAlert(null);
  };

  return (
    <div className="max-w-4xl mx-auto">
      <div className="mb-8 flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-2xl font-bold text-text-primary">Price Tracking</h1>
          <p className="text-sm text-text-muted mt-1">
            Monitor price movements and receive alerts for cards you&apos;re watching.
          </p>
        </div>
        <Link
          href="/dashboard/add"
          className="flex items-center gap-2 px-4 py-2.5 bg-accent hover:bg-accent-hover text-black rounded-xl text-sm font-semibold transition-colors"
        >
          <Plus className="w-4 h-4" />
          Track a Card
        </Link>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-16">
          <Loader2 className="w-6 h-6 animate-spin text-text-muted" />
        </div>
      ) : alerts.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <Bell className="w-12 h-12 text-text-muted mb-4 opacity-40" />
          <h2 className="text-lg font-semibold text-text-primary mb-2">No tracked cards yet</h2>
          <p className="text-sm text-text-muted mb-6 max-w-sm">
            Search for a card and click &ldquo;Track Card&rdquo; to start monitoring prices and receive alerts.
          </p>
          <Link
            href="/dashboard/add"
            className="flex items-center gap-2 px-5 py-2.5 bg-accent hover:bg-accent-hover text-black rounded-xl text-sm font-semibold transition-colors"
          >
            <Plus className="w-4 h-4" />
            Find a Card to Track
          </Link>
        </div>
      ) : (
        <div className="space-y-3">
          {alerts.map((alert) => (
            <div
              key={alert.id}
              className="bg-surface border border-border rounded-2xl p-4 flex flex-col sm:flex-row gap-4"
            >
              {/* Card image */}
              {alert.image_url && (
                <div className="relative w-14 h-20 flex-shrink-0 bg-background rounded-lg overflow-hidden self-center sm:self-start">
                  <Image
                    src={alert.image_url}
                    alt={alert.card_name}
                    fill
                    className="object-contain p-0.5"
                    sizes="56px"
                    unoptimized
                  />
                </div>
              )}

              {/* Info */}
              <div className="flex-1 min-w-0">
                <div className="flex items-start justify-between gap-2 flex-wrap">
                  <div>
                    <p className="font-semibold text-text-primary text-sm">{alert.card_name}</p>
                    <p className="text-xs text-text-muted">{alert.set_name}</p>
                    <div className="flex flex-wrap gap-1.5 mt-1.5">
                      <span className="px-2 py-0.5 bg-surface-hover rounded-full text-[10px] text-text-secondary font-medium">
                        {tierLabel(alert.condition_tier)}
                      </span>
                      <span className="px-2 py-0.5 bg-surface-hover rounded-full text-[10px] text-text-secondary font-medium">
                        {alert.market}
                      </span>
                      {alert.alert_daily_digest && (
                        <span className="px-2 py-0.5 bg-accent/10 text-accent rounded-full text-[10px] font-medium flex items-center gap-1">
                          <Bell className="w-2.5 h-2.5" />
                          Daily digest
                        </span>
                      )}
                      {alert.target_low_price != null && (
                        <span className="px-2 py-0.5 bg-success/10 text-success rounded-full text-[10px] font-medium flex items-center gap-1">
                          <ArrowDownLeft className="w-2.5 h-2.5" />
                          Below {formatCurrency(alert.target_low_price)}
                        </span>
                      )}
                      {alert.target_high_price != null && (
                        <span className="px-2 py-0.5 bg-warning/10 text-warning rounded-full text-[10px] font-medium flex items-center gap-1">
                          <ArrowUpRight className="w-2.5 h-2.5" />
                          Above {formatCurrency(alert.target_high_price)}
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-1.5 flex-shrink-0">
                    <button
                      onClick={() => setEditingAlert(alert)}
                      className="p-2 text-text-muted hover:text-text-primary hover:bg-surface-hover rounded-lg transition-colors"
                      title="Edit alert"
                    >
                      <Edit2 className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => handleDelete(alert.id)}
                      className="p-2 text-text-muted hover:text-danger hover:bg-danger/10 rounded-lg transition-colors"
                      title="Remove alert"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                {/* Current prices */}
                <div className="flex flex-wrap gap-2 mt-3">
                  {alert.track_tcgplayer && (
                    <SourceBadge label="TCGPlayer" price={alert.last_price_tcgplayer} />
                  )}
                  {alert.track_ebay && (
                    <SourceBadge label="eBay" price={alert.last_price_ebay} />
                  )}
                  {alert.track_cardmarket && (
                    <SourceBadge label="CardMarket" price={alert.last_price_cardmarket} />
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {editingAlert && (
        <EditModal
          alert={editingAlert}
          onClose={() => setEditingAlert(null)}
          onSave={(updates) => handleSave(editingAlert.id, updates)}
        />
      )}
    </div>
  );
}
