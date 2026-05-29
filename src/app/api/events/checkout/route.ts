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
const CARD_TYPES = ["TCG", "Sports", "Collectibles", "Other"] as const;
const EVENT_DAYS = ["Saturday", "Sunday"] as const;

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
      card_type,
      tables_count,
      event_day,
    } = await req.json();

    if (!first_name?.trim() || !last_name?.trim() || !business_name?.trim() || !email?.trim() || !phone?.trim()) {
      return NextResponse.json(
        { error: "First name, last name, business name, email, and phone are required." },
        { status: 400 }
      );
    }

    if (!CARD_TYPES.includes(card_type)) {
      return NextResponse.json({ error: "Invalid card type." }, { status: 400 });
    }

    const count = Number(tables_count);
    if (![1, 2, 3].includes(count)) {
      return NextResponse.json({ error: "Tables must be 1, 2, or 3." }, { status: 400 });
    }

    if (!EVENT_DAYS.includes(event_day)) {
      return NextResponse.json({ error: "Please select a valid event day." }, { status: 400 });
    }

    const pricePerTablePence = parseInt(process.env.EVENT_TABLE_PRICE_PENCE || "0", 10);
    if (pricePerTablePence <= 0) {
      return NextResponse.json(
        { error: "Ticket pricing has not been configured yet. Please check back soon." },
        { status: 503 }
      );
    }

    // Server-side availability check per day to prevent overbooking
    const supabase = getSupabaseAdmin();
    const { data: bookings, error: dbError } = await supabase
      .from("event_bookings")
      .select("tables_count")
      .eq("payment_status", "paid")
      .eq("event_day", event_day);

    if (dbError) throw dbError;

    const booked = (bookings || []).reduce((sum, row) => sum + row.tables_count, 0);
    const available = Math.max(0, TOTAL_TABLES - booked);

    if (count > available) {
      return NextResponse.json(
        {
          error:
            available === 0
              ? `Sorry, all tables for ${DAY_LABELS[event_day]} have been sold.`
              : `Only ${available} table${available === 1 ? "" : "s"} remaining for ${DAY_LABELS[event_day]}.`,
        },
        { status: 409 }
      );
    }

    const vendorName = `${first_name.trim()} ${last_name.trim()}`;

    const session = await getStripe().checkout.sessions.create({
      payment_method_types: ["card"],
      customer_email: email.trim(),
      line_items: [
        {
          price_data: {
            currency: "gbp",
            unit_amount: pricePerTablePence,
            product_data: {
              name: `TCG Card Show — Table${count > 1 ? "s" : ""} (${DAY_LABELS[event_day]})`,
              description: `${count} vendor table${count > 1 ? "s" : ""} at the West Investments TCG Card Show — ${DAY_LABELS[event_day]}`,
            },
          },
          quantity: count,
        },
      ],
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
        card_type,
        tables_count: String(count),
        event_day,
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
