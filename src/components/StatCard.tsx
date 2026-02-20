"use client";

import { clsx } from "clsx";
import type { LucideIcon } from "lucide-react";

interface StatCardProps {
  label: string;
  value: string;
  change?: string;
  changeType?: "positive" | "negative" | "neutral";
  icon: LucideIcon;
}

export default function StatCard({
  label,
  value,
  change,
  changeType = "neutral",
  icon: Icon,
}: StatCardProps) {
  return (
    <div className="bg-surface border border-border rounded-2xl p-6 hover:border-border-hover">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-sm text-text-muted font-medium">{label}</p>
          <p className="text-2xl font-bold text-text-primary mt-1">{value}</p>
          {change && (
            <p
              className={clsx(
                "text-sm font-medium mt-2",
                changeType === "positive" && "text-success",
                changeType === "negative" && "text-danger",
                changeType === "neutral" && "text-text-secondary"
              )}
            >
              {change}
            </p>
          )}
        </div>
        <div
          className={clsx(
            "w-12 h-12 rounded-xl flex items-center justify-center",
            changeType === "positive" && "bg-success-muted",
            changeType === "negative" && "bg-danger-muted",
            changeType === "neutral" && "bg-accent-muted"
          )}
        >
          <Icon
            className={clsx(
              "w-6 h-6",
              changeType === "positive" && "text-success",
              changeType === "negative" && "text-danger",
              changeType === "neutral" && "text-accent"
            )}
          />
        </div>
      </div>
    </div>
  );
}
