import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";
import {
  fetchPoketraceCardsBySet,
  getPoketraceTier,
  inferAssetType,
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
  availableRarities: string[];
  appliedRarities: string[];
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
  return [...cards]
    .sort((a, b) => {
      if (a.pctChange == null && b.pctChange == null) return 0;
      if (a.pctChange == null) return 1;
      if (b.pctChange == null) return -1;
      return b.pctChange - a.pctChange;
    })
    .slice(0, n);
}

function normaliseRarity(r: string | null | undefined): string | null {
  if (!r) return null;
  const trimmed = r.trim();
  if (!trimmed || trimmed.toLowerCase() === "none") return null;
  return trimmed;
}

async function fromCache(
  setSlug: string,
  period: "1d" | "7d",
  limit: number
): Promise<{
  raw: TrendCard[];
  psa10: TrendCard[];
  setName: string;
  availableRarities: string[];
} | null> {
  const today = new Date().toISOString().split("T")[0];

  const { data, error } = await supabase
    .from("set_price_trends")
    .select("*")
    .eq("set_slug", setSlug)
    .eq("period", period)
    .gte("recorded_at", `${today}T00:00:00.000Z`)
    .order("tier_type")
    .order("rank")
    .limit(limit * 2 * 2);

  if (error || !data || data.length === 0) return null;

  const setName = data[0]?.set_name ?? setSlug;

  const toTrendCard = (row: Record<string, unknown>): TrendCard => ({
    id: row.card_id as string,
    name: row.card_name as string,
    cardNumber: (row.card_number as string) ?? null,
    rarity: normaliseRarity(row.rarity as string),
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

  const availableRarities = Array.from(
    new Set([...raw, ...psa10].map((c) => c.rarity).filter((r): r is string => !!r))
  ).sort();

  return { raw, psa10, setName, availableRarities };
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const setSlug = searchParams.get("set");
  const period = (searchParams.get("period") ?? "7d") as "1d" | "7d";
  const limit = Math.min(Number(searchParams.get("limit") ?? "10"), 25);
  const rarityParam = searchParams.get("rarities") ?? "";
  const appliedRarities = rarityParam
    .split(",")
    .map((r) => r.trim())
    .filter(Boolean);
  const hasRarityFilter = appliedRarities.length > 0;
  const rarityFilterSet = new Set(appliedRarities.map((r) => r.toLowerCase()));

  if (!setSlug) {
    return NextResponse.json({ error: "set parameter is required" }, { status: 400 });
  }
  if (period !== "1d" && period !== "7d") {
    return NextResponse.json({ error: "period must be 1d or 7d" }, { status: 400 });
  }

  // Cache only covers the unfiltered ranking. When a rarity filter is applied,
  // skip cache and fall through to a live fetch so we can rank within the
  // filtered subset rather than just filtering pre-ranked top-10s.
  if (!hasRarityFilter) {
    const cached = await fromCache(setSlug, period, limit);
    if (cached) {
      const response: SetTrendsResponse = {
        set: { slug: setSlug, name: cached.setName },
        period,
        raw: cached.raw,
        psa10: cached.psa10,
        availableRarities: cached.availableRarities,
        appliedRarities: [],
        fromCache: true,
        fetchedAt: new Date().toISOString(),
      };
      return NextResponse.json(response);
    }
  }

  let cards: PoketraceCard[];
  try {
    // Poketrace API caps `limit` at 20 per page. Use 20 explicitly and bump
    // maxPages so we cover sets with secret rares numbered well above the
    // printed card count (e.g. #294/217). 20 pages × 20 = 400 cards max.
    cards = await fetchPoketraceCardsBySet(setSlug, "US", { pageSize: 20, maxPages: 20 });
    console.log(`[set-trends] Fetched ${cards.length} cards for set "${setSlug}"`);
  } catch (err) {
    console.error("[set-trends] fetchPoketraceCardsBySet failed:", err);
    return NextResponse.json({ error: "Failed to fetch set cards" }, { status: 502 });
  }

  if (cards.length === 0) {
    return NextResponse.json({ error: "Set not found or has no cards" }, { status: 404 });
  }

  const setName = cards[0]?.set?.name ?? setSlug;

  // Drop sealed products — only rank actual cards.
  const cardsOnly = cards.filter((c) => inferAssetType(c) === "card");

  // Collect all rarities from the card-only set so the UI can offer a filter list.
  const availableRarities = Array.from(
    new Set(cardsOnly.map((c) => normaliseRarity(c.rarity)).filter((r): r is string => !!r))
  ).sort();

  // Filter cards by rarity (if applied) before ranking.
  const filteredCards = hasRarityFilter
    ? cardsOnly.filter((c) => {
        const r = normaliseRarity(c.rarity);
        return r ? rarityFilterSet.has(r.toLowerCase()) : false;
      })
    : cardsOnly;

  const rawCards: TrendCard[] = [];
  const psa10Cards: TrendCard[] = [];

  for (const card of filteredCards) {
    const rawEntry = computeTrendCard(card, "NEAR_MINT", period);
    if (rawEntry) {
      rawEntry.rarity = normaliseRarity(rawEntry.rarity);
      rawCards.push(rawEntry);
    }

    const psa10Entry = computeTrendCard(card, "PSA_10", period);
    if (psa10Entry) {
      psa10Entry.rarity = normaliseRarity(psa10Entry.rarity);
      psa10Cards.push(psa10Entry);
    }
  }

  const response: SetTrendsResponse = {
    set: { slug: setSlug, name: setName },
    period,
    raw: topN(rawCards, limit),
    psa10: topN(psa10Cards, limit),
    availableRarities,
    appliedRarities,
    fromCache: false,
    fetchedAt: new Date().toISOString(),
  };

  return NextResponse.json(response);
}
