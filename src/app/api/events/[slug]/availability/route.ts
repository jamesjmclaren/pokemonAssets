import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

function getSupabaseAdmin() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}

export async function GET(
  _req: NextRequest,
  context: { params: Promise<{ slug: string }> }
) {
  try {
    const { slug } = await context.params;
    const supabase = getSupabaseAdmin();

    // Fetch event
    const { data: event, error: eventError } = await supabase
      .from("events")
      .select("id, slug, name, venue, event_days, start_date, end_date, is_active")
      .eq("slug", slug)
      .single();

    if (eventError || !event) {
      return NextResponse.json({ error: "Event not found." }, { status: 404 });
    }

    // Fetch table types
    const { data: tableTypes, error: typesError } = await supabase
      .from("event_table_types")
      .select("type_key, label, description, price_pence, total_available, display_color, sort_order")
      .eq("event_id", event.id)
      .order("sort_order");

    if (typesError) throw typesError;

    // Fetch paid bookings (type, day, quantity, and the specific table number)
    const { data: bookings, error: bookingsError } = await supabase
      .from("event_bookings_v2")
      .select("table_type_key, event_day, quantity, table_label")
      .eq("event_id", event.id)
      .eq("payment_status", "paid");

    if (bookingsError) throw bookingsError;

    const rows = bookings ?? [];
    const days: string[] = event.event_days;

    const tableTypesWithAvailability = (tableTypes ?? []).map((tt) => {
      const perDay: Record<string, { booked: number; available: number }> = {};
      for (const day of days) {
        const booked = rows
          .filter((r) => r.table_type_key === tt.type_key && r.event_day === day)
          .reduce((s, r) => s + r.quantity, 0);
        perDay[day] = { booked, available: Math.max(0, tt.total_available - booked) };
      }
      return { ...tt, ...perDay };
    });

    // Specific table numbers already paid for, per day, for the floor plan
    const bookedLabels: Record<string, string[]> = {};
    for (const day of days) bookedLabels[day] = [];
    for (const r of rows) {
      if (r.table_label && bookedLabels[r.event_day]) {
        bookedLabels[r.event_day].push(r.table_label);
      }
    }

    return NextResponse.json(
      {
        eventId: event.id,
        slug: event.slug,
        name: event.name,
        venue: event.venue,
        days,
        start_date: event.start_date,
        end_date: event.end_date,
        is_active: event.is_active,
        tableTypes: tableTypesWithAvailability,
        booked: bookedLabels,
      },
      { headers: { "Cache-Control": "public, s-maxage=30, stale-while-revalidate=60" } }
    );
  } catch (error) {
    console.error("Event availability error:", error);
    return NextResponse.json({ error: "Failed to fetch availability." }, { status: 500 });
  }
}
