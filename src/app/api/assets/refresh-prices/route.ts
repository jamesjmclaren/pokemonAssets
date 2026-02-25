import { NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";
import { searchCards, searchSealedProducts } from "@/lib/pokemon-api";
import { extractCardPrice } from "@/lib/format";
import { fetchTetheredPrice } from "@/lib/pricecharting";

const STALE_HOURS = 24;

export async function POST() {
  try {
    const { data: assets, error } = await supabase
      .from("assets")
      .select("id, external_id, name, asset_type, price_updated_at, manual_price, pc_product_id, pc_url, pc_grade_field");

    if (error) throw error;
    if (!assets || assets.length === 0) {
      return NextResponse.json({ updated: 0, skipped: 0 });
    }

    const now = Date.now();
    const staleMs = STALE_HOURS * 60 * 60 * 1000;

    // Refresh stale assets. Skip manual_price UNLESS they have a PriceCharting tether.
    const staleAssets = assets.filter((a) => {
      if (a.manual_price && !a.pc_url) return false;
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
        let marketPrice: number | null = null;
        let priceSource = asset.asset_type === "sealed" ? "pokemonpricetracker" : "tcgplayer";

        // Tethered assets → fetch price from PriceCharting (with delay to avoid 429)
        if (asset.pc_url) {
          try {
            if (updated > 0) await new Promise((r) => setTimeout(r, 500));
            const tetheredPrice = await fetchTetheredPrice(
              asset.pc_url,
              asset.pc_grade_field || undefined
            );
            if (tetheredPrice != null) {
              marketPrice = tetheredPrice;
              priceSource = "pricecharting";
            }
          } catch (e) {
            console.warn(`[refresh-prices] PriceCharting tether failed for "${asset.name}":`, e);
          }
        }

        // Fallback to JustTCG / PokemonPriceTracker for non-tethered assets
        if (marketPrice == null) {
          let results: Record<string, unknown>[];

          if (asset.asset_type === "sealed") {
            try {
              results = (await searchSealedProducts(
                asset.name,
                undefined,
                5
              )) as unknown as Record<string, unknown>[];
            } catch {
              results = (await searchCards(
                asset.name,
                undefined,
                5
              )) as unknown as Record<string, unknown>[];
            }
          } else {
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

          const match =
            results.find(
              (c: Record<string, unknown>) => c.id === asset.external_id
            ) || results[0];

          if (!match) continue;

          marketPrice = extractCardPrice(match);
        }

        if (marketPrice == null) {
          console.warn(
            `[refresh-prices] No price found for "${asset.name}"`
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

        if (!updateError) {
          updated++;

          await supabase.from("price_snapshots").insert({
            asset_id: asset.id,
            price: marketPrice,
            source: priceSource,
          });
        }
      } catch (e) {
        console.error(`Failed to refresh price for ${asset.name}:`, e);
      }
    }

    // Record daily price snapshots for ALL assets that have a current price
    // This builds pricing history even when the price hasn't changed
    const assetsWithPrices = assets.filter((a) => !staleAssets.some((s) => s.id === a.id));
    let snapshotsRecorded = 0;

    for (const asset of assetsWithPrices) {
      try {
        // Fetch the current_price for this asset
        const { data: fullAsset } = await supabase
          .from("assets")
          .select("current_price")
          .eq("id", asset.id)
          .single();

        if (fullAsset?.current_price != null) {
          const { error: snapError } = await supabase.from("price_snapshots").insert({
            asset_id: asset.id,
            price: fullAsset.current_price,
            source: asset.manual_price ? "manual" : (asset.asset_type === "sealed" ? "pokemonpricetracker" : "tcgplayer"),
          });
          if (!snapError) snapshotsRecorded++;
        }
      } catch {
        // Don't fail the whole operation for a snapshot error
      }
    }

    return NextResponse.json({
      updated,
      skipped: assets.length - staleAssets.length,
      snapshots_recorded: snapshotsRecorded + updated,
    });
  } catch (error) {
    console.error("Price refresh error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to refresh prices" },
      { status: 500 }
    );
  }
}
