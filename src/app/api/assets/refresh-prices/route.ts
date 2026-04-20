import { NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";
import { searchCards, searchSealedProducts, fetchPoketracePrice } from "@/lib/pokemon-api";
import type { PoketraceSource } from "@/lib/poketrace";
import { extractCardPrice } from "@/lib/format";

function coerceSource(value: unknown): PoketraceSource | undefined {
  return value === "tcgplayer" || value === "ebay" || value === "cardmarket"
    ? value
    : undefined;
}

const STALE_HOURS = 24;

export async function POST() {
  console.log("[refresh-prices] ===== Manual price refresh started =====");

  try {
    const { data: assets, error } = await supabase
      .from("assets")
      .select("id, external_id, name, asset_type, price_updated_at, manual_price, current_price, poketrace_id, poketrace_market, psa_grade, price_source");

    if (error) {
      console.error("[refresh-prices] Failed to fetch assets:", error.message);
      throw error;
    }
    if (!assets || assets.length === 0) {
      console.log("[refresh-prices] No assets found. Exiting.");
      return NextResponse.json({ updated: 0, skipped: 0 });
    }

    console.log(`[refresh-prices] Fetched ${assets.length} total assets`);

    const poketraceLinked = assets.filter((a) => a.poketrace_id).length;
    const manualCount = assets.filter((a) => a.manual_price).length;
    console.log(`[refresh-prices] Breakdown: ${manualCount} manual, ${poketraceLinked} Poketrace-linked`);

    const now = Date.now();
    const staleMs = STALE_HOURS * 60 * 60 * 1000;

    // Refresh stale assets. Skip manual_price UNLESS they have a Poketrace link.
    const staleAssets = assets.filter((a) => {
      if (a.manual_price && !a.poketrace_id) return false;
      if (!a.price_updated_at) return true;
      return now - new Date(a.price_updated_at).getTime() > staleMs;
    });

    console.log(`[refresh-prices] ${staleAssets.length} stale assets to refresh (${assets.length - staleAssets.length} fresh, skipping)`);

    if (staleAssets.length === 0) {
      console.log("[refresh-prices] All assets are fresh. Nothing to do.");
      return NextResponse.json({ updated: 0, skipped: assets.length });
    }

    let updated = 0;
    let poketraceUpdated = 0;

    for (const asset of staleAssets) {
      if (!asset.name) {
        console.warn(`[refresh-prices]   Skipping asset ${asset.id} — no name`);
        continue;
      }

      try {
        let marketPrice: number | null = null;
        let isConverted = false;
        let exchangeRate: number | undefined;
        const priceSource = "poketrace";

        // Poketrace direct lookup (if linked)
        if (asset.poketrace_id) {
          try {
            const preferredSource = coerceSource(asset.price_source);
            console.log(`[refresh-prices]   Fetching Poketrace price for "${asset.name}" (id: ${asset.poketrace_id}, source: ${preferredSource || "auto"})`);
            const result = await fetchPoketracePrice(
              asset.poketrace_id,
              asset.psa_grade || undefined,
              preferredSource
            );
            if (result) {
              marketPrice = result.price;
              isConverted = result.isConverted;
              exchangeRate = result.rate;
              console.log(`[refresh-prices]   ✓ Poketrace: $${result.price}${result.isConverted ? " (EUR→USD)" : ""}`);
            } else {
              console.warn(`[refresh-prices]   ✗ Poketrace returned null for "${asset.name}" — falling back to search`);
            }
          } catch (e) {
            console.warn(`[refresh-prices]   ✗ Poketrace lookup failed for "${asset.name}":`, e instanceof Error ? e.message : e);
          }
        }

        // If a grade is specified but no graded price was found, skip —
        // don't fall back to raw price.
        if (marketPrice == null && asset.psa_grade) {
          console.log(`[refresh-prices]   Grade "${asset.psa_grade}" has no graded price for "${asset.name}" — skipping (N/A)`);
          continue;
        }

        // Fallback to name search via Poketrace
        if (marketPrice == null) {
          let results: Record<string, unknown>[];

          if (asset.asset_type === "sealed") {
            console.log(`[refresh-prices]   Searching Poketrace sealed for "${asset.name}"`);
            results = (await searchSealedProducts(asset.name, undefined, 5)) as unknown as Record<string, unknown>[];
          } else {
            console.log(`[refresh-prices]   Searching Poketrace cards for "${asset.name}"`);
            results = (await searchCards(asset.name, undefined, 5)) as unknown as Record<string, unknown>[];
          }

          if (results.length === 0) {
            console.warn(`[refresh-prices]   ✗ No results for "${asset.name}" — skipping`);
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
            console.log(`[refresh-prices]   ✓ Poketrace search: $${marketPrice} for "${asset.name}"`);
          }
        }

        if (marketPrice == null) {
          console.warn(`[refresh-prices]   ✗ No price found for "${asset.name}" — skipping`);
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
            price_currency: "USD",
            is_converted_price: isConverted,
          })
          .eq("id", asset.id);

        if (!updateError) {
          updated++;
          if (asset.poketrace_id) poketraceUpdated++;

          const { error: snapError } = await supabase.from("price_snapshots").insert({
            asset_id: asset.id,
            price: marketPrice,
            source: priceSource,
            currency: "USD",
            is_converted: isConverted,
            exchange_rate: exchangeRate || null,
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

    console.log(`[refresh-prices] Stale refresh complete: ${updated} updated (${poketraceUpdated} via Poketrace ID)`);

    // Record daily price snapshots for non-stale assets
    const freshAssets = assets.filter((a) => !staleAssets.some((s) => s.id === a.id));
    let snapshotsRecorded = 0;

    console.log(`[refresh-prices] Recording snapshots for ${freshAssets.length} non-stale assets...`);

    for (const asset of freshAssets) {
      try {
        const { data: fullAsset } = await supabase
          .from("assets")
          .select("current_price, is_converted_price")
          .eq("id", asset.id)
          .single();

        if (fullAsset?.current_price != null) {
          const source = asset.manual_price ? "manual" : "poketrace";

          const { error: snapError } = await supabase.from("price_snapshots").insert({
            asset_id: asset.id,
            price: fullAsset.current_price,
            source,
            currency: "USD",
            is_converted: fullAsset.is_converted_price || false,
          });
          if (!snapError) snapshotsRecorded++;
        }
      } catch {
        // Don't fail the whole operation for a snapshot error
      }
    }

    console.log(`[refresh-prices] ===== Manual price refresh finished =====`);
    console.log(`[refresh-prices] Summary: ${updated} refreshed (${poketraceUpdated} via ID) | ${snapshotsRecorded + updated} total snapshots`);

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
