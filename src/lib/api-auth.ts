import { clerkClient } from "@clerk/nextjs/server";
import type { NextRequest } from "next/server";

export interface ApiAuthResult {
  userId: string;
  keyId: string;
}

function extractBearer(req: NextRequest): string | null {
  const header = req.headers.get("authorization");
  if (!header) return null;
  const match = header.match(/^Bearer\s+(.+)$/i);
  return match ? match[1].trim() : null;
}

/**
 * Authenticates an incoming `/api/v1/*` request via a Clerk API key in the
 * `Authorization: Bearer <key>` header. Returns null when the key is missing,
 * invalid, revoked, or expired.
 */
export async function authenticateApiKey(
  req: NextRequest
): Promise<ApiAuthResult | null> {
  const secret = extractBearer(req);
  if (!secret) return null;

  try {
    const clerk = await clerkClient();
    const apiKey = await clerk.apiKeys.verify(secret);
    if (apiKey.revoked || apiKey.expired) return null;
    if (!apiKey.subject?.startsWith("user_")) return null;
    return { userId: apiKey.subject, keyId: apiKey.id };
  } catch {
    return null;
  }
}
