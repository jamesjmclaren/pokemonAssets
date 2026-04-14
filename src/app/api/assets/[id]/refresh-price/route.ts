import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { supabase } from "@/lib/supabase";
import { searchCards, searchSealedProducts, fetchPoketracePrice } from "@/lib/pokemon-api";
import { extractCardPrice } from "@/lib/format";

/**
 * POST /api/assets/[id]/refresh-price
 *
 * Refreshes the market price for a single asset using Poketrace.
 *
 * Cascade:
 * 1. If poketrace_id set → fetch by ID from Poketrace (graded or raw)
 * 2. If manual_price and no link → skip
 * 3. Else → search by name via Poketrace
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
    let priceSource = "poketrace";
    let isConverted = false;
    let exchangeRate: number | undefined;

    console.log(`[refresh-single] Refreshing price for "${asset.name}" (id: ${id})`);

    // State 1: Poketrace direct lookup (if linked)
    if (asset.poketrace_id) {
      try {
        console.log(`[refresh-single]   Trying Poketrace by ID: ${asset.poketrace_id} (grade: ${asset.psa_grade || "raw"})`);
        const result = await fetchPoketracePrice(
          asset.poketrace_id,
          asset.psa_grade || undefined
        );
        if (result) {
          marketPrice = result.price;
          isConverted = result.isConverted;
          exchangeRate = result.rate;
          console.log(`[refresh-single]   ✓ Poketrace price: $${result.price}${result.isConverted ? ` (converted from EUR at ${result.rate})` : ""}`);
        } else {
          console.warn(`[refresh-single]   ✗ Poketrace returned null — falling back to name search`);
        }
      } catch (e) {
        console.warn(`[refresh-single]   ✗ Poketrace ID lookup failed:`, e instanceof Error ? e.message : e);
      }
    }

    // State 2: Manual price — skip refresh (unless Poketrace linked above)
    if (marketPrice == null && asset.manual_price && !asset.poketrace_id) {
      console.log(`[refresh-single]   Asset is manual_price — skipping refresh`);
      return NextResponse.json({
        asset,
        refreshed: false,
        reason: "manual_price",
        message: "This asset uses manual pricing. Update the price manually via the edit form.",
      });
    }

    // State 3: Search by name via Poketrace
    if (marketPrice == null) {
      let results: Record<string, unknown>[];

      if (asset.asset_type === "sealed") {
        console.log(`[refresh-single]   Searching Poketrace for sealed: "${asset.name}"`);
        results = (await searchSealedProducts(asset.name, undefined, 5)) as unknown as Record<string, unknown>[];
      } else {
        console.log(`[refresh-single]   Searching Poketrace for card: "${asset.name}"`);
        results = (await searchCards(asset.name, undefined, 5)) as unknown as Record<string, unknown>[];
      }

      if (results.length === 0) {
        console.warn(`[refresh-single]   ✗ No results found`);
        return NextResponse.json({
          asset,
          refreshed: false,
          reason: "no_results",
          message: "No matching results found from Poketrace.",
        });
      }

      const match = results.find((c: Record<string, unknown>) => c.id === asset.external_id) || results[0];
      if (match) {
        marketPrice = extractCardPrice(match);
        if (marketPrice != null) {
          console.log(`[refresh-single]   ✓ Poketrace search price: $${marketPrice}`);
        }
      }
    }

    if (marketPrice == null) {
      console.warn(`[refresh-single]   ✗ No price found from any source`);
      return NextResponse.json({
        asset,
        refreshed: false,
        reason: "no_price",
        message: "Could not extract a price from Poketrace.",
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
        price_currency: "USD",
        is_converted_price: isConverted,
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
      currency: "USD",
      is_converted: isConverted,
      exchange_rate: exchangeRate || null,
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
