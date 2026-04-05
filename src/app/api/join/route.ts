import { NextRequest, NextResponse } from "next/server";
import { Resend } from "resend";

const resend = new Resend(process.env.RESEND_API_KEY);

export async function POST(req: NextRequest) {
  try {
    const { name, whatsapp } = await req.json();

    if (!name?.trim() || !whatsapp?.trim()) {
      return NextResponse.json(
        { error: "Name and WhatsApp number are required." },
        { status: 400 }
      );
    }

    await resend.emails.send({
      from: "West Investments <onboarding@resend.dev>",
      to: "info@west.investments",
      subject: `New Membership Application: ${name}`,
      html: `
        <h2>New Membership Application</h2>
        <p><strong>Name:</strong> ${name}</p>
        <p><strong>WhatsApp:</strong> ${whatsapp}</p>
        <p><strong>Submitted:</strong> ${new Date().toLocaleString("en-GB", { timeZone: "Europe/London" })}</p>
      `,
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Join application error:", error);
    return NextResponse.json(
      { error: "Failed to submit application. Please try again." },
      { status: 500 }
    );
  }
}
