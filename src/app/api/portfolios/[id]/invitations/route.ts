import { auth, clerkClient, currentUser } from "@clerk/nextjs/server";
import { supabase } from "@/lib/supabase";
import { NextResponse } from "next/server";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { userId } = await auth();
  const { id: portfolioId } = await params;

  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const hasAccess = await checkAdminAccess(portfolioId, userId);
  if (!hasAccess) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { data: invitations, error } = await supabase
    .from("portfolio_invitations")
    .select("*")
    .eq("portfolio_id", portfolioId)
    .gt("expires_at", new Date().toISOString());

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json(invitations);
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { userId } = await auth();
  const user = await currentUser();
  const { id: portfolioId } = await params;

  if (!userId || !user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const hasAccess = await checkAdminAccess(portfolioId, userId);
  if (!hasAccess) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = await request.json();
  const { email, role = "read_only" } = body;
  const normalizedEmail = email?.toLowerCase().trim();

  if (!normalizedEmail) {
    return NextResponse.json({ error: "Email is required" }, { status: 400 });
  }

  if (!["admin", "read_only"].includes(role)) {
    return NextResponse.json({ error: "Invalid role" }, { status: 400 });
  }

  // Get portfolio details
  const { data: portfolio } = await supabase
    .from("portfolios")
    .select("name")
    .eq("id", portfolioId)
    .single();

  if (!portfolio) {
    return NextResponse.json({ error: "Portfolio not found" }, { status: 404 });
  }

  // Check if already a member
  const { data: existingMember } = await supabase
    .from("portfolio_members")
    .select("id")
    .eq("portfolio_id", portfolioId)
    .eq("email", normalizedEmail)
    .single();

  if (existingMember) {
    return NextResponse.json(
      { error: "This person is already a member" },
      { status: 400 }
    );
  }

  // Check if the invited email already has a Clerk account
  const clerk = await clerkClient();
  const existingUsers = await clerk.users.getUserList({
    emailAddress: [normalizedEmail],
  });

  if (existingUsers.data.length > 0) {
    // User already exists — add them directly as a member
    const existingUser = existingUsers.data[0];

    const { error: memberError } = await supabase
      .from("portfolio_members")
      .insert({
        portfolio_id: portfolioId,
        user_id: existingUser.id,
        email: normalizedEmail,
        role,
        invited_by: userId,
        accepted_at: new Date().toISOString(),
      });

    if (memberError) {
      return NextResponse.json({ error: memberError.message }, { status: 500 });
    }

    return NextResponse.json({ added_directly: true });
  }

  // User doesn't exist — create invitation record and send signup email via Clerk
  const { data: existingInvite } = await supabase
    .from("portfolio_invitations")
    .select("id")
    .eq("portfolio_id", portfolioId)
    .eq("email", normalizedEmail)
    .single();

  if (existingInvite) {
    return NextResponse.json(
      { error: "Invitation already sent to this email" },
      { status: 400 }
    );
  }

  // Create the portfolio invitation record (stores portfolio/role mapping)
  const { data, error: insertError } = await supabase
    .from("portfolio_invitations")
    .insert({
      portfolio_id: portfolioId,
      email: normalizedEmail,
      role,
      invited_by: userId,
    })
    .select()
    .single();

  if (insertError) {
    return NextResponse.json({ error: insertError.message }, { status: 500 });
  }

  // Send signup email via Clerk's invitation API
  const baseUrl = request.headers.get("origin") || request.headers.get("host");
  const protocol = baseUrl?.startsWith("http") ? "" : "https://";
  const redirectUrl = `${protocol}${baseUrl}/invite/${data.token}`;

  try {
    await clerk.invitations.createInvitation({
      emailAddress: normalizedEmail,
      redirectUrl,
      ignoreExisting: true,
      notify: true,
    });
  } catch (clerkErr) {
    console.error("Clerk invitation email failed (DB invitation still created):", clerkErr);
    // Invitation record still exists — admin can copy the link as fallback
  }

  return NextResponse.json(data);
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { userId } = await auth();
  const { id: portfolioId } = await params;

  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const hasAccess = await checkAdminAccess(portfolioId, userId);
  if (!hasAccess) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { searchParams } = new URL(request.url);
  const invitationId = searchParams.get("invitationId");

  if (!invitationId) {
    return NextResponse.json(
      { error: "invitationId is required" },
      { status: 400 }
    );
  }

  const { error } = await supabase
    .from("portfolio_invitations")
    .delete()
    .eq("id", invitationId)
    .eq("portfolio_id", portfolioId);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}

async function checkAdminAccess(
  portfolioId: string,
  userId: string
): Promise<boolean> {
  const { data: portfolio } = await supabase
    .from("portfolios")
    .select("owner_id")
    .eq("id", portfolioId)
    .single();

  if (portfolio?.owner_id === userId) return true;

  const { data: member } = await supabase
    .from("portfolio_members")
    .select("role")
    .eq("portfolio_id", portfolioId)
    .eq("user_id", userId)
    .single();

  return member?.role === "admin";
}
