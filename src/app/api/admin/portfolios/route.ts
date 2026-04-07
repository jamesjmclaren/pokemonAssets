import { NextResponse } from "next/server";
import { auth, currentUser } from "@clerk/nextjs/server";
import { supabase } from "@/lib/supabase";
import { isAdminEmail } from "@/lib/admin";

export async function GET() {
  const { userId } = await auth();
  const user = await currentUser();

  if (!userId || !user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const userEmail = user.emailAddresses?.[0]?.emailAddress;
  if (!isAdminEmail(userEmail)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  // Get all managed portfolios owned by this admin
  const { data: portfolios, error } = await supabase
    .from("portfolios")
    .select("id, name, description, owner_id, created_at, is_managed")
    .eq("owner_id", userId)
    .eq("is_managed", true)
    .order("created_at", { ascending: false });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  // For each portfolio, fetch members (clients)
  const portfoliosWithMembers = await Promise.all(
    (portfolios || []).map(async (portfolio) => {
      const { data: members } = await supabase
        .from("portfolio_members")
        .select("id, user_id, email, role, accepted_at")
        .eq("portfolio_id", portfolio.id)
        .not("accepted_at", "is", null);

      // Get asset count and total value
      const { data: assets } = await supabase
        .from("assets")
        .select("current_price, status")
        .eq("portfolio_id", portfolio.id)
        .eq("status", "ACTIVE");

      const totalValue = (assets || []).reduce(
        (sum, a) => sum + (a.current_price || 0),
        0
      );

      return {
        ...portfolio,
        members: members || [],
        asset_count: assets?.length || 0,
        total_value: totalValue,
      };
    })
  );

  return NextResponse.json(portfoliosWithMembers);
}
