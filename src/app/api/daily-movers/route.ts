import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { supabase } from "@/lib/supabase";
import { getPoketracePriceHistory } from "@/lib/poketrace";

// Cache aggressively — asset-level price history is updated at most once
// per day upstream, and fan-out is expensive.
export const revalidate = 3600;

interface MoverRow {
  assetId: string;
  name: string;
  setName: string | null;
  imageUrl: string | null;
  poketraceId: string;
  poketraceMarket: string;
  grade: string | null;
  latestDate: string | null;
  latestPrice: number | null;
  previousDate: string | null;
  previousPrice: number | null;
  absChange: number | null;
  pctChange: number | null;
}

async function getUserPortfolioIds(userId: string): Promise<string[]> {
  const { data: owned } = await supabase
    .from("portfolios")
    .select("id")
    .eq("owner_id", userId);
  const { data: member } = await supabase
    .from("portfolio_members")
    .select("portfolio_id")
    .eq("user_id", userId)
    .not("accepted_at", "is", null);
  const ownedIds = owned?.map((p) => p.id) || [];
  const memberIds = member?.map((m) => m.portfolio_id) || [];
  return [...ownedIds, ...memberIds];
}

async function fetchTwoDayPoints(
  poketraceId: string,
  grade: string | null
): Promise<{ latest?: { date: string; price: number }; previous?: { date: string; price: number } }> {
  const tier = grade ? gradeToTier(grade) : "NEAR_MINT";
  const now = new Date();
  const from = new Date(now.getTime() - 14 * 24 * 60 * 60 * 1000) // 2 weeks for sparse tiers
    .toISOString()
    .split("T")[0];
  const points = await getPoketracePriceHistory(poketraceId, tier, from);
  if (points.length === 0) return {};
  // points sorted ascending by date; take last two
  const latest = points[points.length - 1];
  const previous = points.length >= 2 ? points[points.length - 2] : undefined;
  return {
    latest: { date: latest.date, price: latest.price },
    previous: previous ? { date: previous.date, price: previous.price } : undefined,
  };
}

function gradeToTier(grade: string): string {
  // Minimal mapping matching src/lib/poketrace.ts gradeToPoketraceTier behaviour.
  const g = grade.toUpperCase().replace(/\s+/g, "_");
  if (g.startsWith("PSA_10")) return "PSA_10";
  if (g.startsWith("PSA_9.5") || g === "PSA_9_5") return "PSA_9_5";
  if (g.startsWith("PSA_9")) return "PSA_9";
  if (g.startsWith("PSA_8")) return "PSA_8";
  if (g.startsWith("CGC_10")) return "CGC_10";
  if (g.startsWith("BGS_10")) return "BGS_10";
  return "NEAR_MINT";
}

async function processInBatches<T, R>(
  items: T[],
  size: number,
  worker: (item: T) => Promise<R>
): Promise<R[]> {
  const results: R[] = [];
  for (let i = 0; i < items.length; i += size) {
    const batch = items.slice(i, i + size);
    const out = await Promise.all(batch.map(worker));
    results.push(...out);
  }
  return results;
}

export async function GET(request: NextRequest) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(request.url);
  const portfolioId = searchParams.get("portfolioId");

  const accessibleIds = await getUserPortfolioIds(userId);
  if (accessibleIds.length === 0) return NextResponse.json({ rows: [] });

  const portfolioFilter = portfolioId && accessibleIds.includes(portfolioId) ? [portfolioId] : accessibleIds;

  const { data: assets, error } = await supabase
    .from("assets")
    .select("id, name, set_name, image_url, poketrace_id, poketrace_market, psa_grade, status")
    .in("portfolio_id", portfolioFilter)
    .not("poketrace_id", "is", null)
    .or("status.is.null,status.eq.ACTIVE");

  if (error) {
    console.error("[daily-movers] supabase error:", error);
    return NextResponse.json({ error: "Failed to load assets" }, { status: 500 });
  }

  const rows: MoverRow[] = await processInBatches(assets || [], 8, async (a) => {
    const { latest, previous } = await fetchTwoDayPoints(a.poketrace_id, a.psa_grade);
    const latestPrice = latest?.price ?? null;
    const previousPrice = previous?.price ?? null;
    const absChange = latestPrice != null && previousPrice != null ? latestPrice - previousPrice : null;
    const pctChange =
      latestPrice != null && previousPrice != null && previousPrice > 0
        ? (absChange! / previousPrice) * 100
        : null;
    return {
      assetId: a.id,
      name: a.name,
      setName: a.set_name,
      imageUrl: a.image_url,
      poketraceId: a.poketrace_id,
      poketraceMarket: a.poketrace_market || "US",
      grade: a.psa_grade,
      latestDate: latest?.date ?? null,
      latestPrice,
      previousDate: previous?.date ?? null,
      previousPrice,
      absChange,
      pctChange,
    };
  });

  return NextResponse.json({
    rows,
    fetchedAt: new Date().toISOString(),
  });
}
