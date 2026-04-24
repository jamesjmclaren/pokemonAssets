import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const type = searchParams.get("type"); // card | sealed
  const condition = searchParams.get("condition");
  const setName = searchParams.get("set");

  try {
    // Fetch all active vendors
    const { data: vendors, error: vendorError } = await supabase
      .from("vendors")
      .select("*")
      .eq("is_active", true);

    if (vendorError) throw vendorError;
    if (!vendors || vendors.length === 0) return NextResponse.json([]);

    const vendorUserIds = vendors.map((v) => v.user_id);
    const vendorByUserId: Record<string, typeof vendors[0]> = {};
    for (const v of vendors) vendorByUserId[v.user_id] = v;

    // Fetch all portfolios owned by active vendors
    const { data: portfolios } = await supabase
      .from("portfolios")
      .select("id, owner_id")
      .in("owner_id", vendorUserIds);

    if (!portfolios || portfolios.length === 0) return NextResponse.json([]);

    const portfolioIds = portfolios.map((p) => p.id);
    const ownerByPortfolioId: Record<string, string> = {};
    for (const p of portfolios) ownerByPortfolioId[p.id] = p.owner_id;

    // Fetch for-sale assets from vendor portfolios
    let query = supabase
      .from("assets")
      .select("*")
      .in("portfolio_id", portfolioIds)
      .eq("for_sale", true)
      .eq("status", "ACTIVE")
      .order("created_at", { ascending: false });

    if (type) query = query.eq("asset_type", type);
    if (condition) query = query.eq("condition", condition);
    if (setName) query = query.ilike("set_name", `%${setName}%`);

    const { data: assets, error: assetError } = await query;
    if (assetError) throw assetError;

    // Attach vendor info to each asset
    const items = (assets || []).map((asset) => {
      const ownerId = ownerByPortfolioId[asset.portfolio_id];
      return { ...asset, vendor: vendorByUserId[ownerId] };
    });

    return NextResponse.json(items);
  } catch (error) {
    console.error("Marketplace items fetch error:", error);
    return NextResponse.json({ error: "Failed to fetch marketplace items" }, { status: 500 });
  }
}
