import { NextRequest, NextResponse } from "next/server";
import { getPriceHistoryByType, getPriceHistory } from "@/lib/pokemon-api";
import { supabase } from "@/lib/supabase";

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const cardId = searchParams.get("cardId");
  const name = searchParams.get("name");
  const startDate = searchParams.get("startDate");
  const endDate = searchParams.get("endDate");
  const assetType = searchParams.get("assetType") as "card" | "sealed" | null;
  const assetId = searchParams.get("assetId");

  if (!cardId && !name && !assetId) {
    return NextResponse.json(
      { error: "cardId, name, or assetId parameter is required" },
      { status: 400 }
    );
  }

  try {
    // First, try to get price snapshots from Supabase (our recorded history)
    let snapshotData: { date: string; price: number; source?: string }[] = [];

    if (assetId) {
      let query = supabase
        .from("price_snapshots")
        .select("price, source, recorded_at")
        .eq("asset_id", assetId)
        .order("recorded_at", { ascending: true });

      if (startDate) {
        query = query.gte("recorded_at", `${startDate}T00:00:00.000Z`);
      }
      if (endDate) {
        query = query.lte("recorded_at", `${endDate}T23:59:59.999Z`);
      }

      const { data: snapshots } = await query;

      if (snapshots && snapshots.length > 0) {
        // Deduplicate by date (keep only one entry per day)
        const byDate = new Map<string, { price: number; source: string }>();
        for (const snap of snapshots) {
          const date = new Date(snap.recorded_at).toISOString().split("T")[0];
          byDate.set(date, { price: snap.price, source: snap.source });
        }
        snapshotData = Array.from(byDate.entries()).map(([date, val]) => ({
          date,
          price: val.price,
          source: val.source,
        }));
      }
    }

    // If we have enough snapshot data, return it directly
    if (snapshotData.length >= 2) {
      return NextResponse.json(snapshotData);
    }

    // Fall back to external API for price history
    let apiData;

    if (assetType) {
      apiData = await getPriceHistoryByType(
        assetType,
        cardId || "",
        name || undefined,
        startDate || undefined,
        endDate || undefined
      );
    } else {
      apiData = await getPriceHistory(
        cardId || "",
        startDate || undefined,
        endDate || undefined,
        name || undefined
      );
    }

    // Merge: use API data as base and overlay snapshot data
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const rawPoints = Array.isArray(apiData) ? apiData : (apiData as any)?.data || [];
    const apiPoints = rawPoints as { date: string; price: number; source?: string }[];

    if (snapshotData.length > 0 && apiPoints.length > 0) {
      // Merge both sources, preferring snapshot data for dates where we have both
      const merged = new Map<string, { price: number; source?: string }>();
      for (const point of apiPoints) {
        merged.set(point.date, { price: point.price, source: point.source });
      }
      for (const point of snapshotData) {
        merged.set(point.date, { price: point.price, source: point.source });
      }
      const result = Array.from(merged.entries())
        .map(([date, val]) => ({ date, ...val }))
        .sort((a, b) => a.date.localeCompare(b.date));
      return NextResponse.json(result);
    }

    return NextResponse.json(apiData);
  } catch (error) {
    console.error("Price history API error:", error);
    return NextResponse.json(
      {
        error:
          error instanceof Error ? error.message : "Failed to fetch price history",
      },
      { status: 500 }
    );
  }
}
