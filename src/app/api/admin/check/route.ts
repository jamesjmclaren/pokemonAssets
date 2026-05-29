import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { isCurrentUserAdmin } from "@/lib/admin";

/** Returns whether the authenticated user is a platform admin. */
export async function GET() {
  const { userId } = await auth();
  if (!userId) {
    return NextResponse.json({ isAdmin: false }, { status: 401 });
  }
  const isAdmin = await isCurrentUserAdmin();
  return NextResponse.json({ isAdmin });
}
