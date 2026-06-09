import EventBookingPage from "@/components/event/EventBookingPage";

// The Collectors Exhibition lives at /event (singular). The generalised
// /events/[slug] route renders the same component for any future event.
export const dynamic = "force-dynamic";

export default function Page() {
  return <EventBookingPage slug="collectors-exhibition-june-2027" />;
}
