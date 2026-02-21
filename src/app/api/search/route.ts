import { NextRequest, NextResponse } from "next/server";
import { searchCards, searchAll, getEpisodes } from "@/lib/pokemon-tcg-api";

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const query = searchParams.get("q");
  const type = searchParams.get("type");

  try {
    // Return sets/episodes list
    if (type === "sets" || (!query && !type)) {
      const episodes = await getEpisodes();
      return NextResponse.json(episodes);
    }

    if (!query) {
      return NextResponse.json(
        { error: "Query parameter 'q' is required" },
        { status: 400 }
      );
    }

    // Search based on type
    if (type === "card") {
      const data = await searchCards(query, 20);
      return NextResponse.json(data);
    }

    // For 'all' or 'sealed', search everything
    const data = await searchAll(query, 20);
    return NextResponse.json(data);
  } catch (error) {
    console.error("Search API error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Search failed" },
      { status: 500 }
    );
  }
}
