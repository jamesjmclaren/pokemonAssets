import { NextResponse, type NextRequest } from "next/server";
import { auth } from "@clerk/nextjs/server";
import {
  fetchPoketraceCardsBySet,
  getPoketraceTier,
  inferAssetType,
  type PoketraceCard,
} from "@/lib/poketrace";

// Cache aggressively — top-of-set lists are stable within a day.
export const revalidate = 3600;

const TOP_N = 10;
const MIN_RAW_PRICE = 2; // ignore dime cards that clutter the top

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

function buildRow(card: PoketraceCard, tier: string): CardRow | null {
  const t = getPoketraceTier(card, tier);
  if (!t) return null;
  const previousPrice = t.avg7d ?? t.avg30d;
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
  const seen = new Map<string, CardRow>(); // dedup by card-number+name (prefer Holofoil over Normal)
  for (const c of cards) {
    if (inferAssetType(c) === "sealed") continue;
    if (c.variant) {
      const v = c.variant.toLowerCase();
      // Skip the "Reverse Holofoil" duplicate (trades at a discount and
      // crowds out the proper holo).
      if (v.includes("reverse")) continue;
      // Skip the plain "Normal" version when a higher-rarity variant exists
      // for the same card. We dedupe below to handle that.
    }
    const row = buildRow(c, tier);
    if (!row) continue;
    if (row.price < minPrice) continue;

    // Dedup by (number, name) — prefer the Holofoil/special variant over Normal.
    const key = `${row.number ?? ""}|${row.name}`;
    const existing = seen.get(key);
    if (existing) {
      const existingNormal = (existing.variant ?? "").toLowerCase().includes("normal");
      const newNormal = (row.variant ?? "").toLowerCase().includes("normal");
      // Prefer non-Normal; if both same, keep the higher-priced one.
      if (existingNormal && !newNormal) {
        seen.set(key, row);
      } else if (existingNormal === newNormal && row.price > existing.price) {
        seen.set(key, row);
      }
      continue;
    }
    seen.set(key, row);
  }
  for (const r of seen.values()) rows.push(r);
  rows.sort((a, b) => b.price - a.price);
  return rows.slice(0, TOP_N);
}

export async function GET(req: NextRequest) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const slug = req.nextUrl.searchParams.get("slug");
  if (!slug) {
    return NextResponse.json({ error: "Missing slug parameter" }, { status: 400 });
  }

  try {
    // Don't pass `variant: "Holofoil"` to the API — many high-rarity cards
    // (SIRs, hyper rares) have an empty or different variant tag and would
    // be excluded. We filter "Normal" and "Reverse Holofoil" client-side
    // in pickTop instead.
    const cards = await fetchPoketraceCardsBySet(slug, "US", {
      pageSize: 100,
      maxPages: 6,
    });
    return NextResponse.json({
      setSlug: slug,
      raw: pickTop(cards, "NEAR_MINT", MIN_RAW_PRICE),
      psa10: pickTop(cards, "PSA_10", 5),
      fetchedAt: new Date().toISOString(),
    });
  } catch (err) {
    console.error(`[set-movers] ${slug} failed:`, err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Failed to load set" },
      { status: 500 }
    );
  }
}
