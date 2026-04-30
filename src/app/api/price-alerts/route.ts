import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { supabase } from "@/lib/supabase";
import { getRawPoketraceCard, extractSourcePrices } from "@/lib/poketrace";
import type { CreatePriceAlertPayload } from "@/types";

export async function GET() {
  const { userId } = await auth();
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { data, error } = await supabase
    .from("price_alerts")
    .select("*")
    .eq("user_id", userId)
    .eq("is_active", true)
    .order("created_at", { ascending: false });

  if (error) {
    console.error("[price-alerts] fetch error:", error.message);
    return NextResponse.json({ error: "Failed to fetch alerts" }, { status: 500 });
  }

  return NextResponse.json(data || []);
}

export async function POST(request: NextRequest) {
  const { userId } = await auth();
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body: CreatePriceAlertPayload;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const {
    poketrace_id,
    card_name,
    set_name,
    image_url,
    condition_tier,
    track_tcgplayer,
    track_ebay,
    track_cardmarket,
    market = "US",
    currency = "USD",
    alert_daily_digest,
    target_low_price,
    target_high_price,
  } = body;

  if (!poketrace_id || !card_name || !condition_tier) {
    return NextResponse.json(
      { error: "poketrace_id, card_name, and condition_tier are required" },
      { status: 400 }
    );
  }

  if (!track_tcgplayer && !track_ebay && !track_cardmarket) {
    return NextResponse.json(
      { error: "At least one price source must be selected" },
      { status: 400 }
    );
  }

  if (!alert_daily_digest && target_low_price == null && target_high_price == null) {
    return NextResponse.json(
      { error: "At least one alert type must be enabled" },
      { status: 400 }
    );
  }

  if (track_cardmarket && market !== "EU") {
    return NextResponse.json(
      { error: "CardMarket is only available for EU market" },
      { status: 400 }
    );
  }

  // Fetch initial prices from Poketrace
  let last_price_tcgplayer: number | null = null;
  let last_price_ebay: number | null = null;
  let last_price_cardmarket: number | null = null;

  try {
    const card = await getRawPoketraceCard(poketrace_id);
    if (card) {
      const prices = extractSourcePrices(card, condition_tier);
      if (track_tcgplayer) last_price_tcgplayer = prices.tcgplayer ?? null;
      if (track_ebay) last_price_ebay = prices.ebay ?? null;
      if (track_cardmarket) last_price_cardmarket = prices.cardmarket ?? null;
    }
  } catch (e) {
    console.warn("[price-alerts] Could not fetch initial prices:", e instanceof Error ? e.message : e);
  }

  const { data, error } = await supabase
    .from("price_alerts")
    .insert({
      user_id: userId,
      poketrace_id,
      card_name,
      set_name: set_name || "",
      image_url: image_url || null,
      condition_tier,
      track_tcgplayer: track_tcgplayer ?? false,
      track_ebay: track_ebay ?? false,
      track_cardmarket: track_cardmarket ?? false,
      market,
      currency,
      alert_daily_digest: alert_daily_digest ?? false,
      target_low_price: target_low_price ?? null,
      target_high_price: target_high_price ?? null,
      last_price_tcgplayer,
      last_price_ebay,
      last_price_cardmarket,
    })
    .select()
    .single();

  if (error) {
    if (error.code === "23505") {
      return NextResponse.json(
        { error: "You are already tracking this card and condition tier" },
        { status: 409 }
      );
    }
    console.error("[price-alerts] insert error:", error.message);
    return NextResponse.json({ error: "Failed to create alert" }, { status: 500 });
  }

  return NextResponse.json(data, { status: 201 });
}
