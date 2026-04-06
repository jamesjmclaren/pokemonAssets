import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  try {
    const { name, whatsapp } = await req.json();

    if (!name?.trim() || !whatsapp?.trim()) {
      return NextResponse.json(
        { error: "Name and WhatsApp number are required." },
        { status: 400 }
      );
    }

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
        subject: `New Membership Application: ${name}`,
        html: `
          <h2>New Membership Application</h2>
          <p><strong>Name:</strong> ${name}</p>
          <p><strong>WhatsApp:</strong> ${whatsapp}</p>
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
