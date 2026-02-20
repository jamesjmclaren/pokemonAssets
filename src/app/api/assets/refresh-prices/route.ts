import { NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";
import { searchCards } from "@/lib/pokemon-api";

const STALE_HOURS = 24;

function extractPrice(card: Record<string, unknown>): number | null {
  const prices = card.prices as Record<string, Record<string, unknown>> | undefined;
  return (
    (prices?.tcgplayer?.market as number) ??
    (prices?.tcgplayer?.low as number) ??
    (card.tcgplayerPrice as number) ??
    (card.marketPrice as number) ??
    null
  );
}

export async function POST() {
  try {
    const { data: assets, error } = await supabase
      .from("assets")
      .select("id, external_id, name, price_updated_at");

    if (error) throw error;
    if (!assets || assets.length === 0) {
      return NextResponse.json({ updated: 0, skipped: 0 });
    }

    const now = Date.now();
    const staleMs = STALE_HOURS * 60 * 60 * 1000;

    // Only refresh assets with stale or missing prices
    const staleAssets = assets.filter((a) => {
      if (!a.price_updated_at) return true;
      return now - new Date(a.price_updated_at).getTime() > staleMs;
    });

    if (staleAssets.length === 0) {
      return NextResponse.json({ updated: 0, skipped: assets.length });
    }

    let updated = 0;

    for (const asset of staleAssets) {
      if (!asset.name) continue;

      try {
        // Search by card name (not external_id which is a MongoDB ObjectId)
        const results = await searchCards(asset.name, undefined, 5);
        const cards = Array.isArray(results)
          ? results
          : results.data || results.cards || [];

        // Prefer exact ID match, then first result
        const match =
          cards.find(
            (c: { id?: string }) => c.id === asset.external_id
          ) || cards[0];

        if (!match) continue;

        const marketPrice = extractPrice(match);
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

    return NextResponse.json({
      updated,
      skipped: assets.length - staleAssets.length,
    });
  } catch (error) {
    console.error("Price refresh error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to refresh prices" },
      { status: 500 }
    );
  }
}
