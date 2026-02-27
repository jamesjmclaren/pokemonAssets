import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { supabase } from "@/lib/supabase";
import { searchCards, searchSealedProducts } from "@/lib/pokemon-api";
import { extractCardPrice } from "@/lib/format";
import { fetchTetheredPrice } from "@/lib/pricecharting";

/**
 * POST /api/assets/[id]/refresh-price
 *
 * Refreshes the market price for a single asset, determines the correct
 * pricing source (PriceCharting tether → API → manual skip), updates the
 * asset, and records a price snapshot.
 *
 * Returns the updated asset with the new price.
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { userId } = await auth();
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;

  try {
    // Fetch the asset
    const { data: asset, error: fetchError } = await supabase
      .from("assets")
      .select("*")
      .eq("id", id)
      .single();

    if (fetchError || !asset) {
      return NextResponse.json({ error: "Asset not found" }, { status: 404 });
    }

    // Verify user has access to this asset's portfolio
    const { data: portfolio } = await supabase
      .from("portfolios")
      .select("owner_id")
      .eq("id", asset.portfolio_id)
      .single();

    const isOwner = portfolio?.owner_id === userId;
    if (!isOwner) {
      const { data: member } = await supabase
        .from("portfolio_members")
        .select("role")
        .eq("portfolio_id", asset.portfolio_id)
        .eq("user_id", userId)
        .single();

      if (!member) {
        return NextResponse.json({ error: "Forbidden" }, { status: 403 });
      }
    }

    if (!asset.name) {
      return NextResponse.json({ error: "Asset has no name" }, { status: 400 });
    }

    let marketPrice: number | null = null;
    let priceSource = asset.asset_type === "sealed" ? "pokemonpricetracker" : "tcgplayer";

    console.log(`[refresh-single] Refreshing price for "${asset.name}" (id: ${id})`);

    // State 3: PriceCharting tether
    if (asset.pc_url) {
      try {
        console.log(`[refresh-single]   Trying PriceCharting tether (grade: ${asset.pc_grade_field || "ungraded"}, url: ${asset.pc_url})`);
        const tetheredPrice = await fetchTetheredPrice(
          asset.pc_url,
          asset.pc_grade_field || undefined
        );
        if (tetheredPrice != null) {
          marketPrice = tetheredPrice;
          priceSource = "pricecharting";
          console.log(`[refresh-single]   ✓ PriceCharting price: $${tetheredPrice}`);
        } else {
          console.warn(`[refresh-single]   ✗ PriceCharting returned null — falling back to API`);
        }
      } catch (e) {
        console.warn(`[refresh-single]   ✗ PriceCharting failed:`, e instanceof Error ? e.message : e);
      }
    }

    // State 2: Manual price — skip API refresh (unless tether failed above)
    if (marketPrice == null && asset.manual_price && !asset.pc_url) {
      console.log(`[refresh-single]   Asset is manual_price — skipping API refresh`);
      return NextResponse.json({
        asset,
        refreshed: false,
        reason: "manual_price",
        message: "This asset uses manual pricing. Update the price manually via the edit form.",
      });
    }

    // State 1: JustTCG / PokemonPriceTracker API
    if (marketPrice == null) {
      let results: Record<string, unknown>[];

      if (asset.asset_type === "sealed") {
        console.log(`[refresh-single]   Trying PokemonPriceTracker for sealed product`);
        try {
          results = (await searchSealedProducts(asset.name, undefined, 5)) as unknown as Record<string, unknown>[];
        } catch {
          console.warn(`[refresh-single]   PokemonPriceTracker failed, trying JustTCG`);
          results = (await searchCards(asset.name, undefined, 5)) as unknown as Record<string, unknown>[];
        }
      } else {
        console.log(`[refresh-single]   Trying JustTCG for card`);
        results = (await searchCards(asset.name, undefined, 5)) as unknown as Record<string, unknown>[];
      }

      if (results.length === 0) {
        console.warn(`[refresh-single]   ✗ No API results found`);
        return NextResponse.json({
          asset,
          refreshed: false,
          reason: "no_results",
          message: "No matching results found from pricing APIs.",
        });
      }

      const match = results.find((c: Record<string, unknown>) => c.id === asset.external_id) || results[0];
      if (match) {
        marketPrice = extractCardPrice(match);
        if (marketPrice != null) {
          console.log(`[refresh-single]   ✓ API price: $${marketPrice} (source: ${priceSource})`);
        }
      }
    }

    if (marketPrice == null) {
      console.warn(`[refresh-single]   ✗ No price found from any source`);
      return NextResponse.json({
        asset,
        refreshed: false,
        reason: "no_price",
        message: "Could not extract a price from any source.",
      });
    }

    // Log price change
    const oldPrice = asset.current_price != null ? Number(asset.current_price) : null;
    if (oldPrice != null && oldPrice > 0) {
      const pctChange = ((marketPrice - oldPrice) / oldPrice) * 100;
      console.log(`[refresh-single]   Price change: $${oldPrice} → $${marketPrice} (${pctChange > 0 ? "+" : ""}${pctChange.toFixed(1)}%)`);
    }

    // Update the asset
    const { data: updated, error: updateError } = await supabase
      .from("assets")
      .update({
        current_price: marketPrice,
        price_updated_at: new Date().toISOString(),
      })
      .eq("id", id)
      .select()
      .single();

    if (updateError) {
      console.error(`[refresh-single]   ✗ DB update failed:`, updateError.message);
      throw updateError;
    }

    // Record a price snapshot
    const { error: snapError } = await supabase.from("price_snapshots").insert({
      asset_id: id,
      price: marketPrice,
      source: priceSource,
    });

    if (snapError) {
      console.error(`[refresh-single]   ✗ Snapshot insert failed:`, snapError.message);
    }

    console.log(`[refresh-single]   ✓ Done — saved $${marketPrice} (${priceSource})`);

    return NextResponse.json({
      asset: updated,
      refreshed: true,
      price: marketPrice,
      source: priceSource,
      previous_price: oldPrice,
    });
  } catch (error) {
    console.error(`[refresh-single] Error refreshing asset ${id}:`, error instanceof Error ? error.message : error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to refresh price" },
      { status: 500 }
    );
  }
}
