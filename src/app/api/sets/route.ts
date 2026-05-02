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

    // Fill in missing logos from pokemontcg.io (cached in-process for 24h).
    const missingLogo = sets.some((s) => !s.logo);
    if (missingLogo) {
      const lookup = await getPokemonTcgSetLogos();
      if (lookup.size > 0) {
        for (const s of sets) {
          if (s.logo) continue;
          const fallback = lookup.get(makeLogoLookupKey(s.name, s.releaseDate));
          if (fallback) s.logo = fallback;
        }
      }
    }

    return NextResponse.json(sets);
  } catch (err) {
    console.error("[api/sets] Failed to fetch sets:", err);
    return NextResponse.json({ error: "Failed to fetch sets" }, { status: 502 });
  }
}
