import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin as supabase } from "@/lib/supabase-admin";
import {
  fetchPoketraceCardsBySet,
  getPoketraceTier,
  getPoketraceSets,
  type PoketraceCard,
} from "@/lib/poketrace";
import type { TrendCard } from "@/app/api/set-trends/route";

// Default ceiling on sets per run. Poketrace's /sets endpoint returns
// many legacy / parent-category slugs that 404 or return 0 cards on
// /cards — those failures are cheap (1 request each), and we need to
// process the whole catalogue to find the modern English flagship
// slugs (which Poketrace prefixes e.g. "sv-scarlet-and-violet-151"
// rather than just "151"). Pro budget = 10k req/day; an all-sets run
// on a fresh catalogue is ~2,500 req. Override with ?max=N to throttle.
const DEFAULT_MAX_SETS = 2000;
// Top N cards to store per tier per period per set.
const TOP_N = 10;
// Minimum cards-with-prices to keep a set's results. Below this we skip
// the insert entirely so the dropdown stays clean.
const MIN_CARDS_FOR_INSERT = 8;

// Set name patterns that almost always indicate junk data (Japanese-only
// addendums, deck kit fragments, promo dumps, etc). We skip these
// regardless of card count.
const JUNK_NAME_PATTERN =
  /\b(japanese|additionals?|commemorat|promo card pack|movie commemoration|battle academy|battle strength deck|battle starter deck|half deck|trainer kit|deck kit|gift box|burger king|theme deck)\b/i;

// Modern English flagship sets that Poketrace indexes under long-form
// "sv-scarlet-and-violet-{name}" slugs not surfaced by the /sets catalogue.
// These are always processed regardless of what /sets returns.
// Ordered newest-first so the most relevant sets are prioritised.
const SUPPLEMENTAL_SETS: { slug: string; name: string }[] = [
  // Newest first (2026 era)
  { slug: "sv-scarlet-and-violet-ascended-heroes", name: "Ascended Heroes" },
  { slug: "sv-scarlet-and-violet-mega-evolution", name: "Mega Evolution" },
  { slug: "sv-scarlet-and-violet-white-flare", name: "White Flare" },
  { slug: "sv-scarlet-and-violet-black-bolt", name: "Black Bolt" },
  { slug: "sv-scarlet-and-violet-destined-rivals", name: "Destined Rivals" },
  { slug: "sv-scarlet-and-violet-journey-together", name: "Journey Together" },
  // 2025 era
  { slug: "sv-scarlet-and-violet-prismatic-evolutions", name: "Prismatic Evolutions" },
  { slug: "sv-scarlet-and-violet-surging-sparks", name: "Surging Sparks" },
  { slug: "sv-scarlet-and-violet-stellar-crown", name: "Stellar Crown" },
  { slug: "sv-scarlet-and-violet-shrouded-fable", name: "Shrouded Fable" },
  { slug: "sv-scarlet-and-violet-twilight-masquerade", name: "Twilight Masquerade" },
  { slug: "sv-scarlet-and-violet-temporal-forces", name: "Temporal Forces" },
  { slug: "sv-scarlet-and-violet-paldean-fates", name: "Paldean Fates" },
  { slug: "sv-scarlet-and-violet-paradox-rift", name: "Paradox Rift" },
  { slug: "sv-scarlet-and-violet-obsidian-flames", name: "Obsidian Flames" },
  { slug: "sv-scarlet-and-violet-paldea-evolved", name: "Paldea Evolved" },
  { slug: "sv-scarlet-and-violet-base-set", name: "Scarlet & Violet Base Set" },
];

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

type SetResult = {
  slug: string;
  name: string;
  status: "inserted" | "fetch_failed" | "no_cards" | "below_threshold" | "insert_failed";
  cards_fetched: number;
  raw_with_price: number;
  psa10_with_price: number;
  rows_inserted: number;
};

async function processSet(setSlug: string, setName: string): Promise<SetResult> {
  const result: SetResult = {
    slug: setSlug,
    name: setName,
    status: "no_cards",
    cards_fetched: 0,
    raw_with_price: 0,
    psa10_with_price: 0,
    rows_inserted: 0,
  };

  // Always remove the set's stale rows first. This ensures sets that no
  // longer pass the threshold (e.g. after raising MIN_CARDS_FOR_INSERT)
  // disappear from the dropdown immediately.
  await supabase.from("set_price_trends").delete().eq("set_slug", setSlug);

  // Quick name-based skip for known junk patterns.
  if (JUNK_NAME_PATTERN.test(setName)) {
    console.log(`[cron/set-price-trends]   ${setSlug}: skipping (junk name pattern)`);
    result.status = "below_threshold";
    return result;
  }

  let cards: PoketraceCard[];
  try {
    cards = await fetchPoketraceCardsBySet(setSlug, "US", { pageSize: 20, maxPages: 20 });
  } catch (err) {
    console.warn(`[cron/set-price-trends] Failed to fetch cards for "${setSlug}":`, err);
    result.status = "fetch_failed";
    return result;
  }

  result.cards_fetched = cards.length;
  console.log(`[cron/set-price-trends]   ${setSlug}: ${cards.length} cards fetched`);
  if (cards.length === 0) {
    result.status = "no_cards";
    return result;
  }

  const periods: Array<"1d" | "7d"> = ["1d", "7d"];
  const tierDefs: Array<{ key: string; tierType: "raw" | "psa10" }> = [
    { key: "NEAR_MINT", tierType: "raw" },
    { key: "PSA_10", tierType: "psa10" },
  ];

  const rows: Record<string, unknown>[] = [];

  let rawWithPrice = 0;
  let psa10WithPrice = 0;
  for (const card of cards) {
    if (computeTrendCard(card, "NEAR_MINT", "7d")) rawWithPrice++;
    if (computeTrendCard(card, "PSA_10", "7d")) psa10WithPrice++;
  }
  result.raw_with_price = rawWithPrice;
  result.psa10_with_price = psa10WithPrice;
  if (rawWithPrice < MIN_CARDS_FOR_INSERT && psa10WithPrice < MIN_CARDS_FOR_INSERT) {
    console.log(`[cron/set-price-trends]   ${setSlug}: skipping (raw=${rawWithPrice}, psa10=${psa10WithPrice} below threshold)`);
    result.status = "below_threshold";
    return result;
  }

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

  if (rows.length === 0) {
    result.status = "below_threshold";
    return result;
  }

  const { error } = await supabase.from("set_price_trends").insert(rows);
  if (error) {
    console.error(`[cron/set-price-trends] Insert failed for "${setSlug}":`, error.message);
    result.status = "insert_failed";
    return result;
  }

  result.status = "inserted";
  result.rows_inserted = rows.length;
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

  // Allow caller to supply a comma-separated override list of set slugs,
  // otherwise default to the most recently released sets.
  const slugOverride = request.nextUrl.searchParams.get("sets");
  const maxOverride = Number(request.nextUrl.searchParams.get("max") ?? "");
  const maxSets = Number.isFinite(maxOverride) && maxOverride > 0 ? maxOverride : DEFAULT_MAX_SETS;
  let setsToProcess: { slug: string; name: string }[];

  if (slugOverride) {
    setsToProcess = slugOverride.split(",").map((s) => ({ slug: s.trim(), name: s.trim() }));
  } else {
    try {
      const allSets = await getPoketraceSets("releaseDate", "desc");
      setsToProcess = allSets.slice(0, maxSets).map((s) => ({ slug: s.id, name: s.name }));
    } catch (err) {
      console.error("[cron/set-price-trends] Failed to fetch set list:", err);
      return NextResponse.json({ error: "Failed to fetch sets" }, { status: 502 });
    }

    // Merge supplemental sets first (they take priority) then append catalogue
    // slugs that aren't already covered. This ensures modern flagship sets are
    // always attempted even if the /sets catalogue only exposes broken aliases.
    const seenSlugs = new Set(SUPPLEMENTAL_SETS.map((s) => s.slug));
    const catalogueOnly = setsToProcess.filter((s) => !seenSlugs.has(s.slug));
    setsToProcess = [...SUPPLEMENTAL_SETS, ...catalogueOnly];
  }

  console.log(`[cron/set-price-trends] Processing ${setsToProcess.length} sets (${SUPPLEMENTAL_SETS.length} supplemental + catalogue)`);

  // Process 5 sets concurrently to respect the 30 req/10 sec burst limit.
  const results = await processBatch(setsToProcess, 5, async ({ slug, name }) => {
    console.log(`[cron/set-price-trends]   → ${slug}`);
    return processSet(slug, name);
  });

  const totalInserted = results.reduce((acc, r) => acc + r.rows_inserted, 0);
  const breakdown = {
    inserted: results.filter((r) => r.status === "inserted"),
    below_threshold: results.filter((r) => r.status === "below_threshold"),
    no_cards: results.filter((r) => r.status === "no_cards"),
    fetch_failed: results.filter((r) => r.status === "fetch_failed"),
    insert_failed: results.filter((r) => r.status === "insert_failed"),
  };

  console.log(
    `[cron/set-price-trends] ===== Done: ${breakdown.inserted.length} inserted, ${breakdown.below_threshold.length} below threshold, ${breakdown.no_cards.length} empty, ${breakdown.fetch_failed.length} fetch failed =====`
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
    rows_inserted: totalInserted,
    inserted_sets: breakdown.inserted.map((r) => ({
      slug: r.slug,
      name: r.name,
      cards: r.cards_fetched,
      raw: r.raw_with_price,
      psa10: r.psa10_with_price,
    })),
    below_threshold_sets: breakdown.below_threshold.map((r) => ({
      slug: r.slug,
      name: r.name,
      cards: r.cards_fetched,
      raw: r.raw_with_price,
      psa10: r.psa10_with_price,
    })),
    no_cards_sets: breakdown.no_cards.map((r) => ({ slug: r.slug, name: r.name })),
    fetch_failed_sets: breakdown.fetch_failed.map((r) => ({ slug: r.slug, name: r.name })),
    timestamp: new Date().toISOString(),
  });
}
