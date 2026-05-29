import { NextRequest, NextResponse } from "next/server";
import Stripe from "stripe";
import { createClient } from "@supabase/supabase-js";

function getStripe() {
  return new Stripe(process.env.STRIPE_SECRET_KEY!, {
    apiVersion: "2026-03-25.dahlia",
  });
}

function getSupabaseAdmin() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}

const TOTAL_TABLES = parseInt(process.env.EVENT_TOTAL_TABLES || "176", 10);
const VALID_CARD_TYPES = ["TCG", "Sports", "Collectibles", "Other"];

const DAY_LABELS: Record<string, string> = {
  Saturday: "Saturday 4th June",
  Sunday: "Sunday 5th June",
};

export async function POST(req: NextRequest) {
  try {
    const {
      first_name,
      last_name,
      business_name,
      instagram_handle,
      email,
      phone,
      card_types,
      saturday_tables,
      sunday_tables,
    } = await req.json();

    if (!first_name?.trim() || !last_name?.trim() || !business_name?.trim() || !email?.trim() || !phone?.trim()) {
      return NextResponse.json(
        { error: "First name, last name, business name, email, and phone are required." },
        { status: 400 }
      );
    }

    // Reject oversized inputs (also keeps Stripe metadata within its 500-char/value limit)
    const tooLong = [first_name, last_name, business_name, email, phone, instagram_handle]
      .some((v) => typeof v === "string" && v.length > 200);
    if (tooLong) {
      return NextResponse.json({ error: "One or more fields exceed the maximum length." }, { status: 400 });
    }

    if (typeof email !== "string" || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
      return NextResponse.json({ error: "Please enter a valid email address." }, { status: 400 });
    }

    // Validate and normalise card types against the allowed set (dedup, bounded)
    const validatedCardTypes = Array.isArray(card_types)
      ? [...new Set(card_types)].filter((t: unknown): t is string => typeof t === "string" && VALID_CARD_TYPES.includes(t))
      : [];
    if (validatedCardTypes.length === 0) {
      return NextResponse.json({ error: "Please select at least one card type." }, { status: 400 });
    }

    const satCount = Number(saturday_tables ?? 0);
    const sunCount = Number(sunday_tables ?? 0);

    if (![0, 1, 2, 3].includes(satCount) || ![0, 1, 2, 3].includes(sunCount)) {
      return NextResponse.json({ error: "Table count must be 0–3 per day." }, { status: 400 });
    }

    if (satCount === 0 && sunCount === 0) {
      return NextResponse.json({ error: "Please select tables for at least one day." }, { status: 400 });
    }

    const pricePerTablePence = parseInt(process.env.EVENT_TABLE_PRICE_PENCE || "0", 10);
    if (pricePerTablePence <= 0) {
      return NextResponse.json(
        { error: "Ticket pricing has not been configured yet. Please check back soon." },
        { status: 503 }
      );
    }

    // Server-side availability check per day
    const supabase = getSupabaseAdmin();
    const { data: bookings, error: dbError } = await supabase
      .from("event_bookings")
      .select("tables_count, event_day")
      .eq("payment_status", "paid");

    if (dbError) throw dbError;

    const rows = bookings || [];
    const satBooked = rows.filter((r) => r.event_day === "Saturday").reduce((s, r) => s + r.tables_count, 0);
    const sunBooked = rows.filter((r) => r.event_day === "Sunday").reduce((s, r) => s + r.tables_count, 0);
    const satAvailable = Math.max(0, TOTAL_TABLES - satBooked);
    const sunAvailable = Math.max(0, TOTAL_TABLES - sunBooked);

    if (satCount > satAvailable) {
      return NextResponse.json(
        { error: satAvailable === 0 ? "Saturday is sold out." : `Only ${satAvailable} Saturday table${satAvailable === 1 ? "" : "s"} remaining.` },
        { status: 409 }
      );
    }
    if (sunCount > sunAvailable) {
      return NextResponse.json(
        { error: sunAvailable === 0 ? "Sunday is sold out." : `Only ${sunAvailable} Sunday table${sunAvailable === 1 ? "" : "s"} remaining.` },
        { status: 409 }
      );
    }

    const cardTypesStr = validatedCardTypes.join(",");
    const lineItems: Stripe.Checkout.SessionCreateParams["line_items"] = [];

    if (satCount > 0) {
      lineItems.push({
        price_data: {
          currency: "gbp",
          unit_amount: pricePerTablePence,
          product_data: {
            name: `TCG Card Show — ${DAY_LABELS.Saturday}`,
            description: `${satCount} vendor table${satCount > 1 ? "s" : ""} — ${DAY_LABELS.Saturday}`,
          },
        },
        quantity: satCount,
      });
    }

    if (sunCount > 0) {
      lineItems.push({
        price_data: {
          currency: "gbp",
          unit_amount: pricePerTablePence,
          product_data: {
            name: `TCG Card Show — ${DAY_LABELS.Sunday}`,
            description: `${sunCount} vendor table${sunCount > 1 ? "s" : ""} — ${DAY_LABELS.Sunday}`,
          },
        },
        quantity: sunCount,
      });
    }

    const session = await getStripe().checkout.sessions.create({
      payment_method_types: ["card"],
      customer_email: email.trim(),
      line_items: lineItems,
      mode: "payment",
      success_url: `${req.nextUrl.origin}/event/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${req.nextUrl.origin}/event`,
      metadata: {
        booking_type: "event_table",
        first_name: first_name.trim(),
        last_name: last_name.trim(),
        business_name: business_name.trim(),
        instagram_handle: (instagram_handle || "").trim(),
        email: email.trim(),
        phone: phone.trim(),
        card_types: cardTypesStr,
        saturday_tables: String(satCount),
        sunday_tables: String(sunCount),
      },
    });

    return NextResponse.json({ url: session.url });
  } catch (error) {
    console.error("Event checkout error:", error);
    return NextResponse.json(
      { error: "Failed to create checkout session. Please try again." },
      { status: 500 }
    );
  }
}
