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
    const message =
      error instanceof Error
        ? error.message
        : typeof error === "object" && error !== null && "message" in error
          ? String((error as { message: unknown }).message)
          : "Failed to fetch assets";
    return NextResponse.json({ error: message }, { status: 500 });
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
      psa_grade,
      manual_price,
      quantity,
      language,
      storage_location,
      is_manual_submission,
      pc_product_id,
      pc_url,
      pc_grade_field,
      poketrace_id,
      poketrace_market,
      price_source,
      evidence_url,
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

    // Build the insert payload with required fields
    const insertPayload: Record<string, unknown> = {
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
      psa_grade: psa_grade || null,
      manual_price: manual_price || false,
      quantity: quantity ? parseInt(quantity) : 1,
      language: language || "English",
      storage_location: storage_location || "",
      is_manual_submission: is_manual_submission || false,
      pc_product_id: pc_product_id || null,
      pc_url: pc_url || null,
      pc_grade_field: pc_grade_field || null,
      poketrace_id: poketrace_id || null,
      poketrace_market: poketrace_market || "US",
      price_source: price_source || null,
      evidence_url: evidence_url || null,
    };

    let { data, error } = await supabase
      .from("assets")
      .insert(insertPayload)
      .select()
      .single();

    // If a column doesn't exist yet (migration not applied), retry without it
    if (error && error.code === "PGRST204" && error.message) {
      const match = error.message.match(/Could not find the '(\w+)' column/);
      if (match) {
        const missingCol = match[1];
        delete insertPayload[missingCol];
        ({ data, error } = await supabase
          .from("assets")
          .insert(insertPayload)
          .select()
          .single());
      }
    }

    if (error) throw error;

    // Record the initial price snapshot if we have a price
    if (data && data.current_price != null) {
      await supabase.from("price_snapshots").insert({
        asset_id: data.id,
        price: data.current_price,
        source: is_manual_submission ? "manual" : "api",
      });
    }

    return NextResponse.json(data, { status: 201 });
  } catch (error) {
    console.error("Asset creation error:", error);
    const message =
      error instanceof Error
        ? error.message
        : typeof error === "object" && error !== null && "message" in error
          ? String((error as { message: unknown }).message)
          : "Failed to create asset";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function PATCH(request: NextRequest) {
  const { userId } = await auth();
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await request.json();
    const {
      id,
      name,
      set_name,
      asset_type,
      current_price,
      manual_price,
      purchase_price,
      purchase_date,
      purchase_location,
      condition,
      notes,
      quantity,
      psa_grade,
      language,
      storage_location,
      pc_product_id,
      pc_url,
      pc_grade_field,
      poketrace_id,
      poketrace_market,
      price_source,
      evidence_url,
      status,
      sell_price,
      sell_date,
    } = body;

    if (!id) {
      return NextResponse.json({ error: "Asset ID is required" }, { status: 400 });
    }

    // Verify the asset exists and user has write access
    const { data: asset } = await supabase
      .from("assets")
      .select("portfolio_id")
      .eq("id", id)
      .single();

    if (!asset) {
      return NextResponse.json({ error: "Asset not found" }, { status: 404 });
    }

    // Check write access
    const { data: portfolio } = await supabase
      .from("portfolios")
      .select("owner_id")
      .eq("id", asset.portfolio_id)
      .single();

    const isOwner = portfolio?.owner_id === userId;
    if (!isOwner) {
      const { data: member } = await supabase
        .from("portfolio_members")
        .select("role")
        .eq("portfolio_id", asset.portfolio_id)
        .eq("user_id", userId)
        .single();

      if (member?.role !== "admin") {
        return NextResponse.json({ error: "Read-only access" }, { status: 403 });
      }
    }

    const updates: Record<string, unknown> = {};
    if (name !== undefined) updates.name = name;
    if (set_name !== undefined) updates.set_name = set_name;
    if (asset_type !== undefined) updates.asset_type = asset_type;
    if (current_price !== undefined) {
      updates.current_price = current_price ? parseFloat(current_price) : null;
      updates.price_updated_at = new Date().toISOString();
    }
    if (manual_price !== undefined) updates.manual_price = manual_price;
    if (purchase_price !== undefined) updates.purchase_price = parseFloat(purchase_price);
    if (purchase_date !== undefined) updates.purchase_date = purchase_date;
    if (purchase_location !== undefined) updates.purchase_location = purchase_location;
    if (condition !== undefined) updates.condition = condition;
    if (notes !== undefined) updates.notes = notes || null;
    if (quantity !== undefined) updates.quantity = parseInt(quantity);
    if (psa_grade !== undefined) updates.psa_grade = psa_grade || null;
    if (language !== undefined) updates.language = language;
    if (storage_location !== undefined) updates.storage_location = storage_location;
    if (pc_product_id !== undefined) updates.pc_product_id = pc_product_id || null;
    if (pc_url !== undefined) updates.pc_url = pc_url || null;
    if (pc_grade_field !== undefined) updates.pc_grade_field = pc_grade_field || null;
    if (poketrace_id !== undefined) updates.poketrace_id = poketrace_id || null;
    if (poketrace_market !== undefined) updates.poketrace_market = poketrace_market || "US";
    if (price_source !== undefined) updates.price_source = price_source || null;
    if (evidence_url !== undefined) updates.evidence_url = evidence_url || null;
    if (status !== undefined) updates.status = status;
    if (sell_price !== undefined) updates.sell_price = sell_price ? parseFloat(sell_price) : null;
    if (sell_date !== undefined) updates.sell_date = sell_date || null;

    // Fetch old asset state before update (needed for cash_balance adjustment)
    const { data: oldAsset } = await supabase
      .from("assets")
      .select("status, sell_price, quantity, portfolio_id")
      .eq("id", id)
      .single();

    let { data, error } = await supabase
      .from("assets")
      .update(updates)
      .eq("id", id)
      .select()
      .single();

    // If a column doesn't exist yet (migration not applied), retry without it
    if (error && error.code === "PGRST204" && error.message) {
      const match = error.message.match(/Could not find the '(\w+)' column/);
      if (match) {
        const missingCol = match[1];
        delete updates[missingCol];
        ({ data, error } = await supabase
          .from("assets")
          .update(updates)
          .eq("id", id)
          .select()
          .single());
      }
    }

    if (error) throw error;

    // Adjust cash_balance when sell state changes
    if (data && oldAsset && (status !== undefined || sell_price !== undefined)) {
      const effectiveStatus = status !== undefined ? status : (oldAsset.status || "ACTIVE");
      const wasActive = !oldAsset.status || oldAsset.status === "ACTIVE";
      const wasSOLD = oldAsset.status === "SOLD";
      const nowSOLD = effectiveStatus === "SOLD";
      const nowActive = effectiveStatus === "ACTIVE";
      const qty = data.quantity || 1;

      if (wasActive && nowSOLD && sell_price) {
        // Selling: add sell proceeds to cash balance
        const { data: portfolio } = await supabase
          .from("portfolios")
          .select("cash_balance")
          .eq("id", data.portfolio_id)
          .single();
        const newBalance = (portfolio?.cash_balance || 0) + parseFloat(sell_price) * qty;
        await supabase.from("portfolios").update({ cash_balance: newBalance }).eq("id", data.portfolio_id);
      } else if (wasSOLD && nowActive) {
        // Reactivating: subtract old sell proceeds from cash balance
        const oldSellTotal = (oldAsset.sell_price || 0) * qty;
        const { data: portfolio } = await supabase
          .from("portfolios")
          .select("cash_balance")
          .eq("id", data.portfolio_id)
          .single();
        const newBalance = Math.max(0, (portfolio?.cash_balance || 0) - oldSellTotal);
        await supabase.from("portfolios").update({ cash_balance: newBalance }).eq("id", data.portfolio_id);
      } else if (wasSOLD && nowSOLD && sell_price !== undefined) {
        // Editing sell_price on already-sold asset: adjust cash_balance by the difference
        const oldSellTotal = (oldAsset.sell_price || 0) * qty;
        const newSellTotal = (sell_price ? parseFloat(sell_price) : 0) * qty;
        const diff = newSellTotal - oldSellTotal;
        if (diff !== 0) {
          const { data: portfolio } = await supabase
            .from("portfolios")
            .select("cash_balance")
            .eq("id", data.portfolio_id)
            .single();
          const newBalance = Math.max(0, (portfolio?.cash_balance || 0) + diff);
          await supabase.from("portfolios").update({ cash_balance: newBalance }).eq("id", data.portfolio_id);
        }
      }
    }

    // Record a price snapshot when the price is manually updated
    if (data && current_price !== undefined && data.current_price != null) {
      await supabase.from("price_snapshots").insert({
        asset_id: data.id,
        price: data.current_price,
        source: "manual",
      });
    }

    return NextResponse.json(data);
  } catch (error) {
    console.error("Asset update error:", error);
    const message =
      error instanceof Error
        ? error.message
        : typeof error === "object" && error !== null && "message" in error
          ? String((error as { message: unknown }).message)
          : "Failed to update asset";
    return NextResponse.json({ error: message }, { status: 500 });
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
    const message =
      error instanceof Error
        ? error.message
        : typeof error === "object" && error !== null && "message" in error
          ? String((error as { message: unknown }).message)
          : "Failed to delete asset";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
