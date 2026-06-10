import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdmin, getEvent, purgeExpiredHolds, isValidToken } from "@/lib/event-holds";

// Restore a vendor's own selection after a refresh: returns the labels this
// hold token is still holding, per day, plus the shared deadline.
export async function GET(
  req: NextRequest,
  context: { params: Promise<{ slug: string }> }
) {
  try {
    const { slug } = await context.params;
    const token = req.nextUrl.searchParams.get("token");
    if (!isValidToken(token)) {
      return NextResponse.json({ held: { Saturday: [], Sunday: [] }, expires_at: null });
    }

    const supabase = getSupabaseAdmin();
    const event = await getEvent(supabase, slug);
    if (!event) return NextResponse.json({ error: "Event not found." }, { status: 404 });

    await purgeExpiredHolds(supabase, event.id);

    const { data } = await supabase
      .from("event_table_holds")
      .select("event_day, table_label, expires_at")
      .eq("event_id", event.id)
      .eq("hold_token", token)
      .gt("expires_at", new Date().toISOString());

    const held: Record<string, string[]> = { Saturday: [], Sunday: [] };
    let deadline: string | null = null;
    for (const r of data ?? []) {
      if (held[r.event_day]) held[r.event_day].push(r.table_label);
      if (!deadline || r.expires_at < deadline) deadline = r.expires_at;
    }

    return NextResponse.json(
      { held, expires_at: deadline },
      { headers: { "Cache-Control": "no-store" } }
    );
  } catch (error) {
    console.error("Event holds GET error:", error);
    return NextResponse.json({ error: "Failed to load holds." }, { status: 500 });
  }
}
