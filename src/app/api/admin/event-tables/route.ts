import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { createClient } from "@supabase/supabase-js";
import { isCurrentUserAdmin } from "@/lib/admin";
import { EVENT_TABLES, TYPE_LABELS, type TableTypeKey } from "@/lib/event-floor-plan";

function getSupabaseAdmin() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}

const DEFAULT_SLUG = "collectors-exhibition-june-2027";

interface Buyer {
  business_name: string;
  name: string;
  email: string;
  phone: string;
  instagram_handle: string | null;
  created_at: string;
  ref: string;            // short booking reference (matches the customer's email)
  sessionId: string;      // full Stripe checkout session id, for the dashboard
  paymentIntent: string | null; // Stripe PaymentIntent, for a direct dashboard link
  amountPence: number | null;
}

/** Admin-only: full table list for an event annotated with who has bought each. */
export async function GET(req: NextRequest) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!(await isCurrentUserAdmin())) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const slug = req.nextUrl.searchParams.get("slug") || DEFAULT_SLUG;
  const supabase = getSupabaseAdmin();

  const { data: event, error: eventError } = await supabase
    .from("events")
    .select("id, name, venue, event_days")
    .eq("slug", slug)
    .single();
  if (eventError || !event) {
    return NextResponse.json({ error: "Event not found." }, { status: 404 });
  }

  const days: string[] = event.event_days;

  const { data: bookings, error: bookingsError } = await supabase
    .from("event_bookings_v2")
    .select(
      "table_label, table_type_key, event_day, first_name, last_name, business_name, email, phone, instagram_handle, created_at, amount_paid_pence, stripe_session_id"
    )
    .eq("event_id", event.id)
    .eq("payment_status", "paid");
  if (bookingsError) {
    return NextResponse.json({ error: "Failed to load bookings." }, { status: 500 });
  }

  // PaymentIntents for deep-linking to the actual payment (best-effort: the
  // stripe_payment_intent column is added in migration v23; if it isn't there
  // yet this query just returns nothing and links fall back to a search).
  const piByKey: Record<string, string> = {};
  {
    const { data: piRows } = await supabase
      .from("event_bookings_v2")
      .select("event_day, table_label, stripe_payment_intent")
      .eq("event_id", event.id)
      .eq("payment_status", "paid");
    for (const r of (piRows ?? []) as { event_day: string; table_label: string | null; stripe_payment_intent: string | null }[]) {
      if (r.table_label && r.stripe_payment_intent) piByKey[`${r.event_day}|${r.table_label}`] = r.stripe_payment_intent;
    }
  }

  // Index bookings by day → label
  const byDayLabel: Record<string, Record<string, Buyer>> = {};
  for (const day of days) byDayLabel[day] = {};
  for (const b of bookings ?? []) {
    if (!b.table_label || !byDayLabel[b.event_day]) continue;
    // Stored as `${session.id}_${idx}` — strip the row suffix back to the session id.
    const sessionId = (b.stripe_session_id ?? "").replace(/_\d+$/, "");
    byDayLabel[b.event_day][b.table_label] = {
      business_name: b.business_name,
      name: `${b.first_name} ${b.last_name}`.trim(),
      email: b.email,
      phone: b.phone,
      instagram_handle: b.instagram_handle ?? null,
      created_at: b.created_at,
      ref: sessionId ? sessionId.slice(-8).toUpperCase() : "—",
      sessionId,
      paymentIntent: piByKey[`${b.event_day}|${b.table_label}`] ?? null,
      amountPence: b.amount_paid_pence ?? null,
    };
  }

  // Full table list with per-day buyer (or null = available)
  const rows = EVENT_TABLES.map((t) => {
    const perDay: Record<string, Buyer | null> = {};
    for (const day of days) perDay[day] = byDayLabel[day][t.label] ?? null;
    return {
      label: t.label,
      type: t.type,
      typeLabel: TYPE_LABELS[t.type],
      days: perDay,
    };
  });

  // Summary: sold / total per type per day
  const summary: Record<string, Record<string, { sold: number; total: number }>> = {};
  const totalsByType = EVENT_TABLES.reduce((acc, t) => {
    acc[t.type] = (acc[t.type] ?? 0) + 1;
    return acc;
  }, {} as Record<TableTypeKey, number>);
  for (const type of Object.keys(totalsByType) as TableTypeKey[]) {
    summary[type] = {};
    for (const day of days) {
      const sold = (bookings ?? []).filter(
        (b) => b.table_type_key === type && b.event_day === day
      ).length;
      summary[type][day] = { sold, total: totalsByType[type] };
    }
  }

  // People waiting on a sold-out type (not yet notified)
  const { data: waitlist } = await supabase
    .from("event_waitlist")
    .select("event_day, table_type_key, name, email, created_at")
    .eq("event_id", event.id)
    .is("notified_at", null)
    .order("created_at", { ascending: true });

  return NextResponse.json({
    event: { name: event.name, venue: event.venue, days },
    rows,
    summary,
    typeLabels: TYPE_LABELS,
    stripeMode: process.env.STRIPE_SECRET_KEY?.startsWith("sk_live") ? "live" : "test",
    waitlist: (waitlist ?? []).map((w) => ({
      day: w.event_day,
      type: w.table_type_key,
      typeLabel: TYPE_LABELS[w.table_type_key as TableTypeKey] ?? w.table_type_key,
      name: w.name,
      email: w.email,
      created_at: w.created_at,
    })),
  });
}
