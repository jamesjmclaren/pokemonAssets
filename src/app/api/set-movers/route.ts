import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import {
  fetchPoketraceCardsBySet,
  getPoketraceSets,
  getPoketraceTier,
  type PoketraceCard,
} from "@/lib/poketrace";

// Cache aggressively — top-of-set lists are stable within a day.
export const revalidate = 3600;

const TOP_N = 10;
const MIN_RAW_PRICE = 2; // ignore dime cards that clutter the top

/**
 * Sets to surface, in display order. `match` is a case-insensitive substring
 * matched against the Poketrace set name; `label` is what we show in the UI.
 * Order matters — the first filter to match a set claims it (so
 * "Mega Evolution" is processed last to avoid cannibalising the specific
 * variant names).
 */
const WANTED_SETS: { match: string; label: string }[] = [
  { match: "Perfect Order", label: "ME03 · Perfect Order" },
  { match: "Phantasmal Flames", label: "ME02 · Phantasmal Flames" },
  { match: "Ascended Heroes", label: "ME · Ascended Heroes" },
  { match: "Mega Evolution", label: "ME01 · Mega Evolution" },
];

// Order in which the UI renders them (ME03, ME02, ME01, ME Ascended Heroes).
const DISPLAY_ORDER = [
  "Perfect Order",
  "Phantasmal Flames",
  "Mega Evolution",
  "Ascended Heroes",
];

interface CardRow {
  id: string;
  name: string;
  number: string | null;
  rarity: string | null;
  imageUrl: string | null;
  variant: string | null;
  price: number;
  previousPrice: number | null;
  absChange: number | null;
  pctChange: number | null;
  saleCount: number | null;
  source: string;
}

interface SetBlock {
  setSlug: string;
  setName: string;
  releaseDate: string;
  raw: CardRow[];
  psa10: CardRow[];
}

function buildRow(card: PoketraceCard, tier: string): CardRow | null {
  const t = getPoketraceTier(card, tier);
  if (!t) return null;
  const previousPrice = t.avg1d;
  const absChange = previousPrice != null ? t.avg - previousPrice : null;
  const pctChange =
    previousPrice != null && previousPrice > 0
      ? (absChange! / previousPrice) * 100
      : null;
  return {
    id: card.id,
    name: card.name,
    number: card.cardNumber ?? null,
    rarity: card.rarity ?? null,
    imageUrl: card.image ?? null,
    variant: card.variant ?? null,
    price: t.avg,
    previousPrice,
    absChange,
    pctChange,
    saleCount: t.saleCount,
    source: t.source,
  };
}

function pickTop(
  cards: PoketraceCard[],
  tier: string,
  minPrice: number
): CardRow[] {
  const rows: CardRow[] = [];
  for (const c of cards) {
    // Exclude reverse-holo duplicates from the "Holofoil" view — they typically
    // trade at a discount and crowd out the proper holo variant.
    if (c.variant && /reverse/i.test(c.variant)) continue;
    const row = buildRow(c, tier);
    if (!row) continue;
    if (row.price < minPrice) continue;
    rows.push(row);
  }
  rows.sort((a, b) => b.price - a.price);
  return rows.slice(0, TOP_N);
}

export async function GET() {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const allSets = await getPoketraceSets("releaseDate", "desc");

    // Resolve each wanted filter to exactly one set, preferring the newest
    // release that matches (handy when Poketrace has reprints or sub-sets).
    const resolved: { set: typeof allSets[number]; label: string; match: string }[] = [];
    const usedIds = new Set<string>();
    for (const w of WANTED_SETS) {
      const hit = allSets.find(
        (s) =>
          !usedIds.has(s.id) &&
          s.name.toLowerCase().includes(w.match.toLowerCase())
      );
      if (hit) {
        resolved.push({ set: hit, label: w.label, match: w.match });
        usedIds.add(hit.id);
      } else {
        console.warn(`[set-movers] no Poketrace set matched "${w.match}"`);
      }
    }

    // Render in the order the user listed (ME03 → ME02 → ME01 → ME Ascended Heroes)
    resolved.sort(
      (a, b) => DISPLAY_ORDER.indexOf(a.match) - DISPLAY_ORDER.indexOf(b.match)
    );

    const blocks: SetBlock[] = await Promise.all(
      resolved.map(async ({ set, label }) => {
        const cards = await fetchPoketraceCardsBySet(set.id, "US", {
          pageSize: 100,
          maxPages: 4,
        });
        return {
          setSlug: set.id,
          setName: label,
          releaseDate: set.releaseDate,
          raw: pickTop(cards, "NEAR_MINT", MIN_RAW_PRICE),
          psa10: pickTop(cards, "PSA_10", 5),
        };
      })
    );

    return NextResponse.json({
      sets: blocks,
      missing: WANTED_SETS.filter(
        (w) => !resolved.some((r) => r.match === w.match)
      ).map((w) => w.label),
      // Surface the 30 newest Poketrace set names so we can diagnose
      // mismatches between our filters and Poketrace's actual naming.
      availableSets: allSets.slice(0, 30).map((s) => ({
        slug: s.id,
        name: s.name,
        releaseDate: s.releaseDate,
      })),
      fetchedAt: new Date().toISOString(),
    });
  } catch (err) {
    console.error("[set-movers] failed:", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Failed to load set movers" },
      { status: 500 }
    );
  }
}
