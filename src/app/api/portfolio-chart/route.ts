import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { supabase } from "@/lib/supabase";

/**
 * GET /api/portfolio-chart?portfolioId=xxx&range=3M
 *
 * Returns daily aggregated portfolio value split by asset type (raw, graded, sealed)
 * plus cost basis, for charting.
 */
export async function GET(request: NextRequest) {
  const { userId } = await auth();
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const portfolioId = searchParams.get("portfolioId");
  const range = searchParams.get("range") || "3M";

  if (!portfolioId) {
    return NextResponse.json({ error: "portfolioId is required" }, { status: 400 });
  }

  try {
    // Verify user has access
    const { data: portfolio } = await supabase
      .from("portfolios")
      .select("owner_id")
      .eq("id", portfolioId)
      .single();

    if (!portfolio) {
      return NextResponse.json({ error: "Portfolio not found" }, { status: 404 });
    }

    const isOwner = portfolio.owner_id === userId;
    if (!isOwner) {
      const { data: member } = await supabase
        .from("portfolio_members")
        .select("role")
        .eq("portfolio_id", portfolioId)
        .eq("user_id", userId)
        .single();

      if (!member) {
        return NextResponse.json({ error: "Forbidden" }, { status: 403 });
      }
    }

    // Get all assets in this portfolio
    const { data: assets, error: assetsErr } = await supabase
      .from("assets")
      .select("id, asset_type, psa_grade, purchase_price, purchase_date, quantity, current_price")
      .eq("portfolio_id", portfolioId);

    if (assetsErr) throw assetsErr;
    if (!assets || assets.length === 0) {
      return NextResponse.json([]);
    }

    // Calculate date range
    const now = new Date();
    let startDate: Date;
    switch (range) {
      case "1M":
        startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
        break;
      case "3M":
        startDate = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);
        break;
      case "1Y":
        startDate = new Date(now.getTime() - 365 * 24 * 60 * 60 * 1000);
        break;
      default: // "All"
        startDate = new Date(
          Math.min(...assets.map((a) => new Date(a.purchase_date).getTime()))
        );
        break;
    }

    const startStr = startDate.toISOString().split("T")[0];

    // Get all price snapshots for these assets in range
    const assetIds = assets.map((a) => a.id);
    const { data: snapshots, error: snapErr } = await supabase
      .from("price_snapshots")
      .select("asset_id, price, recorded_at")
      .in("asset_id", assetIds)
      .gte("recorded_at", `${startStr}T00:00:00.000Z`)
      .order("recorded_at", { ascending: true });

    if (snapErr) throw snapErr;

    // Build a map: assetId -> category
    const assetMap = new Map<string, { category: "raw" | "graded" | "sealed"; qty: number; purchasePrice: number; currentPrice: number | null }>();
    for (const a of assets) {
      const category = a.asset_type === "sealed"
        ? "sealed"
        : a.psa_grade
          ? "graded"
          : "raw";
      assetMap.set(a.id, {
        category,
        qty: a.quantity || 1,
        purchasePrice: a.purchase_price,
        currentPrice: a.current_price,
      });
    }

    // Cost basis (doesn't change over time, but we need it per category)
    const costBasis = { raw: 0, graded: 0, sealed: 0, total: 0 };
    for (const a of assets) {
      const info = assetMap.get(a.id)!;
      const cost = info.purchasePrice * info.qty;
      costBasis[info.category] += cost;
      costBasis.total += cost;
    }

    // Group snapshots by date, then by category
    // For each date, take the latest snapshot per asset, then sum by category
    const snapshotsByDate = new Map<string, Map<string, number>>();

    for (const snap of snapshots || []) {
      const date = new Date(snap.recorded_at).toISOString().split("T")[0];
      if (!snapshotsByDate.has(date)) {
        snapshotsByDate.set(date, new Map());
      }
      const dateMap = snapshotsByDate.get(date)!;
      // Keep latest snapshot per asset per day
      dateMap.set(snap.asset_id, snap.price);
    }

    // Build chart data: for each date, calculate total per category
    // We need to carry forward the last known price for assets without a snapshot on a given date
    const sortedDates = Array.from(snapshotsByDate.keys()).sort();

    if (sortedDates.length === 0) {
      // No snapshots — return a single point with current values
      const raw = assets
        .filter((a) => assetMap.get(a.id)!.category === "raw")
        .reduce((sum, a) => sum + (a.current_price ?? a.purchase_price) * (a.quantity || 1), 0);
      const graded = assets
        .filter((a) => assetMap.get(a.id)!.category === "graded")
        .reduce((sum, a) => sum + (a.current_price ?? a.purchase_price) * (a.quantity || 1), 0);
      const sealed = assets
        .filter((a) => assetMap.get(a.id)!.category === "sealed")
        .reduce((sum, a) => sum + (a.current_price ?? a.purchase_price) * (a.quantity || 1), 0);

      return NextResponse.json([{
        date: new Date().toISOString().split("T")[0],
        total: raw + graded + sealed,
        raw,
        graded,
        sealed,
        costBasis: costBasis.total,
      }]);
    }

    // Track last known price per asset
    const lastKnownPrice = new Map<string, number>();
    for (const a of assets) {
      lastKnownPrice.set(a.id, a.purchase_price); // default to purchase price
    }

    const chartPoints: Array<{
      date: string;
      total: number;
      raw: number;
      graded: number;
      sealed: number;
      costBasis: number;
    }> = [];

    for (const date of sortedDates) {
      const dateSnapshots = snapshotsByDate.get(date)!;

      // Update last known prices with today's snapshots
      for (const [assetId, price] of dateSnapshots) {
        lastKnownPrice.set(assetId, price);
      }

      // Calculate totals by category using last known prices
      let raw = 0, graded = 0, sealed = 0;
      for (const a of assets) {
        const info = assetMap.get(a.id)!;
        const price = lastKnownPrice.get(a.id) ?? info.purchasePrice;
        const value = price * info.qty;
        if (info.category === "raw") raw += value;
        else if (info.category === "graded") graded += value;
        else sealed += value;
      }

      chartPoints.push({
        date,
        total: raw + graded + sealed,
        raw,
        graded,
        sealed,
        costBasis: costBasis.total,
      });
    }

    return NextResponse.json(chartPoints);
  } catch (error) {
    console.error("[portfolio-chart] Error:", error instanceof Error ? error.message : error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to build chart data" },
      { status: 500 }
    );
  }
}
