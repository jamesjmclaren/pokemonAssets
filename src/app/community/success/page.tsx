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

      <div className="max-w-lg w-full text-center">
        <CheckCircle className="w-16 h-16 text-success mx-auto mb-6" />
        <h1 className="text-3xl md:text-4xl font-light text-text-primary mb-4">
          Payment Successful
        </h1>
        <div className="w-16 h-px bg-accent/40 mx-auto mb-6" />
        <p
          className="text-text-secondary text-base leading-relaxed mb-4"
          style={{ fontFamily: "Inter, sans-serif", fontWeight: 300 }}
        >
          Thank you for joining the West Investments Community. Your payment has
          been received and a confirmation email has been sent with your details.
        </p>
        <p
          className="text-text-secondary text-sm leading-relaxed mb-8"
          style={{ fontFamily: "Inter, sans-serif", fontWeight: 300 }}
        >
          We will be in touch shortly via WhatsApp to confirm your membership
          and add you to our private group.
        </p>
        <Link
          href="/"
          className="inline-flex items-center gap-2 px-8 py-3 bg-accent text-background text-sm font-medium tracking-widest uppercase hover:bg-accent-hover transition-colors"
          style={{ fontFamily: "Inter, sans-serif", letterSpacing: "0.15em" }}
        >
          Back to Home
        </Link>
      </div>
    </div>
  );
}
