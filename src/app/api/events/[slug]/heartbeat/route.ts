import { NextRequest, NextResponse } from "next/server";
import {
  getSupabaseAdmin,
  getEvent,
  purgeExpiredHolds,
  isValidToken,
} from "@/lib/event-holds";

// Keep this token's holds alive while the vendor is still on the page and has a
// selection. Returns the still-active held labels per day so the client can
// reconcile (e.g. drop any tables that expired or were lost).
export async function POST(
  req: NextRequest,
  context: { params: Promise<{ slug: string }> }
) {
  try {
    const { slug } = await context.params;
    const { holdToken } = await req.json();
    if (!isValidToken(holdToken)) {
      return NextResponse.json({ error: "Invalid request." }, { status: 400 });
    }

    const supabase = getSupabaseAdmin();
    const event = await getEvent(supabase, slug);
    if (!event) return NextResponse.json({ error: "Event not found." }, { status: 404 });

    await purgeExpiredHolds(supabase, event.id);

    const { data } = await supabase
      .from("event_table_holds")
      .select("event_day, table_label, expires_at")
      .eq("event_id", event.id)
      .eq("hold_token", holdToken)
      .gt("expires_at", new Date().toISOString());

    const held: Record<string, string[]> = { Saturday: [], Sunday: [] };
    let deadline: string | null = null;
    for (const r of data ?? []) {
      if (held[r.event_day]) held[r.event_day].push(r.table_label);
      if (!deadline || r.expires_at < deadline) deadline = r.expires_at;
    }

    return NextResponse.json({ ok: true, held, expires_at: deadline });
  } catch (error) {
    console.error("Event heartbeat error:", error);
    return NextResponse.json({ error: "Heartbeat failed." }, { status: 500 });
  }
}
