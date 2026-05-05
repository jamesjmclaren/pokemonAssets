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
       current_price, price_currency, price_source,
       condition, psa_grade, rarity, card_number, asset_type,
       quantity, language`
    )
    .eq("portfolio_id", portfolio.id)
    .or("status.is.null,status.eq.ACTIVE")
    .order("current_price", { ascending: false });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const totalValue = (assets ?? []).reduce(
    (sum, a) => sum + (a.current_price ?? 0) * (a.quantity ?? 1),
    0
  );

  return NextResponse.json(
    { portfolio: { name: portfolio.name }, assets: assets ?? [], totalValue },
    {
      headers: {
        "Cache-Control": "public, s-maxage=300, stale-while-revalidate=600",
      },
    }
  );
}
