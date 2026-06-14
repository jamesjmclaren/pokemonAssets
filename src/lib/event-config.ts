// Which event the booking system targets, chosen by deployment environment.
//
// We share ONE Supabase database between production and preview deployments, so
// to keep production booking data clean we point *preview* deploys at a separate
// "test" event (same schema, its own event_id). Vercel sets VERCEL_ENV
// automatically (production | preview | development); only the Production
// deployment uses the real event. Preview deploys + local dev use the test event.
//
// Server-side only — the client never reads VERCEL_ENV; it receives the chosen
// slug as a prop. The matching test event is seeded by
// supabase-migration-v24-preview-test-event.sql.

export const PROD_EVENT_SLUG = "collectors-exhibition-june-2027";
export const TEST_EVENT_SLUG = "collectors-exhibition-june-2027-test";

/** The live event slug for this deployment environment. */
export function getEventSlug(): string {
  return process.env.VERCEL_ENV === "production" ? PROD_EVENT_SLUG : TEST_EVENT_SLUG;
}
