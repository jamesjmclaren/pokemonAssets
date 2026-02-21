import { auth } from "@clerk/nextjs/server";
import { supabase } from "@/lib/supabase";
import { NextResponse } from "next/server";

export async function GET() {
  const { userId } = await auth();

  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
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
