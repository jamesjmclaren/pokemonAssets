import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { supabase } from "@/lib/supabase";

export async function GET() {
  try {
    const { data: vendors, error } = await supabase
      .from("vendors")
      .select("*")
      .eq("is_active", true)
      .order("created_at", { ascending: false });

    if (error) throw error;

    // Count for-sale items per vendor by joining through portfolios
    const vendorIds = vendors?.map((v) => v.user_id) || [];
    if (vendorIds.length === 0) return NextResponse.json([]);

    const { data: portfolios } = await supabase
      .from("portfolios")
      .select("id, owner_id")
      .in("owner_id", vendorIds);

    const portfolioMap: Record<string, string> = {};
    for (const p of portfolios || []) {
      portfolioMap[p.id] = p.owner_id;
    }

    const portfolioIds = Object.keys(portfolioMap);
    const { data: forSaleAssets } = portfolioIds.length
      ? await supabase
          .from("assets")
          .select("portfolio_id")
          .in("portfolio_id", portfolioIds)
          .eq("for_sale", true)
          .eq("status", "ACTIVE")
      : { data: [] };

    const countByUserId: Record<string, number> = {};
    for (const asset of forSaleAssets || []) {
      const uid = portfolioMap[asset.portfolio_id];
      if (uid) countByUserId[uid] = (countByUserId[uid] || 0) + 1;
    }

    const result = (vendors || []).map((v) => ({
      ...v,
      item_count: countByUserId[v.user_id] || 0,
    }));

    return NextResponse.json(result);
  } catch (error) {
    console.error("Vendors fetch error:", error);
    return NextResponse.json({ error: "Failed to fetch vendors" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  const { userId } = await auth();
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await request.json();
    const { shop_name, description, shop_image_url, website_url, ebay_url, whatsapp_number } = body;

    if (!shop_name?.trim()) {
      return NextResponse.json({ error: "Shop name is required" }, { status: 400 });
    }

    const { data, error } = await supabase
      .from("vendors")
      .upsert(
        {
          user_id: userId,
          shop_name: shop_name.trim(),
          description: description?.trim() || null,
          shop_image_url: shop_image_url || null,
          website_url: website_url?.trim() || null,
          ebay_url: ebay_url?.trim() || null,
          whatsapp_number: whatsapp_number?.replace(/\D/g, "") || null,
          is_active: true,
        },
        { onConflict: "user_id" }
      )
      .select()
      .single();

    if (error) throw error;
    return NextResponse.json(data, { status: 201 });
  } catch (error) {
    console.error("Vendor create error:", error);
    return NextResponse.json({ error: "Failed to save vendor profile" }, { status: 500 });
  }
}
