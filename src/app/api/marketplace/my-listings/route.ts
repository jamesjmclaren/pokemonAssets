import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { supabase } from "@/lib/supabase";

export async function GET() {
  const { userId } = await auth();
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    // Fetch all portfolios owned by this user
    const { data: portfolios } = await supabase
      .from("portfolios")
      .select("id")
      .eq("owner_id", userId);

    if (!portfolios || portfolios.length === 0) return NextResponse.json([]);

    const portfolioIds = portfolios.map((p) => p.id);

    const { data, error } = await supabase
      .from("assets")
      .select("*")
      .in("portfolio_id", portfolioIds)
      .eq("status", "ACTIVE")
      .order("name", { ascending: true });

    if (error) throw error;
    return NextResponse.json(data || []);
  } catch (error) {
    console.error("My listings fetch error:", error);
    return NextResponse.json({ error: "Failed to fetch listings" }, { status: 500 });
  }
}
