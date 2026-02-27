"use client";

import { useState, useEffect } from "react";
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

const SERIES: Array<{ key: string; label: string; color: string; dashed?: boolean }> = [
  { key: "total", label: "Total", color: "#6366f1" },
  { key: "raw", label: "Raw Cards", color: "#f97316" },
  { key: "graded", label: "Graded Cards", color: "#a78bfa" },
  { key: "sealed", label: "Sealed Products", color: "#22c55e" },
  { key: "costBasis", label: "Cost Basis", color: "#9090a8", dashed: true },
];

export default function PortfolioChart({ portfolioId, className = "" }: PortfolioChartProps) {
  const [range, setRange] = useState<TimeRange>("3M");
  const [data, setData] = useState<ChartPoint[]>([]);
  const [loading, setLoading] = useState(true);
  const [visibleSeries, setVisibleSeries] = useState<Set<string>>(
    new Set(["total", "raw", "graded", "sealed", "costBasis"])
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
        </div>

        {/* Time range + Legend */}
        <div className="flex flex-wrap items-center gap-3">
          {/* Time range buttons */}
          <div className="flex rounded-lg border border-border overflow-hidden">
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
      </div>

      {/* Legend */}
      <div className="flex flex-wrap gap-x-4 gap-y-1 mb-4">
        {SERIES.map((s) => (
          <button
            key={s.key}
            onClick={() => toggleSeries(s.key)}
            className={`flex items-center gap-1.5 text-xs transition-opacity ${
              visibleSeries.has(s.key) ? "opacity-100" : "opacity-40"
            }`}
          >
            {s.dashed ? (
              <span className="w-3 border-t-2 border-dashed" style={{ borderColor: s.color }} />
            ) : (
              <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: s.color }} />
            )}
            <span className="text-text-secondary">{s.label}</span>
          </button>
        ))}
      </div>

      {/* Chart */}
      <ResponsiveContainer width="100%" height={300}>
        <AreaChart data={data}>
          <defs>
            {SERIES.filter((s) => !s.dashed).map((s) => (
              <linearGradient key={s.key} id={`grad-${s.key}`} x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor={s.color} stopOpacity={s.key === "total" ? 0.25 : 0.15} />
                <stop offset="100%" stopColor={s.color} stopOpacity={0} />
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
          <Tooltip
            contentStyle={{
              backgroundColor: "#1e1e1e",
              border: "1px solid #2a2a2a",
              borderRadius: "12px",
              padding: "12px",
            }}
            labelStyle={{ color: "#9090a8", fontSize: 12 }}
            formatter={(value: number, name: string) => {
              const series = SERIES.find((s) => s.key === name);
              return [formatCurrency(value), series?.label ?? name];
            }}
            labelFormatter={formatDateShort}
          />

          {/* Cost basis (dashed) — render first so it's behind */}
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

          {/* Sealed */}
          {visibleSeries.has("sealed") && (
            <Area
              type="monotone"
              dataKey="sealed"
              stroke="#22c55e"
              strokeWidth={2}
              fill="url(#grad-sealed)"
              dot={false}
            />
          )}

          {/* Graded */}
          {visibleSeries.has("graded") && (
            <Area
              type="monotone"
              dataKey="graded"
              stroke="#a78bfa"
              strokeWidth={2}
              fill="url(#grad-graded)"
              dot={false}
            />
          )}

          {/* Raw */}
          {visibleSeries.has("raw") && (
            <Area
              type="monotone"
              dataKey="raw"
              stroke="#f97316"
              strokeWidth={2}
              fill="url(#grad-raw)"
              dot={false}
            />
          )}

          {/* Total — on top */}
          {visibleSeries.has("total") && (
            <Area
              type="monotone"
              dataKey="total"
              stroke="#6366f1"
              strokeWidth={2.5}
              fill="url(#grad-total)"
              dot={false}
            />
          )}
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}
