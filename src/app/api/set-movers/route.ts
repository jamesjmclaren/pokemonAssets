import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import {
  fetchPoketraceCardsBySet,
  getPoketraceTier,
  type PoketraceCard,
} from "@/lib/poketrace";

// Cache aggressively — top-of-set lists are stable within a day.
export const revalidate = 3600;

const TOP_N = 10;
const MIN_RAW_PRICE = 2; // ignore dime cards that clutter the top

/**
 * Hardcoded Poketrace slugs for the Mega Evolution series sets we surface.
 * Order here = order rendered in the UI.
 */
const WANTED_SETS: { slug: string; label: string }[] = [
  { slug: "me03-perfect-order", label: "ME03 · Perfect Order" },
  { slug: "me02-phantasmal-flames", label: "ME02 · Phantasmal Flames" },
  { slug: "me01-mega-evolution", label: "ME01 · Mega Evolution" },
  { slug: "me-ascended-heroes", label: "ME · Ascended Heroes" },
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
  raw: CardRow[];
  psa10: CardRow[];
  error?: string;
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
    const blocks: SetBlock[] = await Promise.all(
      WANTED_SETS.map(async ({ slug, label }): Promise<SetBlock> => {
        try {
          const cards = await fetchPoketraceCardsBySet(slug, "US", {
            pageSize: 100,
            maxPages: 4,
          });
          return {
            setSlug: slug,
            setName: label,
            raw: pickTop(cards, "NEAR_MINT", MIN_RAW_PRICE),
            psa10: pickTop(cards, "PSA_10", 5),
          };
        } catch (err) {
          console.warn(`[set-movers] ${slug} fetch failed:`, err);
          return {
            setSlug: slug,
            setName: label,
            raw: [],
            psa10: [],
            error: err instanceof Error ? err.message : "Fetch failed",
          };
        }
      })
    );

    return NextResponse.json({
      sets: blocks,
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
