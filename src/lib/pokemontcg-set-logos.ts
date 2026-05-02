/**
 * Fallback set-logo lookup using the free pokemontcg.io API.
 *
 * Poketrace's /sets payload doesn't always include a logo URL; this module
 * builds a `(name + release year) → logo` map from pokemontcg.io and lets
 * callers fill in the gaps. Cached in-process for 24h since set artwork
 * is effectively static.
 *
 * pokemontcg.io free tier: 1000 req/day without an API key — caching means
 * we hit it at most once per day per Vercel instance.
 */

interface PokemonTcgSet {
  id: string;
  name: string;
  releaseDate: string;
  images?: { symbol?: string; logo?: string };
}

const TTL_MS = 24 * 60 * 60 * 1000;
let cache: Map<string, string> | null = null;
let cacheExpiry = 0;
let inflight: Promise<Map<string, string>> | null = null;

function normaliseName(name: string): string {
  return name.toLowerCase().replace(/[^a-z0-9]/g, "");
}

function withYear(name: string, releaseDate: string): string {
  // Poketrace dates are YYYY-MM-DD; pokemontcg.io uses YYYY/MM/DD.
  const year = releaseDate.slice(0, 4);
  return `${normaliseName(name)}|${year}`;
}

export function makeLogoLookupKeys(name: string, releaseDate: string): string[] {
  // Try the strict (name + year) key first, then fall back to name-only.
  // Year matching is fragile because releaseDate is sometimes empty or
  // formatted differently across the two APIs.
  const keys: string[] = [];
  if (releaseDate) keys.push(withYear(name, releaseDate));
  keys.push(normaliseName(name));
  return keys;
}

export async function getPokemonTcgSetLogos(): Promise<Map<string, string>> {
  const now = Date.now();
  if (cache && now < cacheExpiry) return cache;
  if (inflight) return inflight;

  inflight = (async () => {
    try {
      const res = await fetch(
        "https://api.pokemontcg.io/v2/sets?select=id,name,releaseDate,images",
        { next: { revalidate: 86400 } }
      );
      if (!res.ok) {
        throw new Error(`pokemontcg.io /v2/sets returned ${res.status}`);
      }
      const json: { data: PokemonTcgSet[] } = await res.json();

      const map = new Map<string, string>();
      for (const s of json.data ?? []) {
        const logo = s.images?.logo;
        if (!logo) continue;
        // Index under both keys so callers can try strict-match first
        // and fall back to name-only when years don't align.
        const yearKey = s.releaseDate ? withYear(s.name, s.releaseDate) : null;
        const nameKey = normaliseName(s.name);
        if (yearKey && !map.has(yearKey)) map.set(yearKey, logo);
        // Don't overwrite a year-keyed entry with a less specific one.
        if (!map.has(nameKey)) map.set(nameKey, logo);
      }

      cache = map;
      cacheExpiry = now + TTL_MS;
      return map;
    } catch (err) {
      console.warn("[pokemontcg-set-logos] fetch failed:", err);
      // Fall back to whatever we had before; empty map on first failure.
      return cache ?? new Map<string, string>();
    } finally {
      inflight = null;
    }
  })();

  return inflight;
}
