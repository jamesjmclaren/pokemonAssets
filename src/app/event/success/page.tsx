"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Suspense } from "react";
import { CheckCircle } from "lucide-react";

function SuccessContent() {
  const params = useSearchParams();
  const sessionId = params.get("session_id");
  const ref = sessionId ? sessionId.slice(-8).toUpperCase() : "—";

  return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center px-6 text-center" style={{ fontFamily: "'Cormorant Garamond', Georgia, serif" }}>
      <style>{`@import url('https://fonts.googleapis.com/css2?family=Cormorant+Garamond:ital,wght@0,300;0,400;0,500;0,600;1,300;1,400&display=swap');`}</style>

      <CheckCircle className="w-16 h-16 text-accent mb-8" />

      <p className="text-accent text-xs uppercase tracking-[0.35em] mb-4" style={{ fontFamily: "Inter, sans-serif" }}>
        Booking Confirmed
      </p>
      <h1 className="text-4xl md:text-6xl font-light text-text-primary leading-tight mb-6">
        You&apos;re<br /><em className="text-accent italic">booked in</em>
      </h1>

      <div className="w-24 h-px bg-accent/40 mb-8" />

      <p className="text-text-secondary text-lg leading-relaxed max-w-md mb-4" style={{ fontFamily: "Inter, sans-serif", fontWeight: 300 }}>
        Thank you for booking your table at the West Investments TCG Card Show. A confirmation email has been sent to you.
      </p>

      <p className="text-text-muted text-sm mb-10" style={{ fontFamily: "Inter, sans-serif" }}>
        Booking reference: <span className="text-text-primary font-medium">{ref}</span>
      </p>

      <div className="flex flex-col sm:flex-row gap-4">
        <Link
          href="/event"
          className="inline-flex items-center justify-center px-8 py-3 border border-accent/40 text-accent text-sm tracking-widest uppercase hover:bg-accent hover:text-background transition-all"
          style={{ fontFamily: "Inter, sans-serif", letterSpacing: "0.15em" }}
        >
          Back to Event
        </Link>
        <Link
          href="/"
          className="inline-flex items-center justify-center px-8 py-3 border border-border text-text-secondary text-sm tracking-widest uppercase hover:border-accent/30 hover:text-text-primary transition-all"
          style={{ fontFamily: "Inter, sans-serif", letterSpacing: "0.15em" }}
        >
          Home
        </Link>
      </div>

      <p className="text-text-muted text-xs mt-12" style={{ fontFamily: "Inter, sans-serif" }}>
        Questions? Contact{" "}
        <a href="mailto:info@west.investments" className="text-accent underline">
          info@west.investments
        </a>
      </p>
    </div>
  );
}

export default function EventSuccessPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="animate-pulse text-text-muted">Loading...</div>
      </div>
    }>
      <SuccessContent />
    </Suspense>
  );
}
