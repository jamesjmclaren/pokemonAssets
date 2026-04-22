import { NextResponse } from "next/server";
import { auth, clerkClient } from "@clerk/nextjs/server";

function formatClerkError(err: unknown): { message: string; status: number } {
  // ClerkAPIResponseError shape: { status, clerkError, errors: [{code, message, longMessage}] }
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const e = err as any;
  if (e?.errors && Array.isArray(e.errors) && e.errors.length > 0) {
    const first = e.errors[0];
    const msg = first?.longMessage || first?.message || first?.code || "Clerk error";
    return { message: msg, status: e.status && e.status >= 400 ? e.status : 500 };
  }
  if (typeof e?.message === "string") return { message: e.message, status: 500 };
  return { message: "Unknown error", status: 500 };
}

export async function GET() {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
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
  } catch (err) {
    const { message, status } = formatClerkError(err);
    console.error("[settings/api-keys] list failed:", err);
    return NextResponse.json({ error: message, keys: [] }, { status });
  }
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
    const { message, status } = formatClerkError(err);
    console.error("[settings/api-keys] create failed:", err);
    return NextResponse.json({ error: message }, { status });
  }
}

