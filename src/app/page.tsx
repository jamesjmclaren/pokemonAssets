"use client";

import Link from "next/link";
import { useUser } from "@clerk/nextjs";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { ArrowRight, Shield, TrendingUp, Users } from "lucide-react";

export default function WelcomePage() {
  const { isSignedIn, isLoaded } = useUser();
  const router = useRouter();

  useEffect(() => {
    if (isLoaded && isSignedIn) {
      router.replace("/dashboard");
    }
  }, [isLoaded, isSignedIn, router]);

  if (!isLoaded || isSignedIn) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-pulse text-text-muted">Loading...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-4 -ml-0 lg:-ml-64">
      {/* Hero */}
      <div className="text-center max-w-2xl mx-auto">
        <div className="mb-8">
          <img
            src="/logo.png"
            alt="West Investments Ltd"
            className="h-24 md:h-32 object-contain mx-auto mb-6"
          />
          <h1 className="text-3xl md:text-5xl font-extrabold text-text-primary leading-tight">
            Alternative Assets
            <br />
            <span className="text-accent">Portfolio Tracker</span>
          </h1>
          <p className="text-text-secondary mt-4 text-base md:text-lg max-w-md mx-auto">
            Track, manage, and grow your collectible investments with
            real-time pricing and team collaboration.
          </p>
        </div>

        {/* CTA */}
        <div className="flex flex-col sm:flex-row gap-3 justify-center mb-16">
          <Link
            href="/sign-in"
            className="inline-flex items-center justify-center gap-2 px-8 py-4 bg-accent hover:bg-accent-hover text-black font-bold rounded-xl text-base"
          >
            Sign In
            <ArrowRight className="w-5 h-5" />
          </Link>
          <Link
            href="/sign-up"
            className="inline-flex items-center justify-center gap-2 px-8 py-4 bg-surface border border-border hover:border-border-hover text-text-primary font-semibold rounded-xl text-base"
          >
            Create Account
          </Link>
        </div>

        {/* Feature highlights */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 max-w-xl md:max-w-3xl mx-auto">
          <div className="bg-surface border border-border rounded-2xl p-5 text-left">
            <div className="w-10 h-10 rounded-xl bg-accent/10 flex items-center justify-center mb-3">
              <TrendingUp className="w-5 h-5 text-accent" />
            </div>
            <h3 className="text-sm font-semibold text-text-primary mb-1">
              Real-Time Pricing
            </h3>
            <p className="text-xs text-text-muted">
              Automatic price updates from JustTCG and PokemonPriceTracker
              with daily snapshots.
            </p>
          </div>
          <div className="bg-surface border border-border rounded-2xl p-5 text-left">
            <div className="w-10 h-10 rounded-xl bg-accent/10 flex items-center justify-center mb-3">
              <Users className="w-5 h-5 text-accent" />
            </div>
            <h3 className="text-sm font-semibold text-text-primary mb-1">
              Team Collaboration
            </h3>
            <p className="text-xs text-text-muted">
              Invite team members as admins or viewers with role-based
              access controls.
            </p>
          </div>
          <div className="bg-surface border border-border rounded-2xl p-5 text-left">
            <div className="w-10 h-10 rounded-xl bg-accent/10 flex items-center justify-center mb-3">
              <Shield className="w-5 h-5 text-accent" />
            </div>
            <h3 className="text-sm font-semibold text-text-primary mb-1">
              Portfolio Management
            </h3>
            <p className="text-xs text-text-muted">
              Multiple portfolios with detailed P&L tracking, charts, and
              price history.
            </p>
          </div>
        </div>
      </div>

      {/* Footer */}
      <div className="mt-16 text-center">
        <p className="text-xs text-text-muted">
          West Investments Ltd &middot; Powered by JustTCG &amp; PokemonPriceTracker
        </p>
      </div>
    </div>
  );
}
