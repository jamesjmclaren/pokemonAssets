import { NextRequest, NextResponse } from "next/server";
import Stripe from "stripe";
import { createClient } from "@supabase/supabase-js";
import { randomUUID } from "crypto";
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
const MAX_TABLES_PER_ORDER = 80; // keeps Stripe metadata within its 500-char/value limit
const HOLD_MINUTES = 15;

// Day display labels — update if event dates change
const DAY_LABELS: Record<string, string> = {
  Saturday: "Saturday — The Collectors Exhibition",
  Sunday: "Sunday — The Collectors Exhibition",
};

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

    // Flat list of (day, label, type) for the selection
    const selection: { day: string; label: string; type: TableTypeKey }[] = [
      ...satLabels.map((label) => ({ day: "Saturday", label, type: TABLE_TYPE_BY_LABEL[label] })),
      ...sunLabels.map((label) => ({ day: "Sunday", label, type: TABLE_TYPE_BY_LABEL[label] })),
    ];

    // ── Release expired holds for this event (frees their unique-index slots) ──
    await supabase
      .from("event_bookings_v2")
      .update({ payment_status: "expired" })
      .eq("event_id", event.id)
      .eq("payment_status", "pending")
      .lt("hold_expires_at", new Date().toISOString());

    // ── Friendly conflict pre-check (the unique index is the hard guarantee) ──
    const { data: activeRows, error: activeError } = await supabase
      .from("event_bookings_v2")
      .select("table_label, event_day, payment_status, hold_expires_at")
      .eq("event_id", event.id)
      .in("payment_status", ["paid", "pending"]);
    if (activeError) throw activeError;

    const nowMs = Date.now();
    const takenByDay: Record<string, Set<string>> = { Saturday: new Set(), Sunday: new Set() };
    for (const r of activeRows ?? []) {
      const live =
        r.payment_status === "paid" ||
        (r.hold_expires_at && new Date(r.hold_expires_at).getTime() > nowMs);
      if (live && r.table_label) takenByDay[r.event_day]?.add(r.table_label);
    }
    for (const s of selection) {
      if (takenByDay[s.day]?.has(s.label)) {
        return NextResponse.json(
          { error: `Table ${s.label} (${s.day}) has just been taken. Please pick another.` },
          { status: 409 }
        );
      }
    }

    // ── Reserve: insert pending hold rows (atomic — unique index blocks races) ─
    const reservationId = randomUUID();
    const holdExpires = new Date(Date.now() + HOLD_MINUTES * 60 * 1000).toISOString();
    const reserveRows = selection.map((s, i) => ({
      stripe_session_id: `hold_${reservationId}_${i}`,
      payment_status: "pending",
      hold_expires_at: holdExpires,
      event_id: event.id,
      event_day: s.day,
      table_type_key: s.type,
      table_label: s.label,
      quantity: 1,
      first_name: first_name.trim(),
      last_name: last_name.trim(),
      business_name: business_name.trim(),
      instagram_handle: (instagram_handle || "").trim() || null,
      email: email.trim(),
      phone: phone.trim(),
      card_types: validatedCardTypes.join(","),
      amount_paid_pence: priceByType.get(s.type) ?? 0,
    }));

    const { error: reserveError } = await supabase.from("event_bookings_v2").insert(reserveRows);
    if (reserveError) {
      if (reserveError.code === "23505") {
        return NextResponse.json(
          { error: "One or more of those tables were just taken. Please refresh and try again." },
          { status: 409 }
        );
      }
      throw reserveError;
    }

    // ── Build Stripe line items (grouped by type × day) ───────────────────────
    const lineItems: Stripe.Checkout.SessionCreateParams["line_items"] = [];
    for (const day of ["Saturday", "Sunday"]) {
      const countByType: Partial<Record<TableTypeKey, number>> = {};
      for (const s of selection) {
        if (s.day !== day) continue;
        countByType[s.type] = (countByType[s.type] ?? 0) + 1;
      }
      for (const [typeKey, count] of Object.entries(countByType) as [TableTypeKey, number][]) {
        const price = priceByType.get(typeKey);
        if (!price) continue;
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

    // ── Create the Stripe session (roll back the holds if this fails) ─────────
    let session: Stripe.Checkout.Session;
    try {
      session = await getStripe().checkout.sessions.create({
        payment_method_types: ["card"],
        customer_email: email.trim(),
        line_items: lineItems,
        mode: "payment",
        expires_at: Math.floor(Date.now() / 1000) + 30 * 60, // Stripe session lives 30 min
        success_url: `${req.nextUrl.origin}/events/${slug}/success?session_id={CHECKOUT_SESSION_ID}`,
        cancel_url: `${req.nextUrl.origin}/events/${slug}`,
        metadata: {
          booking_type: "event_table_v2",
          event_slug: slug,
          reservation_id: reservationId,
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
    } catch (stripeError) {
      // Release the holds we just reserved
      await supabase
        .from("event_bookings_v2")
        .delete()
        .like("stripe_session_id", `hold_${reservationId}_%`);
      throw stripeError;
    }

    return NextResponse.json({ url: session.url });
  } catch (error) {
    console.error("Event v2 checkout error:", error);
    return NextResponse.json(
      { error: "Failed to create checkout session. Please try again." },
      { status: 500 }
    );
  }
}
