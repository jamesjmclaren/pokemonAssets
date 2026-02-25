import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";
import { searchCards, searchSealedProducts } from "@/lib/pokemon-api";
import { extractCardPrice } from "@/lib/format";

// This endpoint is designed to be called by a cron job (e.g., Vercel Cron)
// It records daily price snapshots for ALL assets and refreshes stale API prices.

export async function GET(request: NextRequest) {
  // Verify cron secret if configured
  const authHeader = request.headers.get("authorization");
  const cronSecret = process.env.CRON_SECRET;
  if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    // Fetch all assets
    const { data: assets, error } = await supabase
      .from("assets")
      .select("id, external_id, name, asset_type, price_updated_at, manual_price, current_price");

    if (error) throw error;
    if (!assets || assets.length === 0) {
      return NextResponse.json({ message: "No assets found", updated: 0, snapshots: 0 });
    }

    let apiUpdated = 0;
    let snapshotsRecorded = 0;

    // Step 1: Refresh stale API prices (non-manual assets with price older than 24h)
    const now = Date.now();
    const staleMs = 24 * 60 * 60 * 1000;

    const staleApiAssets = assets.filter((a) => {
      if (a.manual_price) return false;
      if (!a.price_updated_at) return true;
      return now - new Date(a.price_updated_at).getTime() > staleMs;
    });

    for (const asset of staleApiAssets) {
      if (!asset.name) continue;

      try {
        let results: Record<string, unknown>[];

        if (asset.asset_type === "sealed") {
          try {
            results = (await searchSealedProducts(asset.name, undefined, 5)) as unknown as Record<string, unknown>[];
          } catch {
            results = (await searchCards(asset.name, undefined, 5)) as unknown as Record<string, unknown>[];
          }
        } else {
          results = (await searchCards(asset.name, undefined, 5)) as unknown as Record<string, unknown>[];
        }

        if (results.length === 0) continue;

        const match = results.find((c: Record<string, unknown>) => c.id === asset.external_id) || results[0];
        if (!match) continue;

        const marketPrice = extractCardPrice(match);
        if (marketPrice == null) continue;

        const { error: updateError } = await supabase
          .from("assets")
          .update({
            current_price: marketPrice,
            price_updated_at: new Date().toISOString(),
          })
          .eq("id", asset.id);

        if (!updateError) {
          apiUpdated++;
          // Update the local reference for snapshot recording
          asset.current_price = marketPrice;
        }
      } catch (e) {
        console.error(`[cron] Failed to refresh price for ${asset.name}:`, e);
      }
    }

    // Step 2: Record daily price snapshots for ALL assets that have a current price
    for (const asset of assets) {
      const price = asset.current_price;
      if (price == null) continue;

      try {
        const source = asset.manual_price
          ? "manual"
          : asset.asset_type === "sealed"
            ? "pokemonpricetracker"
            : "tcgplayer";

        const { error: snapError } = await supabase.from("price_snapshots").insert({
          asset_id: asset.id,
          price,
          source,
        });

        if (!snapError) snapshotsRecorded++;
      } catch {
        // Continue on individual snapshot failures
      }
    }

    return NextResponse.json({
      message: "Daily price recording complete",
      total_assets: assets.length,
      api_prices_refreshed: apiUpdated,
      snapshots_recorded: snapshotsRecorded,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error("[cron] Price recording error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to record prices" },
      { status: 500 }
    );
  }
}
