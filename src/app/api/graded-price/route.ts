import { NextRequest, NextResponse } from "next/server";
import { searchWithGradedPrices } from "@/lib/pricecharting";

/**
 * Strip card-number suffixes and smart quotes for better search matching.
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
    const cards = await searchWithGradedPrices(cleanQuery, 5);

    const candidates = cards.map((c) => ({
      id: c.id,
      name: c.name,
      setName: c.setName,
      url: c.url,
      imageUrl: c.imageUrl,
      currency: "USD",
      prices: {
        raw: c.prices.ungraded,
        psa10: c.prices.psa10,
        psa9: c.prices.grade9,
        grade95: c.prices.grade95,
        grade8: c.prices.grade8,
        grade7: c.prices.grade7,
        cgc10: undefined,
        bgs10: undefined,
      },
    }));

    return NextResponse.json({ candidates });
  } catch (error) {
    console.error("Graded price API error:", error);
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Failed to fetch graded prices",
      },
      { status: 500 }
    );
  }
}
