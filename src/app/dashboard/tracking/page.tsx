"use client";

import { useState, useEffect, useCallback } from "react";
import Image from "next/image";
import { Bell, Trash2, Pencil, X, Loader2, Plus, ArrowUpRight, ArrowDownLeft, TrendingUp } from "lucide-react";
import Link from "next/link";
import { formatCurrency } from "@/lib/format";
import type { PriceAlert } from "@/types";

function tierLabel(tier: string): string {
  if (tier.startsWith("PSA_")) return `PSA ${tier.slice(4)}`;
  if (tier.startsWith("CGC_")) return `CGC ${tier.slice(4)}`;
  if (tier.startsWith("BGS_")) return `BGS ${tier.slice(4)}`;
  return tier.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
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
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-surface border border-border rounded-2xl w-full max-w-sm shadow-2xl">
        <div className="flex items-center justify-between p-5 border-b border-border">
          <div>
            <h3 className="font-bold text-text-primary text-sm">{alert.card_name}</h3>
            <p className="text-xs text-text-muted mt-0.5">{alert.set_name} · {tierLabel(alert.condition_tier)}</p>
          </div>
          <button onClick={onClose} className="p-1.5 text-text-muted hover:text-text-primary rounded-lg transition-colors">
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
            <label className="text-xs font-semibold text-text-muted uppercase tracking-wider flex items-center gap-1.5">
              <ArrowDownLeft className="w-3.5 h-3.5 text-success" />
              Alert when drops below
            </label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted text-sm">$</span>
              <input
                type="number"
                step="0.01"
                min="0"
                value={lowPrice}
                onChange={(e) => setLowPrice(e.target.value)}
                placeholder="No threshold"
                className="w-full pl-7 pr-4 py-2.5 bg-surface border border-border rounded-xl text-text-primary placeholder-text-muted outline-none focus:border-accent text-sm transition-colors"
              />
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-xs font-semibold text-text-muted uppercase tracking-wider flex items-center gap-1.5">
              <ArrowUpRight className="w-3.5 h-3.5 text-warning" />
              Alert when rises above
            </label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted text-sm">$</span>
              <input
                type="number"
                step="0.01"
                min="0"
                value={highPrice}
                onChange={(e) => setHighPrice(e.target.value)}
                placeholder="No threshold"
                className="w-full pl-7 pr-4 py-2.5 bg-surface border border-border rounded-xl text-text-primary placeholder-text-muted outline-none focus:border-accent text-sm transition-colors"
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
              Save Changes
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function AlertCard({ alert, onEdit, onDelete }: { alert: PriceAlert; onEdit: () => void; onDelete: () => void }) {
  const prices = [
    alert.track_tcgplayer ? alert.last_price_tcgplayer : null,
    alert.track_ebay ? alert.last_price_ebay : null,
    alert.track_cardmarket ? alert.last_price_cardmarket : null,
  ].filter((p): p is number => p != null);

  const lowestPrice = prices.length > 0 ? Math.min(...prices) : null;

  return (
    <div className="bg-surface border border-border rounded-2xl overflow-hidden flex flex-col hover:border-accent/30 transition-colors group">
      {/* Image area */}
      <div className="relative bg-gradient-to-b from-surface-hover to-background flex items-center justify-center h-48">
        {alert.image_url ? (
          <div className="relative w-28 h-40 drop-shadow-xl">
            <Image
              src={alert.image_url}
              alt={alert.card_name}
              fill
              className="object-contain"
              sizes="112px"
              unoptimized
            />
          </div>
        ) : (
          <div className="w-28 h-40 bg-surface-hover rounded-xl flex items-center justify-center">
            <TrendingUp className="w-8 h-8 text-text-muted opacity-30" />
          </div>
        )}
        {/* Action buttons */}
        <div className="absolute top-3 right-3 flex gap-1.5 opacity-0 group-hover:opacity-100 transition-opacity">
          <button
            onClick={onEdit}
            className="p-1.5 bg-surface/90 backdrop-blur-sm text-text-muted hover:text-text-primary rounded-lg border border-border shadow-sm transition-colors"
            title="Edit alert"
          >
            <Pencil className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={onDelete}
            className="p-1.5 bg-surface/90 backdrop-blur-sm text-text-muted hover:text-danger rounded-lg border border-border shadow-sm transition-colors"
            title="Remove alert"
          >
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        </div>
        {/* Condition badge */}
        <div className="absolute bottom-3 left-3">
          <span className="px-2.5 py-1 bg-black/60 backdrop-blur-sm text-white rounded-full text-[11px] font-semibold">
            {tierLabel(alert.condition_tier)}
          </span>
        </div>
      </div>

      {/* Card info */}
      <div className="p-4 flex-1 flex flex-col gap-3">
        <div>
          <p className="font-bold text-text-primary text-sm leading-tight">{alert.card_name}</p>
          <p className="text-xs text-text-muted mt-0.5">{alert.set_name}</p>
        </div>

        {/* Prices */}
        <div className="flex flex-col gap-1.5">
          {alert.track_tcgplayer && (
            <div className="flex items-center justify-between">
              <span className="text-[11px] text-text-muted font-medium">TCGPlayer</span>
              <span className="text-sm font-bold text-text-primary">
                {alert.last_price_tcgplayer != null ? formatCurrency(alert.last_price_tcgplayer) : <span className="text-text-muted font-normal text-xs">N/A</span>}
              </span>
            </div>
          )}
          {alert.track_ebay && (
            <div className="flex items-center justify-between">
              <span className="text-[11px] text-text-muted font-medium">eBay</span>
              <span className="text-sm font-bold text-text-primary">
                {alert.last_price_ebay != null ? formatCurrency(alert.last_price_ebay) : <span className="text-text-muted font-normal text-xs">N/A</span>}
              </span>
            </div>
          )}
          {alert.track_cardmarket && (
            <div className="flex items-center justify-between">
              <span className="text-[11px] text-text-muted font-medium">CardMarket</span>
              <span className="text-sm font-bold text-text-primary">
                {alert.last_price_cardmarket != null ? formatCurrency(alert.last_price_cardmarket) : <span className="text-text-muted font-normal text-xs">N/A</span>}
              </span>
            </div>
          )}
        </div>

        {/* Alert badges */}
        <div className="flex flex-wrap gap-1.5 pt-1 border-t border-border mt-auto">
          {alert.alert_daily_digest && (
            <span className="px-2 py-0.5 bg-accent/10 text-accent rounded-full text-[10px] font-medium flex items-center gap-1">
              <Bell className="w-2.5 h-2.5" />
              Daily
            </span>
          )}
          {alert.target_low_price != null && (
            <span className="px-2 py-0.5 bg-success/10 text-success rounded-full text-[10px] font-medium flex items-center gap-1">
              <ArrowDownLeft className="w-2.5 h-2.5" />
              {formatCurrency(alert.target_low_price)}
            </span>
          )}
          {alert.target_high_price != null && (
            <span className="px-2 py-0.5 bg-warning/10 text-warning rounded-full text-[10px] font-medium flex items-center gap-1">
              <ArrowUpRight className="w-2.5 h-2.5" />
              {formatCurrency(alert.target_high_price)}
            </span>
          )}
          {lowestPrice != null && alert.target_low_price != null && lowestPrice <= alert.target_low_price && (
            <span className="px-2 py-0.5 bg-success/20 text-success rounded-full text-[10px] font-bold animate-pulse">
              Triggered!
            </span>
          )}
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
    <div className="max-w-6xl mx-auto">
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
        <div className="flex items-center justify-center py-24">
          <Loader2 className="w-6 h-6 animate-spin text-text-muted" />
        </div>
      ) : alerts.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-24 text-center">
          <div className="w-16 h-16 rounded-2xl bg-surface-hover flex items-center justify-center mb-4">
            <Bell className="w-8 h-8 text-text-muted opacity-40" />
          </div>
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
        <>
          <p className="text-xs text-text-muted mb-4">{alerts.length} card{alerts.length !== 1 ? "s" : ""} tracked · Prices updated daily at 7am UTC</p>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
            {alerts.map((alert) => (
              <AlertCard
                key={alert.id}
                alert={alert}
                onEdit={() => setEditingAlert(alert)}
                onDelete={() => handleDelete(alert.id)}
              />
            ))}
          </div>
        </>
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
