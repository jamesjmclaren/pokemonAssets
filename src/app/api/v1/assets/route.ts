import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";
import { authenticateApiKey } from "@/lib/api-auth";

export const revalidate = 0;

const DEFAULT_LIMIT = 50;
const MAX_LIMIT = 200;

async function getUserPortfolioIds(userId: string): Promise<string[]> {
  const { data: owned } = await supabase
    .from("portfolios")
    .select("id")
    .eq("owner_id", userId);
  const { data: member } = await supabase
    .from("portfolio_members")
    .select("portfolio_id")
    .eq("user_id", userId)
    .not("accepted_at", "is", null);
  const ownedIds = owned?.map((p) => p.id) || [];
  const memberIds = member?.map((m) => m.portfolio_id) || [];
  return [...ownedIds, ...memberIds];
}

export async function GET(request: NextRequest) {
  const auth = await authenticateApiKey(request);
  if (!auth) {
    return NextResponse.json(
      { error: "Unauthorized: missing or invalid API key" },
      { status: 401 }
    );
  }

  const { searchParams } = new URL(request.url);
  const portfolioId = searchParams.get("portfolioId");
  const cursor = searchParams.get("cursor");
  const rawLimit = Number(searchParams.get("limit") || DEFAULT_LIMIT);
  const limit = Math.min(
    Math.max(Number.isFinite(rawLimit) ? rawLimit : DEFAULT_LIMIT, 1),
    MAX_LIMIT
  );

  const accessibleIds = await getUserPortfolioIds(auth.userId);
  if (accessibleIds.length === 0) {
    return NextResponse.json({ assets: [], nextCursor: null });
  }

  if (portfolioId && !accessibleIds.includes(portfolioId)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const filterIds = portfolioId ? [portfolioId] : accessibleIds;

  let query = supabase
    .from("assets")
    .select(
      "id, portfolio_id, name, set_name, asset_type, purchase_price, purchase_date, current_price, price_updated_at, poketrace_id, poketrace_market, psa_grade, status, sell_price, sell_date, created_at"
    )
    .in("portfolio_id", filterIds)
    .order("created_at", { ascending: false })
    .limit(limit + 1);

  if (cursor) {
    query = query.lt("created_at", cursor);
  }

  const { data, error } = await query;
  if (error) {
    console.error("[api/v1/assets] supabase error:", error);
    return NextResponse.json({ error: "Failed to load assets" }, { status: 500 });
  }

  const rows = data || [];
  const hasMore = rows.length > limit;
  const page = hasMore ? rows.slice(0, limit) : rows;
  const nextCursor = hasMore ? page[page.length - 1].created_at : null;

  return NextResponse.json({
    assets: page.map((a) => ({
      id: a.id,
      portfolioId: a.portfolio_id,
      name: a.name,
      setName: a.set_name,
      type: a.asset_type,
      purchasePriceUsd: a.purchase_price != null ? Number(a.purchase_price) : null,
      purchaseDate: a.purchase_date,
      currentPriceUsd: a.current_price != null ? Number(a.current_price) : null,
      priceUpdatedAt: a.price_updated_at,
      poketraceId: a.poketrace_id,
      poketraceMarket: a.poketrace_market,
      grade: a.psa_grade,
      status: a.status,
      sellPriceUsd: a.sell_price != null ? Number(a.sell_price) : null,
      sellDate: a.sell_date,
      createdAt: a.created_at,
    })),
    nextCursor,
  });
}
