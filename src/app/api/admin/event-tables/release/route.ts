import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { createClient } from "@supabase/supabase-js";
import { isCurrentUserAdmin } from "@/lib/admin";
import { TABLE_TYPE_BY_LABEL } from "@/lib/event-floor-plan";

function getSupabaseAdmin() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}

const DEFAULT_SLUG = "collectors-exhibition-june-2027";

// Admin-only: free a booked table (use after refunding the payment in Stripe).
// Deletes the paid booking row + any leftover hold so the table opens back up.
export async function POST(req: NextRequest) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!(await isCurrentUserAdmin())) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { slug = DEFAULT_SLUG, day, label } = await req.json();
  if ((day !== "Saturday" && day !== "Sunday") || typeof label !== "string" || !(label in TABLE_TYPE_BY_LABEL)) {
    return NextResponse.json({ error: "Invalid request." }, { status: 400 });
  }

  const supabase = getSupabaseAdmin();
  const { data: event } = await supabase.from("events").select("id").eq("slug", slug).single();
  if (!event) return NextResponse.json({ error: "Event not found." }, { status: 404 });

  const { error } = await supabase
    .from("event_bookings_v2")
    .delete()
    .eq("event_id", event.id)
    .eq("event_day", day)
    .eq("table_label", label)
    .eq("payment_status", "paid");
  if (error) {
    return NextResponse.json({ error: "Failed to release the table." }, { status: 500 });
  }

  // Clear any stale hold on the same table too.
  await supabase
    .from("event_table_holds")
    .delete()
    .eq("event_id", event.id)
    .eq("event_day", day)
    .eq("table_label", label);

  return NextResponse.json({ ok: true });
}
