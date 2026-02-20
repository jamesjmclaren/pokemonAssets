import { NextRequest, NextResponse } from "next/server";
import { getPriceHistory } from "@/lib/pokemon-api";

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const cardId = searchParams.get("cardId");
  const startDate = searchParams.get("startDate");
  const endDate = searchParams.get("endDate");

  if (!cardId) {
    return NextResponse.json(
      { error: "cardId parameter is required" },
      { status: 400 }
    );
  }

  try {
    const data = await getPriceHistory(
      cardId,
      startDate || undefined,
      endDate || undefined
    );
    return NextResponse.json(data);
  } catch (error) {
    console.error("Price history API error:", error);
    return NextResponse.json(
      {
        error:
          error instanceof Error ? error.message : "Failed to fetch price history",
      },
      { status: 500 }
    );
  }
}
