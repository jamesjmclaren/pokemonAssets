import { redirect } from "next/navigation";

// /events → the current event lives at /event
export default function EventsIndexPage() {
  redirect("/event");
}
