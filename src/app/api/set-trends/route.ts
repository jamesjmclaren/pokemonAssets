import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";
import {
  fetchPoketraceCardsBySet,
  getPoketraceTier,
  type PoketraceCard,
} from "@/lib/poketrace";

// Revalidate hourly — Poketrace upstream prices update at most once per day.
export const revalidate = 3600;

export interface TrendCard {
  id: string;
  name: string;
  cardNumber: string | null;
  rarity: string | null;
  image: string | null;
  currentPrice: number;
  prevPrice: number | null;
  absChange: number | null;
  pctChange: number | null;
  saleCount: number | null;
  source: string;
}

export interface SetTrendsResponse {
  set: { slug: string; name: string };
  period: "1d" | "7d";
  raw: TrendCard[];
  psa10: TrendCard[];
  fromCache: boolean;
  fetchedAt: string;
}

function computeTrendCard(card: PoketraceCard, tier: string, period: "1d" | "7d"): TrendCard | null {
  const tierData = getPoketraceTier(card, tier);
  if (!tierData) return null;

  const currentPrice = tierData.avg;
  const prevPrice = period === "1d" ? tierData.avg1d : tierData.avg7d;
  const absChange = prevPrice != null ? currentPrice - prevPrice : null;
  const pctChange =
    absChange != null && prevPrice != null && prevPrice > 0
      ? (absChange / prevPrice) * 100
      : null;

  return {
    id: card.id,
    name: card.name,
    cardNumber: card.cardNumber ?? null,
    rarity: card.rarity ?? null,
    image: card.image ?? null,
    currentPrice,
    prevPrice,
    absChange,
    pctChange,
    saleCount: tierData.saleCount,
    source: tierData.source,
  };
}

function topN(cards: TrendCard[], n: number): TrendCard[] {
  return cards
    .sort((a, b) => b.currentPrice - a.currentPrice)
    .slice(0, n)
    .map((c, i) => ({ ...c, rank: i + 1 } as TrendCard & { rank: number }));
}

async function fromCache(
  setSlug: string,
  period: "1d" | "7d",
  limit: number
): Promise<{ raw: TrendCard[]; psa10: TrendCard[]; setName: string } | null> {
  const today = new Date().toISOString().split("T")[0];

  const { data, error } = await supabase
    .from("set_price_trends")
    .select("*")
    .eq("set_slug", setSlug)
    .eq("period", period)
    .gte("recorded_at", `${today}T00:00:00.000Z`)
    .order("tier_type")
    .order("rank")
    .limit(limit * 2 * 2); // raw + psa10, 2× safety margin

  if (error || !data || data.length === 0) return null;

  const setName = data[0]?.set_name ?? setSlug;

  const toTrendCard = (row: Record<string, unknown>): TrendCard => ({
    id: row.card_id as string,
    name: row.card_name as string,
    cardNumber: (row.card_number as string) ?? null,
    rarity: (row.rarity as string) ?? null,
    image: (row.card_image as string) ?? null,
    currentPrice: Number(row.current_price),
    prevPrice: row.prev_price != null ? Number(row.prev_price) : null,
    absChange: row.abs_change != null ? Number(row.abs_change) : null,
    pctChange: row.pct_change != null ? Number(row.pct_change) : null,
    saleCount: row.sale_count != null ? Number(row.sale_count) : null,
    source: (row.source as string) ?? "",
  });

  const raw = data.filter((r: Record<string, unknown>) => r.tier_type === "raw").slice(0, limit).map(toTrendCard);
  const psa10 = data.filter((r: Record<string, unknown>) => r.tier_type === "psa10").slice(0, limit).map(toTrendCard);

  if (raw.length === 0 && psa10.length === 0) return null;

  return { raw, psa10, setName };
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const setSlug = searchParams.get("set");
  const period = (searchParams.get("period") ?? "7d") as "1d" | "7d";
  const limit = Math.min(Number(searchParams.get("limit") ?? "10"), 25);

  if (!setSlug) {
    return NextResponse.json({ error: "set parameter is required" }, { status: 400 });
  }
  if (period !== "1d" && period !== "7d") {
    return NextResponse.json({ error: "period must be 1d or 7d" }, { status: 400 });
  }

  // Try cache first
  const cached = await fromCache(setSlug, period, limit);
  if (cached) {
    const response: SetTrendsResponse = {
      set: { slug: setSlug, name: cached.setName },
      period,
      raw: cached.raw,
      psa10: cached.psa10,
      fromCache: true,
      fetchedAt: new Date().toISOString(),
    };
    return NextResponse.json(response);
  }

  // Live fetch from Poketrace
  let cards: PoketraceCard[];
  try {
    cards = await fetchPoketraceCardsBySet(setSlug, "US", { pageSize: 100, maxPages: 6 });
  } catch (err) {
    console.error("[set-trends] fetchPoketraceCardsBySet failed:", err);
    return NextResponse.json({ error: "Failed to fetch set cards" }, { status: 502 });
  }

  if (cards.length === 0) {
    return NextResponse.json({ error: "Set not found or has no cards" }, { status: 404 });
  }

  const setName = cards[0]?.set?.name ?? setSlug;

  const rawCards: TrendCard[] = [];
  const psa10Cards: TrendCard[] = [];

  for (const card of cards) {
    const rawEntry = computeTrendCard(card, "NEAR_MINT", period);
    if (rawEntry) rawCards.push(rawEntry);

    const psa10Entry = computeTrendCard(card, "PSA_10", period);
    if (psa10Entry) psa10Cards.push(psa10Entry);
  }

  const response: SetTrendsResponse = {
    set: { slug: setSlug, name: setName },
    period,
    raw: topN(rawCards, limit),
    psa10: topN(psa10Cards, limit),
    fromCache: false,
    fetchedAt: new Date().toISOString(),
  };

  return NextResponse.json(response);
}
