import { TrendingUp, TrendingDown, Minus } from "lucide-react";
import { clsx } from "clsx";

interface TrendBadgeProps {
  absChange: number | null;
  pctChange: number | null;
  size?: "sm" | "md";
}

export default function TrendBadge({ absChange, pctChange, size = "md" }: TrendBadgeProps) {
  // Three empty-state cases worth distinguishing:
  //  - null: Poketrace had no comparable prior price → "no data"
  //  - flat: a real reading that happens to be ~0% → "0%"
  if (absChange == null || pctChange == null) {
    return (
      <span
        className={clsx(
          "inline-flex items-center gap-1 italic text-text-muted",
          size === "sm" ? "text-[11px]" : "text-xs"
        )}
        title="Poketrace has no recent sales for this card"
      >
        no sales data
      </span>
    );
  }

  const isFlat = Math.abs(pctChange) < 0.05;
  if (isFlat) {
    return (
      <span className={clsx(
        "inline-flex items-center gap-1 text-text-muted",
        size === "sm" ? "text-xs" : "text-sm"
      )}>
        <Minus className={size === "sm" ? "w-3 h-3" : "w-4 h-4"} />
        <span>0%</span>
      </span>
    );
  }

  const isUp = absChange >= 0;

  return (
    <span className={clsx(
      "inline-flex items-center gap-1 font-medium",
      size === "sm" ? "text-xs" : "text-sm",
      isUp ? "text-success" : "text-danger"
    )}>
      {isUp
        ? <TrendingUp className={size === "sm" ? "w-3 h-3" : "w-4 h-4"} />
        : <TrendingDown className={size === "sm" ? "w-3 h-3" : "w-4 h-4"} />
      }
      <span>
        {isUp ? "+" : ""}{pctChange.toFixed(1)}%
      </span>
      <span className={clsx(
        "opacity-70",
        size === "sm" ? "hidden" : "inline"
      )}>
        ({isUp ? "+" : ""}${Math.abs(absChange).toFixed(2)})
      </span>
    </span>
  );
}
