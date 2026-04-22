import { NextResponse } from "next/server";
import { getDisplayRates } from "@/lib/exchange-rate";

// Public endpoint — the display rates are not sensitive and the upstream
// source already caches for 24h. Revalidate matches.
export const revalidate = 86400;

export async function GET() {
  try {
    const rates = await getDisplayRates();
    return NextResponse.json({ base: "USD", rates, fetchedAt: new Date().toISOString() });
  } catch (error) {
    console.error("[exchange-rates] Failed:", error instanceof Error ? error.message : error);
    return NextResponse.json(
      { base: "USD", rates: { USD: 1, EUR: 0.925, GBP: 0.787 }, fallback: true },
      { status: 200 }
    );
  }
}
