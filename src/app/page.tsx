"use client";

import { useUser, SignIn } from "@clerk/nextjs";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { TrendingUp, Users, Shield } from "lucide-react";

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
    <div className="min-h-screen flex flex-col lg:flex-row items-center justify-center px-4 gap-12 lg:gap-20 -ml-0 lg:-ml-64 py-12">
      {/* Left: Hero */}
      <div className="text-center lg:text-left max-w-sm">
        <img
          src="/logo.png"
          alt="West Investments Ltd"
          className="h-20 md:h-24 object-contain mx-auto lg:mx-0 mb-6"
        />
        <h1 className="text-3xl md:text-4xl font-extrabold text-text-primary leading-tight">
          Alternative Assets
          <br />
          <span className="text-accent">Portfolio Tracker</span>
        </h1>
        <p className="text-text-secondary mt-4 text-base max-w-sm mx-auto lg:mx-0">
          Track, manage, and grow your collectible investments with real-time
          pricing and team collaboration.
        </p>

        <div className="hidden lg:flex flex-col gap-3 mt-8">
          <div className="flex items-center gap-3">
            <TrendingUp className="w-4 h-4 text-accent shrink-0" />
            <span className="text-sm text-text-secondary">
              Real-time pricing from JustTCG &amp; PokemonPriceTracker
            </span>
          </div>
          <div className="flex items-center gap-3">
            <Users className="w-4 h-4 text-accent shrink-0" />
            <span className="text-sm text-text-secondary">
              Team collaboration with role-based access
            </span>
          </div>
          <div className="flex items-center gap-3">
            <Shield className="w-4 h-4 text-accent shrink-0" />
            <span className="text-sm text-text-secondary">
              Multiple portfolios with P&amp;L tracking and charts
            </span>
          </div>
        </div>

        <p className="mt-10 text-xs text-text-muted hidden lg:block">
          West Investments Ltd &middot; Powered by JustTCG &amp; PokemonPriceTracker
        </p>
      </div>

      {/* Right: Sign In form */}
      <div className="flex-shrink-0">
        <SignIn
          forceRedirectUrl="/onboarding"
          signUpForceRedirectUrl="/onboarding"
        />
      </div>

      <p className="lg:hidden text-xs text-text-muted text-center">
        West Investments Ltd &middot; Powered by JustTCG &amp; PokemonPriceTracker
      </p>
    </div>
  );
}
