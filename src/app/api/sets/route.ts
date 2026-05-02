import { NextRequest, NextResponse } from "next/server";
import { getPoketraceSets } from "@/lib/poketrace";

export const dynamic = "force-dynamic";

export async function GET(_request: NextRequest) {
  try {
    const sets = await getPoketraceSets("releaseDate", "desc", "en");
    const withDate = sets.filter((s) => !!s.releaseDate);

    console.log(
      `[api/sets] total=${sets.length} withDate=${withDate.length}` +
      (sets.length > 0 ? ` sample slug="${sets[0].id}" lang="${sets[0].language}"` : " (empty)")
    );

    return NextResponse.json(withDate);
  } catch (err) {
    console.error("[api/sets] Failed to fetch sets:", err);
    return NextResponse.json({ error: "Failed to fetch sets" }, { status: 502 });
  }
}
