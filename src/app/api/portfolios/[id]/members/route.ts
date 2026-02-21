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

  // Check if user has access to this portfolio
  const hasAccess = await checkPortfolioAccess(portfolioId, userId);
  if (!hasAccess) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  // Get portfolio owner
  const { data: portfolio } = await supabase
    .from("portfolios")
    .select("owner_id")
    .eq("id", portfolioId)
    .single();

  // Get all members
  const { data: members, error } = await supabase
    .from("portfolio_members")
    .select("*")
    .eq("portfolio_id", portfolioId)
    .not("accepted_at", "is", null);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({
    owner_id: portfolio?.owner_id,
    members: members || [],
  });
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

  const { searchParams } = new URL(request.url);
  const memberId = searchParams.get("memberId");

  if (!memberId) {
    return NextResponse.json({ error: "Member ID required" }, { status: 400 });
  }

  // Check if user is owner or admin
  const hasAccess = await checkAdminAccess(portfolioId, userId);
  if (!hasAccess) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { error } = await supabase
    .from("portfolio_members")
    .delete()
    .eq("id", memberId)
    .eq("portfolio_id", portfolioId);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}

async function checkPortfolioAccess(
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

  // Check if member
  const { data: member } = await supabase
    .from("portfolio_members")
    .select("id")
    .eq("portfolio_id", portfolioId)
    .eq("user_id", userId)
    .not("accepted_at", "is", null)
    .single();

  return !!member;
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
