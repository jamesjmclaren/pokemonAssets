import { NextResponse } from "next/server";
import { auth, clerkClient } from "@clerk/nextjs/server";

export async function GET() {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const clerk = await clerkClient();
  const { data } = await clerk.apiKeys.list({ subject: userId });

  const keys = data.map((k) => ({
    id: k.id,
    name: k.name,
    description: k.description,
    revoked: k.revoked,
    expired: k.expired,
    expiration: k.expiration,
    lastUsedAt: k.lastUsedAt,
    createdAt: k.createdAt,
  }));

  return NextResponse.json({ keys });
}

export async function POST(request: Request) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = (await request.json().catch(() => ({}))) as {
    name?: string;
    description?: string;
  };

  if (!body.name?.trim()) {
    return NextResponse.json({ error: "Name is required" }, { status: 400 });
  }

  const clerk = await clerkClient();
  try {
    const apiKey = await clerk.apiKeys.create({
      subject: userId,
      name: body.name.trim().slice(0, 60),
      description: body.description?.trim().slice(0, 200) || null,
      createdBy: userId,
    });

    return NextResponse.json({
      id: apiKey.id,
      name: apiKey.name,
      description: apiKey.description,
      createdAt: apiKey.createdAt,
      secret: apiKey.secret,
    });
  } catch (err) {
    console.error("[settings/api-keys] create failed:", err);
    return NextResponse.json({ error: "Failed to create API key" }, { status: 500 });
  }
}
