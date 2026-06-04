import { NextRequest, NextResponse } from "next/server";
import {
  searchPoketrace,
  type NormalizedCard,
} from "@/lib/poketrace";

/**
 * GET /api/graded-search?q=...
 *
 * Search Poketrace for cards and return graded price candidates.
 * Replaces the old PriceCharting scraper endpoint.
 * Returns the same { candidates } shape for AddAssetForm compatibility.
 */

function sanitizeCardName(raw: string): string {
  return raw
    .replace(/[\u2018\u2019\u201A\u201B]/g, "'")
    .replace(/[\u201C\u201D\u201E\u201F]/g, '"')
    .replace(/\s+[-#]\s*[\d/]+\s*$/, "")
    .replace(/\s+\d+\/\d+\s*$/, "")
    .trim();
}

/**
 * Map Poketrace graded price tier keys to the legacy grade field format
 * used by the AddAssetForm tether UI.
 */
function mapGradedPricesToLegacy(gradedPrices: Record<string, number>): {
  ungraded?: number;
  grade7?: number;
  grade8?: number;
  grade9?: number;
  grade95?: number;
  psa10?: number;
} {
  const result: Record<string, number> = {};

  for (const [tier, price] of Object.entries(gradedPrices)) {
    const t = tier.toUpperCase();
    if (t === "NEAR_MINT" || t === "UNGRADED") {
      result.ungraded = price;
    } else if (t.includes("7") && !t.includes("17")) {
      result.grade7 = price;
    } else if (t.includes("8") && !t.includes("18")) {
      result.grade8 = price;
    } else if (t.includes("9.5")) {
      result.grade95 = price;
    } else if (t.includes("9") && !t.includes("19") && !t.includes("9.5")) {
      result.grade9 = price;
    } else if (t.includes("10")) {
      result.psa10 = price;
    }
  }

  return result;
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
    const results = await searchPoketrace(cleanQuery, { limit: 5, market: "US" });

    const candidates = results.map((card: NormalizedCard) => {
      const gradedPrices = card.gradedPrices || {};
      const legacyPrices = mapGradedPricesToLegacy(gradedPrices);

      // If no graded prices found, use the raw price as ungraded
      if (!legacyPrices.ungraded && card.marketPrice) {
        legacyPrices.ungraded = card.marketPrice;
      }

      return {
        id: card.poketraceId,
        name: card.name,
        setName: card.setName,
        poketraceId: card.poketraceId,
        poketraceMarket: card.poketraceMarket,
        imageUrl: card.imageUrl,
        currency: card.currency || "USD",
        rawPrice: card.marketPrice,
        prices: legacyPrices,
      };
    });

    return NextResponse.json({ candidates });
  } catch (error) {
    console.error("Graded search API error:", error);
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Failed to fetch graded prices from Poketrace",
      },
      { status: 500 }
    );
  }
}
