import { auth, clerkClient, currentUser } from "@clerk/nextjs/server";
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
  const email = body.email?.toLowerCase().trim();

  if (!email) {
    return NextResponse.json(
      { error: "Email is required" },
      { status: 400 }
    );
  }

  const clerk = await clerkClient();

  // Check if user already exists
  const existingUsers = await clerk.users.getUserList({
    emailAddress: [email],
  });

  if (existingUsers.data.length > 0) {
    return NextResponse.json(
      { error: "This user already has an account on the platform" },
      { status: 400 }
    );
  }

  // Send invitation via Clerk
  const baseUrl =
    request.headers.get("origin") || request.headers.get("host");
  const protocol = baseUrl?.startsWith("http") ? "" : "https://";
  const redirectUrl = `${protocol}${baseUrl}/dashboard`;

  try {
    await clerk.invitations.createInvitation({
      emailAddress: email,
      redirectUrl,
      ignoreExisting: true,
      notify: true,
    });
  } catch (err) {
    console.error("Clerk invitation error:", err);
    return NextResponse.json(
      { error: "Failed to send invitation. Please try again." },
      { status: 500 }
    );
  }

  return NextResponse.json({
    message: "Invitation sent successfully",
  });
}
