import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";

export async function GET() {
  try {
    const { data, error } = await supabase
      .from("assets")
      .select("*")
      .order("created_at", { ascending: false });

    if (error) throw error;
    return NextResponse.json(data);
  } catch (error) {
    console.error("Assets fetch error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to fetch assets" },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    const {
      external_id,
      name,
      set_name,
      asset_type,
      image_url,
      custom_image_url,
      purchase_price,
      purchase_date,
      purchase_location,
      condition,
      notes,
      current_price,
      rarity,
      card_number,
    } = body;

    if (!external_id || !name || !purchase_price || !purchase_date) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 }
      );
    }

    const { data, error } = await supabase
      .from("assets")
      .insert({
        external_id,
        name,
        set_name: set_name || "",
        asset_type: asset_type || "card",
        image_url: image_url || null,
        custom_image_url: custom_image_url || null,
        purchase_price: parseFloat(purchase_price),
        purchase_date,
        purchase_location: purchase_location || "",
        condition: condition || "Near Mint",
        notes: notes || null,
        current_price: current_price ? parseFloat(current_price) : null,
        price_updated_at: current_price ? new Date().toISOString() : null,
        rarity: rarity || null,
        card_number: card_number || null,
      })
      .select()
      .single();

    if (error) throw error;
    return NextResponse.json(data, { status: 201 });
  } catch (error) {
    console.error("Asset creation error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to create asset" },
      { status: 500 }
    );
  }
}

export async function DELETE(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const id = searchParams.get("id");

  if (!id) {
    return NextResponse.json({ error: "id parameter is required" }, { status: 400 });
  }

  try {
    const { error } = await supabase.from("assets").delete().eq("id", id);
    if (error) throw error;
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Asset deletion error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to delete asset" },
      { status: 500 }
    );
  }
}
