import { NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";
import { searchCards } from "@/lib/pokemon-api";

export async function POST() {
  try {
    const { data: assets, error } = await supabase
      .from("assets")
      .select("id, external_id, name");

    if (error) throw error;
    if (!assets || assets.length === 0) {
      return NextResponse.json({ updated: 0 });
    }

    let updated = 0;

    for (const asset of assets) {
      if (!asset.external_id) continue;

      try {
        const results = await searchCards(asset.external_id, undefined, 5);
        const cards = Array.isArray(results)
          ? results
          : results.data || results.cards || [];

        const match = cards.find(
          (c: { id?: string }) => c.id === asset.external_id
        ) || cards[0];

        if (!match) continue;

        const marketPrice =
          match.prices?.tcgplayer?.market ??
          match.prices?.tcgplayer?.low ??
          match.tcgplayerPrice ??
          match.marketPrice ??
          null;

        if (marketPrice == null) continue;

        const { error: updateError } = await supabase
          .from("assets")
          .update({
            current_price: marketPrice,
            price_updated_at: new Date().toISOString(),
          })
          .eq("id", asset.id);

        if (!updateError) updated++;
      } catch (e) {
        console.error(`Failed to refresh price for ${asset.name}:`, e);
      }
    }

    return NextResponse.json({ updated });
  } catch (error) {
    console.error("Price refresh error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to refresh prices" },
      { status: 500 }
    );
  }
}
