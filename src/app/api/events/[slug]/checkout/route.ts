import { NextRequest, NextResponse } from "next/server";
import Stripe from "stripe";
import { createClient } from "@supabase/supabase-js";

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

interface CheckoutItem {
  type_key: string;
  day: string;
  quantity: number;
}

// Day display labels — update if event dates change
const DAY_LABELS: Record<string, string> = {
  Saturday: "Saturday — The Collectors Exhibition",
  Sunday: "Sunday — The Collectors Exhibition",
};

export async function POST(
  req: NextRequest,
  context: { params: Promise<{ slug: string }> }
) {
  try {
    const { slug } = await context.params;
    const body = await req.json();

    const {
      items,
      first_name,
      last_name,
      business_name,
      instagram_handle,
      email,
      phone,
      card_types,
    } = body;

    // ── Personal info validation ──────────────────────────────────────────────
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
      return NextResponse.json(
        { error: "One or more fields exceed the maximum length." },
        { status: 400 }
      );
    }

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
      return NextResponse.json(
        { error: "Please enter a valid email address." },
        { status: 400 }
      );
    }

    // ── Card types ────────────────────────────────────────────────────────────
    const validatedCardTypes = Array.isArray(card_types)
      ? [...new Set(card_types)].filter(
          (t: unknown): t is string =>
            typeof t === "string" && VALID_CARD_TYPES.includes(t)
        )
      : [];
    if (validatedCardTypes.length === 0) {
      return NextResponse.json(
        { error: "Please select at least one card type." },
        { status: 400 }
      );
    }

    // ── Items ─────────────────────────────────────────────────────────────────
    if (!Array.isArray(items) || items.length === 0) {
      return NextResponse.json(
        { error: "Please select at least one table." },
        { status: 400 }
      );
    }

    // ── Fetch event ───────────────────────────────────────────────────────────
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
      return NextResponse.json(
        { error: "This event is no longer accepting bookings." },
        { status: 403 }
      );
    }

    // ── Fetch table types ─────────────────────────────────────────────────────
    const { data: tableTypes, error: typesError } = await supabase
      .from("event_table_types")
      .select("type_key, label, price_pence, total_available")
      .eq("event_id", event.id);

    if (typesError) throw typesError;

    const validTypeKeys = (tableTypes ?? []).map((t) => t.type_key);
    const validDays: string[] = event.event_days;

    // ── Validate + clean items ────────────────────────────────────────────────
    const cleanItems: CheckoutItem[] = [];
    for (const item of items) {
      const qty = Number(item.quantity ?? 0);
      if (!validTypeKeys.includes(item.type_key)) {
        return NextResponse.json(
          { error: `Invalid table type: ${item.type_key}` },
          { status: 400 }
        );
      }
      if (!validDays.includes(item.day)) {
        return NextResponse.json({ error: `Invalid day: ${item.day}` }, { status: 400 });
      }
      if (!Number.isInteger(qty) || qty < 1) {
        return NextResponse.json({ error: "Quantity must be at least 1." }, { status: 400 });
      }
      cleanItems.push({ type_key: item.type_key, day: item.day, quantity: qty });
    }

    // ── Server-side availability check (re-query under lock) ──────────────────
    const { data: bookings, error: bookingsError } = await supabase
      .from("event_bookings_v2")
      .select("table_type_key, event_day, quantity")
      .eq("event_id", event.id)
      .eq("payment_status", "paid");

    if (bookingsError) throw bookingsError;

    const bookedRows = bookings ?? [];

    for (const item of cleanItems) {
      const typeData = (tableTypes ?? []).find((t) => t.type_key === item.type_key);
      if (!typeData) continue;
      const alreadyBooked = bookedRows
        .filter((r) => r.table_type_key === item.type_key && r.event_day === item.day)
        .reduce((s, r) => s + r.quantity, 0);
      const available = Math.max(0, typeData.total_available - alreadyBooked);
      if (item.quantity > available) {
        return NextResponse.json(
          {
            error:
              available === 0
                ? `${typeData.label} tables for ${item.day} are sold out.`
                : `Only ${available} ${typeData.label} table${available === 1 ? "" : "s"} remaining for ${item.day}.`,
          },
          { status: 409 }
        );
      }
    }

    // ── Build Stripe line items ───────────────────────────────────────────────
    const lineItems: Stripe.Checkout.SessionCreateParams["line_items"] = cleanItems.map((item) => {
      const typeData = (tableTypes ?? []).find((t) => t.type_key === item.type_key)!;
      return {
        price_data: {
          currency: "gbp",
          unit_amount: typeData.price_pence,
          product_data: {
            name: `${typeData.label} — ${DAY_LABELS[item.day] ?? item.day}`,
            description: `${item.quantity} unit${item.quantity > 1 ? "s" : ""} — ${event.name} at ${event.venue}`,
          },
        },
        quantity: item.quantity,
      };
    });

    const cardTypesStr = validatedCardTypes.join(",");
    // Compact JSON for Stripe metadata (500-char value limit)
    const itemsJson = JSON.stringify(
      cleanItems.map((i) => ({ tk: i.type_key, d: i.day, q: i.quantity }))
    );

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
        card_types: cardTypesStr,
        items: itemsJson,
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
