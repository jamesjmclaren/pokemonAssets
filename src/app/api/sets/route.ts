import { NextRequest, NextResponse } from "next/server";
import { getPoketraceSets } from "@/lib/poketrace";
import { supabase } from "@/lib/supabase";

// Set catalogue changes only when new products release — cache for 6 hours.
export const revalidate = 21600;

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
    const { data: trendsData, error } = await supabase
      .from("set_price_trends")
      .select("set_slug")
      .gte("recorded_at", new Date(Date.now() - 14 * 24 * 60 * 60 * 1000).toISOString());

    if (error) {
      console.warn("[api/sets] Failed to filter by trends data:", error.message);
      return NextResponse.json(sets);
    }

    const validSlugs = new Set(
      (trendsData ?? []).map((r: { set_slug: string }) => r.set_slug)
    );
    const filtered = sets.filter((s) => validSlugs.has(s.id));

    return NextResponse.json(filtered);
  } catch (err) {
    console.error("[api/sets] Failed to fetch sets:", err);
    return NextResponse.json({ error: "Failed to fetch sets" }, { status: 502 });
  }
}
