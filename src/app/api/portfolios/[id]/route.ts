import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { supabase } from "@/lib/supabase";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { userId } = await auth();
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;

  // Verify user has access (owner or member)
  const { data: portfolio } = await supabase
    .from("portfolios")
    .select("*")
    .eq("id", id)
    .single();

  if (!portfolio) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const isOwner = portfolio.owner_id === userId;

  if (!isOwner) {
    const { data: member } = await supabase
      .from("portfolio_members")
      .select("role")
      .eq("portfolio_id", id)
      .eq("user_id", userId)
      .not("accepted_at", "is", null)
      .single();

    if (!member) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
  }

  return NextResponse.json(portfolio);
}
