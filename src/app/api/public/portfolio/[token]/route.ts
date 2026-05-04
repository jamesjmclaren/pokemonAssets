import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ token: string }> }
) {
  const { token } = await params;

  const { data: portfolio } = await supabase
    .from("portfolios")
    .select("id, name")
    .eq("public_token", token)
    .eq("is_public", true)
    .single();

  if (!portfolio) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const { data: assets, error } = await supabase
    .from("assets")
    .select(
      `id, name, set_name, image_url, custom_image_url,
       current_price, price_currency, price_source, price_updated_at,
       condition, psa_grade, rarity, card_number, asset_type,
       quantity, language`
    )
    .eq("portfolio_id", portfolio.id)
    .or("status.is.null,status.eq.ACTIVE")
    .order("current_price", { ascending: false });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const assetIds = (assets ?? []).map((a) => a.id);

  let baseline: Record<string, number> = {};
  if (assetIds.length > 0) {
    const cutoff = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
    const { data: snapshots } = await supabase
      .from("price_snapshots")
      .select("asset_id, price")
      .in("asset_id", assetIds)
      .lte("recorded_at", cutoff)
      .order("recorded_at", { ascending: false });

    for (const snap of snapshots ?? []) {
      if (!(snap.asset_id in baseline)) {
        baseline[snap.asset_id] = snap.price;
      }
    }
  }

  const publicAssets = (assets ?? []).map((asset) => {
    const base = baseline[asset.id] ?? null;
    const current = asset.current_price ?? null;
    const change7d = base !== null && current !== null ? current - base : null;
    const change7dPct =
      base !== null && base !== 0 && current !== null
        ? ((current - base) / base) * 100
        : null;

    return { ...asset, change7d, change7dPct };
  });

  const totalValue = publicAssets.reduce(
    (sum, a) => sum + (a.current_price ?? 0) * (a.quantity ?? 1),
    0
  );

  return NextResponse.json(
    { portfolio: { name: portfolio.name }, assets: publicAssets, totalValue },
    {
      headers: {
        "Cache-Control": "public, s-maxage=300, stale-while-revalidate=600",
      },
    }
  );
}
