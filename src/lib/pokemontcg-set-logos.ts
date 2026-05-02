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
  series?: string;
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
        "https://api.pokemontcg.io/v2/sets?select=id,name,series,releaseDate,images",
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
        // Poketrace tends to ship long-form names ("Scarlet & Violet—151")
        // while pokemontcg.io uses short-form ("151") plus a `series`
        // field. Index under several derived keys so callers can match
        // either shape. First write wins, prefer the most specific.
        const candidates: string[] = [];
        if (s.releaseDate) candidates.push(withYear(s.name, s.releaseDate));
        if (s.series && s.releaseDate) {
          candidates.push(withYear(`${s.series} ${s.name}`, s.releaseDate));
        }
        if (s.series) {
          candidates.push(normaliseName(`${s.series} ${s.name}`));
        }
        candidates.push(normaliseName(s.name));
        for (const k of candidates) {
          if (!map.has(k)) map.set(k, logo);
        }
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
