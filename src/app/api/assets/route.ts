import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { supabase } from "@/lib/supabase";

async function getUserPortfolioIds(userId: string): Promise<string[]> {
  // Get owned portfolios
  const { data: owned } = await supabase
    .from("portfolios")
    .select("id")
    .eq("owner_id", userId);

  // Get member portfolios
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
  const { userId } = await auth();
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const portfolioId = searchParams.get("portfolioId");

  try {
    // Get user's accessible portfolio IDs
    const accessibleIds = await getUserPortfolioIds(userId);

    if (accessibleIds.length === 0) {
      return NextResponse.json([]);
    }

    let query = supabase
      .from("assets")
      .select("*")
      .order("created_at", { ascending: false });

    if (portfolioId) {
      // Verify user has access to this portfolio
      if (!accessibleIds.includes(portfolioId)) {
        return NextResponse.json({ error: "Forbidden" }, { status: 403 });
      }
      query = query.eq("portfolio_id", portfolioId);
    } else {
      // Get assets from all accessible portfolios
      query = query.in("portfolio_id", accessibleIds);
    }

    const { data, error } = await query;

    if (error) throw error;
    return NextResponse.json(data || []);
  } catch (error) {
    console.error("Assets fetch error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to fetch assets" },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  const { userId } = await auth();
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await request.json();

    const {
      portfolio_id,
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

    if (!portfolio_id || !external_id || !name || !purchase_price || !purchase_date) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 }
      );
    }

    // Verify user has write access to this portfolio
    const accessibleIds = await getUserPortfolioIds(userId);
    if (!accessibleIds.includes(portfolio_id)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    // Check if user has write access (owner or admin)
    const { data: portfolio } = await supabase
      .from("portfolios")
      .select("owner_id")
      .eq("id", portfolio_id)
      .single();

    const isOwner = portfolio?.owner_id === userId;

    if (!isOwner) {
      const { data: member } = await supabase
        .from("portfolio_members")
        .select("role")
        .eq("portfolio_id", portfolio_id)
        .eq("user_id", userId)
        .single();

      if (member?.role !== "admin") {
        return NextResponse.json({ error: "Read-only access" }, { status: 403 });
      }
    }

    const { data, error } = await supabase
      .from("assets")
      .insert({
        portfolio_id,
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
