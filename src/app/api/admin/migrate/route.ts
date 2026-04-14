import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { supabase } from "@/lib/supabase";
import { fetchPoketracePrice } from "@/lib/pokemon-api";

/**
 * Admin-only API for migrating assets to Poketrace.
 *
 * GET  — List all assets with their migration status
 * POST — Link an asset to a Poketrace product ID
 */

function isAdmin(userId: string): boolean {
  const adminIds = (process.env.ADMIN_USER_IDS || "")
    .split(",")
    .map((id) => id.trim())
    .filter(Boolean);
  return adminIds.includes(userId);
}

export async function GET() {
  const { userId } = await auth();
  if (!userId || !isAdmin(userId)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  try {
    const { data: assets, error } = await supabase
      .from("assets")
      .select(
        "id, external_id, name, set_name, asset_type, image_url, custom_image_url, current_price, price_updated_at, psa_grade, condition, poketrace_id, poketrace_market, price_currency, is_converted_price, pc_url, pc_grade_field, portfolio_id, status"
      )
      .order("name");

    if (error) throw error;

    // Group by portfolio for display
    const portfolioIds = [...new Set((assets || []).map((a) => a.portfolio_id))];
    const { data: portfolios } = await supabase
      .from("portfolios")
      .select("id, name")
      .in("id", portfolioIds);

    const portfolioMap: Record<string, string> = {};
    for (const p of portfolios || []) {
      portfolioMap[p.id] = p.name;
    }

    const enriched = (assets || []).map((a) => ({
      ...a,
      portfolio_name: portfolioMap[a.portfolio_id] || "Unknown",
      migration_status: a.poketrace_id ? "migrated" : "pending",
    }));

    const total = enriched.length;
    const migrated = enriched.filter((a) => a.poketrace_id).length;

    return NextResponse.json({
      assets: enriched,
      summary: { total, migrated, pending: total - migrated },
    });
  } catch (error) {
    console.error("[admin/migrate] GET error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to fetch assets" },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  const { userId } = await auth();
  if (!userId || !isAdmin(userId)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  try {
    const body = await request.json();
    const { assetId, poketraceId, poketraceMarket, updatePrice, grade } = body;

    if (!assetId || !poketraceId) {
      return NextResponse.json(
        { error: "assetId and poketraceId are required" },
        { status: 400 }
      );
    }

    // Verify asset exists
    const { data: asset, error: fetchError } = await supabase
      .from("assets")
      .select("*")
      .eq("id", assetId)
      .single();

    if (fetchError || !asset) {
      return NextResponse.json({ error: "Asset not found" }, { status: 404 });
    }

    // Determine the grade: use the explicitly provided grade if present,
    // otherwise fall back to the asset's existing grade
    const effectiveGrade = grade !== undefined ? (grade || null) : asset.psa_grade;

    // Update the asset with Poketrace link
    const updateData: Record<string, unknown> = {
      poketrace_id: poketraceId,
      poketrace_market: poketraceMarket || "US",
    };

    // Update the grade on the asset if one was explicitly provided
    if (grade !== undefined) {
      updateData.psa_grade = grade || null;
    }

    // Optionally fetch and update the price from Poketrace
    if (updatePrice !== false) {
      try {
        const result = await fetchPoketracePrice(
          poketraceId,
          effectiveGrade || undefined
        );
        if (result) {
          updateData.current_price = result.price;
          updateData.price_updated_at = new Date().toISOString();
          updateData.price_currency = "USD";
          updateData.is_converted_price = result.isConverted;

          // Record a snapshot
          await supabase.from("price_snapshots").insert({
            asset_id: assetId,
            price: result.price,
            source: "poketrace",
            currency: "USD",
            is_converted: result.isConverted,
            exchange_rate: result.rate || null,
          });
        }
      } catch (e) {
        console.warn(`[admin/migrate] Price fetch failed for ${poketraceId}:`, e instanceof Error ? e.message : e);
        // Don't fail the migration, just skip the price update
      }
    }

    const { data: updated, error: updateError } = await supabase
      .from("assets")
      .update(updateData)
      .eq("id", assetId)
      .select()
      .single();

    if (updateError) throw updateError;

    return NextResponse.json({
      success: true,
      asset: updated,
      priceUpdated: !!updateData.current_price,
    });
  } catch (error) {
    console.error("[admin/migrate] POST error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Migration failed" },
      { status: 500 }
    );
  }
}
