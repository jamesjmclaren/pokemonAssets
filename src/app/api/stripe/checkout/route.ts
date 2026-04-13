import { NextRequest, NextResponse } from "next/server";
import Stripe from "stripe";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: "2026-03-25.dahlia",
});

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

    const origin = req.headers.get("origin") || "http://localhost:3000";

    const session = await stripe.checkout.sessions.create({
      mode: "subscription",
      line_items: [
        {
          price: process.env.STRIPE_PRICE_ID!,
          quantity: 1,
        },
      ],
      metadata: {
        name: name.trim(),
        whatsapp: whatsapp.trim(),
        dob: dob.trim(),
        profile: (profile || "").trim(),
        interests: (interests || "").trim(),
        referral: (referral || "").trim(),
      },
      success_url: `${origin}/community/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${origin}/community#subscribe`,
    });

    return NextResponse.json({ url: session.url });
  } catch (error) {
    console.error("Stripe checkout error:", error);
    return NextResponse.json(
      { error: "Failed to create checkout session." },
      { status: 500 }
    );
  }
}
