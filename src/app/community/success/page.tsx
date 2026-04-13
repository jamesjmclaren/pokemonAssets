"use client";

import Link from "next/link";
import { CheckCircle } from "lucide-react";

export default function CommunitySuccess() {
  return (
    <div
      className="min-h-screen flex items-center justify-center px-6"
      style={{ fontFamily: "'Cormorant Garamond', Georgia, serif" }}
    >
      <style>{`@import url('https://fonts.googleapis.com/css2?family=Cormorant+Garamond:ital,wght@0,300;0,400;0,500;0,600;1,300;1,400&display=swap');`}</style>

      <div className="max-w-md w-full text-center">
        <CheckCircle className="w-16 h-16 text-success mx-auto mb-6" />
        <h1 className="text-3xl md:text-4xl font-light text-text-primary mb-4">
          Welcome to the Community
        </h1>
        <p
          className="text-text-secondary text-base leading-relaxed mb-8"
          style={{ fontFamily: "Inter, sans-serif", fontWeight: 300 }}
        >
          Your payment was successful. We&apos;ll be in touch shortly via
          WhatsApp to confirm your membership and get you set up.
        </p>
        <Link
          href="/"
          className="inline-flex items-center gap-2 px-8 py-3 bg-accent text-background text-sm font-medium tracking-widest uppercase hover:bg-accent-hover transition-colors"
          style={{ fontFamily: "Inter, sans-serif", letterSpacing: "0.15em" }}
        >
          Return Home
        </Link>
      </div>
    </div>
  );
}
