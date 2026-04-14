import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { searchPoketrace } from "@/lib/poketrace";

/**
 * GET /api/admin/search-poketrace?q=...&market=US
 *
 * Admin-only endpoint to search Poketrace for matching products.
 * Used by the migration page to find the right Poketrace product for each asset.
 */

function isAdmin(userId: string): boolean {
  const adminIds = (process.env.ADMIN_USER_IDS || "")
    .split(",")
    .map((id) => id.trim())
    .filter(Boolean);
  return adminIds.includes(userId);
}

export async function GET(request: NextRequest) {
  const { userId } = await auth();
  if (!userId || !isAdmin(userId)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { searchParams } = new URL(request.url);
  const query = searchParams.get("q");
  const market = (searchParams.get("market") || "US") as "US" | "EU";

  if (!query) {
    return NextResponse.json(
      { error: "Query parameter 'q' is required" },
      { status: 400 }
    );
  }

  try {
    const results = await searchPoketrace(query, { market, limit: 10 });

    return NextResponse.json({
      results: results.map((r) => ({
        poketraceId: r.poketraceId,
        name: r.name,
        setName: r.setName,
        number: r.number,
        rarity: r.rarity,
        imageUrl: r.imageUrl,
        marketPrice: r.marketPrice,
        currency: r.currency,
        market: r.poketraceMarket,
        type: r.type,
        tcgplayerId: r.tcgplayerId,
        gradedPrices: r.gradedPrices,
      })),
    });
  } catch (error) {
    console.error("[admin/search-poketrace] Error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Search failed" },
      { status: 500 }
    );
  }
}
