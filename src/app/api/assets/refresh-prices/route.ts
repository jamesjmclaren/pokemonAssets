import { NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";
import { searchCards, searchSealedProducts } from "@/lib/pokemon-api";
import { extractCardPrice } from "@/lib/format";
import { fetchTetheredPrice } from "@/lib/pricecharting";

const STALE_HOURS = 24;

export async function POST() {
  console.log("[refresh-prices] ===== Manual price refresh started =====");

  try {
    const { data: assets, error } = await supabase
      .from("assets")
      .select("id, external_id, name, asset_type, price_updated_at, manual_price, pc_product_id, pc_url, pc_grade_field, current_price");

    if (error) {
      console.error("[refresh-prices] Failed to fetch assets:", error.message);
      throw error;
    }
    if (!assets || assets.length === 0) {
      console.log("[refresh-prices] No assets found. Exiting.");
      return NextResponse.json({ updated: 0, skipped: 0 });
    }

    console.log(`[refresh-prices] Fetched ${assets.length} total assets`);

    const tetheredCount = assets.filter((a) => a.pc_url).length;
    const manualCount = assets.filter((a) => a.manual_price).length;
    console.log(`[refresh-prices] Breakdown: ${manualCount} manual, ${tetheredCount} PriceCharting-tethered`);

    const now = Date.now();
    const staleMs = STALE_HOURS * 60 * 60 * 1000;

    // Refresh stale assets. Skip manual_price UNLESS they have a PriceCharting tether.
    const staleAssets = assets.filter((a) => {
      if (a.manual_price && !a.pc_url) return false;
      if (!a.price_updated_at) return true;
      return now - new Date(a.price_updated_at).getTime() > staleMs;
    });

    console.log(`[refresh-prices] ${staleAssets.length} stale assets to refresh (${assets.length - staleAssets.length} fresh, skipping)`);

    if (staleAssets.length === 0) {
      console.log("[refresh-prices] All assets are fresh. Nothing to do.");
      return NextResponse.json({ updated: 0, skipped: assets.length });
    }

    let updated = 0;
    let tetheredUpdated = 0;

    for (const asset of staleAssets) {
      if (!asset.name) {
        console.warn(`[refresh-prices]   Skipping asset ${asset.id} — no name`);
        continue;
      }

      try {
        let marketPrice: number | null = null;
        let priceSource = asset.asset_type === "sealed" ? "pokemonpricetracker" : "tcgplayer";

        // Tethered assets → fetch price from PriceCharting (with delay to avoid 429)
        if (asset.pc_url) {
          try {
            console.log(`[refresh-prices]   Fetching PriceCharting tethered price for "${asset.name}" (grade: ${asset.pc_grade_field || "ungraded"}, url: ${asset.pc_url})`);
            if (updated > 0) await new Promise((r) => setTimeout(r, 500));
            const tetheredPrice = await fetchTetheredPrice(
              asset.pc_url,
              asset.pc_grade_field || undefined
            );
            if (tetheredPrice != null) {
              marketPrice = tetheredPrice;
              priceSource = "pricecharting";
              console.log(`[refresh-prices]   ✓ PriceCharting price for "${asset.name}": $${tetheredPrice}`);
            } else {
              console.warn(`[refresh-prices]   ✗ PriceCharting returned null for "${asset.name}" — will fall back to API`);
            }
          } catch (e) {
            console.warn(`[refresh-prices]   ✗ PriceCharting tether failed for "${asset.name}":`, e instanceof Error ? e.message : e);
          }
        }

        // Fallback to JustTCG / PokemonPriceTracker for non-tethered assets
        if (marketPrice == null) {
          let results: Record<string, unknown>[];

          if (asset.asset_type === "sealed") {
            console.log(`[refresh-prices]   Fetching sealed price from PokemonPriceTracker for "${asset.name}"`);
            try {
              results = (await searchSealedProducts(
                asset.name,
                undefined,
                5
              )) as unknown as Record<string, unknown>[];
            } catch {
              console.warn(`[refresh-prices]   PokemonPriceTracker failed for "${asset.name}", falling back to JustTCG`);
              results = (await searchCards(
                asset.name,
                undefined,
                5
              )) as unknown as Record<string, unknown>[];
            }
          } else {
            console.log(`[refresh-prices]   Fetching card price from JustTCG for "${asset.name}"`);
            results = (await searchCards(
              asset.name,
              undefined,
              5
            )) as unknown as Record<string, unknown>[];
          }

          if (results.length === 0) {
            console.warn(`[refresh-prices]   ✗ No API results for "${asset.name}" — skipping`);
            continue;
          }

          const match =
            results.find(
              (c: Record<string, unknown>) => c.id === asset.external_id
            ) || results[0];

          if (!match) {
            console.warn(`[refresh-prices]   ✗ No matching card for "${asset.name}" — skipping`);
            continue;
          }

          marketPrice = extractCardPrice(match);
          if (marketPrice != null) {
            console.log(`[refresh-prices]   ✓ API price for "${asset.name}": $${marketPrice} (source: ${priceSource})`);
          }
        }

        if (marketPrice == null) {
          console.warn(`[refresh-prices]   ✗ No price found for "${asset.name}" from any source — skipping`);
          continue;
        }

        // Log large price changes
        if (asset.current_price != null) {
          const oldPrice = Number(asset.current_price);
          const pctChange = oldPrice > 0 ? ((marketPrice - oldPrice) / oldPrice) * 100 : 0;
          if (Math.abs(pctChange) > 10) {
            console.log(`[refresh-prices]   ⚠ Large price change for "${asset.name}": $${oldPrice} → $${marketPrice} (${pctChange > 0 ? "+" : ""}${pctChange.toFixed(1)}%)`);
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
          updated++;
          if (priceSource === "pricecharting") tetheredUpdated++;

          const { error: snapError } = await supabase.from("price_snapshots").insert({
            asset_id: asset.id,
            price: marketPrice,
            source: priceSource,
          });
          if (snapError) {
            console.error(`[refresh-prices]   ✗ Snapshot insert failed for "${asset.name}":`, snapError.message);
          }
        } else {
          console.error(`[refresh-prices]   ✗ DB update failed for "${asset.name}":`, updateError.message);
        }
      } catch (e) {
        console.error(`[refresh-prices]   ✗ Failed to refresh price for "${asset.name}":`, e instanceof Error ? e.message : e);
      }
    }

    console.log(`[refresh-prices] Stale refresh complete: ${updated} updated (${tetheredUpdated} from PriceCharting)`);

    // Record daily price snapshots for ALL assets that have a current price
    // This builds pricing history even when the price hasn't changed
    const assetsWithPrices = assets.filter((a) => !staleAssets.some((s) => s.id === a.id));
    let snapshotsRecorded = 0;

    console.log(`[refresh-prices] Recording snapshots for ${assetsWithPrices.length} non-stale assets...`);

    for (const asset of assetsWithPrices) {
      try {
        // Fetch the current_price for this asset
        const { data: fullAsset } = await supabase
          .from("assets")
          .select("current_price")
          .eq("id", asset.id)
          .single();

        if (fullAsset?.current_price != null) {
          const source = asset.pc_url
            ? "pricecharting"
            : asset.manual_price
              ? "manual"
              : asset.asset_type === "sealed"
                ? "pokemonpricetracker"
                : "tcgplayer";

          const { error: snapError } = await supabase.from("price_snapshots").insert({
            asset_id: asset.id,
            price: fullAsset.current_price,
            source,
          });
          if (!snapError) snapshotsRecorded++;
        }
      } catch {
        // Don't fail the whole operation for a snapshot error
      }
    }

    console.log(`[refresh-prices] ===== Manual price refresh finished =====`);
    console.log(`[refresh-prices] Summary: ${updated} refreshed (${tetheredUpdated} tethered) | ${snapshotsRecorded + updated} total snapshots`);

    return NextResponse.json({
      updated,
      skipped: assets.length - staleAssets.length,
      snapshots_recorded: snapshotsRecorded + updated,
    });
  } catch (error) {
    console.error("[refresh-prices] ===== Price refresh FAILED =====", error instanceof Error ? error.message : error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to refresh prices" },
      { status: 500 }
    );
  }
}
