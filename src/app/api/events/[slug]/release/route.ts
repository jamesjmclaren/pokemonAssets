import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdmin, getEvent, isValidLabel, isValidToken } from "@/lib/event-holds";

// Release one of this token's holds when the vendor deselects a table.
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

    await supabase
      .from("event_table_holds")
      .delete()
      .eq("event_id", event.id)
      .eq("event_day", day)
      .eq("table_label", label)
      .eq("hold_token", holdToken);

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("Event release error:", error);
    return NextResponse.json({ error: "Could not release that table." }, { status: 500 });
  }
}
