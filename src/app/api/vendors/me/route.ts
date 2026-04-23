import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { supabase } from "@/lib/supabase";

export async function GET() {
  const { userId } = await auth();
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { data, error } = await supabase
      .from("vendors")
      .select("*")
      .eq("user_id", userId)
      .single();

    if (error && error.code !== "PGRST116") throw error;
    return NextResponse.json(data || null);
  } catch (error) {
    console.error("Vendor me fetch error:", error);
    return NextResponse.json({ error: "Failed to fetch vendor profile" }, { status: 500 });
  }
}
