import { auth, currentUser } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";

const ADMIN_EMAILS = [
  "jamesjmclaren@gmail.com",
  "k1west.cityboy@gmail.com",
];

export async function POST(request: Request) {
  const { userId } = await auth();
  const user = await currentUser();

  if (!userId || !user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const userEmail = user.primaryEmailAddress?.emailAddress?.toLowerCase();
  if (!userEmail || !ADMIN_EMAILS.some((e) => e.toLowerCase() === userEmail)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = await request.json();
  const name = body.name?.trim();
  const email = body.email?.toLowerCase().trim() || null;

  if (!name) {
    return NextResponse.json(
      { error: "Name is required" },
      { status: 400 }
    );
  }

  // Build the sign-up link
  const baseUrl =
    request.headers.get("origin") || request.headers.get("host");
  const protocol = baseUrl?.startsWith("http") ? "" : "https://";
  const signUpLink = `${protocol}${baseUrl}/sign-up`;

  let emailSent = false;

  // If email provided, send the invite link via Maileroo
  if (email) {
    try {
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
            address: email,
            display_name: name,
          },
          subject: "You're Invited to West Investments",
          html: `
            <h2>You're Invited</h2>
            <p>Hi ${name},</p>
            <p>You've been invited to join the West Investments platform — a private community for serious collectibles investors, traders, and collectors.</p>
            <p>Click the link below to create your account. You can sign up using your email, Google, or any available method:</p>
            <p style="margin: 24px 0;">
              <a href="${signUpLink}" style="display: inline-block; padding: 12px 28px; background-color: #c9a84c; color: #000; text-decoration: none; font-weight: 600; letter-spacing: 0.05em;">
                Create Your Account
              </a>
            </p>
            <p>Or copy this link: <a href="${signUpLink}">${signUpLink}</a></p>
            <br />
            <p>Best regards,</p>
            <p><strong>West Investments</strong></p>
          `,
        }),
      });

      if (res.ok) {
        emailSent = true;
      } else {
        console.error("Maileroo send failed:", await res.text());
      }
    } catch (err) {
      console.error("Failed to send invite email:", err);
    }
  }

  return NextResponse.json({
    link: signUpLink,
    emailSent,
    message: emailSent
      ? "Invite link generated and emailed"
      : "Invite link generated",
  });
}
