import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { TABLE_TYPE_BY_LABEL } from "@/lib/event-floor-plan";

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

    const { data: event, error: eventError } = await supabase
      .from("events")
      .select("id, slug, name, venue, event_days, start_date, end_date, is_active")
      .eq("slug", slug)
      .single();

    if (eventError || !event) {
      return NextResponse.json({ error: "Event not found." }, { status: 404 });
    }

    const { data: tableTypes, error: typesError } = await supabase
      .from("event_table_types")
      .select("type_key, label, description, price_pence, total_available, display_color, sort_order")
      .eq("event_id", event.id)
      .order("sort_order");
    if (typesError) throw typesError;

    const nowIso = new Date().toISOString();
    // Paid bookings (sold) + live reserve-on-select holds (locked) — both
    // make a table unavailable to everyone else.
    const [{ data: paidRows }, { data: holdRows }] = await Promise.all([
      supabase
        .from("event_bookings_v2")
        .select("event_day, table_label, table_type_key")
        .eq("event_id", event.id)
        .eq("payment_status", "paid"),
      supabase
        .from("event_table_holds")
        .select("event_day, table_label")
        .eq("event_id", event.id)
        .gt("expires_at", nowIso),
    ]);

    const days: string[] = event.event_days;
    const paid = paidRows ?? [];
    const holds = holdRows ?? [];

    // Per-type counts: available = total − paid − held (for the active day)
    const countFor = (typeKey: string, day: string) => {
      const paidCount = paid.filter((r) => r.table_type_key === typeKey && r.event_day === day).length;
      const heldCount = holds.filter(
        (r) => r.event_day === day && TABLE_TYPE_BY_LABEL[r.table_label] === typeKey
      ).length;
      return { paidCount, heldCount };
    };

    const tableTypesWithAvailability = (tableTypes ?? []).map((tt) => {
      const perDay: Record<string, { booked: number; held: number; available: number }> = {};
      for (const day of days) {
        const { paidCount, heldCount } = countFor(tt.type_key, day);
        perDay[day] = {
          booked: paidCount,
          held: heldCount,
          available: Math.max(0, tt.total_available - paidCount - heldCount),
        };
      }
      return { ...tt, ...perDay };
    });

    // Specific table numbers, per day, for the floor plan states
    const bookedLabels: Record<string, string[]> = {};
    const heldLabels: Record<string, string[]> = {};
    for (const day of days) {
      bookedLabels[day] = [];
      heldLabels[day] = [];
    }
    for (const r of paid) if (r.table_label && bookedLabels[r.event_day]) bookedLabels[r.event_day].push(r.table_label);
    for (const r of holds) if (r.table_label && heldLabels[r.event_day]) heldLabels[r.event_day].push(r.table_label);

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
        held: heldLabels,
      },
      // Short cache so holds by others show up quickly
      { headers: { "Cache-Control": "public, s-maxage=5, stale-while-revalidate=15" } }
    );
  } catch (error) {
    console.error("Event availability error:", error);
    return NextResponse.json({ error: "Failed to fetch availability." }, { status: 500 });
  }
}
