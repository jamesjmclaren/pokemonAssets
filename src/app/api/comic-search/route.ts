import { NextRequest, NextResponse } from "next/server";
import { searchComicsWithGradedPrices } from "@/lib/pricecharting";

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
    const comics = await searchComicsWithGradedPrices(cleanQuery, 5);

    const candidates = comics.map((c) => ({
      id: c.id,
      name: c.name,
      setName: c.setName,
      url: c.url,
      imageUrl: c.imageUrl,
      currency: "USD",
      prices: {
        ungraded: c.prices.ungraded,
        vg4: c.prices.vg4,
        fine6: c.prices.fine6,
        vf8: c.prices.vf8,
        nm92: c.prices.nm92,
        nm98: c.prices.nm98,
      },
    }));

    return NextResponse.json({ candidates });
  } catch (error) {
    console.error("Comic search API error:", error);
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Failed to fetch comic prices from PriceCharting",
      },
      { status: 500 }
    );
  }
}
