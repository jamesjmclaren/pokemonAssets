import { NextRequest, NextResponse } from "next/server";
import { searchCards } from "@/lib/pokemon-tcg-api";

/**
 * Strip card-number suffixes and smart quotes so the RapidAPI search
 * matches on card name only.
 */
function sanitizeCardName(raw: string): string {
  return raw
    .replace(/[\u2018\u2019\u201A\u201B]/g, "'")
    .replace(/[\u201C\u201D\u201E\u201F]/g, '"')
    .replace(/\s+[-#]\s*[\d/]+\s*$/, "")
    .replace(/\s+\d+\/\d+\s*$/, "")
    .trim();
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const query = searchParams.get("q");

  if (!query) {
    return NextResponse.json(
      { error: "Query parameter 'q' is required" },
      { status: 400 }
    );
  }

  const cleanQuery = sanitizeCardName(query);

  try {
    const cards = await searchCards(cleanQuery, 10);

    // Return all candidates so the user can pick the right one
    const candidates = cards.map((c) => ({
      id: c.id,
      name: c.name,
      number: c.number,
      setName: c.setName,
      setCode: c.setCode,
      rarity: c.rarity,
      imageUrl: c.imageUrl,
      currency: c.currency,
      prices: {
        raw: c.prices.raw,
        psa10: c.prices.psa10,
        psa9: c.prices.psa9,
        cgc10: c.prices.cgc10,
        bgs10: c.prices.bgs10,
      },
    }));

    return NextResponse.json({ candidates });
  } catch (error) {
    console.error("Graded price API error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to fetch graded prices" },
      { status: 500 }
    );
  }
}
