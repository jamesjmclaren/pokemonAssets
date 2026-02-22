import { NextRequest, NextResponse } from "next/server";
import { searchAssets, getSets } from "@/lib/pokemon-api";

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const query = searchParams.get("q");
  const type = searchParams.get("type");

  try {
    // Return sets list
    if (type === "sets" || (!query && !type)) {
      const sets = await getSets();
      return NextResponse.json(sets);
    }

    if (!query) {
      return NextResponse.json(
        { error: "Query parameter 'q' is required" },
        { status: 400 }
      );
    }

    // Search using JustTCG (cards) + PokemonPriceTracker (sealed) via unified search
    const data = await searchAssets(query, (type as "card" | "sealed" | "all") || "all");
    return NextResponse.json(data);
  } catch (error) {
    console.error("Search API error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Search failed" },
      { status: 500 }
    );
  }
}
