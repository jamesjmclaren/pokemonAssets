"use client";

import { useState, useEffect, useMemo } from "react";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import { formatCurrency, formatDateShort } from "@/lib/format";

type TimeRange = "1M" | "3M" | "1Y" | "All";

interface ChartPoint {
  date: string;
  total: number;
  raw: number;
  graded: number;
  sealed: number;
  costBasis: number;
}

interface PortfolioChartProps {
  portfolioId: string;
  className?: string;
}

// Stacked series (bottom to top): sealed, raw, graded
// These stack to form the total portfolio value
const STACKED_SERIES: Array<{ key: string; label: string; color: string }> = [
  { key: "sealed", label: "Sealed Products", color: "#22c55e" },
  { key: "raw", label: "Raw Cards", color: "#f97316" },
  { key: "graded", label: "Graded Cards", color: "#a78bfa" },
];

const COST_BASIS = { key: "costBasis", label: "Cost Basis", color: "#9090a8" };

export default function PortfolioChart({ portfolioId, className = "" }: PortfolioChartProps) {
  const [range, setRange] = useState<TimeRange>("3M");
  const [data, setData] = useState<ChartPoint[]>([]);
  const [loading, setLoading] = useState(true);
  const [visibleSeries, setVisibleSeries] = useState<Set<string>>(
    new Set(["raw", "graded", "sealed", "costBasis"])
  );

  useEffect(() => {
    async function fetchChart() {
      setLoading(true);
      try {
        const res = await fetch(`/api/portfolio-chart?portfolioId=${portfolioId}&range=${range}`);
        if (!res.ok) throw new Error("Failed to fetch");
        const points = await res.json();
        setData(Array.isArray(points) ? points : []);
      } catch (err) {
        console.error("Portfolio chart fetch error:", err);
        setData([]);
      } finally {
        setLoading(false);
      }
    }
    if (portfolioId) fetchChart();
  }, [portfolioId, range]);

  const toggleSeries = (key: string) => {
    setVisibleSeries((prev) => {
      const next = new Set(prev);
      if (next.has(key)) {
        next.delete(key);
      } else {
        next.add(key);
      }
      return next;
    });
  };

  // Zero out hidden stacked series so the Y-axis rescales to visible data only
  // Must be above early returns to preserve hook call order
  const chartData = useMemo(() => {
    if (data.length === 0) return data;
    const hiddenKeys = STACKED_SERIES.filter((s) => !visibleSeries.has(s.key)).map((s) => s.key);
    if (hiddenKeys.length === 0 && visibleSeries.has("costBasis")) return data;
    return data.map((point) => {
      const p = { ...point };
      for (const key of hiddenKeys) {
        (p as unknown as Record<string, number>)[key] = 0;
      }
      if (!visibleSeries.has("costBasis")) {
        p.costBasis = 0;
      }
      return p;
    });
  }, [data, visibleSeries]);

  // Build a lookup from original data so tooltip always shows real values
  const realDataByDate = useMemo(() => {
    const map = new Map<string, ChartPoint>();
    for (const point of data) map.set(point.date, point);
    return map;
  }, [data]);

  if (loading) {
    return (
      <div className={`bg-surface border border-border rounded-2xl p-6 ${className}`}>
        <h3 className="text-sm font-semibold text-text-primary mb-4">Portfolio Value</h3>
        <div className="h-72 flex items-center justify-center">
          <p className="text-text-muted text-sm">Loading chart...</p>
        </div>
      </div>
    );
  }

  if (data.length === 0) {
    return (
      <div className={`bg-surface border border-border rounded-2xl p-6 ${className}`}>
        <h3 className="text-sm font-semibold text-text-primary mb-4">Portfolio Value</h3>
        <div className="h-64 flex items-center justify-center">
          <p className="text-text-muted text-sm">
            Add assets and wait for daily price recordings to see portfolio value over time
          </p>
        </div>
      </div>
    );
  }

  const latest = data[data.length - 1];
  const isUp = latest.total >= latest.costBasis;

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const CustomTooltip = ({ active, payload, label }: any) => {
    if (!active || !payload || payload.length === 0) return null;
    const point = realDataByDate.get(label) ?? (payload[0]?.payload as ChartPoint | undefined);
    if (!point) return null;

    return (
      <div className="bg-[#1e1e1e] border border-[#2a2a2a] rounded-xl p-3 text-xs">
        <p className="text-[#9090a8] mb-2">{formatDateShort(label)}</p>
        <div className="space-y-1">
          <div className="flex items-center justify-between gap-4">
            <span className="text-text-primary font-semibold">Total</span>
            <span className="text-text-primary font-semibold">{formatCurrency(point.total)}</span>
          </div>
          <div className="border-t border-[#2a2a2a] my-1" />
          {[...STACKED_SERIES].reverse().map((s) => (
            <div key={s.key} className="flex items-center justify-between gap-4">
              <span className="flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full" style={{ backgroundColor: s.color }} />
                <span className="text-[#9090a8]">{s.label}</span>
              </span>
              <span className="text-text-primary">{formatCurrency(point[s.key as keyof ChartPoint] as number)}</span>
            </div>
          ))}
          <div className="border-t border-[#2a2a2a] my-1" />
          <div className="flex items-center justify-between gap-4">
            <span className="flex items-center gap-1.5">
              <span className="w-3 border-t-2 border-dashed border-[#9090a8]" />
              <span className="text-[#9090a8]">{COST_BASIS.label}</span>
            </span>
            <span className="text-text-primary">{formatCurrency(point.costBasis)}</span>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className={`bg-surface border border-border rounded-2xl p-4 md:p-6 ${className}`}>
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-3 mb-4">
        <div>
          <h3 className="text-sm font-semibold text-text-primary">Portfolio Value</h3>
          <div className="flex items-baseline gap-3 mt-1">
            <span className="text-2xl font-bold text-text-primary">
              {formatCurrency(latest.total)}
            </span>
            <span className={`text-sm font-medium ${isUp ? "text-success" : "text-danger"}`}>
              {isUp ? "+" : ""}
              {formatCurrency(latest.total - latest.costBasis)}
            </span>
          </div>
          {/* Breakdown */}
          <div className="flex flex-wrap gap-x-4 gap-y-0.5 mt-1">
            {[...STACKED_SERIES].reverse().map((s) => (
              <span key={s.key} className="text-xs text-text-muted">
                <span className="inline-block w-2 h-2 rounded-full mr-1" style={{ backgroundColor: s.color }} />
                {s.label}: {formatCurrency(latest[s.key as keyof ChartPoint] as number)}
              </span>
            ))}
          </div>
        </div>

        {/* Time range buttons */}
        <div className="flex rounded-lg border border-border overflow-hidden flex-shrink-0">
          {(["1M", "3M", "1Y", "All"] as TimeRange[]).map((r) => (
            <button
              key={r}
              onClick={() => setRange(r)}
              className={`px-3 py-1.5 text-xs font-semibold ${
                range === r
                  ? "bg-accent text-black"
                  : "text-text-muted hover:text-text-primary hover:bg-surface-hover"
              }`}
            >
              {r}
            </button>
          ))}
        </div>
      </div>

      {/* Legend (toggleable) */}
      <div className="flex flex-wrap gap-x-4 gap-y-1 mb-4">
        {[...STACKED_SERIES].reverse().map((s) => (
          <button
            key={s.key}
            onClick={() => toggleSeries(s.key)}
            className={`flex items-center gap-1.5 text-xs transition-opacity ${
              visibleSeries.has(s.key) ? "opacity-100" : "opacity-40"
            }`}
          >
            <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: s.color }} />
            <span className="text-text-secondary">{s.label}</span>
          </button>
        ))}
        <button
          onClick={() => toggleSeries("costBasis")}
          className={`flex items-center gap-1.5 text-xs transition-opacity ${
            visibleSeries.has("costBasis") ? "opacity-100" : "opacity-40"
          }`}
        >
          <span className="w-3 border-t-2 border-dashed" style={{ borderColor: COST_BASIS.color }} />
          <span className="text-text-secondary">{COST_BASIS.label}</span>
        </button>
      </div>

      {/* Chart — stacked area */}
      <ResponsiveContainer width="100%" height={300}>
        <AreaChart data={chartData}>
          <defs>
            {STACKED_SERIES.map((s) => (
              <linearGradient key={s.key} id={`grad-${s.key}`} x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor={s.color} stopOpacity={0.4} />
                <stop offset="100%" stopColor={s.color} stopOpacity={0.05} />
              </linearGradient>
            ))}
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke="#2a2a2a" vertical={false} />
          <XAxis
            dataKey="date"
            tickFormatter={formatDateShort}
            stroke="#606078"
            fontSize={11}
            tickLine={false}
            axisLine={false}
          />
          <YAxis
            tickFormatter={(v) => `$${v >= 1000 ? `${(v / 1000).toFixed(1)}k` : v.toFixed(0)}`}
            stroke="#606078"
            fontSize={11}
            tickLine={false}
            axisLine={false}
            width={55}
          />
          <Tooltip content={<CustomTooltip />} />

          {/* Cost basis (dashed, non-stacked) — rendered first so it's behind */}
          {visibleSeries.has("costBasis") && (
            <Area
              type="monotone"
              dataKey="costBasis"
              stroke="#9090a8"
              strokeWidth={1.5}
              strokeDasharray="6 4"
              fill="none"
              dot={false}
            />
          )}

          {/* Stacked areas: sealed (bottom) → raw → graded (top) */}
          {STACKED_SERIES.map((s) => (
            <Area
              key={s.key}
              type="monotone"
              dataKey={s.key}
              stackId="portfolio"
              stroke={visibleSeries.has(s.key) ? s.color : "transparent"}
              strokeWidth={visibleSeries.has(s.key) ? 2 : 0}
              fill={visibleSeries.has(s.key) ? `url(#grad-${s.key})` : "transparent"}
              dot={false}
            />
          ))}
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}
