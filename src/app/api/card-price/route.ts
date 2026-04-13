import { NextRequest, NextResponse } from "next/server";
import { fetchPoketracePrice } from "@/lib/pokemon-api";

/**
 * GET /api/card-price?poketraceId=...&grade=PSA+10
 *
 * Returns the price for a specific card, optionally for a specific grade.
 * Used by AddAssetForm to get graded prices after a user selects a grade.
 */
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const poketraceId = searchParams.get("poketraceId");
  const grade = searchParams.get("grade") || undefined;

  if (!poketraceId) {
    return NextResponse.json(
      { error: "poketraceId parameter is required" },
      { status: 400 }
    );
  }

  try {
    const result = await fetchPoketracePrice(poketraceId, grade);

    if (!result) {
      return NextResponse.json({ price: null, grade: grade || null });
    }

    return NextResponse.json({
      price: result.price,
      isConverted: result.isConverted,
      rate: result.rate,
      grade: grade || null,
    });
  } catch (error) {
    console.error("[card-price] Error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to fetch price" },
      { status: 500 }
    );
  }
}
