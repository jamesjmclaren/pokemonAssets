import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { supabase } from "@/lib/supabase";
import { getRawPoketraceCard } from "@/lib/poketrace";

/**
 * GET /api/assets/[id]/graded-values
 *
 * Returns all available graded price tiers for the asset's linked Poketrace card.
 * Each tier includes avg, low, high, and sale count when available.
 */

interface GradedValue {
  tier: string;
  label: string;
  avg: number;
  low: number | null;
  high: number | null;
  saleCount: number | null;
  source: string;
}

/** Map a Poketrace tier key to a human-readable label */
function tierToLabel(tier: string): string {
  const t = tier.toUpperCase();

  // Raw conditions
  if (t === "NEAR_MINT" || t === "NM") return "Near Mint";
  if (t === "LIGHTLY_PLAYED" || t === "LP") return "Lightly Played";
  if (t === "MODERATELY_PLAYED" || t === "MP") return "Moderately Played";
  if (t === "HEAVILY_PLAYED" || t === "HP") return "Heavily Played";
  if (t === "DAMAGED" || t === "DMG") return "Damaged";

  // Graded — e.g. PSA_10, CGC_9.5, BGS_9_5
  const match = t.match(/^(PSA|CGC|BGS|SGC|ACE|TAG)_(\d+(?:[._]\d+)?)$/);
  if (match) {
    const company = match[1];
    const grade = match[2].replace("_", ".");
    return `${company} ${grade}`;
  }

  // Fallback: title case the tier key
  return tier
    .replace(/_/g, " ")
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

/** Sort priority: higher grades first, grouped by company */
const COMPANY_ORDER: Record<string, number> = {
  PSA: 0,
  BGS: 1,
  CGC: 2,
  SGC: 3,
  ACE: 4,
  TAG: 5,
};

function tierSortKey(tier: string): number {
  const t = tier.toUpperCase();

  // Raw conditions go last
  if (!t.match(/^(PSA|CGC|BGS|SGC|ACE|TAG)_/)) return 9999;

  const match = t.match(/^(PSA|CGC|BGS|SGC|ACE|TAG)_(\d+(?:[._]\d+)?)$/);
  if (!match) return 9998;

  const company = match[1];
  const grade = parseFloat(match[2].replace("_", "."));

  // Lower company order + higher grade = higher priority
  return (COMPANY_ORDER[company] ?? 6) * 100 + (100 - grade * 10);
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { userId } = await auth();
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;

  try {
    // Fetch the asset
    const { data: asset, error: fetchError } = await supabase
      .from("assets")
      .select("id, portfolio_id, poketrace_id, psa_grade, name")
      .eq("id", id)
      .single();

    if (fetchError || !asset) {
      return NextResponse.json({ error: "Asset not found" }, { status: 404 });
    }

    // Verify user has access
    const { data: portfolio } = await supabase
      .from("portfolios")
      .select("owner_id")
      .eq("id", asset.portfolio_id)
      .single();

    const isOwner = portfolio?.owner_id === userId;
    if (!isOwner) {
      const { data: member } = await supabase
        .from("portfolio_members")
        .select("role")
        .eq("portfolio_id", asset.portfolio_id)
        .eq("user_id", userId)
        .single();

      if (!member) {
        return NextResponse.json({ error: "Forbidden" }, { status: 403 });
      }
    }

    if (!asset.poketrace_id) {
      return NextResponse.json({ gradedValues: [], message: "Asset is not linked to Poketrace" });
    }

    // Fetch raw card from Poketrace
    const card = await getRawPoketraceCard(asset.poketrace_id);
    if (!card || !card.prices) {
      return NextResponse.json({ gradedValues: [], message: "Could not fetch pricing data" });
    }

    // Collect all tiers from all sources, preferring tcgplayer > ebay > cardmarket
    const tierMap = new Map<string, GradedValue>();
    const sources = [
      { data: card.prices.tcgplayer, name: "TCGPlayer" },
      { data: card.prices.ebay, name: "eBay" },
      { data: card.prices.cardmarket, name: "CardMarket" },
    ];

    for (const { data: sourceData, name: sourceName } of sources) {
      if (!sourceData) continue;
      for (const [tier, tierData] of Object.entries(sourceData)) {
        if (!tierData?.avg || tierMap.has(tier)) continue;
        tierMap.set(tier, {
          tier,
          label: tierToLabel(tier),
          avg: tierData.avg,
          low: tierData.low ?? null,
          high: tierData.high ?? null,
          saleCount: tierData.saleCount ?? tierData.approxSaleCount ?? null,
          source: sourceName,
        });
      }
    }

    // Sort: graded tiers first (PSA 10 → PSA 1), then raw conditions
    const gradedValues = Array.from(tierMap.values()).sort(
      (a, b) => tierSortKey(a.tier) - tierSortKey(b.tier)
    );

    return NextResponse.json({
      gradedValues,
      currentGrade: asset.psa_grade || null,
    });
  } catch (error) {
    console.error(`[graded-values] Error for asset ${id}:`, error instanceof Error ? error.message : error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to fetch graded values" },
      { status: 500 }
    );
  }
}
