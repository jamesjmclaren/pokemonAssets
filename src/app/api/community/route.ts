import { NextRequest, NextResponse } from "next/server";
import { escapeHtml } from "@/lib/escape-html";

export async function POST(req: NextRequest) {
  try {
    const { name, whatsapp, dob, profile, interests, referral } = await req.json();

    if (!name?.trim() || !whatsapp?.trim() || !dob?.trim()) {
      return NextResponse.json(
        { error: "Name, number, and date of birth are required." },
        { status: 400 }
      );
    }

    const safeName = escapeHtml(name);
    const safeWhatsapp = escapeHtml(whatsapp);
    const safeDob = escapeHtml(dob);
    const safeProfile = escapeHtml(profile || "Not provided");
    const safeInterests = escapeHtml(interests || "Not provided");
    const safeReferral = escapeHtml(referral || "None");

    const res = await fetch("https://smtp.maileroo.com/api/v2/emails", {
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
        subject: `New Subscription: ${safeName}`,
        html: `
          <h2>New Subscription</h2>
          <p><strong>Name:</strong> ${safeName}</p>
          <p><strong>Number:</strong> ${safeWhatsapp}</p>
          <p><strong>Date of Birth:</strong> ${safeDob}</p>
          <p><strong>Profile:</strong> ${safeProfile}</p>
          <p><strong>Interests:</strong> ${safeInterests}</p>
          <p><strong>Referral:</strong> ${safeReferral}</p>
          <p><strong>Submitted:</strong> ${new Date().toLocaleString("en-GB", { timeZone: "Europe/London" })}</p>
        `,
      }),
    });

    if (!res.ok) {
      const data = await res.json();
      console.error("Maileroo error:", data);
      throw new Error("Email send failed");
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Join application error:", error);
    return NextResponse.json(
      { error: "Failed to submit application. Please try again." },
      { status: 500 }
    );
  }
}
