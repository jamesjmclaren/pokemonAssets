import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

function getSupabaseAdmin() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}

const TOTAL_TABLES = parseInt(process.env.EVENT_TOTAL_TABLES || "176", 10);

export async function GET() {
  try {
    const supabase = getSupabaseAdmin();
    const { data, error } = await supabase
      .from("event_bookings")
      .select("tables_count, event_day")
      .eq("payment_status", "paid");

    if (error) throw error;

    const rows = data || [];
    const satBooked = rows
      .filter((r) => r.event_day === "Saturday")
      .reduce((sum, r) => sum + r.tables_count, 0);
    const sunBooked = rows
      .filter((r) => r.event_day === "Sunday")
      .reduce((sum, r) => sum + r.tables_count, 0);

    return NextResponse.json(
      {
        total: TOTAL_TABLES,
        Saturday: { booked: satBooked, available: Math.max(0, TOTAL_TABLES - satBooked) },
        Sunday: { booked: sunBooked, available: Math.max(0, TOTAL_TABLES - sunBooked) },
      },
      {
        headers: {
          "Cache-Control": "public, s-maxage=30, stale-while-revalidate=60",
        },
      }
    );
  } catch (error) {
    console.error("Availability check error:", error);
    return NextResponse.json({ error: "Failed to check availability" }, { status: 500 });
  }
}
