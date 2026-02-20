import { NextRequest, NextResponse } from "next/server";
import { searchCards, getSets } from "@/lib/pokemon-api";

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const query = searchParams.get("q");
  const setId = searchParams.get("setId");
  const type = searchParams.get("type");

  try {
    if (type === "sets" || (!query && !type)) {
      const data = await getSets();
      return NextResponse.json(data);
    }

    if (!query) {
      return NextResponse.json(
        { error: "Query parameter 'q' is required" },
        { status: 400 }
      );
    }

    const data = await searchCards(query, setId || undefined);
    return NextResponse.json(data);
  } catch (error) {
    console.error("Search API error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Search failed" },
      { status: 500 }
    );
  }
}
