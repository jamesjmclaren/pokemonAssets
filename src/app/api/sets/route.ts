import { NextResponse } from "next/server";
import { getPoketraceSets } from "@/lib/poketrace";

// Poketrace catalogue is cached internally by apiFetch (revalidate: 3600).
export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const sets = await getPoketraceSets("releaseDate", "desc");
    return NextResponse.json(sets);
  } catch (err) {
    console.error("[api/sets] Failed to fetch sets:", err);
    return NextResponse.json({ error: "Failed to fetch sets" }, { status: 502 });
  }
}
