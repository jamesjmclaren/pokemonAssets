"use client";

import { useUser } from "@clerk/nextjs";
import { useState, useEffect, useMemo, useCallback } from "react";
import { Loader2, Shield, Search, Download, LayoutGrid, ExternalLink, Copy, Check, Unlock } from "lucide-react";

interface Buyer {
  business_name: string;
  name: string;
  email: string;
  phone: string;
  instagram_handle: string | null;
  created_at: string;
  ref: string;
  sessionId: string;
  paymentIntent: string | null;
  amountPence: number | null;
}

interface Row {
  label: string;
  type: string;
  typeLabel: string;
  days: Record<string, Buyer | null>;
}

interface WaitlistEntry {
  day: string;
  type: string;
  typeLabel: string;
  name: string;
  email: string;
  created_at: string;
}

interface TablesData {
  event: { name: string; venue: string; days: string[] };
  rows: Row[];
  summary: Record<string, Record<string, { sold: number; total: number }>>;
  typeLabels: Record<string, string>;
  stripeMode?: "test" | "live";
  waitlist?: WaitlistEntry[];
}

const TYPE_ORDER = ["standard", "corner", "premier_corner"];
const TYPE_DOT: Record<string, string> = {
  standard: "#3b82f6",
  corner: "#22c55e",
  premier_corner: "#ef4444",
};

export default function AdminEventTablesPage() {
  const { user, isLoaded } = useUser();
  const [isAdmin, setIsAdmin] = useState(false);
  const [adminChecked, setAdminChecked] = useState(false);

  const [data, setData] = useState<TablesData | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeDay, setActiveDay] = useState<string>("");
  const [search, setSearch] = useState("");
  const [releasing, setReleasing] = useState<string | null>(null);
  const [copiedRef, setCopiedRef] = useState<string | null>(null);

  useEffect(() => {
    if (isLoaded && user) {
      fetch("/api/admin/check")
        .then((r) => r.json())
        .then((d) => setIsAdmin(Boolean(d?.isAdmin)))
        .catch(() => setIsAdmin(false))
        .finally(() => setAdminChecked(true));
    } else if (isLoaded && !user) {
      setAdminChecked(true);
    }
  }, [isLoaded, user]);

  const loadData = useCallback(() => {
    setLoading(true);
    fetch("/api/admin/event-tables")
      .then((r) => r.json())
      .then((d: TablesData) => {
        if (d?.rows) {
          setData(d);
          setActiveDay((prev) => prev || d.event.days[0] || "");
        }
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    if (isAdmin) loadData();
  }, [isAdmin, loadData]);

  const releaseTable = async (day: string, label: string) => {
    if (
      !confirm(
        `Release table ${label} (${day})?\n\nDo this only AFTER you have refunded the payment in Stripe. The table will become available to book again.`
      )
    )
      return;
    setReleasing(`${day}|${label}`);
    try {
      const res = await fetch("/api/admin/event-tables/release", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ day, label }),
      });
      if (res.ok) loadData();
    } finally {
      setReleasing(null);
    }
  };

  const copySession = (sessionId: string) => {
    navigator.clipboard.writeText(sessionId);
    setCopiedRef(sessionId);
    setTimeout(() => setCopiedRef(null), 1500);
  };

  const filteredByType = useMemo(() => {
    if (!data || !activeDay) return {};
    const q = search.trim().toLowerCase();
    const groups: Record<string, Row[]> = {};
    for (const row of data.rows) {
      const buyer = row.days[activeDay];
      if (q) {
        const hay = [
          row.label,
          buyer?.business_name,
          buyer?.name,
          buyer?.email,
          buyer?.ref,
          buyer?.sessionId,
        ]
          .filter(Boolean)
          .join(" ")
          .toLowerCase();
        if (!hay.includes(q)) continue;
      }
      (groups[row.type] ??= []).push(row);
    }
    return groups;
  }, [data, activeDay, search]);

  const exportCsv = () => {
    if (!data || !activeDay) return;
    const header = ["Table", "Type", "Status", "Business", "Name", "Email", "Phone", "Ref", "Stripe Session", "Amount £"];
    const lines = [header.join(",")];
    for (const row of data.rows) {
      const b = row.days[activeDay];
      const cells = [
        row.label,
        row.typeLabel,
        b ? "SOLD" : "Available",
        b?.business_name ?? "",
        b?.name ?? "",
        b?.email ?? "",
        b?.phone ?? "",
        b?.ref ?? "",
        b?.sessionId ?? "",
        b?.amountPence != null ? (b.amountPence / 100).toFixed(2) : "",
      ].map((c) => `"${String(c).replace(/"/g, '""')}"`);
      lines.push(cells.join(","));
    }
    const blob = new Blob([lines.join("\n")], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `tables-${activeDay.toLowerCase()}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  if (!isLoaded || !adminChecked) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        <Loader2 className="w-6 h-6 animate-spin text-text-muted" />
      </div>
    );
  }

  if (!isAdmin) {
    return (
      <div className="min-h-[60vh] flex flex-col items-center justify-center gap-4">
        <Shield className="w-12 h-12 text-text-muted" />
        <h1 className="text-xl font-semibold text-text-primary">Access Denied</h1>
        <p className="text-text-secondary text-sm">You do not have permission to access this page.</p>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto">
      <div className="mb-6 flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-text-primary mb-1 flex items-center gap-2">
            <LayoutGrid className="w-5 h-5 text-accent" /> Event Tables
          </h1>
          <p className="text-text-secondary text-sm">
            {data ? `${data.event.name} — ${data.event.venue}` : "Who has bought which table."}
          </p>
        </div>
        {data && activeDay && (
          <button
            onClick={exportCsv}
            className="inline-flex items-center gap-2 px-3 py-2 bg-surface border border-border rounded-lg text-sm text-text-secondary hover:text-text-primary hover:border-border-hover transition-colors shrink-0"
          >
            <Download className="w-4 h-4" /> Export {activeDay}
          </button>
        )}
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-16">
          <Loader2 className="w-6 h-6 animate-spin text-text-muted" />
        </div>
      ) : !data ? (
        <p className="text-center text-text-muted text-sm py-16">No event data found.</p>
      ) : (
        <>
          {/* Summary cards */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-6">
            {TYPE_ORDER.map((type) => {
              const perDay = data.summary[type] ?? {};
              return (
                <div key={type} className="bg-surface border border-border rounded-xl p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <span className="w-3 h-3 rounded-sm" style={{ backgroundColor: TYPE_DOT[type] }} />
                    <span className="text-text-primary text-sm font-medium">{data.typeLabels[type]}</span>
                  </div>
                  {data.event.days.map((day) => {
                    const s = perDay[day] ?? { sold: 0, total: 0 };
                    return (
                      <div key={day} className="flex items-center justify-between text-xs text-text-muted">
                        <span>{day}</span>
                        <span>
                          <span className="text-text-primary font-medium">{s.sold}</span> / {s.total} sold
                        </span>
                      </div>
                    );
                  })}
                </div>
              );
            })}
          </div>

          {/* Day tabs */}
          <div className="flex gap-1 mb-4 border-b border-border">
            {data.event.days.map((day) => (
              <button
                key={day}
                onClick={() => setActiveDay(day)}
                className={`px-4 py-2.5 text-sm font-medium transition-colors border-b-2 -mb-px ${
                  activeDay === day
                    ? "border-accent text-accent"
                    : "border-transparent text-text-muted hover:text-text-secondary"
                }`}
              >
                {day}
              </button>
            ))}
          </div>

          {/* Search */}
          <div className="relative mb-4">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-muted" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search table number, business, name, or email…"
              className="w-full pl-9 pr-3 py-2.5 bg-background border border-border rounded-lg text-sm text-text-primary placeholder:text-text-muted focus:outline-none focus:border-accent/50"
            />
          </div>

          {/* Waitlist for the active day */}
          {(() => {
            const waiters = (data.waitlist ?? []).filter((w) => w.day === activeDay);
            if (waiters.length === 0) return null;
            return (
              <div className="mb-6 rounded-xl border border-accent/25 bg-accent/5 p-4">
                <h2 className="text-text-primary text-sm font-medium mb-1">
                  Waitlist <span className="text-text-muted text-xs">({waiters.length})</span>
                </h2>
                <p className="text-text-muted text-xs mb-3">
                  Notified automatically when you release a matching table on {activeDay}.
                </p>
                <div className="space-y-1.5">
                  {waiters.map((w, i) => (
                    <div key={`${w.email}-${i}`} className="flex items-center justify-between gap-3 text-sm">
                      <span className="text-text-primary truncate">
                        {w.name} <span className="text-text-muted">· {w.email}</span>
                      </span>
                      <span className="shrink-0 text-[11px] px-2 py-0.5 rounded-full bg-background border border-border text-text-secondary">
                        {w.typeLabel}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            );
          })()}

          {/* Tables grouped by type */}
          {TYPE_ORDER.map((type) => {
            const rows = filteredByType[type];
            if (!rows || rows.length === 0) return null;
            return (
              <div key={type} className="mb-6">
                <div className="flex items-center gap-2 mb-2">
                  <span className="w-3 h-3 rounded-sm" style={{ backgroundColor: TYPE_DOT[type] }} />
                  <h2 className="text-text-primary text-sm font-medium">{data.typeLabels[type]}</h2>
                  <span className="text-text-muted text-xs">({rows.length})</span>
                </div>
                <div className="space-y-1.5">
                  {rows.map((row) => {
                    const buyer = row.days[activeDay];
                    return (
                      <div
                        key={row.label}
                        className={`flex items-start justify-between gap-3 px-3 py-2.5 rounded-lg border ${
                          buyer ? "bg-surface border-border" : "bg-background border-border/50"
                        }`}
                      >
                        <div className="flex items-start gap-3 min-w-0">
                          <span className="mt-0.5 inline-flex items-center justify-center min-w-[42px] h-7 px-2 rounded-md bg-background border border-border text-xs font-semibold text-text-primary shrink-0">
                            {row.label}
                          </span>
                          {buyer ? (
                            <div className="min-w-0">
                              <p className="text-sm text-text-primary truncate">{buyer.business_name}</p>
                              <p className="text-xs text-text-muted truncate">
                                {buyer.name}
                                {buyer.email ? ` · ${buyer.email}` : ""}
                                {buyer.phone ? ` · ${buyer.phone}` : ""}
                              </p>
                              <div className="flex flex-wrap items-center gap-x-2 gap-y-1 mt-1 text-[11px]">
                                <span className="font-mono text-accent/90">Ref {buyer.ref}</span>
                                {buyer.amountPence != null && (
                                  <span className="text-text-muted">£{(buyer.amountPence / 100).toFixed(0)}</span>
                                )}
                                {buyer.sessionId && (
                                  <>
                                    <button
                                      onClick={() => copySession(buyer.sessionId)}
                                      className="inline-flex items-center gap-1 text-text-muted hover:text-text-primary transition-colors"
                                      title="Copy Stripe session id"
                                    >
                                      {copiedRef === buyer.sessionId ? (
                                        <Check className="w-3 h-3 text-success" />
                                      ) : (
                                        <Copy className="w-3 h-3" />
                                      )}
                                      <span className="font-mono">{buyer.sessionId.slice(0, 14)}…</span>
                                    </button>
                                    <a
                                      href={
                                        buyer.paymentIntent
                                          ? `https://dashboard.stripe.com/${data?.stripeMode === "live" ? "" : "test/"}payments/${buyer.paymentIntent}`
                                          : `https://dashboard.stripe.com/${data?.stripeMode === "live" ? "" : "test/"}search?query=${encodeURIComponent(buyer.email)}`
                                      }
                                      target="_blank"
                                      rel="noopener noreferrer"
                                      className="inline-flex items-center gap-1 text-accent/80 hover:text-accent transition-colors"
                                      title={buyer.paymentIntent ? "Open this payment in Stripe" : "Find this customer's payment in Stripe (by email)"}
                                    >
                                      Stripe <ExternalLink className="w-3 h-3" />
                                    </a>
                                  </>
                                )}
                              </div>
                            </div>
                          ) : (
                            <span className="text-sm text-text-muted mt-0.5">Available</span>
                          )}
                        </div>
                        <div className="shrink-0 flex flex-col items-end gap-1.5">
                          <span
                            className={`text-[10px] uppercase tracking-wider px-2 py-1 rounded-full ${
                              buyer ? "bg-danger/10 text-danger" : "bg-success/10 text-success"
                            }`}
                          >
                            {buyer ? "Sold" : "Open"}
                          </span>
                          {buyer && (
                            <button
                              onClick={() => releaseTable(activeDay, row.label)}
                              disabled={releasing === `${activeDay}|${row.label}`}
                              className="inline-flex items-center gap-1 text-[11px] text-text-muted hover:text-danger transition-colors disabled:opacity-50 cursor-pointer"
                              title="Release this table (do it after refunding in Stripe)"
                            >
                              {releasing === `${activeDay}|${row.label}` ? (
                                <Loader2 className="w-3 h-3 animate-spin" />
                              ) : (
                                <Unlock className="w-3 h-3" />
                              )}
                              Release
                            </button>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </>
      )}
    </div>
  );
}
