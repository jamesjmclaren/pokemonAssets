import { NextRequest, NextResponse } from "next/server";
import Stripe from "stripe";
import { TABLE_TYPE_BY_LABEL, type TableTypeKey } from "@/lib/event-floor-plan";
import {
  getSupabaseAdmin,
  getEvent,
  purgeExpiredHolds,
  isValidToken,
  CHECKOUT_HOLD_MINUTES,
} from "@/lib/event-holds";

function getStripe() {
  return new Stripe(process.env.STRIPE_SECRET_KEY!, { apiVersion: "2026-03-25.dahlia" });
}

const VALID_CARD_TYPES = ["TCG", "Sports", "Collectibles", "Memorabilia", "Other"];

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
      holdToken,
      first_name,
      last_name,
      business_name,
      instagram_handle,
      email,
      phone,
      card_types,
    } = body;

    // ── Validate vendor details ───────────────────────────────────────────────
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
    const validatedCardTypes = Array.isArray(card_types)
      ? [...new Set(card_types)].filter(
          (t: unknown): t is string => typeof t === "string" && VALID_CARD_TYPES.includes(t)
        )
      : [];
    if (validatedCardTypes.length === 0) {
      return NextResponse.json({ error: "Please select at least one card type." }, { status: 400 });
    }
    if (!isValidToken(holdToken)) {
      return NextResponse.json({ error: "Your session expired. Please re-select your tables." }, { status: 400 });
    }

    // ── Event + types ─────────────────────────────────────────────────────────
    const supabase = getSupabaseAdmin();
    const event = await getEvent(supabase, slug);
    if (!event) return NextResponse.json({ error: "Event not found." }, { status: 404 });
    if (!event.is_active) {
      return NextResponse.json({ error: "This event is no longer accepting bookings." }, { status: 403 });
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

    // ── The tables being bought come from this token's live holds ─────────────
    await purgeExpiredHolds(supabase, event.id);
    const { data: holds } = await supabase
      .from("event_table_holds")
      .select("event_day, table_label")
      .eq("event_id", event.id)
      .eq("hold_token", holdToken)
      .gt("expires_at", new Date().toISOString());

    if (!holds || holds.length === 0) {
      return NextResponse.json(
        { error: "Your hold expired. Please re-select your tables and try again." },
        { status: 409 }
      );
    }

    const selection = holds.map((h) => ({
      day: h.event_day,
      label: h.table_label,
      type: TABLE_TYPE_BY_LABEL[h.table_label] as TableTypeKey,
    }));

    // Extend the holds so they survive the redirect to Stripe + payment.
    const newDeadline = new Date(Date.now() + CHECKOUT_HOLD_MINUTES * 60 * 1000).toISOString();
    await supabase
      .from("event_table_holds")
      .update({ expires_at: newDeadline })
      .eq("event_id", event.id)
      .eq("hold_token", holdToken);

    // ── Stripe line items (grouped by type × day) ─────────────────────────────
    const lineItems: Stripe.Checkout.SessionCreateParams["line_items"] = [];
    const satLabels: string[] = [];
    const sunLabels: string[] = [];
    for (const day of ["Saturday", "Sunday"]) {
      const countByType: Partial<Record<TableTypeKey, number>> = {};
      for (const s of selection) {
        if (s.day !== day) continue;
        countByType[s.type] = (countByType[s.type] ?? 0) + 1;
        (day === "Saturday" ? satLabels : sunLabels).push(s.label);
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

    const session = await getStripe().checkout.sessions.create({
      payment_method_types: ["card"],
      customer_email: email.trim(),
      line_items: lineItems,
      mode: "payment",
      expires_at: Math.floor(Date.now() / 1000) + 30 * 60,
      success_url: `${req.nextUrl.origin}/events/${slug}/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${req.nextUrl.origin}/event`,
      metadata: {
        booking_type: "event_table_v2",
        event_slug: slug,
        reservation_id: holdToken,
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
