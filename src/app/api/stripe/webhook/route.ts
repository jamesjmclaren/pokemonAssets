import { NextRequest, NextResponse } from "next/server";
import Stripe from "stripe";
import { createClient } from "@supabase/supabase-js";

function getSupabaseAdmin() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}

function getStripe() {
  return new Stripe(process.env.STRIPE_SECRET_KEY!, {
    apiVersion: "2026-03-25.dahlia",
  });
}

export async function POST(req: NextRequest) {
  const body = await req.text();
  const sig = req.headers.get("stripe-signature");

  if (!sig) {
    return NextResponse.json(
      { error: "Missing stripe-signature header" },
      { status: 400 }
    );
  }

  let event: Stripe.Event;

  try {
    event = getStripe().webhooks.constructEvent(
      body,
      sig,
      process.env.STRIPE_WEBHOOK_SECRET!
    );
  } catch (err) {
    console.error("Webhook signature verification failed:", err);
    return NextResponse.json(
      { error: "Invalid signature" },
      { status: 400 }
    );
  }

  if (event.type === "checkout.session.completed") {
    const session = event.data.object as Stripe.Checkout.Session;
    const metadata = session.metadata || {};

    if (metadata.booking_type === "event_table") {
      await handleEventTableBooking(session, metadata);
      return NextResponse.json({ received: true });
    }

    const name = metadata.name || "Unknown";
    const whatsapp = metadata.whatsapp || "Not provided";
    const dob = metadata.dob || "Not provided";
    const profile = metadata.profile || "Not provided";
    const interests = metadata.interests || "Not provided";
    const referral = metadata.referral || "None";

    // Send notification email to admin
    try {
      await fetch("https://smtp.maileroo.com/api/v2/emails", {
        method: "POST",
        headers: {
          "X-Api-Key": process.env.MAILEROO_API_KEY!,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          from: {
            address: `noreply@${process.env.MAILEROO_DOMAIN || "west.investments"}`,
            display_name: "West Investments",
          },
          to: {
            address: "info@west.investments",
            display_name: "West Investments",
          },
          subject: `New Paid Membership: ${name}`,
          html: `
            <h2>New Paid Community Membership</h2>
            <p>A new member has completed payment and joined the community.</p>
            <hr />
            <p><strong>Name:</strong> ${name}</p>
            <p><strong>Number:</strong> ${whatsapp}</p>
            <p><strong>Date of Birth:</strong> ${dob}</p>
            <p><strong>Profile:</strong> ${profile}</p>
            <p><strong>Interests:</strong> ${interests}</p>
            <p><strong>Referral:</strong> ${referral}</p>
            <hr />
            <p><strong>Payment Amount:</strong> £${((session.amount_total || 0) / 100).toFixed(2)}</p>
            <p><strong>Payment Status:</strong> ${session.payment_status}</p>
            <p><strong>Stripe Session ID:</strong> ${session.id}</p>
            <p><strong>Submitted:</strong> ${new Date().toLocaleString("en-GB", { timeZone: "Europe/London" })}</p>
          `,
        }),
      });
    } catch (emailError) {
      console.error("Failed to send admin notification email:", emailError);
    }

    // Send confirmation email to member if we have their email from Stripe
    if (session.customer_details?.email) {
      try {
        await fetch("https://smtp.maileroo.com/api/v2/emails", {
          method: "POST",
          headers: {
            "X-Api-Key": process.env.MAILEROO_API_KEY!,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            from: {
              address: `noreply@${process.env.MAILEROO_DOMAIN || "west.investments"}`,
              display_name: "West Investments",
            },
            to: {
              address: session.customer_details.email,
              display_name: name,
            },
            subject: "Welcome to the West Investments Community",
            html: `
              <h2>Welcome to West Investments</h2>
              <p>Hi ${name},</p>
              <p>Thank you for joining the West Investments Community. Your payment of <strong>£${((session.amount_total || 0) / 100).toFixed(2)}</strong> has been received.</p>
              <h3>Your Details</h3>
              <p><strong>Name:</strong> ${name}</p>
              <p><strong>Number:</strong> ${whatsapp}</p>
              <p><strong>Date of Birth:</strong> ${dob}</p>
              <p><strong>Interests:</strong> ${interests}</p>
              ${referral !== "None" ? `<p><strong>Referred by:</strong> ${referral}</p>` : ""}
              <hr />
              <p>We will be in touch shortly via WhatsApp to confirm your membership and add you to our private group.</p>
              <p>If you have any questions, please contact us at <a href="mailto:info@west.investments">info@west.investments</a>.</p>
              <br />
              <p>Best regards,</p>
              <p><strong>West Investments</strong></p>
            `,
          }),
        });
      } catch (emailError) {
        console.error("Failed to send member confirmation email:", emailError);
      }
    }
  }

  return NextResponse.json({ received: true });
}

const DAY_LABELS: Record<string, string> = {
  Saturday: "Saturday 4th June",
  Sunday: "Sunday 5th June",
};

async function handleEventTableBooking(
  session: Stripe.Checkout.Session,
  metadata: Record<string, string>
) {
  const firstName = metadata.first_name || "";
  const lastName = metadata.last_name || "";
  const businessName = metadata.business_name || "Unknown";
  const instagramHandle = metadata.instagram_handle || "";
  const email = metadata.email || "";
  const phone = metadata.phone || "Not provided";
  const cardType = metadata.card_type || "Not provided";
  const tablesCount = parseInt(metadata.tables_count || "1", 10);
  const eventDay = metadata.event_day || "Saturday";
  const amountPaidPence = session.amount_total || 0;
  const vendorName = `${firstName} ${lastName}`.trim() || businessName;
  const dayLabel = DAY_LABELS[eventDay] || eventDay;

  // Insert booking record
  try {
    await getSupabaseAdmin()
      .from("event_bookings")
      .insert({
        stripe_session_id: session.id,
        payment_status: "paid",
        first_name: firstName,
        last_name: lastName,
        business_name: businessName,
        instagram_handle: instagramHandle || null,
        email,
        phone,
        card_type: cardType,
        tables_count: tablesCount,
        event_day: eventDay,
        amount_paid_pence: amountPaidPence,
      });
  } catch (dbError) {
    console.error("Failed to insert event booking:", dbError);
  }

  const amountFormatted = `£${(amountPaidPence / 100).toFixed(2)}`;
  const mailerooKey = process.env.MAILEROO_API_KEY!;
  const domain = process.env.MAILEROO_DOMAIN || "west.investments";

  // Admin notification email
  try {
    await fetch("https://smtp.maileroo.com/api/v2/emails", {
      method: "POST",
      headers: { "X-Api-Key": mailerooKey, "Content-Type": "application/json" },
      body: JSON.stringify({
        from: { address: `noreply@${domain}`, display_name: "West Investments" },
        to: { address: "info@west.investments", display_name: "West Investments" },
        subject: `New Table Booking: ${businessName} — ${dayLabel} (${tablesCount} table${tablesCount > 1 ? "s" : ""})`,
        html: `
          <h2>New Event Table Booking</h2>
          <p>A vendor has completed payment for table(s) at the TCG Card Show.</p>
          <hr />
          <p><strong>Name:</strong> ${vendorName}</p>
          <p><strong>Business Name:</strong> ${businessName}</p>
          ${instagramHandle ? `<p><strong>Instagram:</strong> @${instagramHandle}</p>` : ""}
          <p><strong>Email:</strong> ${email}</p>
          <p><strong>Phone:</strong> ${phone}</p>
          <p><strong>Card Type:</strong> ${cardType}</p>
          <p><strong>Event Day:</strong> ${dayLabel}</p>
          <p><strong>Tables Booked:</strong> ${tablesCount}</p>
          <hr />
          <p><strong>Amount Paid:</strong> ${amountFormatted}</p>
          <p><strong>Payment Status:</strong> ${session.payment_status}</p>
          <p><strong>Stripe Session ID:</strong> ${session.id}</p>
          <p><strong>Booked At:</strong> ${new Date().toLocaleString("en-GB", { timeZone: "Europe/London" })}</p>
        `,
      }),
    });
  } catch (emailError) {
    console.error("Failed to send admin event booking email:", emailError);
  }

  // Vendor confirmation email
  if (email) {
    try {
      await fetch("https://smtp.maileroo.com/api/v2/emails", {
        method: "POST",
        headers: { "X-Api-Key": mailerooKey, "Content-Type": "application/json" },
        body: JSON.stringify({
          from: { address: `noreply@${domain}`, display_name: "West Investments" },
          to: { address: email, display_name: vendorName },
          subject: `Booking Confirmed — TCG Card Show (${dayLabel})`,
          html: `
            <h2>Booking Confirmed</h2>
            <p>Hi ${vendorName},</p>
            <p>Thank you for booking your table${tablesCount > 1 ? "s" : ""} at the West Investments TCG Card Show. Your payment of <strong>${amountFormatted}</strong> has been received.</p>
            <h3>Booking Summary</h3>
            <p><strong>Name:</strong> ${vendorName}</p>
            <p><strong>Business Name:</strong> ${businessName}</p>
            <p><strong>Card Type:</strong> ${cardType}</p>
            <p><strong>Event Day:</strong> ${dayLabel}</p>
            <p><strong>Tables Booked:</strong> ${tablesCount}</p>
            <p><strong>Amount Paid:</strong> ${amountFormatted}</p>
            <p><strong>Booking Reference:</strong> ${session.id}</p>
            <hr />
            <p><strong>Please note:</strong> This booking does not include internet or power. These can be purchased at a later date from ExCeL London.</p>
            <p>Table and booth positions will be allocated randomly within rows. Display cases can be booked at a later date.</p>
            <br />
            <p>We will be in touch with further details about the event, including setup times.</p>
            <p>If you have any questions, please contact us at <a href="mailto:info@west.investments">info@west.investments</a>.</p>
            <br />
            <p>Best regards,</p>
            <p><strong>West Investments</strong></p>
          `,
        }),
      });
    } catch (emailError) {
      console.error("Failed to send vendor confirmation email:", emailError);
    }
  }
}
