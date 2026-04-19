import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { getPoketraceSets } from "@/lib/poketrace";

// Set list is near-static; cache aggressively.
export const revalidate = 86400;

export async function GET() {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const sets = await getPoketraceSets("name", "asc");
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
