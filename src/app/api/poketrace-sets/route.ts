import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { getPoketraceSets } from "@/lib/poketrace";

// Set list is near-static; cache aggressively.
export const revalidate = 86400;

// Poketrace's /v1/sets contains many tiny "sub-set" entries (e.g. one per
// pokemon for promo releases) with the same display name as the parent set.
// Filter these out — real releases have many more cards.
const MIN_CARD_COUNT = 20;

export async function GET() {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const raw = await getPoketraceSets("name", "asc");

    // Drop sub-set noise.
    const filtered = raw.filter((s) => s.totalCards >= MIN_CARD_COUNT);

    // Collapse same-named sets (common with Poketrace reprints / promos) —
    // keep whichever entry has the most cards.
    const byName = new Map<string, typeof filtered[number]>();
    for (const s of filtered) {
      const existing = byName.get(s.name);
      if (!existing || s.totalCards > existing.totalCards) {
        byName.set(s.name, s);
      }
    }

    const sets = Array.from(byName.values()).sort((a, b) =>
      a.name.localeCompare(b.name)
    );

    return NextResponse.json({
      sets: sets.map((s) => ({
        slug: s.id,
        name: s.name,
        series: s.series,
        totalCards: s.totalCards,
      })),
      fetchedAt: new Date().toISOString(),
    });
  } catch (err) {
    console.error("[poketrace-sets] failed:", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Failed to load sets" },
      { status: 500 }
    );
  }
}
