import { NextResponse } from "next/server";
import { getPoketraceSets } from "@/lib/poketrace";
import {
  getPokemonTcgSetLogos,
  makeLogoLookupKeys,
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
    const unmatchedSamples: string[] = [];
    if (lookup.size > 0) {
      for (const s of sets) {
        if (s.logo) continue;
        const keys = makeLogoLookupKeys(s.name, s.releaseDate);
        let hit: string | undefined;
        for (const k of keys) {
          const found = lookup.get(k);
          if (found) {
            hit = found;
            break;
          }
        }
        if (hit) {
          s.logo = hit;
          matched++;
        } else if (unmatchedSamples.length < 8) {
          unmatchedSamples.push(`"${s.name}"|${s.releaseDate?.slice(0, 4) ?? "—"}`);
        }
      }
    }
    console.log(
      `[api/sets] ${sets.length} catalogue sets, ${lookup.size} pokemontcg.io entries indexed, ${matched} logo matches`
    );
    if (matched === 0 && unmatchedSamples.length > 0) {
      console.log(`[api/sets] sample unmatched names: ${unmatchedSamples.join(", ")}`);
    }

    return NextResponse.json(sets, {
      headers: { "Cache-Control": "no-store" },
    });
  } catch (err) {
    console.error("[api/sets] Failed to fetch sets:", err);
    return NextResponse.json({ error: "Failed to fetch sets" }, { status: 502 });
  }
}
