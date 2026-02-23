import { NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";
import { searchCards, searchSealedProducts } from "@/lib/pokemon-api";
import { extractCardPrice } from "@/lib/format";
import { searchWithGradedPrices } from "@/lib/pricecharting";

const STALE_HOURS = 24;

/**
 * Map a psa_grade string to the corresponding PriceCharting price field.
 */
function getGradedPrice(
  prices: { ungraded?: number; grade7?: number; grade8?: number; grade9?: number; grade95?: number; psa10?: number },
  grade: string
): number | undefined {
  const g = grade.toLowerCase();
  if (g.includes("10")) return prices.psa10;
  if (g.includes("9.5")) return prices.grade95;
  if (g.includes("9")) return prices.grade9;
  if (g.includes("8")) return prices.grade8;
  if (g.includes("7")) return prices.grade7;
  return prices.grade9; // fallback
}

export async function POST() {
  try {
    const { data: assets, error } = await supabase
      .from("assets")
      .select("id, external_id, name, asset_type, price_updated_at, manual_price, psa_grade");

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
        let marketPrice: number | null = null;
        let priceSource = "tcgplayer";

        // Graded cards → fetch from PriceCharting (eBay sold data)
        if (asset.psa_grade && asset.asset_type === "card") {
          try {
            const pcResults = await searchWithGradedPrices(asset.name, 3);
            if (pcResults.length > 0) {
              // Use the first result's graded price
              const gradedPrice = getGradedPrice(pcResults[0].prices, asset.psa_grade);
              if (gradedPrice != null) {
                marketPrice = gradedPrice;
                priceSource = "pricecharting";
              }
            }
          } catch (e) {
            console.warn(`[refresh-prices] PriceCharting failed for graded "${asset.name}":`, e);
          }
        }

        // Ungraded cards or fallback → use JustTCG / PokemonPriceTracker
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
          priceSource = asset.asset_type === "sealed" ? "pokemonpricetracker" : "tcgplayer";
        }

        if (marketPrice == null) {
          console.warn(
            `[refresh-prices] No price found for "${asset.name}" (grade: ${asset.psa_grade || "raw"})`
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
