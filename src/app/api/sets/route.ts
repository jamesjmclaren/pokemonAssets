import { NextResponse } from "next/server";
import { getPoketraceSets } from "@/lib/poketrace";

// Set catalogue changes only when new products release — cache for 6 hours.
export const revalidate = 21600;

export async function GET() {
  try {
    const sets = await getPoketraceSets("releaseDate", "desc", "en");
    // Only include sets that have a release date so the dropdown is clean.
    return NextResponse.json(sets.filter((s) => !!s.releaseDate));
  } catch (err) {
    console.error("[api/sets] Failed to fetch sets:", err);
    return NextResponse.json({ error: "Failed to fetch sets" }, { status: 502 });
  }
}
