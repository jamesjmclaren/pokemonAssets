import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { TABLE_TYPE_BY_LABEL } from "./event-floor-plan";

export const HOLD_MINUTES = 15;
export const CHECKOUT_HOLD_MINUTES = 20; // a little longer to survive the Stripe redirect

export function getSupabaseAdmin(): SupabaseClient {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}

export function isValidLabel(label: unknown): label is string {
  return typeof label === "string" && label in TABLE_TYPE_BY_LABEL;
}

export function isValidToken(token: unknown): token is string {
  return typeof token === "string" && token.length >= 8 && token.length <= 100;
}

export async function getEvent(supabase: SupabaseClient, slug: string) {
  const { data } = await supabase
    .from("events")
    .select("id, name, venue, event_days, is_active")
    .eq("slug", slug)
    .single();
  return data;
}

/** Delete every expired hold for an event so its unique-index slots are free. */
export async function purgeExpiredHolds(supabase: SupabaseClient, eventId: string) {
  await supabase
    .from("event_table_holds")
    .delete()
    .eq("event_id", eventId)
    .lt("expires_at", new Date().toISOString());
}

/** Earliest expiry among a token's still-active holds, or null if it has none. */
export async function tokenDeadline(
  supabase: SupabaseClient,
  eventId: string,
  token: string
): Promise<string | null> {
  const { data } = await supabase
    .from("event_table_holds")
    .select("expires_at")
    .eq("event_id", eventId)
    .eq("hold_token", token)
    .gt("expires_at", new Date().toISOString())
    .order("expires_at", { ascending: true })
    .limit(1);
  return data && data.length > 0 ? data[0].expires_at : null;
}

/** Labels that are unavailable to everyone else: paid bookings + live holds. */
export async function getUnavailable(supabase: SupabaseClient, eventId: string) {
  const nowIso = new Date().toISOString();
  const [{ data: paid }, { data: holds }] = await Promise.all([
    supabase
      .from("event_bookings_v2")
      .select("event_day, table_label")
      .eq("event_id", eventId)
      .eq("payment_status", "paid"),
    supabase
      .from("event_table_holds")
      .select("event_day, table_label, hold_token")
      .eq("event_id", eventId)
      .gt("expires_at", nowIso),
  ]);
  return { paid: paid ?? [], holds: holds ?? [] };
}
