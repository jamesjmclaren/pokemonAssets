import { NextResponse } from "next/server";
import { auth, clerkClient } from "@clerk/nextjs/server";

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;

  const clerk = await clerkClient();

  // Verify the key belongs to this user before revoking.
  let apiKey;
  try {
    apiKey = await clerk.apiKeys.get(id);
  } catch {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  if (apiKey.subject !== userId) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  try {
    await clerk.apiKeys.revoke({ apiKeyId: id, revocationReason: "user_revoked" });
    return NextResponse.json({ revoked: true });
  } catch (err) {
    console.error("[settings/api-keys] revoke failed:", err);
    return NextResponse.json({ error: "Failed to revoke" }, { status: 500 });
  }
}
