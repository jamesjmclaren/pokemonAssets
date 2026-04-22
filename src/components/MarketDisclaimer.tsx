import { Info } from "lucide-react";
import { getMarketDisclaimer } from "@/lib/format";

type Market = "US" | "EU" | string | null | undefined;

interface Props {
  market?: Market;
  variant?: "short" | "long";
  className?: string;
  showIcon?: boolean;
}

export default function MarketDisclaimer({
  market,
  variant = "short",
  className = "",
  showIcon = false,
}: Props) {
  const text = getMarketDisclaimer(market, variant);
  return (
    <span
      className={`inline-flex items-center gap-1 text-xs text-text-muted ${className}`}
    >
      {showIcon && <Info className="w-3 h-3 flex-shrink-0" aria-hidden />}
      <span>{text}</span>
    </span>
  );
}
