import EventBookingPage from "@/components/event/EventBookingPage";
import { getEventSlug } from "@/lib/event-config";

// The Collectors Exhibition lives at /event (singular). The generalised
// /events/[slug] route renders the same component for any future event.
// Production books the real event; preview deploys book the test event
// (same shared database) — see src/lib/event-config.ts.
export const dynamic = "force-dynamic";

export default function Page() {
  return <EventBookingPage slug={getEventSlug()} />;
}
