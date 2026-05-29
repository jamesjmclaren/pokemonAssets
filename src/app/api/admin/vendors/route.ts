import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin as supabase } from "@/lib/supabase-admin";
import { isCurrentUserAdmin as assertAdmin } from "@/lib/admin";

export async function GET() {
  if (!(await assertAdmin())) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  try {
    const { data: vendors, error } = await supabase
      .from("vendors")
      .select("*")
      .order("created_at", { ascending: false });

    if (error) throw error;
    return NextResponse.json(vendors ?? []);
  } catch (err) {
    console.error("Admin vendors fetch error:", err);
    return NextResponse.json({ error: "Failed to fetch vendors" }, { status: 500 });
  }
}

export async function PATCH(request: NextRequest) {
  if (!(await assertAdmin())) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  try {
    const { id, is_verified } = await request.json();
    if (!id || typeof is_verified !== "boolean") {
      return NextResponse.json({ error: "Invalid payload" }, { status: 400 });
    }

    const { data, error } = await supabase
      .from("vendors")
      .update({ is_verified })
      .eq("id", id)
      .select()
      .single();

    if (error) throw error;
    return NextResponse.json(data);
  } catch (err) {
    console.error("Admin vendor verify error:", err);
    return NextResponse.json({ error: "Failed to update vendor" }, { status: 500 });
  }
}
