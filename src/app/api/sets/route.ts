import { NextResponse } from "next/server";
import { getPoketraceSets } from "@/lib/poketrace";
import {
  getPokemonTcgSetLogos,
  makeLogoLookupKey,
} from "@/lib/pokemontcg-set-logos";

// Poketrace catalogue is cached internally by apiFetch (revalidate: 3600).
export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const sets = await getPoketraceSets("releaseDate", "desc");

    // Poketrace's /sets endpoint doesn't include logos — always fill from
    // pokemontcg.io (cached in-process for 24h).
    const lookup = await getPokemonTcgSetLogos();
    let matched = 0;
    if (lookup.size > 0) {
      for (const s of sets) {
        if (s.logo) continue;
        const fallback = lookup.get(makeLogoLookupKey(s.name, s.releaseDate));
        if (fallback) {
          s.logo = fallback;
          matched++;
        }
      }
    }
    console.log(
      `[api/sets] ${sets.length} catalogue sets, ${lookup.size} pokemontcg.io entries indexed, ${matched} logo matches`
    );

    return NextResponse.json(sets, {
      headers: { "Cache-Control": "no-store" },
    });
  } catch (err) {
    console.error("[api/sets] Failed to fetch sets:", err);
    return NextResponse.json({ error: "Failed to fetch sets" }, { status: 502 });
  }
}
