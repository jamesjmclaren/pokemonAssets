import { NextRequest, NextResponse } from "next/server";
import { getPriceHistoryByType, getPriceHistory } from "@/lib/pokemon-api";

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const cardId = searchParams.get("cardId");
  const name = searchParams.get("name");
  const startDate = searchParams.get("startDate");
  const endDate = searchParams.get("endDate");
  const assetType = searchParams.get("assetType") as
    | "card"
    | "sealed"
    | null;

  if (!cardId && !name) {
    return NextResponse.json(
      { error: "cardId or name parameter is required" },
      { status: 400 }
    );
  }

  try {
    let data;

    if (assetType) {
      // New type-aware path — routes sealed to PPT, cards to JustTCG
      data = await getPriceHistoryByType(
        assetType,
        cardId || "",
        name || undefined,
        startDate || undefined,
        endDate || undefined
      );
    } else {
      // Backwards-compatible path — uses JustTCG
      data = await getPriceHistory(
        cardId || "",
        startDate || undefined,
        endDate || undefined,
        name || undefined
      );
    }

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
