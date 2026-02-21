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
    <div className="bg-surface border border-border rounded-2xl p-4 md:p-6 hover:border-border-hover">
      <div className="flex items-start justify-between">
        <div className="min-w-0 flex-1">
          <p className="text-xs md:text-sm text-text-muted font-medium">{label}</p>
          <p className="text-lg md:text-2xl font-bold text-text-primary mt-1 truncate">{value}</p>
          {change && (
            <p
              className={clsx(
                "text-xs md:text-sm font-medium mt-1 md:mt-2 truncate",
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
            "w-9 h-9 md:w-12 md:h-12 rounded-xl flex items-center justify-center flex-shrink-0 ml-2",
            changeType === "positive" && "bg-success-muted",
            changeType === "negative" && "bg-danger-muted",
            changeType === "neutral" && "bg-accent-muted"
          )}
        >
          <Icon
            className={clsx(
              "w-4 h-4 md:w-6 md:h-6",
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
