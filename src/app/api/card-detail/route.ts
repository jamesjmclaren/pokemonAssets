import { NextRequest, NextResponse } from "next/server";
import {
  getRawPoketraceCard,
  inferAssetType,
  type PoketraceCard,
} from "@/lib/poketrace";
import { convertToUsd } from "@/lib/exchange-rate";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const RAW_TIERS = new Set(["NEAR_MINT", "Near Mint", "NM", "LIGHTLY_PLAYED", "Lightly Played", "LP", "MODERATELY_PLAYED", "Moderately Played", "HEAVILY_PLAYED", "Heavily Played", "DAMAGED", "Damaged"]);

function isRawTier(tier: string) {
  return RAW_TIERS.has(tier) || (!tier.startsWith("PSA") && !tier.startsWith("CGC") && !tier.startsWith("BGS") && !tier.startsWith("SGC") && !tier.startsWith("ACE") && !tier.startsWith("TAG"));
}

function formatTierLabel(tier: string): string {
  // NEAR_MINT → Near Mint, PSA_10 → PSA 10, CGC_9_5 → CGC 9.5
  if (tier === "NEAR_MINT" || tier === "Near Mint" || tier === "NM") return "Near Mint";
  if (tier === "LIGHTLY_PLAYED" || tier === "Lightly Played" || tier === "LP") return "Lightly Played";
  if (tier === "MODERATELY_PLAYED" || tier === "Moderately Played") return "Mod. Played";
  if (tier === "HEAVILY_PLAYED" || tier === "Heavily Played") return "Heavily Played";
  if (tier === "DAMAGED" || tier === "Damaged") return "Damaged";

  // PSA_10 → "PSA 10", CGC_9_5 → "CGC 9.5"
  const parts = tier.split("_");
  if (parts.length === 2) return `${parts[0]} ${parts[1]}`;
  if (parts.length === 3) return `${parts[0]} ${parts[1]}.${parts[2]}`;
  return tier.replace(/_/g, " ");
}

const GRADED_ORDER = [
  "PSA_10", "PSA_9_5", "PSA_9", "PSA_8_5", "PSA_8", "PSA_7", "PSA_6", "PSA_5", "PSA_4", "PSA_3", "PSA_2", "PSA_1",
  "CGC_10", "CGC_9_5", "CGC_9", "CGC_8_5", "CGC_8",
  "BGS_10", "BGS_9_5", "BGS_9", "BGS_8_5", "BGS_8",
  "SGC_10", "SGC_9_5", "SGC_9",
  "ACE_10", "TAG_10",
];

function gradedSortKey(tier: string): number {
  const idx = GRADED_ORDER.indexOf(tier);
  return idx === -1 ? 999 : idx;
}

interface TierSummary {
  tier: string;
  label: string;
  source: string;
  avg: number;
  low?: number;
  high?: number;
  saleCount?: number;
  avg1d?: number | null;
  avg7d?: number | null;
  avg30d?: number | null;
}

function extractAllTiers(
  card: PoketraceCard,
  isEur: boolean,
  eurToUsd: number
): { rawPrices: Record<string, TierSummary>; gradedPrices: TierSummary[] } {
  const prices = card.prices || {};
  const sources = ["tcgplayer", "ebay", "cardmarket"] as const;
  const rawPricesMap: Record<string, TierSummary> = {};
  const gradedMap: Record<string, TierSummary> = {};

  for (const source of sources) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const sourceData = (prices as any)[source] as Record<string, { avg: number; low?: number; high?: number; saleCount?: number; approxSaleCount?: number; avg1d?: number; avg7d?: number; avg30d?: number }> | undefined;
    if (!sourceData) continue;

    for (const [tier, data] of Object.entries(sourceData)) {
      if (!data?.avg || data.avg <= 0) continue;

      const scale = isEur ? eurToUsd : 1;
      const summary: TierSummary = {
        tier,
        label: formatTierLabel(tier),
        source,
        avg: Math.round(data.avg * scale * 100) / 100,
        low: data.low != null ? Math.round(data.low * scale * 100) / 100 : undefined,
        high: data.high != null ? Math.round(data.high * scale * 100) / 100 : undefined,
        saleCount: data.saleCount ?? data.approxSaleCount ?? undefined,
        avg1d: data.avg1d != null ? Math.round(data.avg1d * scale * 100) / 100 : null,
        avg7d: data.avg7d != null ? Math.round(data.avg7d * scale * 100) / 100 : null,
        avg30d: data.avg30d != null ? Math.round(data.avg30d * scale * 100) / 100 : null,
      };

      if (isRawTier(tier)) {
        // For raw tiers, keep one entry per (normalized) tier per source
        const key = `${source}:${tier}`;
        rawPricesMap[key] = summary;
      } else {
        // For graded tiers, keep the best source per tier (prefer ebay for graded)
        if (!gradedMap[tier] || source === "ebay") {
          gradedMap[tier] = summary;
        }
      }
    }
  }

  // Build raw prices as a source-keyed object (one NM per source)
  const rawPrices: Record<string, TierSummary> = {};
  const RAW_ALIASES = ["NEAR_MINT", "Near Mint", "NM"];
  for (const source of sources) {
    for (const alias of RAW_ALIASES) {
      const key = `${source}:${alias}`;
      if (rawPricesMap[key]) {
        rawPrices[source] = rawPricesMap[key];
        break;
      }
    }
    // If no NM for this source, try first available raw tier
    if (!rawPrices[source]) {
      for (const [key, summary] of Object.entries(rawPricesMap)) {
        if (key.startsWith(`${source}:`)) {
          rawPrices[source] = summary;
          break;
        }
      }
    }
  }

  const gradedPrices = Object.values(gradedMap).sort(
    (a, b) => gradedSortKey(a.tier) - gradedSortKey(b.tier)
  );

  return { rawPrices, gradedPrices };
}

// ---------------------------------------------------------------------------
// Route handler
// ---------------------------------------------------------------------------

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const poketraceId = searchParams.get("poketraceId");

  if (!poketraceId) {
    return NextResponse.json({ error: "poketraceId is required" }, { status: 400 });
  }

  try {
    const card = await getRawPoketraceCard(poketraceId);
    if (!card) {
      return NextResponse.json({ error: "Card not found" }, { status: 404 });
    }

    // Determine EUR → USD conversion rate if needed
    let eurToUsd = 1;
    const isEur = card.currency === "EUR";
    if (isEur) {
      const { rate } = await convertToUsd(1, "EUR");
      eurToUsd = rate;
    }

    const { rawPrices, gradedPrices } = extractAllTiers(card, isEur, eurToUsd);

    return NextResponse.json({
      id: card.id,
      name: card.name,
      setName: card.set?.name || "",
      setSlug: card.set?.slug || "",
      cardNumber: card.cardNumber || null,
      rarity: card.rarity || null,
      image: card.image || null,
      type: inferAssetType(card),
      currency: isEur ? "USD" : (card.currency || "USD"),
      isConverted: isEur,
      market: card.market || "US",
      rawPrices,
      gradedPrices,
    });
  } catch (error) {
    console.error("Card detail fetch error:", error);
    return NextResponse.json({ error: "Failed to fetch card details" }, { status: 500 });
  }
}
