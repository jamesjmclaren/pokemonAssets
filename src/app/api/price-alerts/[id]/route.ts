import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { supabase } from "@/lib/supabase";

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { userId } = await auth();
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;

  const { data: existing } = await supabase
    .from("price_alerts")
    .select("user_id")
    .eq("id", id)
    .single();

  if (!existing || existing.user_id !== userId) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  let body: Record<string, unknown>;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const updates: Record<string, unknown> = {};

  if (body.track_tcgplayer !== undefined) updates.track_tcgplayer = body.track_tcgplayer;
  if (body.track_ebay !== undefined) updates.track_ebay = body.track_ebay;
  if (body.track_cardmarket !== undefined) updates.track_cardmarket = body.track_cardmarket;
  if (body.alert_daily_digest !== undefined) updates.alert_daily_digest = body.alert_daily_digest;
  if ("target_low_price" in body) updates.target_low_price = body.target_low_price ?? null;
  if ("target_high_price" in body) updates.target_high_price = body.target_high_price ?? null;
  if (body.is_active !== undefined) updates.is_active = body.is_active;

  const { data, error } = await supabase
    .from("price_alerts")
    .update(updates)
    .eq("id", id)
    .select()
    .single();

  if (error) {
    console.error("[price-alerts] update error:", error.message);
    return NextResponse.json({ error: "Failed to update alert" }, { status: 500 });
  }

  return NextResponse.json(data);
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { userId } = await auth();
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;

  const { data: existing } = await supabase
    .from("price_alerts")
    .select("user_id")
    .eq("id", id)
    .single();

  if (!existing || existing.user_id !== userId) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const { error } = await supabase
    .from("price_alerts")
    .delete()
    .eq("id", id);

  if (error) {
    console.error("[price-alerts] delete error:", error.message);
    return NextResponse.json({ error: "Failed to delete alert" }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}
