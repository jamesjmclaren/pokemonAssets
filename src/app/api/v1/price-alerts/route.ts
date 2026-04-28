import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";
import { authenticateApiKey } from "@/lib/api-auth";
import type { PriceAlert } from "@/types";

export const revalidate = 0;

const DEFAULT_LIMIT = 50;
const MAX_LIMIT = 200;

export async function GET(request: NextRequest) {
  const auth = await authenticateApiKey(request);
  if (!auth) {
    return NextResponse.json(
      { error: "Unauthorized: missing or invalid API key" },
      { status: 401 }
    );
  }

  const { searchParams } = new URL(request.url);
  const cursor = searchParams.get("cursor");
  const rawLimit = Number(searchParams.get("limit") || DEFAULT_LIMIT);
  const limit = Math.min(
    Math.max(Number.isFinite(rawLimit) ? rawLimit : DEFAULT_LIMIT, 1),
    MAX_LIMIT
  );

  let query = supabase
    .from("price_alerts")
    .select(
      "id, poketrace_id, card_name, set_name, image_url, condition_tier, track_tcgplayer, track_ebay, track_cardmarket, market, currency, alert_daily_digest, target_low_price, target_high_price, last_price_tcgplayer, last_price_ebay, last_price_cardmarket, last_notified_at, is_active, created_at"
    )
    .eq("user_id", auth.userId)
    .eq("is_active", true)
    .order("created_at", { ascending: false })
    .limit(limit + 1);

  if (cursor) {
    query = query.lt("created_at", cursor);
  }

  const { data, error } = await query;
  if (error) {
    console.error("[api/v1/price-alerts] supabase error:", error);
    return NextResponse.json({ error: "Failed to load price alerts" }, { status: 500 });
  }

  const rows = (data || []) as PriceAlert[];
  const hasMore = rows.length > limit;
  const page = hasMore ? rows.slice(0, limit) : rows;
  const nextCursor = hasMore ? page[page.length - 1].created_at : null;

  return NextResponse.json({
    priceAlerts: page.map((a) => ({
      id: a.id,
      poketraceId: a.poketrace_id,
      cardName: a.card_name,
      setName: a.set_name,
      imageUrl: a.image_url,
      conditionTier: a.condition_tier,
      trackTcgplayer: a.track_tcgplayer,
      trackEbay: a.track_ebay,
      trackCardmarket: a.track_cardmarket,
      market: a.market,
      currency: a.currency,
      alertDailyDigest: a.alert_daily_digest,
      targetLowPriceUsd: a.target_low_price != null ? Number(a.target_low_price) : null,
      targetHighPriceUsd: a.target_high_price != null ? Number(a.target_high_price) : null,
      lastPriceTcgplayerUsd: a.last_price_tcgplayer != null ? Number(a.last_price_tcgplayer) : null,
      lastPriceEbayUsd: a.last_price_ebay != null ? Number(a.last_price_ebay) : null,
      lastPriceCardmarketUsd: a.last_price_cardmarket != null ? Number(a.last_price_cardmarket) : null,
      lastNotifiedAt: a.last_notified_at,
      isActive: a.is_active,
      createdAt: a.created_at,
    })),
    nextCursor,
  });
}
