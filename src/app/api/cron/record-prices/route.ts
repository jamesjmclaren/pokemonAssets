import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";
import { searchCards, searchSealedProducts } from "@/lib/pokemon-api";
import { extractCardPrice } from "@/lib/format";
import { fetchTetheredPrice } from "@/lib/pricecharting";

// This endpoint is designed to be called by a cron job (e.g., Vercel Cron)
// It records daily price snapshots for ALL assets and refreshes stale API prices.

export async function GET(request: NextRequest) {
  // Verify cron secret if configured
  const authHeader = request.headers.get("authorization");
  const cronSecret = process.env.CRON_SECRET;
  if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
    console.warn("[cron] Unauthorized request — invalid or missing CRON_SECRET");
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  console.log("[cron] ===== Daily price recording started =====");

  try {
    // Fetch all assets (including PriceCharting tether fields)
    const { data: assets, error } = await supabase
      .from("assets")
      .select("id, external_id, name, asset_type, price_updated_at, manual_price, current_price, pc_product_id, pc_url, pc_grade_field");

    if (error) {
      console.error("[cron] Failed to fetch assets from database:", error.message);
      throw error;
    }
    if (!assets || assets.length === 0) {
      console.log("[cron] No assets found in database. Exiting.");
      return NextResponse.json({ message: "No assets found", updated: 0, snapshots: 0 });
    }

    console.log(`[cron] Fetched ${assets.length} total assets from database`);

    const tetheredCount = assets.filter((a) => a.pc_url).length;
    const manualCount = assets.filter((a) => a.manual_price).length;
    const sealedCount = assets.filter((a) => a.asset_type === "sealed").length;
    const cardCount = assets.filter((a) => a.asset_type !== "sealed").length;
    console.log(`[cron] Breakdown: ${cardCount} cards, ${sealedCount} sealed, ${manualCount} manual, ${tetheredCount} PriceCharting-tethered`);

    let apiUpdated = 0;
    let tetheredUpdated = 0;
    let snapshotsRecorded = 0;

    // Step 1: Refresh stale API prices
    // Skip manual_price UNLESS the asset has a PriceCharting tether (pc_url)
    const now = Date.now();
    const staleMs = 24 * 60 * 60 * 1000;

    const staleApiAssets = assets.filter((a) => {
      if (a.manual_price && !a.pc_url) return false;
      if (!a.price_updated_at) return true;
      return now - new Date(a.price_updated_at).getTime() > staleMs;
    });

    const freshCount = assets.length - staleApiAssets.length;
    console.log(`[cron] Step 1: ${staleApiAssets.length} stale assets to refresh (${freshCount} are fresh, skipping)`);

    for (const asset of staleApiAssets) {
      if (!asset.name) {
        console.warn(`[cron]   Skipping asset ${asset.id} — no name`);
        continue;
      }

      try {
        let marketPrice: number | null = null;
        let priceSource = asset.asset_type === "sealed" ? "pokemonpricetracker" : "tcgplayer";

        // Tethered assets → fetch price from PriceCharting first
        if (asset.pc_url) {
          try {
            console.log(`[cron]   Fetching PriceCharting tethered price for "${asset.name}" (grade: ${asset.pc_grade_field || "ungraded"}, url: ${asset.pc_url})`);
            if (tetheredUpdated > 0) await new Promise((r) => setTimeout(r, 500));
            const tetheredPrice = await fetchTetheredPrice(
              asset.pc_url,
              asset.pc_grade_field || undefined
            );
            if (tetheredPrice != null) {
              marketPrice = tetheredPrice;
              priceSource = "pricecharting";
              console.log(`[cron]   ✓ PriceCharting price for "${asset.name}": $${tetheredPrice}`);
            } else {
              console.warn(`[cron]   ✗ PriceCharting returned null for "${asset.name}" — will fall back to API`);
            }
          } catch (e) {
            console.warn(`[cron]   ✗ PriceCharting tether failed for "${asset.name}":`, e instanceof Error ? e.message : e);
          }
        }

        // Fallback to JustTCG / PokemonPriceTracker if no tethered price
        if (marketPrice == null) {
          let results: Record<string, unknown>[];

          if (asset.asset_type === "sealed") {
            console.log(`[cron]   Fetching sealed price from PokemonPriceTracker for "${asset.name}"`);
            try {
              results = (await searchSealedProducts(asset.name, undefined, 5)) as unknown as Record<string, unknown>[];
            } catch {
              console.warn(`[cron]   PokemonPriceTracker failed for "${asset.name}", falling back to JustTCG`);
              results = (await searchCards(asset.name, undefined, 5)) as unknown as Record<string, unknown>[];
            }
          } else {
            console.log(`[cron]   Fetching card price from JustTCG for "${asset.name}"`);
            results = (await searchCards(asset.name, undefined, 5)) as unknown as Record<string, unknown>[];
          }

          if (results.length === 0) {
            console.warn(`[cron]   ✗ No API results for "${asset.name}" — skipping`);
            continue;
          }

          const match = results.find((c: Record<string, unknown>) => c.id === asset.external_id) || results[0];
          if (!match) {
            console.warn(`[cron]   ✗ No matching card for "${asset.name}" — skipping`);
            continue;
          }

          marketPrice = extractCardPrice(match);
          if (marketPrice != null) {
            console.log(`[cron]   ✓ API price for "${asset.name}": $${marketPrice} (source: ${priceSource})`);
          }
        }

        if (marketPrice == null) {
          console.warn(`[cron]   ✗ No price found for "${asset.name}" from any source — skipping`);
          continue;
        }

        // Log if price changed significantly
        if (asset.current_price != null) {
          const oldPrice = Number(asset.current_price);
          const pctChange = oldPrice > 0 ? ((marketPrice - oldPrice) / oldPrice) * 100 : 0;
          if (Math.abs(pctChange) > 10) {
            console.log(`[cron]   ⚠ Large price change for "${asset.name}": $${oldPrice} → $${marketPrice} (${pctChange > 0 ? "+" : ""}${pctChange.toFixed(1)}%)`);
          }
        }

        const { error: updateError } = await supabase
          .from("assets")
          .update({
            current_price: marketPrice,
            price_updated_at: new Date().toISOString(),
          })
          .eq("id", asset.id);

        if (!updateError) {
          if (priceSource === "pricecharting") {
            tetheredUpdated++;
          }
          apiUpdated++;
          // Update the local reference for snapshot recording
          asset.current_price = marketPrice;
        } else {
          console.error(`[cron]   ✗ DB update failed for "${asset.name}":`, updateError.message);
        }
      } catch (e) {
        console.error(`[cron]   ✗ Failed to refresh price for "${asset.name}":`, e instanceof Error ? e.message : e);
      }
    }

    console.log(`[cron] Step 1 complete: ${apiUpdated} prices refreshed (${tetheredUpdated} from PriceCharting)`);

    // Step 2: Record daily price snapshots for ALL assets that have a current price
    console.log("[cron] Step 2: Recording daily price snapshots...");

    for (const asset of assets) {
      const price = asset.current_price;
      if (price == null) continue;

      try {
        const source = asset.pc_url
          ? "pricecharting"
          : asset.manual_price
            ? "manual"
            : asset.asset_type === "sealed"
              ? "pokemonpricetracker"
              : "tcgplayer";

        const { error: snapError } = await supabase.from("price_snapshots").insert({
          asset_id: asset.id,
          price,
          source,
        });

        if (!snapError) {
          snapshotsRecorded++;
        } else {
          console.error(`[cron]   ✗ Snapshot insert failed for "${asset.name}":`, snapError.message);
        }
      } catch {
        // Continue on individual snapshot failures
      }
    }

    console.log(`[cron] Step 2 complete: ${snapshotsRecorded} snapshots recorded`);
    console.log(`[cron] ===== Daily price recording finished =====`);
    console.log(`[cron] Summary: ${assets.length} total | ${apiUpdated} refreshed (${tetheredUpdated} tethered) | ${snapshotsRecorded} snapshots`);

    return NextResponse.json({
      message: "Daily price recording complete",
      total_assets: assets.length,
      api_prices_refreshed: apiUpdated,
      tethered_prices_refreshed: tetheredUpdated,
      snapshots_recorded: snapshotsRecorded,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error("[cron] ===== Price recording FAILED =====", error instanceof Error ? error.message : error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to record prices" },
      { status: 500 }
    );
  }
}
