import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin as supabase } from "@/lib/supabase-admin";
import {
  fetchPoketraceCardsBySet,
  getPoketraceTier,
  getPoketraceSets,
  inferAssetType,
  type PoketraceCard,
} from "@/lib/poketrace";
import type { TrendCard } from "@/app/api/set-trends/route";

const TOP_N = 20;
const SETS_TO_PROCESS = 20;
// Minimum cards with a price before we bother inserting for a set.
const MIN_CARDS_FOR_INSERT = 5;

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
  // Rank by percentage gain descending; cards with no prior price data sort last.
  return [...cards]
    .sort((a, b) => {
      if (a.pctChange == null && b.pctChange == null) return 0;
      if (a.pctChange == null) return 1;
      if (b.pctChange == null) return -1;
      return b.pctChange - a.pctChange;
    })
    .slice(0, n);
}

type SetResult = {
  slug: string;
  name: string;
  status: "inserted" | "fetch_failed" | "no_cards" | "below_threshold" | "insert_failed";
  cards_fetched: number;
  rows_inserted: number;
};

async function processSet(slug: string, setName: string): Promise<SetResult> {
  const result: SetResult = {
    slug,
    name: setName,
    status: "no_cards",
    cards_fetched: 0,
    rows_inserted: 0,
  };

  // Clear any stale rows for this set before re-inserting.
  await supabase.from("set_price_trends").delete().eq("set_slug", slug);

  let cards: PoketraceCard[] = [];
  try {
    // Fetch up to 100 cards (5 pages × 20) — enough to find the top 20 by price.
    cards = await fetchPoketraceCardsBySet(slug, "US", { pageSize: 20, maxPages: 5 });
  } catch (err) {
    console.warn(`[cron/set-price-trends] Fetch failed for "${slug}":`, err instanceof Error ? err.message : err);
    result.status = "fetch_failed";
    return result;
  }

  if (cards.length === 0) {
    console.log(`[cron/set-price-trends]   ${slug}: 0 cards returned`);
    result.status = "no_cards";
    return result;
  }

  result.cards_fetched = cards.length;

  // Drop sealed products — only rank actual cards.
  const cardOnly = cards.filter((c) => inferAssetType(c) === "card");

  // Check we have enough priced cards to be worth inserting.
  const pricedCount = cardOnly.filter((c) => computeTrendCard(c, "NEAR_MINT", "7d") !== null).length;
  if (pricedCount < MIN_CARDS_FOR_INSERT) {
    console.log(`[cron/set-price-trends]   ${slug}: only ${pricedCount} priced cards (below threshold)`);
    result.status = "below_threshold";
    return result;
  }

  const periods: Array<"1d" | "7d"> = ["1d", "7d"];
  const tierDefs: Array<{ key: string; tierType: "raw" | "psa10" }> = [
    { key: "NEAR_MINT", tierType: "raw" },
    { key: "PSA_10", tierType: "psa10" },
  ];

  const rows: Record<string, unknown>[] = [];

  for (const period of periods) {
    for (const { key, tierType } of tierDefs) {
      const computed: TrendCard[] = [];
      for (const card of cardOnly) {
        const entry = computeTrendCard(card, key, period);
        if (entry) computed.push(entry);
      }
      const top = topN(computed, TOP_N);
      for (let i = 0; i < top.length; i++) {
        const c = top[i];
        rows.push({
          set_slug: slug,
          set_name: setName,
          period,
          tier_type: tierType,
          rank: i + 1,
          card_id: c.id,
          card_name: c.name,
          card_number: c.cardNumber,
          card_image: c.image,
          rarity: c.rarity,
          current_price: c.currentPrice,
          prev_price: c.prevPrice,
          abs_change: c.absChange,
          pct_change: c.pctChange,
          sale_count: c.saleCount,
          source: c.source,
        });
      }
    }
  }

  if (rows.length === 0) {
    result.status = "below_threshold";
    return result;
  }

  const { error } = await supabase.from("set_price_trends").insert(rows);
  if (error) {
    console.error(`[cron/set-price-trends] Insert failed for "${slug}":`, error.message);
    result.status = "insert_failed";
    return result;
  }

  result.status = "inserted";
  result.rows_inserted = rows.length;
  console.log(`[cron/set-price-trends]   ${slug}: inserted ${rows.length} rows (${cards.length} cards)`);
  return result;
}

async function processBatch<T, R>(items: T[], batchSize: number, fn: (item: T) => Promise<R>): Promise<R[]> {
  const results: R[] = [];
  for (let i = 0; i < items.length; i += batchSize) {
    const batch = items.slice(i, i + batchSize);
    const out = await Promise.all(batch.map(fn));
    results.push(...out);
  }
  return results;
}

export async function GET(request: NextRequest) {
  const authHeader = request.headers.get("authorization");
  const cronSecret = process.env.CRON_SECRET;
  if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  console.log("[cron/set-price-trends] ===== Started =====");

  // Allow a comma-separated ?sets= override to target specific slugs directly.
  const slugOverride = request.nextUrl.searchParams.get("sets");

  let setsToProcess: { slug: string; name: string }[];

  if (slugOverride) {
    setsToProcess = slugOverride.split(",").map((s) => {
      const slug = s.trim();
      return { slug, name: slug };
    });
  } else {
    // Fetch the Poketrace set catalogue, filter to sets with a release date,
    // and take the most recent SETS_TO_PROCESS sets.
    let allSets: Awaited<ReturnType<typeof getPoketraceSets>>;
    try {
      allSets = await getPoketraceSets("releaseDate", "desc", "en");
    } catch (err) {
      console.error("[cron/set-price-trends] Failed to fetch set catalogue:", err);
      return NextResponse.json({ error: "Failed to fetch sets" }, { status: 502 });
    }

    setsToProcess = allSets
      .filter((s) => !!s.releaseDate)
      .slice(0, SETS_TO_PROCESS)
      .map((s) => ({ slug: s.id, name: s.name }));
  }

  console.log(`[cron/set-price-trends] Processing ${setsToProcess.length} sets`);

  const results = await processBatch(setsToProcess, 5, ({ slug, name }) =>
    processSet(slug, name)
  );

  const breakdown = {
    inserted: results.filter((r) => r.status === "inserted"),
    below_threshold: results.filter((r) => r.status === "below_threshold"),
    no_cards: results.filter((r) => r.status === "no_cards"),
    fetch_failed: results.filter((r) => r.status === "fetch_failed"),
    insert_failed: results.filter((r) => r.status === "insert_failed"),
  };

  const totalRows = results.reduce((acc, r) => acc + r.rows_inserted, 0);

  console.log(
    `[cron/set-price-trends] ===== Done: ${breakdown.inserted.length} inserted, ` +
    `${breakdown.no_cards.length} empty, ${breakdown.fetch_failed.length} failed =====`
  );

  return NextResponse.json({
    message: "Set price trends recorded",
    counts: {
      total: results.length,
      inserted: breakdown.inserted.length,
      below_threshold: breakdown.below_threshold.length,
      no_cards: breakdown.no_cards.length,
      fetch_failed: breakdown.fetch_failed.length,
      insert_failed: breakdown.insert_failed.length,
    },
    rows_inserted: totalRows,
    inserted_sets: breakdown.inserted.map((r) => ({ slug: r.slug, name: r.name, cards: r.cards_fetched })),
    no_cards_sets: breakdown.no_cards.map((r) => ({ slug: r.slug, name: r.name })),
    fetch_failed_sets: breakdown.fetch_failed.map((r) => ({ slug: r.slug, name: r.name })),
    timestamp: new Date().toISOString(),
  });
}
