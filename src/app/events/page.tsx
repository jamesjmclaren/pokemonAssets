import { redirect } from "next/navigation";

// /events → current active event
// Update this slug when a new event is added
export default function EventsIndexPage() {
  redirect("/events/collectors-exhibition-june-2027");
}
