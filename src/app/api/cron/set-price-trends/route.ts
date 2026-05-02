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
// slugs not always surfaced by the /sets catalogue. Each entry has one
// or more candidate slugs — the cron tries them in order and uses the
// first that returns cards. Ordered newest-first.
const SUPPLEMENTAL_SETS: { name: string; slugs: string[] }[] = [
  // ---- 2026 / Mega Evolution era ----
  { name: "Perfect Order", slugs: ["me-mega-evolution-perfect-order", "me-perfect-order", "perfect-order", "sv-scarlet-and-violet-perfect-order"] },
  { name: "Ascended Heroes", slugs: ["sv-scarlet-and-violet-ascended-heroes", "me-mega-evolution-ascended-heroes", "me-ascended-heroes", "ascended-heroes"] },
  { name: "Phantasmal Flames", slugs: ["me-mega-evolution-phantasmal-flames", "me-phantasmal-flames", "phantasmal-flames", "sv-scarlet-and-violet-phantasmal-flames"] },
  { name: "Mega Evolution", slugs: ["me-mega-evolution", "mega-evolution", "sv-scarlet-and-violet-mega-evolution"] },
  // ---- 2025 era ----
  { name: "White Flare", slugs: ["sv-scarlet-and-violet-white-flare", "white-flare", "rsv10-5-white-flare"] },
  { name: "Black Bolt", slugs: ["sv-scarlet-and-violet-black-bolt", "black-bolt", "zsv10-5-black-bolt"] },
  { name: "Destined Rivals", slugs: ["sv-scarlet-and-violet-destined-rivals", "destined-rivals", "sv10-destined-rivals"] },
  { name: "Journey Together", slugs: ["sv-scarlet-and-violet-journey-together", "journey-together", "sv9-journey-together"] },
  { name: "Prismatic Evolutions", slugs: ["sv-scarlet-and-violet-prismatic-evolutions", "prismatic-evolutions", "sv8-5-prismatic-evolutions"] },
  // ---- 2024 era ----
  { name: "Surging Sparks", slugs: ["sv-scarlet-and-violet-surging-sparks", "surging-sparks", "sv8-surging-sparks"] },
  { name: "Stellar Crown", slugs: ["sv-scarlet-and-violet-stellar-crown", "stellar-crown", "sv7-stellar-crown"] },
  { name: "Shrouded Fable", slugs: ["sv-scarlet-and-violet-shrouded-fable", "shrouded-fable", "sv6-5-shrouded-fable"] },
  { name: "Twilight Masquerade", slugs: ["sv-scarlet-and-violet-twilight-masquerade", "twilight-masquerade", "sv6-twilight-masquerade"] },
  { name: "Temporal Forces", slugs: ["sv-scarlet-and-violet-temporal-forces", "temporal-forces", "sv5-temporal-forces"] },
  { name: "Paldean Fates", slugs: ["sv-scarlet-and-violet-paldean-fates", "paldean-fates", "sv4-5-paldean-fates"] },
  // ---- 2023 era (SV launch) ----
  { name: "Paradox Rift", slugs: ["sv-scarlet-and-violet-paradox-rift", "paradox-rift", "sv4-paradox-rift"] },
  { name: "Scarlet & Violet—151", slugs: ["sv-scarlet-and-violet-151", "151", "sv3-5-151"] },
  { name: "Obsidian Flames", slugs: ["sv-scarlet-and-violet-obsidian-flames", "obsidian-flames", "sv3-obsidian-flames"] },
  { name: "Paldea Evolved", slugs: ["sv-scarlet-and-violet-paldea-evolved", "paldea-evolved", "sv2-paldea-evolved"] },
  { name: "Scarlet & Violet Base Set", slugs: ["sv-scarlet-and-violet-base-set", "scarlet-and-violet-base-set", "sv1-scarlet-and-violet"] },
  // ---- Sword & Shield era (2020-2023) ----
  { name: "Crown Zenith", slugs: ["swsh-sword-and-shield-crown-zenith", "crown-zenith", "swsh12-5-crown-zenith"] },
  { name: "Silver Tempest", slugs: ["swsh-sword-and-shield-silver-tempest", "silver-tempest", "swsh12-silver-tempest"] },
  { name: "Lost Origin", slugs: ["swsh-sword-and-shield-lost-origin", "lost-origin", "swsh11-lost-origin"] },
  { name: "Pokémon GO", slugs: ["swsh-sword-and-shield-pokemon-go", "pokemon-go", "pgo-pokemon-go"] },
  { name: "Astral Radiance", slugs: ["swsh-sword-and-shield-astral-radiance", "astral-radiance", "swsh10-astral-radiance"] },
  { name: "Brilliant Stars", slugs: ["swsh-sword-and-shield-brilliant-stars", "brilliant-stars", "swsh9-brilliant-stars"] },
  { name: "Fusion Strike", slugs: ["swsh-sword-and-shield-fusion-strike", "fusion-strike", "swsh8-fusion-strike"] },
  { name: "Celebrations", slugs: ["swsh-sword-and-shield-celebrations", "celebrations", "cel25-celebrations"] },
  { name: "Evolving Skies", slugs: ["swsh-sword-and-shield-evolving-skies", "evolving-skies", "swsh7-evolving-skies"] },
  { name: "Chilling Reign", slugs: ["swsh-sword-and-shield-chilling-reign", "chilling-reign", "swsh6-chilling-reign"] },
  { name: "Battle Styles", slugs: ["swsh-sword-and-shield-battle-styles", "battle-styles", "swsh5-battle-styles"] },
  { name: "Shining Fates", slugs: ["swsh-sword-and-shield-shining-fates", "shining-fates", "swsh4-5-shining-fates"] },
  { name: "Vivid Voltage", slugs: ["swsh-sword-and-shield-vivid-voltage", "vivid-voltage", "swsh4-vivid-voltage"] },
  { name: "Champion's Path", slugs: ["swsh-sword-and-shield-champions-path", "champions-path", "swsh3-5-champions-path"] },
  { name: "Darkness Ablaze", slugs: ["swsh-sword-and-shield-darkness-ablaze", "darkness-ablaze", "swsh3-darkness-ablaze"] },
  { name: "Rebel Clash", slugs: ["swsh-sword-and-shield-rebel-clash", "rebel-clash", "swsh2-rebel-clash"] },
  { name: "Sword & Shield", slugs: ["swsh-sword-and-shield", "sword-and-shield", "swsh1-sword-and-shield"] },
  // ---- Sun & Moon era (2017-2019) ----
  { name: "Cosmic Eclipse", slugs: ["sm-sun-and-moon-cosmic-eclipse", "cosmic-eclipse", "sm12-cosmic-eclipse"] },
  { name: "Hidden Fates", slugs: ["sm-sun-and-moon-hidden-fates", "hidden-fates", "sm11-5-hidden-fates"] },
  { name: "Unified Minds", slugs: ["sm-sun-and-moon-unified-minds", "unified-minds", "sm11-unified-minds"] },
  { name: "Unbroken Bonds", slugs: ["sm-sun-and-moon-unbroken-bonds", "unbroken-bonds", "sm10-unbroken-bonds"] },
  { name: "Detective Pikachu", slugs: ["sm-sun-and-moon-detective-pikachu", "detective-pikachu", "det-detective-pikachu"] },
  { name: "Team Up", slugs: ["sm-sun-and-moon-team-up", "team-up", "sm9-team-up"] },
  { name: "Lost Thunder", slugs: ["sm-sun-and-moon-lost-thunder", "lost-thunder", "sm8-lost-thunder"] },
  { name: "Dragon Majesty", slugs: ["sm-sun-and-moon-dragon-majesty", "dragon-majesty", "sm7-5-dragon-majesty"] },
  { name: "Celestial Storm", slugs: ["sm-sun-and-moon-celestial-storm", "celestial-storm", "sm7-celestial-storm"] },
  { name: "Forbidden Light", slugs: ["sm-sun-and-moon-forbidden-light", "forbidden-light", "sm6-forbidden-light"] },
  { name: "Ultra Prism", slugs: ["sm-sun-and-moon-ultra-prism", "ultra-prism", "sm5-ultra-prism"] },
  { name: "Crimson Invasion", slugs: ["sm-sun-and-moon-crimson-invasion", "crimson-invasion", "sm4-crimson-invasion"] },
  { name: "Shining Legends", slugs: ["sm-sun-and-moon-shining-legends", "shining-legends", "sm3-5-shining-legends"] },
  { name: "Burning Shadows", slugs: ["sm-sun-and-moon-burning-shadows", "burning-shadows", "sm3-burning-shadows"] },
  { name: "Guardians Rising", slugs: ["sm-sun-and-moon-guardians-rising", "guardians-rising", "sm2-guardians-rising"] },
  { name: "Sun & Moon", slugs: ["sm-sun-and-moon", "sun-and-moon", "sm1-sun-and-moon"] },
  // ---- XY era (2014-2016) ----
  { name: "Evolutions", slugs: ["xy-evolutions", "evolutions", "xy12-evolutions"] },
  { name: "Steam Siege", slugs: ["xy-steam-siege", "steam-siege", "xy11-steam-siege"] },
  { name: "Fates Collide", slugs: ["xy-fates-collide", "fates-collide", "xy10-fates-collide"] },
  { name: "Generations", slugs: ["xy-generations", "generations", "g1-generations"] },
  { name: "BREAKpoint", slugs: ["xy-breakpoint", "breakpoint", "xy9-breakpoint"] },
  { name: "BREAKthrough", slugs: ["xy-breakthrough", "breakthrough", "xy8-breakthrough"] },
  { name: "Ancient Origins", slugs: ["xy-ancient-origins", "ancient-origins", "xy7-ancient-origins"] },
  { name: "Roaring Skies", slugs: ["xy-roaring-skies", "roaring-skies", "xy6-roaring-skies"] },
  { name: "Double Crisis", slugs: ["xy-double-crisis", "double-crisis", "dc1-double-crisis"] },
  { name: "Primal Clash", slugs: ["xy-primal-clash", "primal-clash", "xy5-primal-clash"] },
  { name: "Phantom Forces", slugs: ["xy-phantom-forces", "phantom-forces", "xy4-phantom-forces"] },
  { name: "Furious Fists", slugs: ["xy-furious-fists", "furious-fists", "xy3-furious-fists"] },
  { name: "Flashfire", slugs: ["xy-flashfire", "flashfire", "xy2-flashfire"] },
  { name: "XY", slugs: ["xy-base-set", "xy", "xy1-xy"] },
  { name: "Kalos Starter Set", slugs: ["xy-kalos-starter-set", "kalos-starter-set", "xy0-kalos-starter-set"] },
  // ---- Black & White era (2011-2013) ----
  { name: "Legendary Treasures", slugs: ["bw-black-and-white-legendary-treasures", "legendary-treasures", "bw11-legendary-treasures"] },
  { name: "Plasma Blast", slugs: ["bw-black-and-white-plasma-blast", "plasma-blast", "bw10-plasma-blast"] },
  { name: "Plasma Freeze", slugs: ["bw-black-and-white-plasma-freeze", "plasma-freeze", "bw9-plasma-freeze"] },
  { name: "Plasma Storm", slugs: ["bw-black-and-white-plasma-storm", "plasma-storm", "bw8-plasma-storm"] },
  { name: "Boundaries Crossed", slugs: ["bw-black-and-white-boundaries-crossed", "boundaries-crossed", "bw7-boundaries-crossed"] },
  { name: "Dragon Vault", slugs: ["bw-black-and-white-dragon-vault", "dragon-vault", "dv1-dragon-vault"] },
  { name: "Dragons Exalted", slugs: ["bw-black-and-white-dragons-exalted", "dragons-exalted", "bw6-dragons-exalted"] },
  { name: "Dark Explorers", slugs: ["bw-black-and-white-dark-explorers", "dark-explorers", "bw5-dark-explorers"] },
  { name: "Next Destinies", slugs: ["bw-black-and-white-next-destinies", "next-destinies", "bw4-next-destinies"] },
  { name: "Noble Victories", slugs: ["bw-black-and-white-noble-victories", "noble-victories", "bw3-noble-victories"] },
  { name: "Emerging Powers", slugs: ["bw-black-and-white-emerging-powers", "emerging-powers", "bw2-emerging-powers"] },
  { name: "Black & White", slugs: ["bw-black-and-white", "black-and-white", "bw1-black-and-white"] },
  { name: "Call of Legends", slugs: ["col-call-of-legends", "call-of-legends", "col1-call-of-legends"] },
  // ---- HeartGold & SoulSilver era (2010) ----
  { name: "Triumphant", slugs: ["hgss-heartgold-and-soulsilver-triumphant", "triumphant", "hgss4-triumphant"] },
  { name: "Undaunted", slugs: ["hgss-heartgold-and-soulsilver-undaunted", "undaunted", "hgss3-undaunted"] },
  { name: "Unleashed", slugs: ["hgss-heartgold-and-soulsilver-unleashed", "unleashed", "hgss2-unleashed"] },
  { name: "HeartGold & SoulSilver", slugs: ["hgss-heartgold-and-soulsilver", "heartgold-and-soulsilver", "hgss1-heartgold-and-soulsilver"] },
  // ---- Platinum era (2009) ----
  { name: "Platinum: Arceus", slugs: ["pl-platinum-arceus", "platinum-arceus", "pl4-platinum-arceus"] },
  { name: "Supreme Victors", slugs: ["pl-platinum-supreme-victors", "supreme-victors", "pl3-supreme-victors"] },
  { name: "Rising Rivals", slugs: ["pl-platinum-rising-rivals", "rising-rivals", "pl2-rising-rivals"] },
  { name: "Platinum", slugs: ["pl-platinum", "platinum", "pl1-platinum"] },
  // ---- Diamond & Pearl era (2007-2008) ----
  { name: "Stormfront", slugs: ["dp-diamond-and-pearl-stormfront", "stormfront", "dp7-stormfront"] },
  { name: "Legends Awakened", slugs: ["dp-diamond-and-pearl-legends-awakened", "legends-awakened", "dp6-legends-awakened"] },
  { name: "Majestic Dawn", slugs: ["dp-diamond-and-pearl-majestic-dawn", "majestic-dawn", "dp5-majestic-dawn"] },
  { name: "Great Encounters", slugs: ["dp-diamond-and-pearl-great-encounters", "great-encounters", "dp4-great-encounters"] },
  { name: "Secret Wonders", slugs: ["dp-diamond-and-pearl-secret-wonders", "secret-wonders", "dp3-secret-wonders"] },
  { name: "Mysterious Treasures", slugs: ["dp-diamond-and-pearl-mysterious-treasures", "mysterious-treasures", "dp2-mysterious-treasures"] },
  { name: "Diamond & Pearl", slugs: ["dp-diamond-and-pearl", "diamond-and-pearl", "dp1-diamond-and-pearl"] },
  // ---- EX era (2003-2007) ----
  { name: "EX Power Keepers", slugs: ["ex-power-keepers", "power-keepers", "ex16-power-keepers"] },
  { name: "EX Dragon Frontiers", slugs: ["ex-dragon-frontiers", "dragon-frontiers", "ex15-dragon-frontiers"] },
  { name: "EX Crystal Guardians", slugs: ["ex-crystal-guardians", "crystal-guardians", "ex14-crystal-guardians"] },
  { name: "EX Holon Phantoms", slugs: ["ex-holon-phantoms", "holon-phantoms", "ex13-holon-phantoms"] },
  { name: "EX Legend Maker", slugs: ["ex-legend-maker", "legend-maker", "ex12-legend-maker"] },
  { name: "EX Delta Species", slugs: ["ex-delta-species", "delta-species", "ex11-delta-species"] },
  { name: "EX Unseen Forces", slugs: ["ex-unseen-forces", "unseen-forces", "ex10-unseen-forces"] },
  { name: "EX Emerald", slugs: ["ex-emerald", "emerald", "ex9-emerald"] },
  { name: "EX Deoxys", slugs: ["ex-deoxys", "deoxys", "ex8-deoxys"] },
  { name: "EX Team Rocket Returns", slugs: ["ex-team-rocket-returns", "team-rocket-returns", "ex7-team-rocket-returns"] },
  { name: "EX FireRed & LeafGreen", slugs: ["ex-firered-and-leafgreen", "firered-and-leafgreen", "ex6-firered-and-leafgreen"] },
  { name: "EX Hidden Legends", slugs: ["ex-hidden-legends", "hidden-legends", "ex5-hidden-legends"] },
  { name: "EX Team Magma vs Team Aqua", slugs: ["ex-team-magma-vs-team-aqua", "team-magma-vs-team-aqua", "ex4-team-magma-vs-team-aqua"] },
  { name: "EX Dragon", slugs: ["ex-dragon", "dragon", "ex3-dragon"] },
  { name: "EX Sandstorm", slugs: ["ex-sandstorm", "sandstorm", "ex2-sandstorm"] },
  { name: "EX Ruby & Sapphire", slugs: ["ex-ruby-and-sapphire", "ruby-and-sapphire", "ex1-ruby-and-sapphire"] },
  // ---- e-Card era (2002-2003) ----
  { name: "Skyridge", slugs: ["ec-skyridge", "skyridge", "ec3-skyridge"] },
  { name: "Aquapolis", slugs: ["ec-aquapolis", "aquapolis", "ec2-aquapolis"] },
  { name: "Expedition Base Set", slugs: ["ec-expedition-base-set", "expedition-base-set", "ec1-expedition-base-set"] },
  // ---- Legendary Collection (2002) ----
  { name: "Legendary Collection", slugs: ["legendary-collection", "lc1-legendary-collection"] },
  // ---- Neo era (2000-2002) ----
  { name: "Neo Destiny", slugs: ["neo-destiny", "n4-neo-destiny"] },
  { name: "Neo Revelation", slugs: ["neo-revelation", "n3-neo-revelation"] },
  { name: "Neo Discovery", slugs: ["neo-discovery", "n2-neo-discovery"] },
  { name: "Neo Genesis", slugs: ["neo-genesis", "n1-neo-genesis"] },
  // ---- Original era (1999-2000) ----
  { name: "Gym Challenge", slugs: ["gym-challenge", "g2-gym-challenge"] },
  { name: "Gym Heroes", slugs: ["gym-heroes", "g1-gym-heroes"] },
  { name: "Team Rocket", slugs: ["team-rocket", "tr-team-rocket"] },
  { name: "Base Set 2", slugs: ["base-set-2", "b2-base-set-2"] },
  { name: "Fossil", slugs: ["fossil", "fo-fossil"] },
  { name: "Jungle", slugs: ["jungle", "ju-jungle"] },
  { name: "Base Set", slugs: ["base-set", "bs-base-set", "base"] },
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

async function processSet(slugCandidates: string[], setName: string): Promise<SetResult> {
  const primarySlug = slugCandidates[0];
  const result: SetResult = {
    slug: primarySlug,
    name: setName,
    status: "no_cards",
    cards_fetched: 0,
    raw_with_price: 0,
    psa10_with_price: 0,
    rows_inserted: 0,
  };

  // Always remove the set's stale rows for every candidate slug first. This
  // ensures sets that no longer pass the threshold disappear from the
  // dropdown immediately, regardless of which slug variant we previously
  // inserted under.
  for (const candidate of slugCandidates) {
    await supabase.from("set_price_trends").delete().eq("set_slug", candidate);
  }

  // Quick name-based skip for known junk patterns.
  if (JUNK_NAME_PATTERN.test(setName)) {
    console.log(`[cron/set-price-trends]   ${primarySlug}: skipping (junk name pattern)`);
    result.status = "below_threshold";
    return result;
  }

  // Try each candidate slug in order — stop at the first that returns cards.
  let cards: PoketraceCard[] = [];
  let workingSlug = primarySlug;
  let lastError: unknown = null;
  for (const candidate of slugCandidates) {
    try {
      const batch = await fetchPoketraceCardsBySet(candidate, "US", { pageSize: 20, maxPages: 20 });
      if (batch.length > 0) {
        cards = batch;
        workingSlug = candidate;
        console.log(`[cron/set-price-trends]   ${primarySlug}: matched candidate "${candidate}" (${batch.length} cards)`);
        break;
      }
    } catch (err) {
      lastError = err;
      // 4xx/5xx — try the next candidate
    }
  }

  result.slug = workingSlug;

  if (cards.length === 0) {
    if (lastError) {
      console.warn(`[cron/set-price-trends] All candidates failed for "${primarySlug}":`, lastError);
      result.status = "fetch_failed";
    } else {
      console.log(`[cron/set-price-trends]   ${primarySlug}: no candidate returned cards`);
      result.status = "no_cards";
    }
    return result;
  }

  result.cards_fetched = cards.length;

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
    console.log(`[cron/set-price-trends]   ${workingSlug}: skipping (raw=${rawWithPrice}, psa10=${psa10WithPrice} below threshold)`);
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
          set_slug: workingSlug,
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
    console.error(`[cron/set-price-trends] Insert failed for "${workingSlug}":`, error.message);
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
  let setsToProcess: { name: string; slugs: string[] }[];

  if (slugOverride) {
    // Override mode: each comma-separated entry is a single slug to test.
    setsToProcess = slugOverride.split(",").map((s) => {
      const slug = s.trim();
      return { name: slug, slugs: [slug] };
    });
  } else {
    let catalogueSets: { slug: string; name: string }[] = [];
    try {
      const allSets = await getPoketraceSets("releaseDate", "desc");
      catalogueSets = allSets.slice(0, maxSets).map((s) => ({ slug: s.id, name: s.name }));
    } catch (err) {
      console.error("[cron/set-price-trends] Failed to fetch set list:", err);
      return NextResponse.json({ error: "Failed to fetch sets" }, { status: 502 });
    }

    // Merge supplemental sets first (they take priority) then append catalogue
    // slugs that aren't already covered by any supplemental candidate. This
    // ensures known flagship sets are tried with their full slug-fallback
    // chain rather than the catalogue's broken alias.
    const supplementalSlugs = new Set(SUPPLEMENTAL_SETS.flatMap((s) => s.slugs));
    const catalogueOnly = catalogueSets
      .filter((s) => !supplementalSlugs.has(s.slug))
      .map((s) => ({ name: s.name, slugs: [s.slug] }));
    setsToProcess = [...SUPPLEMENTAL_SETS, ...catalogueOnly];
  }

  console.log(`[cron/set-price-trends] Processing ${setsToProcess.length} sets (${SUPPLEMENTAL_SETS.length} supplemental + catalogue)`);

  // Process 5 sets concurrently to respect the 30 req/10 sec burst limit.
  const results = await processBatch(setsToProcess, 5, async ({ slugs, name }) => {
    console.log(`[cron/set-price-trends]   → ${name} (${slugs.length} candidate(s))`);
    return processSet(slugs, name);
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
