import { NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";
import { searchCards, searchSealedProducts } from "@/lib/pokemon-api";
import { extractCardPrice } from "@/lib/format";

const STALE_HOURS = 24;

export async function POST() {
  try {
    const { data: assets, error } = await supabase
      .from("assets")
      .select("id, external_id, name, asset_type, price_updated_at, manual_price");

    if (error) throw error;
    if (!assets || assets.length === 0) {
      return NextResponse.json({ updated: 0, skipped: 0 });
    }

    const now = Date.now();
    const staleMs = STALE_HOURS * 60 * 60 * 1000;

    // Only refresh assets with stale or missing prices (skip manual_price assets)
    const staleAssets = assets.filter((a) => {
      if (a.manual_price) return false;
      if (!a.price_updated_at) return true;
      return now - new Date(a.price_updated_at).getTime() > staleMs;
    });

    if (staleAssets.length === 0) {
      return NextResponse.json({ updated: 0, skipped: assets.length });
    }

    let updated = 0;

    for (const asset of staleAssets) {
      if (!asset.name) continue;

      try {
        let results: Record<string, unknown>[];

        if (asset.asset_type === "sealed") {
          // Use PokemonPriceTracker for sealed products
          try {
            results = (await searchSealedProducts(
              asset.name,
              undefined,
              5
            )) as unknown as Record<string, unknown>[];
          } catch {
            // Fall back to JustTCG if PPT unavailable
            results = (await searchCards(
              asset.name,
              undefined,
              5
            )) as unknown as Record<string, unknown>[];
          }
        } else {
          // Use JustTCG for cards
          results = (await searchCards(
            asset.name,
            undefined,
            5
          )) as unknown as Record<string, unknown>[];
        }

        if (results.length === 0) {
          console.warn(`[refresh-prices] No API results for "${asset.name}"`);
          continue;
        }

        // Prefer exact ID match, then first result
        const match =
          results.find(
            (c: Record<string, unknown>) => c.id === asset.external_id
          ) || results[0];

        if (!match) continue;

        const marketPrice = extractCardPrice(match);
        if (marketPrice == null) {
          console.warn(
            `[refresh-prices] No price found for "${asset.name}". API keys:`,
            Object.keys(match),
            "prices field:",
            JSON.stringify(match.prices ?? "missing")
          );
          continue;
        }

        const { error: updateError } = await supabase
          .from("assets")
          .update({
            current_price: marketPrice,
            price_updated_at: new Date().toISOString(),
          })
          .eq("id", asset.id);

        if (!updateError) updated++;
      } catch (e) {
        console.error(`Failed to refresh price for ${asset.name}:`, e);
      }
    }

    return NextResponse.json({
      updated,
      skipped: assets.length - staleAssets.length,
    });
  } catch (error) {
    console.error("Price refresh error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to refresh prices" },
      { status: 500 }
    );
  }
}
