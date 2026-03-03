"use client";

import { useUser } from "@clerk/nextjs";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { ArrowRight, TrendingUp, Shield, BarChart3, Gem } from "lucide-react";

export default function LandingPage() {
  const { isSignedIn, isLoaded } = useUser();
  const router = useRouter();
  const [visibleSections, setVisibleSections] = useState<Set<string>>(new Set());
  const sectionRefs = useRef<Map<string, HTMLElement>>(new Map());

  useEffect(() => {
    if (isLoaded && isSignedIn) {
      router.replace("/dashboard");
    }
  }, [isLoaded, isSignedIn, router]);

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            setVisibleSections((prev) => new Set(prev).add(entry.target.id));
          }
        });
      },
      { threshold: 0.15 }
    );

    sectionRefs.current.forEach((el) => observer.observe(el));
    return () => observer.disconnect();
  }, []);

  const setRef = (id: string) => (el: HTMLElement | null) => {
    if (el) sectionRefs.current.set(id, el);
  };

  const isVisible = (id: string) => visibleSections.has(id);

  if (!isLoaded || isSignedIn) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-pulse text-text-muted">Loading...</div>
      </div>
    );
  }

  return (
    <div className="landing-grain">
      {/* Navigation */}
      <nav className="fixed top-0 left-0 right-0 z-50 landing-fade-in" style={{ animationDelay: "0.2s" }}>
        <div className="max-w-7xl mx-auto px-6 md:px-12 py-6 flex items-center justify-between">
          <img src="/logo.png" alt="West Investments" className="h-10 md:h-12 object-contain" />
          <div className="flex items-center gap-8">
            <a href="#approach" className="hidden md:block text-sm text-text-secondary hover:text-text-primary tracking-wide uppercase" style={{ fontFamily: "Inter, sans-serif", letterSpacing: "0.15em", fontSize: "11px" }}>
              Our Approach
            </a>
            <a href="#strategies" className="hidden md:block text-sm text-text-secondary hover:text-text-primary tracking-wide uppercase" style={{ fontFamily: "Inter, sans-serif", letterSpacing: "0.15em", fontSize: "11px" }}>
              Strategies
            </a>
            <button
              onClick={() => router.push("/sign-in")}
              className="text-xs tracking-widest uppercase border border-accent/40 text-accent px-6 py-2.5 hover:bg-accent hover:text-background cursor-pointer"
              style={{ fontFamily: "Inter, sans-serif", letterSpacing: "0.2em" }}
            >
              Sign In
            </button>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="min-h-screen flex flex-col justify-center relative overflow-hidden">
        {/* Subtle radial glow */}
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] rounded-full" style={{ background: "radial-gradient(circle, rgba(212,175,55,0.04) 0%, transparent 70%)" }} />
        </div>

        <div className="max-w-7xl mx-auto px-6 md:px-12 w-full relative">
          {/* Overline */}
          <p
            className="text-text-muted tracking-widest uppercase mb-8 landing-fade-up"
            style={{ fontFamily: "Inter, sans-serif", fontSize: "11px", letterSpacing: "0.3em", animationDelay: "0.4s" }}
          >
            West Investments Ltd
          </p>

          {/* Main heading */}
          <h1
            className="landing-fade-up"
            style={{
              fontFamily: "'Playfair Display', serif",
              fontSize: "clamp(3.5rem, 10vw, 9rem)",
              fontWeight: 400,
              lineHeight: 0.95,
              letterSpacing: "-0.02em",
              color: "var(--color-text-primary)",
              animationDelay: "0.6s",
            }}
          >
            Portfolios
          </h1>

          {/* Gold divider */}
          <div
            className="h-px bg-accent/50 mt-10 mb-8 landing-line-reveal"
            style={{ maxWidth: "120px", animationDelay: "1s" }}
          />

          {/* Subheading */}
          <p
            className="max-w-lg text-text-secondary leading-relaxed landing-fade-up"
            style={{ fontFamily: "'Playfair Display', serif", fontSize: "1.15rem", fontWeight: 400, animationDelay: "1.1s" }}
          >
            A disciplined approach to alternative investments — preserving and growing capital through curated collectible portfolios.
          </p>

          {/* CTA */}
          <button
            onClick={() => router.push("/sign-in")}
            className="group mt-12 inline-flex items-center gap-3 landing-fade-up cursor-pointer"
            style={{ animationDelay: "1.3s" }}
          >
            <span
              className="text-accent tracking-widest uppercase hover:text-accent-hover"
              style={{ fontFamily: "Inter, sans-serif", fontSize: "12px", letterSpacing: "0.25em" }}
            >
              Enter Dashboard
            </span>
            <ArrowRight className="w-4 h-4 text-accent group-hover:translate-x-1 transition-transform" />
          </button>
        </div>

        {/* Scroll indicator */}
        <div className="absolute bottom-12 left-1/2 -translate-x-1/2 landing-fade-in" style={{ animationDelay: "2s" }}>
          <div className="w-px h-16 bg-gradient-to-b from-transparent via-accent/30 to-transparent" />
        </div>
      </section>

      {/* Our Approach Section */}
      <section
        id="approach"
        ref={setRef("approach")}
        className="py-32 md:py-40 border-t border-border/30"
      >
        <div className="max-w-7xl mx-auto px-6 md:px-12">
          <div className="grid md:grid-cols-2 gap-16 md:gap-24">
            <div>
              <p
                className={`text-text-muted tracking-widest uppercase mb-6 ${isVisible("approach") ? "landing-fade-up" : "opacity-0"}`}
                style={{ fontFamily: "Inter, sans-serif", fontSize: "11px", letterSpacing: "0.3em", animationDelay: "0.1s" }}
              >
                Our Approach
              </p>
              <h2
                className={`${isVisible("approach") ? "landing-fade-up" : "opacity-0"}`}
                style={{
                  fontFamily: "'Playfair Display', serif",
                  fontSize: "clamp(2rem, 4vw, 3.5rem)",
                  fontWeight: 400,
                  lineHeight: 1.1,
                  color: "var(--color-text-primary)",
                  animationDelay: "0.2s",
                }}
              >
                Long-term value
                <br />
                <span className="text-accent">in alternatives</span>
              </h2>
            </div>
            <div className={`flex flex-col justify-center ${isVisible("approach") ? "landing-fade-up" : "opacity-0"}`} style={{ animationDelay: "0.4s" }}>
              <p className="text-text-secondary leading-relaxed text-base" style={{ fontFamily: "'Playfair Display', serif" }}>
                We take a patient, research-driven approach to alternative asset investing. From rare collectibles to emerging market categories, our platform empowers investors to build, track, and optimise portfolios with institutional-grade tools.
              </p>
              <p className="text-text-muted leading-relaxed text-base mt-6" style={{ fontFamily: "'Playfair Display', serif" }}>
                Our commitment is simple — provide the infrastructure and insight needed to make informed decisions in markets where traditional data is scarce.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Strategies / Features Section */}
      <section
        id="strategies"
        ref={setRef("strategies")}
        className="py-32 md:py-40 border-t border-border/30"
      >
        <div className="max-w-7xl mx-auto px-6 md:px-12">
          <p
            className={`text-text-muted tracking-widest uppercase mb-6 ${isVisible("strategies") ? "landing-fade-up" : "opacity-0"}`}
            style={{ fontFamily: "Inter, sans-serif", fontSize: "11px", letterSpacing: "0.3em", animationDelay: "0.1s" }}
          >
            Investment Strategies
          </p>
          <h2
            className={`mb-20 ${isVisible("strategies") ? "landing-fade-up" : "opacity-0"}`}
            style={{
              fontFamily: "'Playfair Display', serif",
              fontSize: "clamp(2rem, 4vw, 3.5rem)",
              fontWeight: 400,
              lineHeight: 1.1,
              color: "var(--color-text-primary)",
              animationDelay: "0.2s",
            }}
          >
            Built for the
            <br />
            <span className="text-accent">discerning investor</span>
          </h2>

          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-px bg-border/30">
            {[
              {
                icon: TrendingUp,
                title: "Real-Time Pricing",
                description: "Live market data across alternative asset classes, updated continuously from leading pricing sources.",
                delay: "0.3s",
              },
              {
                icon: BarChart3,
                title: "Portfolio Analytics",
                description: "Comprehensive P&L tracking, performance charts, and detailed breakdowns across your holdings.",
                delay: "0.45s",
              },
              {
                icon: Shield,
                title: "Team Collaboration",
                description: "Role-based access controls and team management for institutional-grade portfolio oversight.",
                delay: "0.6s",
              },
              {
                icon: Gem,
                title: "Curated Collections",
                description: "Organise assets into thematic collections with provenance tracking and evidence management.",
                delay: "0.75s",
              },
            ].map(({ icon: Icon, title, description, delay }) => (
              <div
                key={title}
                className={`bg-surface/50 p-8 md:p-10 group hover:bg-surface-hover/50 ${isVisible("strategies") ? "landing-fade-up" : "opacity-0"}`}
                style={{ animationDelay: delay }}
              >
                <Icon className="w-5 h-5 text-accent mb-6" strokeWidth={1.5} />
                <h3
                  className="text-text-primary mb-3"
                  style={{ fontFamily: "'Playfair Display', serif", fontSize: "1.15rem", fontWeight: 500 }}
                >
                  {title}
                </h3>
                <p className="text-text-muted text-sm leading-relaxed" style={{ fontFamily: "Inter, sans-serif" }}>
                  {description}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Values / Philosophy Section */}
      <section
        id="values"
        ref={setRef("values")}
        className="py-32 md:py-40 border-t border-border/30 relative"
      >
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute bottom-0 right-0 w-[600px] h-[600px] rounded-full" style={{ background: "radial-gradient(circle, rgba(212,175,55,0.03) 0%, transparent 70%)" }} />
        </div>
        <div className="max-w-7xl mx-auto px-6 md:px-12 relative">
          <div className="max-w-2xl mx-auto text-center">
            <p
              className={`text-text-muted tracking-widest uppercase mb-6 ${isVisible("values") ? "landing-fade-up" : "opacity-0"}`}
              style={{ fontFamily: "Inter, sans-serif", fontSize: "11px", letterSpacing: "0.3em", animationDelay: "0.1s" }}
            >
              Our Philosophy
            </p>
            <h2
              className={`mb-8 ${isVisible("values") ? "landing-fade-up" : "opacity-0"}`}
              style={{
                fontFamily: "'Playfair Display', serif",
                fontSize: "clamp(1.75rem, 3.5vw, 2.75rem)",
                fontWeight: 400,
                lineHeight: 1.2,
                fontStyle: "italic",
                color: "var(--color-text-primary)",
                animationDelay: "0.2s",
              }}
            >
              &ldquo;We believe alternative assets deserve the same rigour and transparency as any institutional portfolio.&rdquo;
            </h2>
            <div
              className={`h-px bg-accent/30 mx-auto mb-8 ${isVisible("values") ? "landing-line-reveal" : "opacity-0"}`}
              style={{ maxWidth: "60px", animationDelay: "0.5s" }}
            />
            <p
              className={`text-text-muted text-sm ${isVisible("values") ? "landing-fade-up" : "opacity-0"}`}
              style={{ fontFamily: "Inter, sans-serif", letterSpacing: "0.1em", animationDelay: "0.6s" }}
            >
              West Investments Ltd
            </p>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section
        id="cta"
        ref={setRef("cta")}
        className="py-32 md:py-40 border-t border-border/30"
      >
        <div className="max-w-7xl mx-auto px-6 md:px-12 text-center">
          <h2
            className={`mb-8 ${isVisible("cta") ? "landing-fade-up" : "opacity-0"}`}
            style={{
              fontFamily: "'Playfair Display', serif",
              fontSize: "clamp(2rem, 4vw, 3.5rem)",
              fontWeight: 400,
              lineHeight: 1.1,
              color: "var(--color-text-primary)",
              animationDelay: "0.1s",
            }}
          >
            Ready to begin?
          </h2>
          <p
            className={`text-text-secondary max-w-md mx-auto mb-12 ${isVisible("cta") ? "landing-fade-up" : "opacity-0"}`}
            style={{ fontFamily: "'Playfair Display', serif", fontSize: "1.05rem", animationDelay: "0.25s" }}
          >
            Access your portfolios and start tracking your alternative investments with precision.
          </p>
          <button
            onClick={() => router.push("/sign-in")}
            className={`inline-flex items-center gap-3 border border-accent text-accent px-10 py-4 hover:bg-accent hover:text-background tracking-widest uppercase cursor-pointer ${isVisible("cta") ? "landing-fade-up" : "opacity-0"}`}
            style={{ fontFamily: "Inter, sans-serif", fontSize: "12px", letterSpacing: "0.25em", animationDelay: "0.4s" }}
          >
            Enter Dashboard
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-border/30 py-12">
        <div className="max-w-7xl mx-auto px-6 md:px-12 flex flex-col md:flex-row items-center justify-between gap-6">
          <img src="/logo.png" alt="West Investments" className="h-8 object-contain opacity-50" />
          <p className="text-text-muted text-xs tracking-wide" style={{ fontFamily: "Inter, sans-serif", letterSpacing: "0.1em" }}>
            &copy; {new Date().getFullYear()} West Investments Ltd. All rights reserved.
          </p>
        </div>
      </footer>
    </div>
  );
}
