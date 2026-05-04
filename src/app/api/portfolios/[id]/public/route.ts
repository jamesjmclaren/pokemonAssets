import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { supabase } from "@/lib/supabase";

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { userId } = await auth();
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const body = await request.json();
  const { is_public } = body;

  if (typeof is_public !== "boolean") {
    return NextResponse.json({ error: "is_public must be a boolean" }, { status: 400 });
  }

  const { data: portfolio } = await supabase
    .from("portfolios")
    .select("id, owner_id, public_token")
    .eq("id", id)
    .single();

  if (!portfolio) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  if (portfolio.owner_id !== userId) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const updates: Record<string, unknown> = { is_public };

  if (is_public && !portfolio.public_token) {
    updates.public_token = crypto.randomUUID();
  }

  const { data, error } = await supabase
    .from("portfolios")
    .update(updates)
    .eq("id", id)
    .select("is_public, public_token")
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json(data);
}
