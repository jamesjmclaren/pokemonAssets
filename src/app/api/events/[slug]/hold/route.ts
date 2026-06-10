import { NextRequest, NextResponse } from "next/server";
import {
  getSupabaseAdmin,
  getEvent,
  purgeExpiredHolds,
  tokenDeadline,
  isValidLabel,
  isValidToken,
  HOLD_MINUTES,
} from "@/lib/event-holds";

// Reserve a single table the moment a vendor clicks it. Returns the shared
// hold deadline so the page can run one countdown for the whole selection.
export async function POST(
  req: NextRequest,
  context: { params: Promise<{ slug: string }> }
) {
  try {
    const { slug } = await context.params;
    const { label, day, holdToken } = await req.json();

    if (!isValidLabel(label) || (day !== "Saturday" && day !== "Sunday") || !isValidToken(holdToken)) {
      return NextResponse.json({ error: "Invalid request." }, { status: 400 });
    }

    const supabase = getSupabaseAdmin();
    const event = await getEvent(supabase, slug);
    if (!event) return NextResponse.json({ error: "Event not found." }, { status: 404 });
    if (!event.is_active) return NextResponse.json({ error: "Bookings are closed." }, { status: 403 });
    if (!event.event_days.includes(day)) {
      return NextResponse.json({ error: "Invalid day." }, { status: 400 });
    }

    await purgeExpiredHolds(supabase, event.id);

    // Already sold?
    const { data: paid } = await supabase
      .from("event_bookings_v2")
      .select("id")
      .eq("event_id", event.id)
      .eq("event_day", day)
      .eq("table_label", label)
      .eq("payment_status", "paid")
      .limit(1);
    if (paid && paid.length > 0) {
      return NextResponse.json({ error: "That table has already been booked." }, { status: 409 });
    }

    // All of this token's tables share one deadline so the countdown is single.
    const existingDeadline = await tokenDeadline(supabase, event.id, holdToken);
    const deadline = existingDeadline ?? new Date(Date.now() + HOLD_MINUTES * 60 * 1000).toISOString();

    // Take the hold. The unique index makes this race-safe.
    const { error: insErr } = await supabase.from("event_table_holds").insert({
      event_id: event.id,
      event_day: day,
      table_label: label,
      hold_token: holdToken,
      expires_at: deadline,
    });

    if (insErr) {
      if (insErr.code !== "23505") throw insErr;
      // A row already exists for this table+day — resolve who owns it.
      const { data: row } = await supabase
        .from("event_table_holds")
        .select("hold_token, expires_at")
        .eq("event_id", event.id)
        .eq("event_day", day)
        .eq("table_label", label)
        .single();
      const live = row && new Date(row.expires_at).getTime() > Date.now();
      if (row && (row.hold_token === holdToken || !live)) {
        // Our own hold (extend) or a stale row (reclaim).
        await supabase
          .from("event_table_holds")
          .update({ hold_token: holdToken, expires_at: deadline })
          .eq("event_id", event.id)
          .eq("event_day", day)
          .eq("table_label", label);
      } else {
        return NextResponse.json({ error: "That table was just taken by someone else." }, { status: 409 });
      }
    }

    return NextResponse.json({ ok: true, expires_at: deadline });
  } catch (error) {
    console.error("Event hold error:", error);
    return NextResponse.json({ error: "Could not hold that table. Please try again." }, { status: 500 });
  }
}
