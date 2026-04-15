import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { supabase } from "@/lib/supabase";
import { fetchPoketracePrice, searchCards, searchSealedProducts } from "@/lib/pokemon-api";
import { extractCardPrice } from "@/lib/format";

/**
 * GET /api/assets/[id]/suggested-price
 *
 * Returns the current Poketrace market price for an asset WITHOUT updating anything.
 * Used to show a "suggested price" hint when an asset is in manual pricing mode.
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { userId } = await auth();
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;

  try {
    const { data: asset, error: fetchError } = await supabase
      .from("assets")
      .select("id, name, asset_type, psa_grade, poketrace_id, external_id, portfolio_id")
      .eq("id", id)
      .single();

    if (fetchError || !asset) {
      return NextResponse.json({ error: "Asset not found" }, { status: 404 });
    }

    // Verify user has access
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

      if (!member) {
        return NextResponse.json({ error: "Forbidden" }, { status: 403 });
      }
    }

    let suggestedPrice: number | null = null;

    // Priority 1: Direct Poketrace lookup
    if (asset.poketrace_id) {
      try {
        const result = await fetchPoketracePrice(
          asset.poketrace_id,
          asset.psa_grade || undefined
        );
        if (result) {
          suggestedPrice = result.price;
        }
      } catch {
        // Fall through to name search
      }
    }

    // If a grade is specified but no graded price was found, don't fall back
    // to raw price — return null (N/A) instead.
    if (suggestedPrice == null && asset.psa_grade) {
      return NextResponse.json({ suggestedPrice: null });
    }

    // Priority 2: Search by name
    if (suggestedPrice == null && asset.name) {
      try {
        const results =
          asset.asset_type === "sealed"
            ? ((await searchSealedProducts(asset.name, undefined, 5)) as unknown as Record<string, unknown>[])
            : ((await searchCards(asset.name, undefined, 5)) as unknown as Record<string, unknown>[]);

        const match =
          results.find((c) => c.id === asset.external_id) || results[0];
        if (match) {
          suggestedPrice = extractCardPrice(match);
        }
      } catch {
        // No suggestion available
      }
    }

    return NextResponse.json({ suggestedPrice });
  } catch (error) {
    console.error(`[suggested-price] Error for asset ${id}:`, error instanceof Error ? error.message : error);
    return NextResponse.json(
      { error: "Failed to fetch suggested price" },
      { status: 500 }
    );
  }
}
