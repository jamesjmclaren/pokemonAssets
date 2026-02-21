import { auth } from "@clerk/nextjs/server";
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

  // Check if user is owner or admin
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
  const { id: portfolioId } = await params;

  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Check if user is owner or admin
  const hasAccess = await checkAdminAccess(portfolioId, userId);
  if (!hasAccess) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = await request.json();
  const { email, role = "read_only" } = body;

  if (!email?.trim()) {
    return NextResponse.json({ error: "Email is required" }, { status: 400 });
  }

  if (!["admin", "read_only"].includes(role)) {
    return NextResponse.json({ error: "Invalid role" }, { status: 400 });
  }

  // Check if invitation already exists
  const { data: existing } = await supabase
    .from("portfolio_invitations")
    .select("id")
    .eq("portfolio_id", portfolioId)
    .eq("email", email.toLowerCase())
    .single();

  if (existing) {
    return NextResponse.json(
      { error: "Invitation already sent to this email" },
      { status: 400 }
    );
  }

  const { data, error } = await supabase
    .from("portfolio_invitations")
    .insert({
      portfolio_id: portfolioId,
      email: email.toLowerCase().trim(),
      role,
      invited_by: userId,
    })
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json(data);
}

async function checkAdminAccess(
  portfolioId: string,
  userId: string
): Promise<boolean> {
  // Check if owner
  const { data: portfolio } = await supabase
    .from("portfolios")
    .select("owner_id")
    .eq("id", portfolioId)
    .single();

  if (portfolio?.owner_id === userId) return true;

  // Check if admin member
  const { data: member } = await supabase
    .from("portfolio_members")
    .select("role")
    .eq("portfolio_id", portfolioId)
    .eq("user_id", userId)
    .single();

  return member?.role === "admin";
}
