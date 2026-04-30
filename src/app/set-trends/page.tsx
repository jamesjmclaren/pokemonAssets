"use client";

import { useState, useEffect, useCallback } from "react";
import { TrendingUp, ChevronDown, RefreshCw, AlertCircle } from "lucide-react";
import { clsx } from "clsx";
import SetTrendsList from "@/components/SetTrendsList";
import type { SetTrendsResponse } from "@/app/api/set-trends/route";

interface SetOption {
  id: string;
  name: string;
  releaseDate: string;
}

type Period = "1d" | "7d";

export default function SetTrendsPage() {
  const [sets, setSets] = useState<SetOption[]>([]);
  const [setsLoading, setSetsLoading] = useState(true);

  const [selectedSet, setSelectedSet] = useState<string>("");
  const [period, setPeriod] = useState<Period>("7d");

  const [data, setData] = useState<SetTrendsResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [dropdownOpen, setDropdownOpen] = useState(false);

  // Load set list once on mount
  useEffect(() => {
    async function loadSets() {
      try {
        const res = await fetch("/api/sets");
        if (!res.ok) throw new Error("Failed to load sets");
        const json = await res.json();
        const list: SetOption[] = Array.isArray(json) ? json : json.sets ?? [];
        setSets(list);
        if (list.length > 0) setSelectedSet(list[0].id);
      } catch {
        setSetsLoading(false);
      } finally {
        setSetsLoading(false);
      }
    }
    loadSets();
  }, []);

  const fetchTrends = useCallback(async (setSlug: string, p: Period) => {
    if (!setSlug) return;
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/set-trends?set=${encodeURIComponent(setSlug)}&period=${p}&limit=10`);
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error ?? "Failed to load trends");
      }
      const json: SetTrendsResponse = await res.json();
      setData(json);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load trends");
    } finally {
      setLoading(false);
    }
  }, []);

  // Fetch whenever selected set or period changes
  useEffect(() => {
    if (selectedSet) fetchTrends(selectedSet, period);
  }, [selectedSet, period, fetchTrends]);

  const selectedSetName = sets.find((s) => s.id === selectedSet)?.name ?? selectedSet;

  const periodLabel = period === "1d" ? "Daily (24h)" : "Weekly (7d)";
  const periodSubtitle = period === "1d"
    ? "vs. yesterday's avg price"
    : "vs. last week's avg price";

  return (
    <div className="max-w-5xl mx-auto px-4 py-8 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-accent-muted flex items-center justify-center">
            <TrendingUp className="w-5 h-5 text-accent" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-text-primary">Set Price Trends</h1>
            <p className="text-sm text-text-muted">
              Top raw NM &amp; PSA 10 cards by price movement
            </p>
          </div>
        </div>

        {/* Refresh */}
        <button
          onClick={() => selectedSet && fetchTrends(selectedSet, period)}
          disabled={loading || !selectedSet}
          className="self-start sm:self-auto flex items-center gap-2 text-sm text-text-muted hover:text-text-primary transition-colors disabled:opacity-40"
        >
          <RefreshCw className={clsx("w-4 h-4", loading && "animate-spin")} />
          {loading ? "Loading…" : "Refresh"}
        </button>
      </div>

      {/* Controls */}
      <div className="flex flex-col sm:flex-row gap-3">
        {/* Set selector */}
        <div className="relative flex-1">
          <button
            onClick={() => setDropdownOpen((o) => !o)}
            disabled={setsLoading}
            className="w-full flex items-center justify-between gap-2 bg-surface border border-border hover:border-border-hover rounded-xl px-4 py-3 text-sm text-text-primary transition-colors disabled:opacity-50"
          >
            <span className="truncate">
              {setsLoading ? "Loading sets…" : (selectedSetName || "Select a set")}
            </span>
            <ChevronDown className={clsx("w-4 h-4 text-text-muted shrink-0 transition-transform", dropdownOpen && "rotate-180")} />
          </button>

          {dropdownOpen && sets.length > 0 && (
            <div className="absolute z-20 top-full mt-1 w-full bg-surface-elevated border border-border rounded-xl shadow-xl overflow-hidden">
              <div className="max-h-72 overflow-y-auto">
                {sets.map((s) => (
                  <button
                    key={s.id}
                    onClick={() => {
                      setSelectedSet(s.id);
                      setDropdownOpen(false);
                    }}
                    className={clsx(
                      "w-full text-left px-4 py-2.5 text-sm hover:bg-surface-hover transition-colors",
                      s.id === selectedSet ? "text-accent font-medium" : "text-text-primary"
                    )}
                  >
                    {s.name}
                    {s.releaseDate && (
                      <span className="text-text-muted ml-2 text-xs">{s.releaseDate.slice(0, 4)}</span>
                    )}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Period toggle */}
        <div className="flex bg-surface border border-border rounded-xl p-1 gap-1 shrink-0">
          {(["1d", "7d"] as Period[]).map((p) => (
            <button
              key={p}
              onClick={() => setPeriod(p)}
              className={clsx(
                "px-5 py-2 text-sm font-medium rounded-lg transition-colors",
                period === p
                  ? "bg-accent text-surface"
                  : "text-text-muted hover:text-text-primary"
              )}
            >
              {p === "1d" ? "Daily" : "Weekly"}
            </button>
          ))}
        </div>
      </div>

      {/* Close dropdown on outside click */}
      {dropdownOpen && (
        <div className="fixed inset-0 z-10" onClick={() => setDropdownOpen(false)} />
      )}

      {/* Error state */}
      {error && (
        <div className="flex items-center gap-3 bg-danger-muted border border-danger border-opacity-30 rounded-xl px-4 py-3 text-sm text-danger">
          <AlertCircle className="w-4 h-4 shrink-0" />
          {error}
        </div>
      )}

      {/* Meta info */}
      {data && !loading && (
        <p className="text-xs text-text-muted">
          {data.set.name} · {periodLabel} · {periodSubtitle}
          {data.fromCache && " · served from cache"}
          {" · updated "}{new Date(data.fetchedAt).toLocaleTimeString()}
        </p>
      )}

      {/* Two-column trend lists */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        <SetTrendsList
          title="Raw (Near Mint)"
          subtitle={`Top 10 by NM price · ${periodLabel}`}
          cards={data?.raw ?? []}
          loading={loading}
          accentColor="gold"
        />
        <SetTrendsList
          title="PSA 10 Graded"
          subtitle={`Top 10 by PSA 10 price · ${periodLabel}`}
          cards={data?.psa10 ?? []}
          loading={loading}
          accentColor="blue"
        />
      </div>
    </div>
  );
}
