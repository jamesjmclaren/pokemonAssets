import { NextResponse } from "next/server";
import { getPoketraceSets } from "@/lib/poketrace";

// Set catalogue changes only when new products release — cache for 6 hours.
export const revalidate = 21600;

export async function GET() {
  try {
    const sets = await getPoketraceSets("releaseDate", "desc");
    return NextResponse.json(sets);
  } catch (err) {
    console.error("[api/sets] Failed to fetch sets:", err);
    return NextResponse.json({ error: "Failed to fetch sets" }, { status: 502 });
  }
}
