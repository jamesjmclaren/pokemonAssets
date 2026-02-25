import { auth, currentUser } from "@clerk/nextjs/server";
import { supabase } from "@/lib/supabase";
import { NextResponse } from "next/server";

export async function GET() {
  const { userId } = await auth();
  const user = await currentUser();

  if (!userId || !user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Auto-accept any pending invitations for this user's email addresses.
  // This handles the case where the Clerk invitation redirect was lost
  // (e.g. during Google OAuth) and the user never landed on /invite/{token}.
  const userEmails = user.emailAddresses.map((e) =>
    e.emailAddress.toLowerCase()
  );

  if (userEmails.length > 0) {
    const { data: pendingInvitations } = await supabase
      .from("portfolio_invitations")
      .select("*")
      .in("email", userEmails)
      .gt("expires_at", new Date().toISOString());

    if (pendingInvitations && pendingInvitations.length > 0) {
      for (const invitation of pendingInvitations) {
        // Check if already a member of this portfolio
        const { data: existingMember } = await supabase
          .from("portfolio_members")
          .select("id")
          .eq("portfolio_id", invitation.portfolio_id)
          .eq("user_id", userId)
          .single();

        if (!existingMember) {
          await supabase.from("portfolio_members").insert({
            portfolio_id: invitation.portfolio_id,
            user_id: userId,
            email: invitation.email,
            role: invitation.role,
            invited_by: invitation.invited_by,
            accepted_at: new Date().toISOString(),
          });
        }

        // Delete the invitation regardless (consumed or already a member)
        await supabase
          .from("portfolio_invitations")
          .delete()
          .eq("id", invitation.id);
      }
    }
  }

  // Get portfolios where user is owner OR member
  const { data: ownedPortfolios, error: ownedError } = await supabase
    .from("portfolios")
    .select("id, name, description, owner_id, created_at")
    .eq("owner_id", userId);

  if (ownedError) {
    return NextResponse.json({ error: ownedError.message }, { status: 500 });
  }

  const { data: memberPortfolios, error: memberError } = await supabase
    .from("portfolio_members")
    .select("portfolio_id, role, portfolios(id, name, description, owner_id, created_at)")
    .eq("user_id", userId)
    .not("accepted_at", "is", null);

  if (memberError) {
    return NextResponse.json({ error: memberError.message }, { status: 500 });
  }

  const portfolios = [
    ...ownedPortfolios.map((p) => ({ ...p, role: "owner" as const })),
    ...memberPortfolios.map((m) => ({
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      ...(m.portfolios as any),
      role: m.role,
    })),
  ];

  return NextResponse.json(portfolios);
}

export async function POST(request: Request) {
  const { userId } = await auth();

  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json();
  const { name, description } = body;

  if (!name?.trim()) {
    return NextResponse.json({ error: "Name is required" }, { status: 400 });
  }

  const { data, error } = await supabase
    .from("portfolios")
    .insert({
      name: name.trim(),
      description: description?.trim() || null,
      owner_id: userId,
    })
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json(data);
}
