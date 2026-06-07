"use client";

import { useUser } from "@clerk/nextjs";
import { useState, useEffect, useMemo } from "react";
import { Loader2, Shield, Search, Download, LayoutGrid } from "lucide-react";

interface Buyer {
  business_name: string;
  name: string;
  email: string;
  phone: string;
  instagram_handle: string | null;
  created_at: string;
}

interface Row {
  label: string;
  type: string;
  typeLabel: string;
  days: Record<string, Buyer | null>;
}

interface TablesData {
  event: { name: string; venue: string; days: string[] };
  rows: Row[];
  summary: Record<string, Record<string, { sold: number; total: number }>>;
  typeLabels: Record<string, string>;
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

  useEffect(() => {
    if (!isAdmin) return;
    setLoading(true);
    fetch("/api/admin/event-tables")
      .then((r) => r.json())
      .then((d: TablesData) => {
        if (d?.rows) {
          setData(d);
          setActiveDay(d.event.days[0] ?? "");
        }
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [isAdmin]);

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
    const header = ["Table", "Type", "Status", "Business", "Name", "Email", "Phone"];
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
                        className={`flex items-center justify-between gap-3 px-3 py-2.5 rounded-lg border ${
                          buyer
                            ? "bg-surface border-border"
                            : "bg-background border-border/50"
                        }`}
                      >
                        <div className="flex items-center gap-3 min-w-0">
                          <span className="inline-flex items-center justify-center min-w-[42px] h-7 px-2 rounded-md bg-background border border-border text-xs font-semibold text-text-primary">
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
                            </div>
                          ) : (
                            <span className="text-sm text-text-muted">Available</span>
                          )}
                        </div>
                        <span
                          className={`shrink-0 text-[10px] uppercase tracking-wider px-2 py-1 rounded-full ${
                            buyer
                              ? "bg-danger/10 text-danger"
                              : "bg-success/10 text-success"
                          }`}
                        >
                          {buyer ? "Sold" : "Open"}
                        </span>
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
