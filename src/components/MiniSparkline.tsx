"use client";

import { useState, useEffect } from "react";

interface MiniSparklineProps {
  assetId: string;
  assetName: string;
  assetType: "card" | "sealed";
  currentPrice: number;
  purchasePrice: number;
}

export default function MiniSparkline({
  currentPrice,
  purchasePrice,
}: MiniSparklineProps) {
  const [points, setPoints] = useState<number[]>([]);

  useEffect(() => {
    // Generate a simple sparkline from purchase price to current price
    // In production this would fetch real price history
    const steps = 12;
    const start = purchasePrice;
    const end = currentPrice;
    const generated: number[] = [];

    for (let i = 0; i <= steps; i++) {
      const progress = i / steps;
      const base = start + (end - start) * progress;
      // Add slight variation for visual interest
      const noise = (Math.sin(i * 1.5) * 0.03 + Math.cos(i * 0.7) * 0.02) * base;
      generated.push(Math.max(0, base + noise));
    }

    setPoints(generated);
  }, [currentPrice, purchasePrice]);

  if (points.length < 2) return null;

  const min = Math.min(...points);
  const max = Math.max(...points);
  const range = max - min || 1;
  const width = 96;
  const height = 32;
  const padding = 2;

  const pathPoints = points.map((p, i) => {
    const x = padding + (i / (points.length - 1)) * (width - padding * 2);
    const y = height - padding - ((p - min) / range) * (height - padding * 2);
    return `${x},${y}`;
  });

  const d = `M${pathPoints.join(" L")}`;
  const isUp = currentPrice >= purchasePrice;
  const color = isUp ? "#22c55e" : "#ef4444";

  return (
    <svg viewBox={`0 0 ${width} ${height}`} className="w-full h-full">
      <path
        d={d}
        fill="none"
        stroke={color}
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}
