"use client";

import { useParams } from "next/navigation";
import EventBookingPage from "@/components/event/EventBookingPage";

export default function Page() {
  const { slug } = useParams<{ slug: string }>();
  return <EventBookingPage slug={slug} />;
}
