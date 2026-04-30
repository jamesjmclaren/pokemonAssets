import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { supabase } from "@/lib/supabase";

/**
 * GET /api/assets/recent-changes?portfolioId=X&days=7
 *
 * Returns the price change % for each active asset over the last N days,
 * calculated by comparing current_price against the most recent snapshot
 * that is at least N days old.
 *
 * Response: { asset_id: string; change_pct: number | null }[]
 * change_pct is null when no snapshot old enough exists for comparison.
 */
export async function GET(request: NextRequest) {
  const { userId } = await auth();
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const portfolioId = searchParams.get("portfolioId");
  const days = Math.min(Math.max(parseInt(searchParams.get("days") ?? "7", 10), 1), 365);

  if (!portfolioId) {
    return NextResponse.json({ error: "portfolioId required" }, { status: 400 });
  }

  try {
    // Verify user has access to this portfolio
    const { data: owned } = await supabase
      .from("portfolios")
      .select("id")
      .eq("id", portfolioId)
      .eq("owner_id", userId)
      .maybeSingle();

    if (!owned) {
      const { data: member } = await supabase
        .from("portfolio_members")
        .select("portfolio_id")
        .eq("portfolio_id", portfolioId)
        .eq("user_id", userId)
        .not("accepted_at", "is", null)
        .maybeSingle();

      if (!member) {
        return NextResponse.json({ error: "Forbidden" }, { status: 403 });
      }
    }

    // Get all active assets with their current prices
    const { data: assets, error: assetsError } = await supabase
      .from("assets")
      .select("id, current_price, purchase_price")
      .eq("portfolio_id", portfolioId)
      .or("status.is.null,status.eq.ACTIVE");

    if (assetsError) throw assetsError;
    if (!assets || assets.length === 0) {
      return NextResponse.json([]);
    }

    const assetIds = assets.map((a) => a.id);
    const cutoff = new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString();

    // Fetch snapshots older than the cutoff, sorted newest-first so we can
    // keep the first (= closest to N days ago) per asset.
    const { data: snapshots, error: snapsError } = await supabase
      .from("price_snapshots")
      .select("asset_id, price")
      .in("asset_id", assetIds)
      .lte("recorded_at", cutoff)
      .order("recorded_at", { ascending: false });

    if (snapsError) throw snapsError;

    // Build a map: asset_id → baseline price (closest snapshot to N days ago)
    const baseline: Record<string, number> = {};
    for (const snap of snapshots ?? []) {
      if (!(snap.asset_id in baseline)) {
        baseline[snap.asset_id] = snap.price;
      }
    }

    const result = assets.map((a) => {
      const base = baseline[a.id];
      const current = a.current_price ?? a.purchase_price;
      const change_pct =
        base != null && base > 0 ? ((current - base) / base) * 100 : null;
      return { asset_id: a.id, change_pct };
    });

    return NextResponse.json(result);
  } catch (error) {
    console.error("[recent-changes]", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed" },
      { status: 500 }
    );
  }
}
