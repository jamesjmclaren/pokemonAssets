import { NextRequest, NextResponse } from "next/server";
import { getPoketraceSets } from "@/lib/poketrace";
import { supabase } from "@/lib/supabase";

// The Poketrace catalogue is cached internally by apiFetch (revalidate:
// 3600), so this handler runs cheaply per request: one likely-cached
// Poketrace fetch + one Supabase filter query. Skip route-level caching
// so the dropdown reflects newly-persisted sets within the same session.
export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const onlyWithData = request.nextUrl.searchParams.get("onlyWithData") === "true";

  try {
    const sets = await getPoketraceSets("releaseDate", "desc");

    if (!onlyWithData) {
      return NextResponse.json(sets);
    }

    // Filter to only sets present in set_price_trends — i.e. sets the cron
    // found real card data for. This keeps the dropdown free of niche
    // Japanese promos and other Poketrace-incomplete sets.
    // Only treat sets as "with data" if they have rows from the last 2 days.
    // The cron runs nightly and now deletes-then-inserts per set, so anything
    // older than that means the latest run dropped the set.
    const { data: trendsData, error } = await supabase
      .from("set_price_trends")
      .select("set_slug, set_name")
      .gte("recorded_at", new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString());

    if (error) {
      console.warn("[api/sets] Failed to filter by trends data:", error.message);
      return NextResponse.json(sets);
    }

    // Build a slug→name map of every set with recent trend data.
    const trendsBySlug = new Map<string, string>();
    for (const row of (trendsData ?? []) as { set_slug: string; set_name: string }[]) {
      if (!trendsBySlug.has(row.set_slug)) trendsBySlug.set(row.set_slug, row.set_name);
    }

    // Keep catalogue entries that have data, then append any trend slugs that
    // aren't surfaced by the Poketrace /sets catalogue (e.g. our supplemental
    // long-form slugs like sv-scarlet-and-violet-ascended-heroes).
    const filtered = sets.filter((s) => trendsBySlug.has(s.id));
    const cataloguedSlugs = new Set(filtered.map((s) => s.id));
    const extras = [...trendsBySlug.entries()]
      .filter(([slug]) => !cataloguedSlugs.has(slug))
      .map(([slug, name]) => ({
        id: slug,
        name,
        series: "pokemon",
        releaseDate: "",
        totalCards: 0,
      }));

    // Supplemental sets are newest — surface them at the top.
    return NextResponse.json([...extras, ...filtered]);
  } catch (err) {
    console.error("[api/sets] Failed to fetch sets:", err);
    return NextResponse.json({ error: "Failed to fetch sets" }, { status: 502 });
  }
}
