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
            <a href="#about" className="hidden md:block text-sm text-text-secondary hover:text-text-primary tracking-wide uppercase" style={{ fontFamily: "Inter, sans-serif", letterSpacing: "0.15em", fontSize: "11px" }}>
              About
            </a>
            <a href="#what-we-do" className="hidden md:block text-sm text-text-secondary hover:text-text-primary tracking-wide uppercase" style={{ fontFamily: "Inter, sans-serif", letterSpacing: "0.15em", fontSize: "11px" }}>
              What We Do
            </a>
            <button
              onClick={() => router.push("/sign-in")}
              className="hidden md:block text-sm text-text-secondary hover:text-text-primary tracking-wide uppercase cursor-pointer bg-transparent border-none"
              style={{ fontFamily: "Inter, sans-serif", letterSpacing: "0.15em", fontSize: "11px" }}
            >
              Portfolios
            </button>
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
            Alternative Investments
          </p>

          {/* Main heading */}
          <h1
            className="landing-fade-up"
            style={{
              fontFamily: "'Playfair Display', serif",
              fontSize: "clamp(3rem, 8vw, 7.5rem)",
              fontWeight: 400,
              lineHeight: 0.95,
              letterSpacing: "-0.02em",
              color: "var(--color-text-primary)",
              animationDelay: "0.6s",
            }}
          >
            Preserving &amp;
            <br />
            Growing <span className="text-accent">Capital</span>
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
            West Investments is a specialist alternative investment firm focused on identifying, acquiring, and managing high-conviction positions across non-traditional asset classes.
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
              View Portfolios
            </span>
            <ArrowRight className="w-4 h-4 text-accent group-hover:translate-x-1 transition-transform" />
          </button>
        </div>

        {/* Scroll indicator */}
        <div className="absolute bottom-12 left-1/2 -translate-x-1/2 landing-fade-in" style={{ animationDelay: "2s" }}>
          <div className="w-px h-16 bg-gradient-to-b from-transparent via-accent/30 to-transparent" />
        </div>
      </section>

      {/* About Section */}
      <section
        id="about"
        ref={setRef("about")}
        className="py-32 md:py-40 border-t border-border/30"
      >
        <div className="max-w-7xl mx-auto px-6 md:px-12">
          <div className="grid md:grid-cols-2 gap-16 md:gap-24">
            <div>
              <p
                className={`text-text-muted tracking-widest uppercase mb-6 ${isVisible("about") ? "landing-fade-up" : "opacity-0"}`}
                style={{ fontFamily: "Inter, sans-serif", fontSize: "11px", letterSpacing: "0.3em", animationDelay: "0.1s" }}
              >
                The Company
              </p>
              <h2
                className={`${isVisible("about") ? "landing-fade-up" : "opacity-0"}`}
                style={{
                  fontFamily: "'Playfair Display', serif",
                  fontSize: "clamp(2rem, 4vw, 3.5rem)",
                  fontWeight: 400,
                  lineHeight: 1.1,
                  color: "var(--color-text-primary)",
                  animationDelay: "0.2s",
                }}
              >
                Built on conviction,
                <br />
                <span className="text-accent">driven by data</span>
              </h2>
            </div>
            <div className={`flex flex-col justify-center ${isVisible("about") ? "landing-fade-up" : "opacity-0"}`} style={{ animationDelay: "0.4s" }}>
              <p className="text-text-secondary leading-relaxed text-base" style={{ fontFamily: "'Playfair Display', serif" }}>
                West Investments was founded with a singular belief: that alternative assets — from rare collectibles to emerging tangible markets — represent one of the most compelling opportunities for long-term capital growth.
              </p>
              <p className="text-text-muted leading-relaxed text-base mt-6" style={{ fontFamily: "'Playfair Display', serif" }}>
                We combine deep market expertise with institutional-grade infrastructure, providing our investors with the tools, transparency, and insight needed to navigate markets where traditional data is scarce and conviction matters most.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* What We Do Section */}
      <section
        id="what-we-do"
        ref={setRef("what-we-do")}
        className="py-32 md:py-40 border-t border-border/30"
      >
        <div className="max-w-7xl mx-auto px-6 md:px-12">
          <p
            className={`text-text-muted tracking-widest uppercase mb-6 ${isVisible("what-we-do") ? "landing-fade-up" : "opacity-0"}`}
            style={{ fontFamily: "Inter, sans-serif", fontSize: "11px", letterSpacing: "0.3em", animationDelay: "0.1s" }}
          >
            What We Do
          </p>
          <h2
            className={`mb-20 ${isVisible("what-we-do") ? "landing-fade-up" : "opacity-0"}`}
            style={{
              fontFamily: "'Playfair Display', serif",
              fontSize: "clamp(2rem, 4vw, 3.5rem)",
              fontWeight: 400,
              lineHeight: 1.1,
              color: "var(--color-text-primary)",
              animationDelay: "0.2s",
            }}
          >
            Alternative assets,
            <br />
            <span className="text-accent">institutional approach</span>
          </h2>

          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-px bg-border/30">
            {[
              {
                icon: Gem,
                title: "Asset Acquisition",
                description: "We identify and acquire high-conviction positions across collectibles, rare items, and emerging alternative asset categories.",
                delay: "0.3s",
              },
              {
                icon: BarChart3,
                title: "Portfolio Management",
                description: "Real-time valuation tracking, P&L analytics, and comprehensive performance reporting across all holdings.",
                delay: "0.45s",
              },
              {
                icon: TrendingUp,
                title: "Market Intelligence",
                description: "Proprietary pricing data and market insights sourced from leading platforms to inform investment decisions.",
                delay: "0.6s",
              },
              {
                icon: Shield,
                title: "Risk & Governance",
                description: "Structured oversight with role-based access, provenance tracking, and evidence management for every position.",
                delay: "0.75s",
              },
            ].map(({ icon: Icon, title, description, delay }) => (
              <div
                key={title}
                className={`bg-surface/50 p-8 md:p-10 group hover:bg-surface-hover/50 ${isVisible("what-we-do") ? "landing-fade-up" : "opacity-0"}`}
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

      {/* Platform Preview Section */}
      <section
        id="preview"
        ref={setRef("preview")}
        className="py-32 md:py-40 border-t border-border/30 relative overflow-hidden"
      >
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute top-1/3 left-1/2 -translate-x-1/2 w-[1000px] h-[600px] rounded-full" style={{ background: "radial-gradient(ellipse, rgba(212,175,55,0.05) 0%, transparent 70%)" }} />
        </div>
        <div className="max-w-7xl mx-auto px-6 md:px-12 relative">
          <div className="text-center mb-16">
            <p
              className={`text-text-muted tracking-widest uppercase mb-6 ${isVisible("preview") ? "landing-fade-up" : "opacity-0"}`}
              style={{ fontFamily: "Inter, sans-serif", fontSize: "11px", letterSpacing: "0.3em", animationDelay: "0.1s" }}
            >
              The Platform
            </p>
            <h2
              className={`${isVisible("preview") ? "landing-fade-up" : "opacity-0"}`}
              style={{
                fontFamily: "'Playfair Display', serif",
                fontSize: "clamp(2rem, 4vw, 3.5rem)",
                fontWeight: 400,
                lineHeight: 1.1,
                color: "var(--color-text-primary)",
                animationDelay: "0.2s",
              }}
            >
              Your portfolio,
              <br />
              <span className="text-accent">at a glance</span>
            </h2>
          </div>

          {/* Dashboard Mockup */}
          <div
            className={`rounded-2xl border border-border/60 bg-surface/80 p-4 md:p-6 shadow-2xl shadow-black/40 ${isVisible("preview") ? "landing-fade-up" : "opacity-0"}`}
            style={{ animationDelay: "0.3s" }}
          >
            {/* Mockup header bar */}
            <div className="flex items-center justify-between mb-5">
              <div>
                <div className="text-sm font-semibold text-text-primary" style={{ fontFamily: "Inter, sans-serif" }}>Dashboard</div>
                <div className="text-xs text-text-muted mt-0.5" style={{ fontFamily: "Inter, sans-serif" }}>Track your investment portfolio</div>
              </div>
              <div className="flex gap-2">
                <div className="px-3 py-1.5 rounded-lg bg-surface border border-border text-xs text-text-muted" style={{ fontFamily: "Inter, sans-serif" }}>Refresh Prices</div>
                <div className="px-3 py-1.5 rounded-lg bg-accent text-background text-xs font-semibold" style={{ fontFamily: "Inter, sans-serif" }}>Add Asset</div>
              </div>
            </div>

            {/* Stat cards row */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-5">
              {[
                { label: "Total Value", value: "$47,820", change: "+$8,240 (20.8%)", positive: true },
                { label: "Total Invested", value: "$39,580", change: null, positive: true },
                { label: "Total P/L", value: "$8,240", change: "+20.8%", positive: true },
                { label: "Total Assets", value: "34", change: null, positive: true },
              ].map((stat) => (
                <div key={stat.label} className="bg-background border border-border/60 rounded-xl p-3 md:p-4">
                  <p className="text-[10px] md:text-xs text-text-muted" style={{ fontFamily: "Inter, sans-serif" }}>{stat.label}</p>
                  <p className="text-sm md:text-lg font-bold text-text-primary mt-1" style={{ fontFamily: "Inter, sans-serif" }}>{stat.value}</p>
                  {stat.change && (
                    <p className={`text-[10px] md:text-xs font-medium mt-1 ${stat.positive ? "text-success" : "text-danger"}`} style={{ fontFamily: "Inter, sans-serif" }}>
                      {stat.change}
                    </p>
                  )}
                </div>
              ))}
            </div>

            {/* Chart mockup */}
            <div className="bg-background border border-border/60 rounded-xl p-4 md:p-5 mb-5">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <div className="text-xs font-semibold text-text-primary" style={{ fontFamily: "Inter, sans-serif" }}>Portfolio Value</div>
                  <div className="flex items-baseline gap-2 mt-1">
                    <span className="text-lg font-bold text-text-primary" style={{ fontFamily: "Inter, sans-serif" }}>$47,820</span>
                    <span className="text-xs font-medium text-success" style={{ fontFamily: "Inter, sans-serif" }}>+$8,240</span>
                  </div>
                </div>
                <div className="flex rounded-md border border-border overflow-hidden">
                  {["1M", "3M", "1Y", "All"].map((r) => (
                    <div key={r} className={`px-2.5 py-1 text-[10px] font-semibold ${r === "3M" ? "bg-accent text-background" : "text-text-muted"}`} style={{ fontFamily: "Inter, sans-serif" }}>
                      {r}
                    </div>
                  ))}
                </div>
              </div>
              {/* SVG chart lines */}
              <div className="relative h-32 md:h-44">
                <svg viewBox="0 0 400 120" className="w-full h-full" preserveAspectRatio="none">
                  <defs>
                    <linearGradient id="preview-grad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#a78bfa" stopOpacity="0.3" />
                      <stop offset="100%" stopColor="#a78bfa" stopOpacity="0.02" />
                    </linearGradient>
                  </defs>
                  {/* Grid lines */}
                  {[30, 60, 90].map((y) => (
                    <line key={y} x1="0" y1={y} x2="400" y2={y} stroke="#2a2a2a" strokeWidth="0.5" />
                  ))}
                  {/* Area fill */}
                  <path d="M0,95 C30,90 60,85 100,80 C140,75 160,60 200,55 C240,50 260,45 300,35 C330,28 360,22 400,18 L400,120 L0,120 Z" fill="url(#preview-grad)" />
                  {/* Main line */}
                  <path d="M0,95 C30,90 60,85 100,80 C140,75 160,60 200,55 C240,50 260,45 300,35 C330,28 360,22 400,18" fill="none" stroke="#a78bfa" strokeWidth="2" />
                  {/* Cost basis dashed line */}
                  <line x1="0" y1="75" x2="400" y2="65" stroke="#9090a8" strokeWidth="1" strokeDasharray="6 4" />
                </svg>
              </div>
            </div>

            {/* Asset cards mockup */}
            <div>
              <div className="flex items-center justify-between mb-3">
                <div className="text-xs font-semibold text-text-primary" style={{ fontFamily: "Inter, sans-serif" }}>Top Performers</div>
                <div className="text-xs text-accent" style={{ fontFamily: "Inter, sans-serif" }}>View All</div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                {[
                  { name: "Charizard VMAX", set: "Champions Path", type: "Card", grade: "PSA 10", value: "$4,850", invested: "$2,200", pnl: "+120.5%", positive: true, image: "https://images.pokemontcg.io/swsh35/74_hires.png" },
                  { name: "Umbreon VMAX", set: "Evolving Skies", type: "Card", grade: "PSA 10", value: "$12,400", invested: "$8,500", pnl: "+45.9%", positive: true, image: "https://images.pokemontcg.io/swsh7/215_hires.png" },
                  { name: "Pikachu VMAX", set: "Vivid Voltage", type: "Card", grade: "PSA 9", value: "$8,200", invested: "$5,800", pnl: "+41.4%", positive: true, image: "https://images.pokemontcg.io/swsh4/188_hires.png" },
                ].map((asset) => (
                  <div key={asset.name} className="bg-background border border-border/60 rounded-xl overflow-hidden">
                    {/* Card image */}
                    <div className="aspect-[4/3] bg-background overflow-hidden flex items-center justify-center relative">
                      <img
                        src={asset.image}
                        alt={asset.name}
                        className="object-contain p-2 md:p-3 w-full h-full"
                      />
                      <div className="absolute top-2 left-2 flex gap-1">
                        <span className={`px-1.5 py-0.5 rounded text-[9px] font-semibold ${asset.type === "Card" ? "bg-accent-muted text-accent" : "bg-warning-muted text-warning"}`}>
                          {asset.type}
                        </span>
                        {asset.grade && (
                          <span className="px-1.5 py-0.5 rounded text-[9px] font-semibold bg-gold/20 text-gold">
                            {asset.grade}
                          </span>
                        )}
                      </div>
                    </div>
                    <div className="p-3">
                      <h4 className="text-xs font-semibold text-text-primary truncate" style={{ fontFamily: "Inter, sans-serif" }}>{asset.name}</h4>
                      <p className="text-[10px] text-text-muted mt-0.5" style={{ fontFamily: "Inter, sans-serif" }}>{asset.set}</p>
                      <div className="flex items-end justify-between mt-2">
                        <div>
                          <p className="text-[10px] text-text-muted" style={{ fontFamily: "Inter, sans-serif" }}>Current Value</p>
                          <p className="text-sm font-bold text-text-primary" style={{ fontFamily: "Inter, sans-serif" }}>{asset.value}</p>
                        </div>
                        <div className={`px-1.5 py-0.5 rounded text-[10px] font-semibold ${asset.positive ? "bg-success-muted text-success" : "bg-danger-muted text-danger"}`}>
                          {asset.pnl}
                        </div>
                      </div>
                      <div className="flex items-center justify-between mt-1.5 pt-1.5 border-t border-border/40">
                        <span className="text-[10px] text-text-muted" style={{ fontFamily: "Inter, sans-serif" }}>Invested {asset.invested}</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Subtle caption */}
          <p
            className={`text-center text-text-muted mt-6 text-xs ${isVisible("preview") ? "landing-fade-up" : "opacity-0"}`}
            style={{ fontFamily: "Inter, sans-serif", letterSpacing: "0.05em", animationDelay: "0.5s" }}
          >
            Real-time portfolio tracking with live pricing, P&amp;L analytics, and performance charts
          </p>
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
            Access Your Portfolios
          </h2>
          <p
            className={`text-text-secondary max-w-md mx-auto mb-12 ${isVisible("cta") ? "landing-fade-up" : "opacity-0"}`}
            style={{ fontFamily: "'Playfair Display', serif", fontSize: "1.05rem", animationDelay: "0.25s" }}
          >
            Sign in to view your portfolios, track performance, and manage your alternative investment positions.
          </p>
          <button
            onClick={() => router.push("/sign-in")}
            className={`inline-flex items-center gap-3 border border-accent text-accent px-10 py-4 hover:bg-accent hover:text-background tracking-widest uppercase cursor-pointer ${isVisible("cta") ? "landing-fade-up" : "opacity-0"}`}
            style={{ fontFamily: "Inter, sans-serif", fontSize: "12px", letterSpacing: "0.25em", animationDelay: "0.4s" }}
          >
            View Portfolios
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
