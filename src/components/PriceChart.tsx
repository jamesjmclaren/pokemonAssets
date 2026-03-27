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
import type { PriceHistoryPoint } from "@/types";

interface PriceChartProps {
  externalId: string;
  assetId?: string;
  cardName?: string;
  purchasePrice?: number;
  assetType?: "card" | "sealed" | "comic";
  className?: string;
}

const TIME_RANGES = [
  { label: "30D", days: 30 },
  { label: "90D", days: 90 },
  { label: "1Y", days: 365 },
  { label: "All", days: 9999 },
];

export default function PriceChart({
  externalId,
  assetId,
  cardName,
  purchasePrice,
  assetType,
  className = "",
}: PriceChartProps) {
  const [data, setData] = useState<PriceHistoryPoint[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [range, setRange] = useState(90);

  useEffect(() => {
    async function fetchHistory() {
      setLoading(true);
      setError(null);
      try {
        const endDate = new Date().toISOString().split("T")[0];
        const startDate = new Date(Date.now() - range * 86400000)
          .toISOString()
          .split("T")[0];
        const nameParam = cardName ? `&name=${encodeURIComponent(cardName)}` : "";
        const typeParam = assetType ? `&assetType=${assetType}` : "";
        const assetIdParam = assetId ? `&assetId=${assetId}` : "";
        const res = await fetch(
          `/api/price-history?cardId=${encodeURIComponent(externalId)}&startDate=${startDate}&endDate=${endDate}${nameParam}${typeParam}${assetIdParam}`
        );
        if (!res.ok) throw new Error("Failed to fetch price history");
        const json = await res.json();

        const points: PriceHistoryPoint[] = Array.isArray(json)
          ? json
          : json.data || json.history || json.priceHistory || [];

        setData(points);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Error loading chart");
      } finally {
        setLoading(false);
      }
    }
    fetchHistory();
  }, [externalId, assetId, cardName, assetType, range]);

  if (loading) {
    return (
      <div className={`bg-surface border border-border rounded-2xl p-6 ${className}`}>
        <div className="skeleton h-64 rounded-xl" />
      </div>
    );
  }

  if (error || data.length === 0) {
    return (
      <div className={`bg-surface border border-border rounded-2xl p-6 ${className}`}>
        <h3 className="text-sm font-semibold text-text-primary mb-4">
          Price History
        </h3>
        <div className="h-64 flex items-center justify-center">
          <p className="text-text-muted text-sm">
            {error || "No price history available yet"}
          </p>
        </div>
      </div>
    );
  }

  const prices = data.map((d) => d.price);
  const minPrice = Math.min(...prices) * 0.95;
  const maxPrice = Math.max(...prices) * 1.05;
  const currentPrice = prices[prices.length - 1];
  const startPrice = prices[0];
  const isUp = currentPrice >= startPrice;

  return (
    <div className={`bg-surface border border-border rounded-2xl p-6 ${className}`}>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h3 className="text-sm font-semibold text-text-primary">
            Price History
          </h3>
          <p className={`text-xs mt-1 ${isUp ? "text-success" : "text-danger"}`}>
            {isUp ? "+" : ""}
            {((currentPrice - startPrice) / startPrice * 100).toFixed(2)}% over{" "}
            {range} days
          </p>
        </div>
        <div className="flex gap-1 bg-background rounded-xl p-1">
          {TIME_RANGES.map((r) => (
            <button
              key={r.days}
              onClick={() => setRange(r.days)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium ${
                range === r.days
                  ? "bg-accent text-black"
                  : "text-text-secondary hover:text-text-primary"
              }`}
            >
              {r.label}
            </button>
          ))}
        </div>
      </div>

      <ResponsiveContainer width="100%" height={280}>
        <AreaChart data={data}>
          <defs>
            <linearGradient id="priceGradient" x1="0" y1="0" x2="0" y2="1">
              <stop
                offset="0%"
                stopColor={isUp ? "#22c55e" : "#ef4444"}
                stopOpacity={0.3}
              />
              <stop
                offset="100%"
                stopColor={isUp ? "#22c55e" : "#ef4444"}
                stopOpacity={0}
              />
            </linearGradient>
          </defs>
          <CartesianGrid
            strokeDasharray="3 3"
            stroke="#2a2a2a"
            vertical={false}
          />
          <XAxis
            dataKey="date"
            tickFormatter={formatDateShort}
            stroke="#606078"
            fontSize={11}
            tickLine={false}
            axisLine={false}
          />
          <YAxis
            domain={[minPrice, maxPrice]}
            tickFormatter={(v) => `$${v.toFixed(0)}`}
            stroke="#606078"
            fontSize={11}
            tickLine={false}
            axisLine={false}
            width={60}
          />
          <Tooltip
            contentStyle={{
              backgroundColor: "#1e1e1e",
              border: "1px solid #2a2a2a",
              borderRadius: "12px",
              padding: "12px",
            }}
            labelStyle={{ color: "#9090a8", fontSize: 12 }}
            formatter={(value: number) => [formatCurrency(value), "Price"]}
            labelFormatter={formatDateShort}
          />
          {purchasePrice && (
            <CartesianGrid
              horizontalPoints={[purchasePrice]}
              stroke="#D4AF37"
              strokeDasharray="8 4"
              strokeOpacity={0.5}
            />
          )}
          <Area
            type="monotone"
            dataKey="price"
            stroke={isUp ? "#22c55e" : "#ef4444"}
            strokeWidth={2}
            fill="url(#priceGradient)"
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}
