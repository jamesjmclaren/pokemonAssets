import { auth, currentUser } from "@clerk/nextjs/server";
import { NextRequest, NextResponse } from "next/server";

const ADMIN_EMAILS = [
  "jamesjmclaren@gmail.com",
  "k1west.cityboy@gmail.com",
];

const API_BASE = "https://api.poketrace.com/v1";

export async function GET(request: NextRequest) {
  const { userId } = await auth();
  const user = await currentUser();
  if (!userId || !user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const userEmail = user.primaryEmailAddress?.emailAddress?.toLowerCase();
  if (!userEmail || !ADMIN_EMAILS.some((e) => e.toLowerCase() === userEmail)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const apiKey = process.env.POKETRACE_API_KEY?.trim();
  if (!apiKey) {
    return NextResponse.json({ error: "POKETRACE_API_KEY not configured" }, { status: 500 });
  }

  const slug = request.nextUrl.searchParams.get("slug")?.trim();
  const search = request.nextUrl.searchParams.get("search")?.trim();
  const market = request.nextUrl.searchParams.get("market")?.trim() || "US";

  if (!slug && !search) {
    return NextResponse.json(
      { error: "Provide ?slug=<set-slug> to probe /cards, or ?search=<keyword> to probe /sets" },
      { status: 400 }
    );
  }

  const results: Record<string, unknown> = { market };

  // Probe /cards for an exact slug
  if (slug) {
    const url = new URL("/v1/cards", API_BASE);
    url.searchParams.set("set", slug);
    url.searchParams.set("market", market);
    url.searchParams.set("limit", "3");
    try {
      const res = await fetch(url.toString(), {
        headers: { "X-API-Key": apiKey, "Content-Type": "application/json" },
        cache: "no-store",
      });
      const text = await res.text();
      let body: unknown = text;
      try {
        body = JSON.parse(text);
      } catch {
        /* keep as text */
      }
      const sample = (body as { data?: unknown[] })?.data;
      results.cards_probe = {
        slug,
        url: url.toString().replace(apiKey, "***"),
        status: res.status,
        ok: res.ok,
        cardCount: Array.isArray(sample) ? sample.length : 0,
        firstCard: Array.isArray(sample) && sample[0] ? sample[0] : null,
        body: Array.isArray(sample) ? { hasMore: (body as { hasMore?: boolean }).hasMore } : body,
      };
    } catch (err) {
      results.cards_probe = {
        slug,
        error: err instanceof Error ? err.message : String(err),
      };
    }
  }

  // Probe /sets searching by keyword (substring match against name + slug)
  if (search) {
    const all: { slug: string; name: string; releaseDate?: string }[] = [];
    let cursor: string | null | undefined;
    let pages = 0;
    try {
      do {
        const url = new URL("/v1/sets", API_BASE);
        url.searchParams.set("limit", "100");
        if (cursor) url.searchParams.set("cursor", cursor);
        const res = await fetch(url.toString(), {
          headers: { "X-API-Key": apiKey, "Content-Type": "application/json" },
          cache: "no-store",
        });
        if (!res.ok) {
          results.sets_probe = { error: `HTTP ${res.status}` };
          break;
        }
        const json = await res.json();
        const batch = (json?.data ?? []) as { slug: string; name: string; releaseDate?: string }[];
        all.push(...batch);
        cursor = json?.pagination?.hasMore ? json.pagination.nextCursor : null;
        pages += 1;
      } while (cursor && pages < 30);

      const needle = search.toLowerCase();
      const matches = all.filter(
        (s) => s.slug.toLowerCase().includes(needle) || s.name.toLowerCase().includes(needle)
      );
      results.sets_probe = {
        search,
        totalSetsInCatalogue: all.length,
        matchCount: matches.length,
        matches: matches.slice(0, 50),
      };
    } catch (err) {
      results.sets_probe = { error: err instanceof Error ? err.message : String(err) };
    }
  }

  return NextResponse.json(results);
}
