import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdmin, getEvent, rateLimited } from "@/lib/event-holds";
import { TYPE_LABELS, type TableTypeKey } from "@/lib/event-floor-plan";

const VALID_TYPES: TableTypeKey[] = ["standard", "corner", "premier_corner"];

// Join the waitlist for a sold-out table type on a given day.
export async function POST(
  req: NextRequest,
  context: { params: Promise<{ slug: string }> }
) {
  try {
    const { slug } = await context.params;
    const { day, type_key, name, email } = await req.json();

    if (
      (day !== "Saturday" && day !== "Sunday") ||
      !VALID_TYPES.includes(type_key) ||
      typeof name !== "string" ||
      !name.trim() ||
      typeof email !== "string" ||
      !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())
    ) {
      return NextResponse.json({ error: "Please enter a valid name and email." }, { status: 400 });
    }
    if (name.length > 200 || email.length > 200) {
      return NextResponse.json({ error: "Input too long." }, { status: 400 });
    }

    const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || email;
    if (rateLimited(`waitlist:${ip}`, 10, 60000)) {
      return NextResponse.json({ error: "Too many requests — please try again shortly." }, { status: 429 });
    }

    const supabase = getSupabaseAdmin();
    const event = await getEvent(supabase, slug);
    if (!event) return NextResponse.json({ error: "Event not found." }, { status: 404 });

    // Skip duplicate active sign-ups for the same email/day/type.
    const { data: existing } = await supabase
      .from("event_waitlist")
      .select("id")
      .eq("event_id", event.id)
      .eq("event_day", day)
      .eq("table_type_key", type_key)
      .eq("email", email.trim().toLowerCase())
      .is("notified_at", null)
      .limit(1);

    if (!existing || existing.length === 0) {
      const { error } = await supabase.from("event_waitlist").insert({
        event_id: event.id,
        event_day: day,
        table_type_key: type_key,
        name: name.trim(),
        email: email.trim().toLowerCase(),
      });
      if (error) throw error;
    }

    return NextResponse.json({
      ok: true,
      message: `You're on the waitlist for ${TYPE_LABELS[type_key as TableTypeKey]} on ${day}. We'll email you if one frees up.`,
    });
  } catch (error) {
    console.error("Event waitlist error:", error);
    return NextResponse.json({ error: "Could not join the waitlist. Please try again." }, { status: 500 });
  }
}
