import { NextRequest, NextResponse } from "next/server";
import Stripe from "stripe";

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
