import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { supabase } from "@/lib/supabase";

/**
 * DELETE /api/assets/[id]/price-snapshots
 *
 * Deletes price snapshots for an asset. Admin/owner only.
 *
 * Query params:
 *   - snapshotId: delete a single snapshot by ID
 *   - before: delete all snapshots recorded before this ISO date
 *   - all: if "true", delete ALL snapshots for this asset
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { userId } = await auth();
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id: assetId } = await params;
  const { searchParams } = new URL(request.url);
  const snapshotId = searchParams.get("snapshotId");
  const before = searchParams.get("before");
  const all = searchParams.get("all");

  try {
    // Fetch the asset to get portfolio_id
    const { data: asset, error: assetError } = await supabase
      .from("assets")
      .select("portfolio_id, name")
      .eq("id", assetId)
      .single();

    if (assetError || !asset) {
      return NextResponse.json({ error: "Asset not found" }, { status: 404 });
    }

    // Check that user is owner or admin — read_only cannot delete snapshots
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

      if (member?.role !== "admin") {
        return NextResponse.json(
          { error: "Only portfolio owners and admins can delete price history" },
          { status: 403 }
        );
      }
    }

    let deleted = 0;

    if (snapshotId) {
      // Delete a single snapshot
      console.log(`[price-snapshots] Deleting snapshot ${snapshotId} for asset "${asset.name}"`);
      const { error } = await supabase
        .from("price_snapshots")
        .delete()
        .eq("id", snapshotId)
        .eq("asset_id", assetId);

      if (error) throw error;
      deleted = 1;
    } else if (before) {
      // Delete all snapshots before a date
      console.log(`[price-snapshots] Deleting snapshots before ${before} for asset "${asset.name}"`);
      const { data, error } = await supabase
        .from("price_snapshots")
        .delete()
        .eq("asset_id", assetId)
        .lt("recorded_at", `${before}T23:59:59.999Z`)
        .select("id");

      if (error) throw error;
      deleted = data?.length ?? 0;
    } else if (all === "true") {
      // Delete ALL snapshots for this asset
      console.log(`[price-snapshots] Deleting ALL snapshots for asset "${asset.name}"`);
      const { data, error } = await supabase
        .from("price_snapshots")
        .delete()
        .eq("asset_id", assetId)
        .select("id");

      if (error) throw error;
      deleted = data?.length ?? 0;
    } else {
      return NextResponse.json(
        { error: "Provide snapshotId, before (date), or all=true" },
        { status: 400 }
      );
    }

    console.log(`[price-snapshots] Deleted ${deleted} snapshots for asset "${asset.name}"`);

    return NextResponse.json({ deleted, asset_id: assetId });
  } catch (error) {
    console.error("[price-snapshots] Delete error:", error instanceof Error ? error.message : error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to delete snapshots" },
      { status: 500 }
    );
  }
}

/**
 * GET /api/assets/[id]/price-snapshots
 *
 * Returns price snapshots for an asset (for the admin delete UI).
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { userId } = await auth();
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id: assetId } = await params;

  try {
    const { data: snapshots, error } = await supabase
      .from("price_snapshots")
      .select("id, price, source, recorded_at")
      .eq("asset_id", assetId)
      .order("recorded_at", { ascending: false });

    if (error) throw error;

    return NextResponse.json(snapshots || []);
  } catch (error) {
    console.error("[price-snapshots] Fetch error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to fetch snapshots" },
      { status: 500 }
    );
  }
}
