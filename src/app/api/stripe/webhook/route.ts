import { NextRequest, NextResponse } from "next/server";
import Stripe from "stripe";
import { createClient } from "@supabase/supabase-js";
import { escapeHtml } from "@/lib/escape-html";
import {
  TABLE_TYPE_BY_LABEL,
  TYPE_LABELS,
  TYPE_PRICE_PENCE,
  type TableTypeKey,
} from "@/lib/event-floor-plan";
import {
  brandedEmailHtml,
  summaryCard,
  buildEventIcs,
  googleCalendarUrl,
} from "@/lib/event-emails";

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

    if (metadata.booking_type === "event_table_v2") {
      await handleEventTableV2Booking(session, metadata);
      return NextResponse.json({ received: true });
    }

    const name = escapeHtml(metadata.name || "Unknown");
    const whatsapp = escapeHtml(metadata.whatsapp || "Not provided");
    const dob = escapeHtml(metadata.dob || "Not provided");
    const profile = escapeHtml(metadata.profile || "Not provided");
    const interests = escapeHtml(metadata.interests || "Not provided");
    const referral = escapeHtml(metadata.referral || "None");

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
  const cardTypes = metadata.card_types || "Not provided";
  const satCount = parseInt(metadata.saturday_tables || "0", 10);
  const sunCount = parseInt(metadata.sunday_tables || "0", 10);
  const amountPaidPence = session.amount_total || 0;
  const vendorName = `${firstName} ${lastName}`.trim() || businessName;

  // Build day summary for emails
  const dayLines: string[] = [];
  if (satCount > 0) dayLines.push(`${satCount} table${satCount > 1 ? "s" : ""} — ${DAY_LABELS.Saturday}`);
  if (sunCount > 0) dayLines.push(`${sunCount} table${sunCount > 1 ? "s" : ""} — ${DAY_LABELS.Sunday}`);
  const daySummary = dayLines.join(", ");
  const subjectDays = [satCount > 0 ? DAY_LABELS.Saturday : null, sunCount > 0 ? DAY_LABELS.Sunday : null]
    .filter(Boolean).join(" & ");

  // Escaped copies for safe interpolation into email HTML (DB insert uses raw values)
  const eVendorName = escapeHtml(vendorName);
  const eBusinessName = escapeHtml(businessName);
  const eInstagramHandle = escapeHtml(instagramHandle);
  const eEmail = escapeHtml(email);
  const ePhone = escapeHtml(phone);
  const eCardTypes = escapeHtml(cardTypes);

  // Insert one row per booked day so per-day counter stays accurate
  const supabase = getSupabaseAdmin();
  const dayInserts = [
    satCount > 0 ? { event_day: "Saturday", tables_count: satCount } : null,
    sunCount > 0 ? { event_day: "Sunday", tables_count: sunCount } : null,
  ].filter(Boolean) as { event_day: string; tables_count: number }[];

  for (const [i, day] of dayInserts.entries()) {
    try {
      await supabase.from("event_bookings").insert({
        // Suffix session ID so uniqueness constraint holds for two-day bookings
        stripe_session_id: dayInserts.length > 1 ? `${session.id}_${i}` : session.id,
        payment_status: "paid",
        first_name: firstName,
        last_name: lastName,
        business_name: businessName,
        instagram_handle: instagramHandle || null,
        email,
        phone,
        card_type: cardTypes,
        tables_count: day.tables_count,
        event_day: day.event_day,
        amount_paid_pence: Math.round((amountPaidPence * day.tables_count) / (satCount + sunCount)),
      });
    } catch (dbError) {
      console.error(`Failed to insert event booking row for ${day.event_day}:`, dbError);
    }
  }

  // Fetch remaining availability after booking
  const totalTables = parseInt(process.env.EVENT_TOTAL_TABLES || "176", 10);
  let satRemaining: number | null = null;
  let sunRemaining: number | null = null;
  try {
    const { data: allBookings } = await supabase
      .from("event_bookings")
      .select("tables_count, event_day")
      .eq("payment_status", "paid");
    const rows = allBookings || [];
    const satBooked = rows.filter((r) => r.event_day === "Saturday").reduce((s, r) => s + r.tables_count, 0);
    const sunBooked = rows.filter((r) => r.event_day === "Sunday").reduce((s, r) => s + r.tables_count, 0);
    satRemaining = Math.max(0, totalTables - satBooked);
    sunRemaining = Math.max(0, totalTables - sunBooked);
  } catch {}

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
        to: { address: process.env.EVENT_NOTIFICATION_EMAIL || "info@west.investments", display_name: "West Investments" },
        subject: `New Table Booking: ${businessName} — ${subjectDays}`,
        html: `
          <h2>New Event Table Booking</h2>
          <p>A vendor has completed payment for table(s) at the TCG Card Show.</p>
          <hr />
          <p><strong>Name:</strong> ${eVendorName}</p>
          <p><strong>Business Name:</strong> ${eBusinessName}</p>
          ${instagramHandle ? `<p><strong>Instagram:</strong> @${eInstagramHandle}</p>` : ""}
          <p><strong>Email:</strong> ${eEmail}</p>
          <p><strong>Phone:</strong> ${ePhone}</p>
          <p><strong>Card Types:</strong> ${eCardTypes}</p>
          <p><strong>Tables Booked:</strong> ${daySummary}</p>
          <hr />
          <p><strong>Total Paid:</strong> ${amountFormatted}</p>
          <p><strong>Payment Status:</strong> ${session.payment_status}</p>
          <p><strong>Stripe Session ID:</strong> ${session.id}</p>
          <p><strong>Booked At:</strong> ${new Date().toLocaleString("en-GB", { timeZone: "Europe/London" })}</p>
          <hr />
          <h3>Tables Remaining</h3>
          <p><strong>Saturday 4th June:</strong> ${satRemaining !== null ? `${satRemaining} of ${totalTables}` : "—"}</p>
          <p><strong>Sunday 5th June:</strong> ${sunRemaining !== null ? `${sunRemaining} of ${totalTables}` : "—"}</p>
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
          subject: `Booking Confirmed — TCG Card Show (${subjectDays})`,
          html: `
            <h2>Booking Confirmed</h2>
            <p>Hi ${eVendorName},</p>
            <p>Thank you for booking at the West Investments TCG Card Show. Your payment of <strong>${amountFormatted}</strong> has been received.</p>
            <h3>Booking Summary</h3>
            <p><strong>Name:</strong> ${eVendorName}</p>
            <p><strong>Business Name:</strong> ${eBusinessName}</p>
            <p><strong>Card Types:</strong> ${eCardTypes}</p>
            <p><strong>Tables Booked:</strong> ${daySummary}</p>
            <p><strong>Total Paid:</strong> ${amountFormatted}</p>
            <p><strong>Booking Reference:</strong> ${session.id}</p>
            <hr />
            <p><strong>Please note:</strong> This booking does not include internet or power. These can be purchased at a later date from ExCeL London.</p>
            <p>Table and booth positions will be allocated randomly. Display cases can be booked at a later date.</p>
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

// ─────────────────────────────────────────────────────────────────────────────
// v2 handler — generalised multi-type table bookings (event_bookings_v2)
// ─────────────────────────────────────────────────────────────────────────────

async function handleEventTableV2Booking(
  session: Stripe.Checkout.Session,
  metadata: Record<string, string>
) {
  const firstName = metadata.first_name || "";
  const lastName = metadata.last_name || "";
  const businessName = metadata.business_name || "Unknown";
  const instagramHandle = metadata.instagram_handle || "";
  const email = metadata.email || "";
  const phone = metadata.phone || "Not provided";
  const cardTypes = metadata.card_types || "Not provided";
  const eventSlug = metadata.event_slug || "unknown";
  const amountPaidPence = session.amount_total || 0;
  const vendorName = `${firstName} ${lastName}`.trim() || businessName;

  // Parse selected table numbers per day (comma-separated labels in metadata)
  const parseLabels = (s: string | undefined): string[] =>
    (s || "")
      .split(",")
      .map((l) => l.trim())
      .filter((l) => l && l in TABLE_TYPE_BY_LABEL);
  const tables: { label: string; type: TableTypeKey; day: string }[] = [
    ...parseLabels(metadata.sat_tables).map((label) => ({
      label,
      type: TABLE_TYPE_BY_LABEL[label],
      day: "Saturday",
    })),
    ...parseLabels(metadata.sun_tables).map((label) => ({
      label,
      type: TABLE_TYPE_BY_LABEL[label],
      day: "Sunday",
    })),
  ];

  if (tables.length === 0) {
    console.error("handleEventTableV2Booking: no tables in metadata");
    return;
  }

  // Look up event (for FK + emails)
  const supabase = getSupabaseAdmin();
  const { data: event } = await supabase
    .from("events")
    .select("id, name, venue, start_date, end_date")
    .eq("slug", eventSlug)
    .single();
  if (!event) {
    console.error(`handleEventTableV2Booking: event not found for slug "${eventSlug}"`);
    return;
  }

  // The reservation id IS the browser's hold token.
  const reservationId = metadata.reservation_id || "";

  // Insert one paid booking row per table. The unique index blocks any table
  // that was already taken — log those for manual review/refund.
  for (const [idx, t] of tables.entries()) {
    const { error } = await supabase.from("event_bookings_v2").insert({
      stripe_session_id: `${session.id}_${idx}`,
      payment_status: "paid",
      event_id: event.id,
      event_day: t.day,
      table_type_key: t.type,
      table_label: t.label,
      quantity: 1,
      first_name: firstName,
      last_name: lastName,
      business_name: businessName,
      instagram_handle: instagramHandle || null,
      email,
      phone,
      card_types: cardTypes,
      amount_paid_pence: TYPE_PRICE_PENCE[t.type],
    });
    if (error) {
      if (error.code === "23505") {
        console.error(
          `handleEventTableV2Booking: table ${t.label} (${t.day}) already booked — paid order needs manual review/refund. Session ${session.id}`
        );
      } else {
        console.error(`handleEventTableV2Booking: insert failed for ${t.label}:`, error);
      }
    }
  }

  // Release this token's reserve-on-select holds now that the tables are paid.
  if (reservationId) {
    await supabase
      .from("event_table_holds")
      .delete()
      .eq("event_id", event.id)
      .eq("hold_token", reservationId);
  }

  // Build readable booking summary lines for emails (grouped by type × day, with table numbers)
  const grouped = new Map<string, string[]>();
  for (const t of tables) {
    const k = `${t.day}|${t.type}`;
    if (!grouped.has(k)) grouped.set(k, []);
    grouped.get(k)!.push(t.label);
  }
  const itemLines = [...grouped.entries()].map(([k, labels]) => {
    const [day, type] = k.split("|") as [string, TableTypeKey];
    const linePence = TYPE_PRICE_PENCE[type] * labels.length;
    return `${TYPE_LABELS[type]} × ${labels.length} (${labels.join(", ")}) — ${day}: £${(linePence / 100).toFixed(2)}`;
  });

  const amountFormatted = `£${(amountPaidPence / 100).toFixed(2)}`;
  const eVendorName = escapeHtml(vendorName);
  const eBusinessName = escapeHtml(businessName);
  const eEmail = escapeHtml(email);
  const ePhone = escapeHtml(phone);
  const eCardTypes = escapeHtml(cardTypes);
  const eInstagram = escapeHtml(instagramHandle);
  const eEventName = escapeHtml(event.name);
  const eVenue = escapeHtml(event.venue);
  const mailerooKey = process.env.MAILEROO_API_KEY!;
  const domain = process.env.MAILEROO_DOMAIN || "west.investments";
  const ref = session.id.slice(-8).toUpperCase();

  // Admin notification
  try {
    await fetch("https://smtp.maileroo.com/api/v2/emails", {
      method: "POST",
      headers: { "X-Api-Key": mailerooKey, "Content-Type": "application/json" },
      body: JSON.stringify({
        from: { address: `noreply@${domain}`, display_name: "West Investments" },
        to: {
          address: process.env.EVENT_NOTIFICATION_EMAIL || "info@west.investments",
          display_name: "West Investments",
        },
        subject: `New Table Booking: ${businessName} — ${eEventName}`,
        html: `
          <h2>New Table Booking — ${eEventName}</h2>
          <p>A vendor has completed payment at ${eVenue}.</p>
          <hr />
          <p><strong>Name:</strong> ${eVendorName}</p>
          <p><strong>Business:</strong> ${eBusinessName}</p>
          ${instagramHandle ? `<p><strong>Instagram:</strong> @${eInstagram}</p>` : ""}
          <p><strong>Email:</strong> ${eEmail}</p>
          <p><strong>Phone:</strong> ${ePhone}</p>
          <p><strong>Card Types:</strong> ${eCardTypes}</p>
          <hr />
          <h3>Tables Booked</h3>
          ${itemLines.map((l) => `<p>${escapeHtml(l)}</p>`).join("")}
          <p><strong>Total Paid:</strong> ${amountFormatted}</p>
          <hr />
          <p><strong>Stripe Session:</strong> ${session.id}</p>
          <p><strong>Reference:</strong> ${ref}</p>
          <p><strong>Booked At:</strong> ${new Date().toLocaleString("en-GB", { timeZone: "Europe/London" })}</p>
        `,
      }),
    });
  } catch (e) {
    console.error("handleEventTableV2Booking: failed to send admin email:", e);
  }

  // Vendor confirmation — branded, with a calendar invite
  if (email) {
    try {
      const tablesHtml = itemLines.map((l) => escapeHtml(l)).join("<br/>");
      const startDate: string | null = event.start_date ?? null;
      const endDate: string | null = event.end_date ?? startDate;
      const calTitle = `${event.name} — Vendor`;
      const calDetails = `Booking ref ${ref}. Tables: ${tables.map((t) => `${t.label} (${t.day})`).join(", ")}.`;

      const card = summaryCard(ref, [
        ["Event", `${eEventName}`],
        ["Venue", `${eVenue}`],
        ["Business", eBusinessName],
        ["Tables", tablesHtml],
        ["Total paid", amountFormatted],
      ]);

      const gcal =
        startDate && endDate
          ? googleCalendarUrl({
              title: calTitle,
              details: calDetails,
              location: event.venue,
              startDate,
              endDate,
            })
          : null;

      const html = brandedEmailHtml({
        heading: "Booking confirmed",
        intro: `Hi ${eVendorName}, thank you for booking at <strong style="color:#e9e3d6;">${eEventName}</strong>. Your payment of <strong style="color:#e9e3d6;">${amountFormatted}</strong> has been received and your tables are reserved.`,
        bodyHtml: `${card}
          ${gcal ? `<p style="margin:18px 0 0;"><a href="${gcal}" style="color:#D4AF37;text-decoration:none;font-size:13px;">＋ Add to Google Calendar</a></p>` : ""}
          <p style="margin:20px 0 0;color:#8a8479;font-size:12px;line-height:1.7;">
            This booking does not include internet or power — these can be purchased from the venue.
            Table positions are communicated closer to the event. Display cases can be booked later.
          </p>`,
        footerNote: "A calendar invite is attached to this email.",
      });

      const payload: Record<string, unknown> = {
        from: { address: `noreply@${domain}`, display_name: "West Investments" },
        to: { address: email, display_name: vendorName },
        reply_to: { address: "info@west.investments", display_name: "West Investments" },
        subject: `Booking Confirmed — ${event.name} (Ref ${ref})`,
        html,
      };
      if (startDate && endDate) {
        const ics = buildEventIcs({
          uid: `${session.id}@west.investments`,
          title: calTitle,
          description: calDetails,
          location: event.venue,
          startDate,
          endDate,
        });
        payload.attachments = [
          {
            file_name: "collectors-exhibition.ics",
            content_type: "text/calendar",
            content: Buffer.from(ics).toString("base64"),
          },
        ];
      }

      await fetch("https://smtp.maileroo.com/api/v2/emails", {
        method: "POST",
        headers: { "X-Api-Key": mailerooKey, "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
    } catch (e) {
      console.error("handleEventTableV2Booking: failed to send vendor email:", e);
    }
  }
}
