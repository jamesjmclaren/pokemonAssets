import { currentUser } from "@clerk/nextjs/server";

/**
 * Server-only admin authorisation helpers.
 *
 * The admin email list is sourced from the ADMIN_EMAILS env var (comma
 * separated). It falls back to the historical hardcoded list so existing
 * deployments keep working if the env var is not yet set. This module must
 * never be imported into client components — it would leak the admin list
 * into the browser bundle.
 */

const FALLBACK_ADMIN_EMAILS = [
  "jamesjmclaren@gmail.com",
  "k1west.cityboy@gmail.com",
];

export function getAdminEmails(): string[] {
  const fromEnv = (process.env.ADMIN_EMAILS || "")
    .split(",")
    .map((e) => e.trim().toLowerCase())
    .filter(Boolean);
  return fromEnv.length > 0 ? fromEnv : FALLBACK_ADMIN_EMAILS.map((e) => e.toLowerCase());
}

export function isAdminEmail(email: string | null | undefined): boolean {
  if (!email) return false;
  return getAdminEmails().includes(email.toLowerCase());
}

/** Returns true if the currently authenticated Clerk user is an admin. */
export async function isCurrentUserAdmin(): Promise<boolean> {
  const user = await currentUser();
  if (!user) return false;
  return isAdminEmail(user.primaryEmailAddress?.emailAddress);
}
