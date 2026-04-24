import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { supabase } from "@/lib/supabase";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  try {
    const { data: vendor, error } = await supabase
      .from("vendors")
      .select("*")
      .eq("id", id)
      .eq("is_active", true)
      .single();

    if (error || !vendor) {
      return NextResponse.json({ error: "Vendor not found" }, { status: 404 });
    }

    // Fetch vendor's for-sale items across all their owned portfolios
    const { data: portfolios } = await supabase
      .from("portfolios")
      .select("id")
      .eq("owner_id", vendor.user_id);

    const portfolioIds = portfolios?.map((p) => p.id) || [];
    const forSaleItems = portfolioIds.length
      ? (
          await supabase
            .from("assets")
            .select("*")
            .in("portfolio_id", portfolioIds)
            .eq("for_sale", true)
            .eq("status", "ACTIVE")
            .order("created_at", { ascending: false })
        ).data || []
      : [];

    return NextResponse.json({ vendor, items: forSaleItems });
  } catch (error) {
    console.error("Vendor fetch error:", error);
    return NextResponse.json({ error: "Failed to fetch vendor" }, { status: 500 });
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { userId } = await auth();
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;

  try {
    const { data: vendor } = await supabase
      .from("vendors")
      .select("user_id")
      .eq("id", id)
      .single();

    if (!vendor || vendor.user_id !== userId) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const body = await request.json();
    const { shop_name, description, shop_image_url, website_url, ebay_url, whatsapp_number, is_active } = body;

    const updates: Record<string, unknown> = {};
    if (shop_name !== undefined) updates.shop_name = shop_name.trim();
    if (description !== undefined) updates.description = description?.trim() || null;
    if (shop_image_url !== undefined) updates.shop_image_url = shop_image_url || null;
    if (website_url !== undefined) updates.website_url = website_url?.trim() || null;
    if (ebay_url !== undefined) updates.ebay_url = ebay_url?.trim() || null;
    if (whatsapp_number !== undefined) updates.whatsapp_number = whatsapp_number?.replace(/\D/g, "") || null;
    if (is_active !== undefined) updates.is_active = is_active;

    const { data, error } = await supabase
      .from("vendors")
      .update(updates)
      .eq("id", id)
      .select()
      .single();

    if (error) throw error;
    return NextResponse.json(data);
  } catch (error) {
    console.error("Vendor update error:", error);
    return NextResponse.json({ error: "Failed to update vendor" }, { status: 500 });
  }
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

  try {
    const { data: vendor } = await supabase
      .from("vendors")
      .select("user_id")
      .eq("id", id)
      .single();

    if (!vendor || vendor.user_id !== userId) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { error } = await supabase
      .from("vendors")
      .update({ is_active: false })
      .eq("id", id);

    if (error) throw error;
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Vendor delete error:", error);
    return NextResponse.json({ error: "Failed to deactivate vendor" }, { status: 500 });
  }
}
