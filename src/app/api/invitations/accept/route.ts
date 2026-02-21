import { auth, currentUser } from "@clerk/nextjs/server";
import { supabase } from "@/lib/supabase";
import { NextResponse } from "next/server";

export async function POST(request: Request) {
  const { userId } = await auth();
  const user = await currentUser();

  if (!userId || !user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json();
  const { token } = body;

  if (!token) {
    return NextResponse.json({ error: "Token is required" }, { status: 400 });
  }

  // Find the invitation
  const { data: invitation, error: inviteError } = await supabase
    .from("portfolio_invitations")
    .select("*")
    .eq("token", token)
    .gt("expires_at", new Date().toISOString())
    .single();

  if (inviteError || !invitation) {
    return NextResponse.json(
      { error: "Invalid or expired invitation" },
      { status: 400 }
    );
  }

  // Verify email matches (optional - you might want to allow any authenticated user)
  const userEmail = user.emailAddresses[0]?.emailAddress?.toLowerCase();
  if (invitation.email !== userEmail) {
    return NextResponse.json(
      { error: "This invitation was sent to a different email address" },
      { status: 400 }
    );
  }

  // Check if already a member
  const { data: existingMember } = await supabase
    .from("portfolio_members")
    .select("id")
    .eq("portfolio_id", invitation.portfolio_id)
    .eq("user_id", userId)
    .single();

  if (existingMember) {
    // Delete the invitation since they're already a member
    await supabase.from("portfolio_invitations").delete().eq("id", invitation.id);
    return NextResponse.json({ error: "Already a member" }, { status: 400 });
  }

  // Create membership
  const { error: memberError } = await supabase.from("portfolio_members").insert({
    portfolio_id: invitation.portfolio_id,
    user_id: userId,
    email: invitation.email,
    role: invitation.role,
    invited_by: invitation.invited_by,
    accepted_at: new Date().toISOString(),
  });

  if (memberError) {
    return NextResponse.json({ error: memberError.message }, { status: 500 });
  }

  // Delete the invitation
  await supabase.from("portfolio_invitations").delete().eq("id", invitation.id);

  return NextResponse.json({
    success: true,
    portfolio_id: invitation.portfolio_id,
  });
}
