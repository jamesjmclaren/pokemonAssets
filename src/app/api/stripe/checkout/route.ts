import { NextRequest, NextResponse } from "next/server";
import Stripe from "stripe";

function getStripe() {
  return new Stripe(process.env.STRIPE_SECRET_KEY!, {
    apiVersion: "2026-03-25.dahlia",
  });
}

export async function POST(req: NextRequest) {
  try {
    const { name, whatsapp, dob, profile, interests, referral } =
      await req.json();

    if (!name?.trim() || !whatsapp?.trim() || !dob?.trim()) {
      return NextResponse.json(
        { error: "Name, number, and date of birth are required." },
        { status: 400 }
      );
    }

    const session = await getStripe().checkout.sessions.create({
      payment_method_types: ["card"],
      line_items: [
        {
          price_data: {
            currency: "gbp",
            product_data: {
              name: "West Investments Community Membership",
              description: "Annual membership — all features included",
            },
            unit_amount: 27000, // £270.00
          },
          quantity: 1,
        },
      ],
      mode: "payment",
      success_url: `${req.nextUrl.origin}/community/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${req.nextUrl.origin}/community`,
      customer_email: undefined,
      metadata: {
        name: name.trim(),
        whatsapp: whatsapp.trim(),
        dob: dob.trim(),
        profile: (profile || "").trim(),
        interests: (interests || "").trim(),
        referral: (referral || "").trim(),
      },
    });

    return NextResponse.json({ url: session.url });
  } catch (error) {
    console.error("Stripe checkout error:", error);
    return NextResponse.json(
      { error: "Failed to create checkout session. Please try again." },
      { status: 500 }
    );
  }
}
