import { NextRequest, NextResponse } from "next/server";
import { fetchPoketracePrice, fetchPoketracePriceBreakdown } from "@/lib/poketrace";
import type { PoketraceSource } from "@/lib/poketrace";

/**
 * GET /api/card-price?poketraceId=...&grade=PSA+10&source=ebay
 *
 * Returns the price for a specific card, optionally for a specific grade or
 * source (tcgplayer | ebay | cardmarket). Also returns a per-source breakdown
 * so the UI can let the user pick which source to use.
 */
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const poketraceId = searchParams.get("poketraceId");
  const grade = searchParams.get("grade") || undefined;
  const sourceParam = searchParams.get("source") as PoketraceSource | null;
  const source: PoketraceSource | undefined =
    sourceParam === "tcgplayer" || sourceParam === "ebay" || sourceParam === "cardmarket"
      ? sourceParam
      : undefined;

  if (!poketraceId) {
    return NextResponse.json(
      { error: "poketraceId parameter is required" },
      { status: 400 }
    );
  }

  try {
    const [result, breakdown] = await Promise.all([
      fetchPoketracePrice(poketraceId, grade, source),
      fetchPoketracePriceBreakdown(poketraceId, grade),
    ]);

    return NextResponse.json({
      price: result?.price ?? null,
      isConverted: result?.isConverted ?? false,
      rate: result?.rate,
      grade: grade || null,
      source: result?.source || source || null,
      breakdown: breakdown?.prices || {},
      breakdownConverted: breakdown?.isConverted || false,
      currency: breakdown?.currency || "USD",
      tier: breakdown?.tier || null,
    });
  } catch (error) {
    console.error("[card-price] Error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to fetch price" },
      { status: 500 }
    );
  }
}
