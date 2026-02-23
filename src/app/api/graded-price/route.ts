import { NextRequest, NextResponse } from "next/server";
import { searchCards } from "@/lib/pokemon-tcg-api";

/**
 * Strip card-number suffixes and smart quotes so the RapidAPI search
 * matches on card name only.
 * e.g. "Mega Charizard X ex - 125/094" → "Mega Charizard X ex"
 */
function sanitizeCardName(raw: string): string {
  return raw
    .replace(/[\u2018\u2019\u201A\u201B]/g, "'")
    .replace(/[\u201C\u201D\u201E\u201F]/g, '"')
    .replace(/\s+[-#]\s*[\d/]+\s*$/, "") // strip trailing " - 125/094" or " #280"
    .replace(/\s+\d+\/\d+\s*$/, "")      // strip trailing " 125/094"
    .trim();
}

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

  const cleanQuery = sanitizeCardName(query);

  try {
    const cards = await searchCards(cleanQuery, 10);

    if (cards.length === 0) {
      return NextResponse.json({ price: null, prices: {} });
    }

    // Find the best card that has graded data, falling back to first result
    const cardWithGraded = cards.find(
      (c) => c.prices.psa10 || c.prices.psa9 || c.prices.cgc10 || c.prices.bgs10
    );
    const card = cardWithGraded || cards[0];
    const prices = card.prices;

    // Pick the price for the requested grade
    let price: number | undefined;
    if (grade) {
      const g = grade.toLowerCase();
      if (g.includes("psa 10")) price = prices.psa10;
      else if (g.includes("psa 9")) price = prices.psa9;
      else if (g.includes("psa 8") || g.includes("psa 7") || g.includes("psa"))
        price = prices.psa9;
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
