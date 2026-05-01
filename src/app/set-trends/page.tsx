"use client";

import { useState, useEffect, useCallback } from "react";
import { TrendingUp, ChevronDown, RefreshCw, AlertCircle, Search } from "lucide-react";
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
  const [setQuery, setSetQuery] = useState("");
  const [showAllSets, setShowAllSets] = useState(false);

  const [selectedRarities, setSelectedRarities] = useState<string[]>([]);

  // Reset rarity filter when set changes — the available rarity list will differ.
  useEffect(() => {
    setSelectedRarities([]);
  }, [selectedSet]);

  // Load set list whenever the data-only filter toggle changes
  useEffect(() => {
    async function loadSets() {
      setSetsLoading(true);
      try {
        const url = showAllSets ? "/api/sets" : "/api/sets?onlyWithData=true";
        const res = await fetch(url);
        if (!res.ok) throw new Error("Failed to load sets");
        const json = await res.json();
        const list: SetOption[] = Array.isArray(json) ? json : json.sets ?? [];
        setSets(list);

        // Prefer a recognisable English flagship set as the default landing
        // experience. Fall back to the first non-promo set, then the first
        // available set.
        // Long-form slugs first (what the cron inserts for modern SV sets),
        // then the short-form aliases as fallback in case Poketrace fixes them.
        const PREFERRED_SLUGS = [
          "sv-scarlet-and-violet-ascended-heroes",
          "sv-scarlet-and-violet-mega-evolution",
          "sv-scarlet-and-violet-white-flare",
          "sv-scarlet-and-violet-black-bolt",
          "sv-scarlet-and-violet-destined-rivals",
          "sv-scarlet-and-violet-journey-together",
          "sv-scarlet-and-violet-prismatic-evolutions",
          "sv-scarlet-and-violet-surging-sparks",
          "sv-scarlet-and-violet-stellar-crown",
          "sv-scarlet-and-violet-twilight-masquerade",
          "sv-scarlet-and-violet-temporal-forces",
          "sv-scarlet-and-violet-paldean-fates",
          "sv-scarlet-and-violet-paradox-rift",
          "sv-scarlet-and-violet-151",
        ];
        // Preserve the user's selection if it's still in the new list,
        // otherwise pick a sensible default.
        setSelectedSet((current) => {
          if (current && list.some((l) => l.id === current)) return current;
          const preferred = PREFERRED_SLUGS.map((s) => list.find((l) => l.id === s)).find(Boolean);
          const firstNonPromo = list.find(
            (l) =>
              !/promo|commemoration|movie/i.test(l.name) &&
              !/japanese/i.test(l.name)
          );
          const defaultSet = preferred ?? firstNonPromo ?? list[0];
          return defaultSet?.id ?? "";
        });
      } catch {
        setSetsLoading(false);
      } finally {
        setSetsLoading(false);
      }
    }
    loadSets();
  }, [showAllSets]);

  const fetchTrends = useCallback(async (setSlug: string, p: Period, rarities: string[]) => {
    if (!setSlug) return;
    setLoading(true);
    setError(null);
    setData(null); // clear stale data immediately so we never show prior set's results
    try {
      const params = new URLSearchParams({
        set: setSlug,
        period: p,
        limit: "10",
      });
      if (rarities.length > 0) params.set("rarities", rarities.join(","));
      const res = await fetch(`/api/set-trends?${params.toString()}`);
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error ?? "Failed to load trends");
      }
      const json: SetTrendsResponse = await res.json();
      setData(json);
    } catch (err) {
      setData(null);
      setError(err instanceof Error ? err.message : "Failed to load trends");
    } finally {
      setLoading(false);
    }
  }, []);

  // Fetch whenever selected set, period, or rarity filter changes
  useEffect(() => {
    if (selectedSet) fetchTrends(selectedSet, period, selectedRarities);
  }, [selectedSet, period, selectedRarities, fetchTrends]);

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
          onClick={() => selectedSet && fetchTrends(selectedSet, period, selectedRarities)}
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

          {dropdownOpen && sets.length > 0 && (() => {
            const q = setQuery.trim().toLowerCase();
            const filtered = q
              ? sets.filter(
                  (s) => s.name.toLowerCase().includes(q) || s.id.toLowerCase().includes(q)
                )
              : sets;
            return (
              <div className="absolute z-20 top-full mt-1 w-full bg-surface-elevated border border-border rounded-xl shadow-xl overflow-hidden">
                <div className="p-2 border-b border-border space-y-2">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-muted pointer-events-none" />
                    <input
                      autoFocus
                      type="text"
                      value={setQuery}
                      onChange={(e) => setSetQuery(e.target.value)}
                      placeholder="Search sets…"
                      className="w-full bg-surface border border-border focus:border-accent rounded-lg pl-9 pr-3 py-2 text-sm text-text-primary placeholder:text-text-muted outline-none transition-colors"
                    />
                  </div>
                  <label className="flex items-center gap-2 px-1 text-xs text-text-muted cursor-pointer">
                    <input
                      type="checkbox"
                      checked={showAllSets}
                      onChange={(e) => setShowAllSets(e.target.checked)}
                      className="w-3.5 h-3.5 accent-accent cursor-pointer"
                    />
                    <span>Show all sets (including ones without trend data)</span>
                  </label>
                </div>
                <div className="max-h-72 overflow-y-auto">
                  {filtered.length === 0 ? (
                    <div className="px-4 py-6 text-center text-sm text-text-muted">
                      No sets match &ldquo;{setQuery}&rdquo;
                    </div>
                  ) : (
                    filtered.map((s) => (
                      <button
                        key={s.id}
                        onClick={() => {
                          setSelectedSet(s.id);
                          setDropdownOpen(false);
                          setSetQuery("");
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
                    ))
                  )}
                </div>
              </div>
            );
          })()}
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

      {/* Rarity filter pills */}
      {data && data.availableRarities.length > 0 && (
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-xs text-text-muted mr-1">Rarity:</span>
          <button
            onClick={() => setSelectedRarities([])}
            className={clsx(
              "px-3 py-1.5 text-xs font-medium rounded-full border transition-colors",
              selectedRarities.length === 0
                ? "bg-accent text-surface border-accent"
                : "bg-surface text-text-muted border-border hover:border-border-hover hover:text-text-primary"
            )}
          >
            All
          </button>
          {data.availableRarities.map((r) => {
            const active = selectedRarities.includes(r);
            return (
              <button
                key={r}
                onClick={() => {
                  setSelectedRarities((prev) =>
                    prev.includes(r) ? prev.filter((x) => x !== r) : [...prev, r]
                  );
                }}
                className={clsx(
                  "px-3 py-1.5 text-xs font-medium rounded-full border transition-colors",
                  active
                    ? "bg-accent text-surface border-accent"
                    : "bg-surface text-text-secondary border-border hover:border-border-hover hover:text-text-primary"
                )}
              >
                {r}
              </button>
            );
          })}
        </div>
      )}

      {/* Close dropdown on outside click */}
      {dropdownOpen && (
        <div
          className="fixed inset-0 z-10"
          onClick={() => {
            setDropdownOpen(false);
            setSetQuery("");
          }}
        />
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
