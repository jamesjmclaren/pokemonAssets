"use client";

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

interface PortfolioChartProps {
  data: Array<{ date: string; value: number; invested: number }>;
  className?: string;
}

export default function PortfolioChart({ data, className = "" }: PortfolioChartProps) {
  if (data.length === 0) {
    return (
      <div className={`bg-surface border border-border rounded-2xl p-6 ${className}`}>
        <h3 className="text-sm font-semibold text-text-primary mb-4">
          Portfolio Value
        </h3>
        <div className="h-64 flex items-center justify-center">
          <p className="text-text-muted text-sm">
            Add assets to see portfolio value over time
          </p>
        </div>
      </div>
    );
  }

  const latestValue = data[data.length - 1]?.value ?? 0;
  const latestInvested = data[data.length - 1]?.invested ?? 0;
  const isUp = latestValue >= latestInvested;

  return (
    <div className={`bg-surface border border-border rounded-2xl p-6 ${className}`}>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h3 className="text-sm font-semibold text-text-primary">
            Portfolio Value
          </h3>
          <div className="flex items-baseline gap-3 mt-1">
            <span className="text-2xl font-bold text-text-primary">
              {formatCurrency(latestValue)}
            </span>
            <span className={`text-sm font-medium ${isUp ? "text-success" : "text-danger"}`}>
              {isUp ? "+" : ""}
              {formatCurrency(latestValue - latestInvested)}
            </span>
          </div>
        </div>
      </div>

      <ResponsiveContainer width="100%" height={280}>
        <AreaChart data={data}>
          <defs>
            <linearGradient id="valueGradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#6366f1" stopOpacity={0.3} />
              <stop offset="100%" stopColor="#6366f1" stopOpacity={0} />
            </linearGradient>
            <linearGradient id="investedGradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#9090a8" stopOpacity={0.1} />
              <stop offset="100%" stopColor="#9090a8" stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke="#2a2a3a" vertical={false} />
          <XAxis
            dataKey="date"
            tickFormatter={formatDateShort}
            stroke="#606078"
            fontSize={11}
            tickLine={false}
            axisLine={false}
          />
          <YAxis
            tickFormatter={(v) => `$${v.toFixed(0)}`}
            stroke="#606078"
            fontSize={11}
            tickLine={false}
            axisLine={false}
            width={60}
          />
          <Tooltip
            contentStyle={{
              backgroundColor: "#1e1e2a",
              border: "1px solid #2a2a3a",
              borderRadius: "12px",
              padding: "12px",
            }}
            labelStyle={{ color: "#9090a8", fontSize: 12 }}
            formatter={(value: number, name: string) => [
              formatCurrency(value),
              name === "value" ? "Current Value" : "Total Invested",
            ]}
            labelFormatter={formatDateShort}
          />
          <Area
            type="monotone"
            dataKey="invested"
            stroke="#606078"
            strokeWidth={1}
            strokeDasharray="4 4"
            fill="url(#investedGradient)"
          />
          <Area
            type="monotone"
            dataKey="value"
            stroke="#6366f1"
            strokeWidth={2}
            fill="url(#valueGradient)"
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}
