import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin as supabase } from "@/lib/supabase-admin";
import {
  fetchPoketraceCardsBySet,
  getPoketraceTier,
  getPoketraceSets,
  type PoketraceCard,
} from "@/lib/poketrace";
import type { TrendCard } from "@/app/api/set-trends/route";

// How many sets to process per run. Adjust down if the cron hits the
// 10,000 req/day Pro limit on days with many other operations.
const MAX_SETS = 30;
// Top N cards to store per tier per period per set.
const TOP_N = 10;

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
  return [...cards].sort((a, b) => b.currentPrice - a.currentPrice).slice(0, n);
}

async function processSet(
  setSlug: string,
  setName: string
): Promise<{ inserted: number; skipped: number }> {
  let cards: PoketraceCard[];
  try {
    // Poketrace API caps `limit` at 20. Use 20 pages × 20 = 400 cards max.
    cards = await fetchPoketraceCardsBySet(setSlug, "US", { pageSize: 20, maxPages: 20 });
  } catch (err) {
    console.warn(`[cron/set-price-trends] Failed to fetch cards for "${setSlug}":`, err);
    return { inserted: 0, skipped: 1 };
  }

  console.log(`[cron/set-price-trends]   ${setSlug}: ${cards.length} cards fetched`);
  if (cards.length === 0) return { inserted: 0, skipped: 1 };

  const periods: Array<"1d" | "7d"> = ["1d", "7d"];
  const tierDefs: Array<{ key: string; tierType: "raw" | "psa10" }> = [
    { key: "NEAR_MINT", tierType: "raw" },
    { key: "PSA_10", tierType: "psa10" },
  ];

  const rows: Record<string, unknown>[] = [];

  for (const period of periods) {
    for (const { key, tierType } of tierDefs) {
      const computed: TrendCard[] = [];
      for (const card of cards) {
        const entry = computeTrendCard(card, key, period);
        if (entry) computed.push(entry);
      }
      const top = topN(computed, TOP_N);
      for (let i = 0; i < top.length; i++) {
        const c = top[i];
        rows.push({
          set_slug: setSlug,
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

  if (rows.length === 0) return { inserted: 0, skipped: 1 };

  const { error } = await supabase.from("set_price_trends").insert(rows);
  if (error) {
    console.error(`[cron/set-price-trends] Insert failed for "${setSlug}":`, error.message);
    return { inserted: 0, skipped: 1 };
  }

  return { inserted: rows.length, skipped: 0 };
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

  // Allow caller to supply a comma-separated override list of set slugs,
  // otherwise default to the most recently released sets.
  const slugOverride = request.nextUrl.searchParams.get("sets");
  let setsToProcess: { slug: string; name: string }[];

  if (slugOverride) {
    setsToProcess = slugOverride.split(",").map((s) => ({ slug: s.trim(), name: s.trim() }));
  } else {
    try {
      const allSets = await getPoketraceSets("releaseDate", "desc");
      setsToProcess = allSets.slice(0, MAX_SETS).map((s) => ({ slug: s.id, name: s.name }));
    } catch (err) {
      console.error("[cron/set-price-trends] Failed to fetch set list:", err);
      return NextResponse.json({ error: "Failed to fetch sets" }, { status: 502 });
    }
  }

  console.log(`[cron/set-price-trends] Processing ${setsToProcess.length} sets`);

  let totalInserted = 0;
  let totalSkipped = 0;

  // Process 5 sets concurrently to respect the 30 req/10 sec burst limit.
  const results = await processBatch(setsToProcess, 5, async ({ slug, name }) => {
    console.log(`[cron/set-price-trends]   → ${slug}`);
    return processSet(slug, name);
  });

  for (const r of results) {
    totalInserted += r.inserted;
    totalSkipped += r.skipped;
  }

  console.log(`[cron/set-price-trends] ===== Done: ${totalInserted} rows inserted, ${totalSkipped} sets skipped =====`);

  return NextResponse.json({
    message: "Set price trends recorded",
    sets_processed: setsToProcess.length - totalSkipped,
    sets_skipped: totalSkipped,
    rows_inserted: totalInserted,
    timestamp: new Date().toISOString(),
  });
}
