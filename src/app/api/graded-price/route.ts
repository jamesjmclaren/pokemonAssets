import { NextRequest, NextResponse } from "next/server";
import { searchCards } from "@/lib/pokemon-tcg-api";

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const query = searchParams.get("q");
  const grade = searchParams.get("grade");

  if (!query) {
    return NextResponse.json(
      { error: "Query parameter 'q' is required" },
      { status: 400 }
    );
  }

  try {
    const cards = await searchCards(query, 5);

    if (cards.length === 0) {
      return NextResponse.json({ price: null, prices: {} });
    }

    // Return the best match's graded prices
    const card = cards[0];
    const prices = card.prices;

    // Pick the price for the requested grade
    let price: number | undefined;
    if (grade) {
      const g = grade.toLowerCase();
      if (g.includes("psa 10")) price = prices.psa10;
      else if (g.includes("psa 9")) price = prices.psa9;
      else if (g.includes("psa 8") || g.includes("psa 7") || g.includes("psa"))
        price = prices.psa9; // Approximate lower PSA with PSA 9 data
      else if (g.includes("cgc 10") || g.includes("cgc 9.5") || g.includes("cgc"))
        price = prices.cgc10;
      else if (g.includes("bgs 10") || g.includes("bgs 9.5") || g.includes("bgs"))
        price = prices.bgs10;
    }

    return NextResponse.json({
      price: price ?? null,
      prices: {
        raw: prices.raw,
        psa10: prices.psa10,
        psa9: prices.psa9,
        cgc10: prices.cgc10,
        bgs10: prices.bgs10,
      },
      cardName: card.name,
      setName: card.setName,
      currency: card.currency,
    });
  } catch (error) {
    console.error("Graded price API error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to fetch graded prices" },
      { status: 500 }
    );
  }
}
