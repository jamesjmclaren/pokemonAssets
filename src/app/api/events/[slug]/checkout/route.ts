import { NextRequest, NextResponse } from "next/server";
import Stripe from "stripe";
import { createClient } from "@supabase/supabase-js";
import { TABLE_TYPE_BY_LABEL, type TableTypeKey } from "@/lib/event-floor-plan";

function getStripe() {
  return new Stripe(process.env.STRIPE_SECRET_KEY!, { apiVersion: "2026-03-25.dahlia" });
}

function getSupabaseAdmin() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}

const VALID_CARD_TYPES = ["TCG", "Sports", "Collectibles", "Memorabilia", "Other"];
const MAX_TABLES_PER_ORDER = 80; // keeps the Stripe metadata within its 500-char/value limit

// Day display labels — update if event dates change
const DAY_LABELS: Record<string, string> = {
  Saturday: "Saturday — The Collectors Exhibition",
  Sunday: "Sunday — The Collectors Exhibition",
};

/** De-dupe, keep only valid known table labels. */
function cleanLabels(input: unknown): string[] {
  if (!Array.isArray(input)) return [];
  return [...new Set(input)].filter(
    (l: unknown): l is string => typeof l === "string" && l in TABLE_TYPE_BY_LABEL
  );
}

export async function POST(
  req: NextRequest,
  context: { params: Promise<{ slug: string }> }
) {
  try {
    const { slug } = await context.params;
    const body = await req.json();

    const {
      sat_tables,
      sun_tables,
      first_name,
      last_name,
      business_name,
      instagram_handle,
      email,
      phone,
      card_types,
    } = body;

    // ── Personal info ─────────────────────────────────────────────────────────
    if (
      !first_name?.trim() ||
      !last_name?.trim() ||
      !business_name?.trim() ||
      !email?.trim() ||
      !phone?.trim()
    ) {
      return NextResponse.json(
        { error: "First name, last name, business name, email, and phone are required." },
        { status: 400 }
      );
    }
    const tooLong = [first_name, last_name, business_name, email, phone, instagram_handle].some(
      (v) => typeof v === "string" && v.length > 200
    );
    if (tooLong) {
      return NextResponse.json({ error: "One or more fields exceed the maximum length." }, { status: 400 });
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
      return NextResponse.json({ error: "Please enter a valid email address." }, { status: 400 });
    }

    // ── Card types ────────────────────────────────────────────────────────────
    const validatedCardTypes = Array.isArray(card_types)
      ? [...new Set(card_types)].filter(
          (t: unknown): t is string => typeof t === "string" && VALID_CARD_TYPES.includes(t)
        )
      : [];
    if (validatedCardTypes.length === 0) {
      return NextResponse.json({ error: "Please select at least one card type." }, { status: 400 });
    }

    // ── Selected tables ───────────────────────────────────────────────────────
    const satLabels = cleanLabels(sat_tables);
    const sunLabels = cleanLabels(sun_tables);
    if (satLabels.length === 0 && sunLabels.length === 0) {
      return NextResponse.json({ error: "Please select at least one table." }, { status: 400 });
    }
    if (satLabels.length + sunLabels.length > MAX_TABLES_PER_ORDER) {
      return NextResponse.json(
        { error: `You can book up to ${MAX_TABLES_PER_ORDER} tables per order. Please split into multiple orders.` },
        { status: 400 }
      );
    }

    // ── Fetch event + types ───────────────────────────────────────────────────
    const supabase = getSupabaseAdmin();
    const { data: event, error: eventError } = await supabase
      .from("events")
      .select("id, name, venue, event_days, is_active")
      .eq("slug", slug)
      .single();
    if (eventError || !event) {
      return NextResponse.json({ error: "Event not found." }, { status: 404 });
    }
    if (!event.is_active) {
      return NextResponse.json({ error: "This event is no longer accepting bookings." }, { status: 403 });
    }

    const validDays: string[] = event.event_days;
    if (satLabels.length && !validDays.includes("Saturday")) {
      return NextResponse.json({ error: "Saturday is not part of this event." }, { status: 400 });
    }
    if (sunLabels.length && !validDays.includes("Sunday")) {
      return NextResponse.json({ error: "Sunday is not part of this event." }, { status: 400 });
    }

    const { data: tableTypes, error: typesError } = await supabase
      .from("event_table_types")
      .select("type_key, label, price_pence")
      .eq("event_id", event.id);
    if (typesError) throw typesError;
    const priceByType = new Map<string, number>();
    const labelByType = new Map<string, string>();
    for (const t of tableTypes ?? []) {
      priceByType.set(t.type_key, t.price_pence);
      labelByType.set(t.type_key, t.label);
    }

    // ── Conflict check: reject tables already paid for, per day ────────────────
    const { data: booked, error: bookedError } = await supabase
      .from("event_bookings_v2")
      .select("table_label, event_day")
      .eq("event_id", event.id)
      .eq("payment_status", "paid");
    if (bookedError) throw bookedError;

    const bookedByDay: Record<string, Set<string>> = { Saturday: new Set(), Sunday: new Set() };
    for (const row of booked ?? []) {
      if (row.table_label) bookedByDay[row.event_day]?.add(row.table_label);
    }

    const dayLabels: { day: string; labels: string[] }[] = [
      { day: "Saturday", labels: satLabels },
      { day: "Sunday", labels: sunLabels },
    ];
    for (const { day, labels } of dayLabels) {
      for (const label of labels) {
        if (bookedByDay[day]?.has(label)) {
          return NextResponse.json(
            { error: `Table ${label} for ${day} has just been taken. Please pick another.` },
            { status: 409 }
          );
        }
      }
    }

    // ── Build Stripe line items (grouped by type × day) ───────────────────────
    const lineItems: Stripe.Checkout.SessionCreateParams["line_items"] = [];
    for (const { day, labels } of dayLabels) {
      const countByType: Partial<Record<TableTypeKey, number>> = {};
      for (const label of labels) {
        const tk = TABLE_TYPE_BY_LABEL[label];
        countByType[tk] = (countByType[tk] ?? 0) + 1;
      }
      for (const [typeKey, count] of Object.entries(countByType) as [TableTypeKey, number][]) {
        const price = priceByType.get(typeKey);
        if (!price) {
          return NextResponse.json({ error: `Pricing not configured for ${typeKey}.` }, { status: 503 });
        }
        lineItems.push({
          price_data: {
            currency: "gbp",
            unit_amount: price,
            product_data: {
              name: `${labelByType.get(typeKey) ?? typeKey} — ${DAY_LABELS[day] ?? day}`,
              description: `${count} table${count > 1 ? "s" : ""} — ${event.name} at ${event.venue}`,
            },
          },
          quantity: count,
        });
      }
    }

    const session = await getStripe().checkout.sessions.create({
      payment_method_types: ["card"],
      customer_email: email.trim(),
      line_items: lineItems,
      mode: "payment",
      success_url: `${req.nextUrl.origin}/events/${slug}/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${req.nextUrl.origin}/events/${slug}`,
      metadata: {
        booking_type: "event_table_v2",
        event_slug: slug,
        first_name: first_name.trim(),
        last_name: last_name.trim(),
        business_name: business_name.trim(),
        instagram_handle: (instagram_handle || "").trim(),
        email: email.trim(),
        phone: phone.trim(),
        card_types: validatedCardTypes.join(","),
        sat_tables: satLabels.join(","),
        sun_tables: sunLabels.join(","),
      },
    });

    return NextResponse.json({ url: session.url });
  } catch (error) {
    console.error("Event v2 checkout error:", error);
    return NextResponse.json(
      { error: "Failed to create checkout session. Please try again." },
      { status: 500 }
    );
  }
}
