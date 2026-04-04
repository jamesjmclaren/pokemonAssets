"use client";

import { useUser } from "@clerk/nextjs";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { ArrowRight, Search, BarChart3, Globe, ShieldCheck, MapPin } from "lucide-react";

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

  const showPage = isLoaded && !isSignedIn;

  useEffect(() => {
    if (!showPage) return;

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
  }, [showPage]);

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
    <div>
      {/* Navigation — Citadel-inspired clean horizontal bar */}
      <nav className="fixed top-0 left-0 right-0 z-50 landing-fade-in border-b border-border/20" style={{ animationDelay: "0.2s", backdropFilter: "blur(16px)", backgroundColor: "rgba(10,10,10,0.9)" }}>
        <div className="max-w-7xl mx-auto px-6 md:px-12 py-5 flex items-center justify-between">
          <img src="/logo.png" alt="West Investments" className="h-10 md:h-12 object-contain" />
          <div className="flex items-center gap-10">
            <a href="#about" className="hidden md:block text-text-secondary hover:text-text-primary transition-colors" style={{ fontFamily: "Inter, sans-serif", letterSpacing: "0.12em", fontSize: "11px", textTransform: "uppercase" }}>
              About Us
            </a>
            <a href="#what-we-do" className="hidden md:block text-text-secondary hover:text-text-primary transition-colors" style={{ fontFamily: "Inter, sans-serif", letterSpacing: "0.12em", fontSize: "11px", textTransform: "uppercase" }}>
              What We Do
            </a>
            <a href="#contact" className="hidden md:block text-text-secondary hover:text-text-primary transition-colors" style={{ fontFamily: "Inter, sans-serif", letterSpacing: "0.12em", fontSize: "11px", textTransform: "uppercase" }}>
              Contact Us
            </a>
            <button
              onClick={() => router.push("/sign-in")}
              className="text-xs tracking-widest uppercase border border-accent/40 text-accent px-6 py-2.5 hover:bg-accent hover:text-background transition-all cursor-pointer"
              style={{ fontFamily: "Inter, sans-serif", letterSpacing: "0.2em" }}
            >
              Client Login
            </button>
          </div>
        </div>
      </nav>

      {/* Hero Section — Steyn Group-inspired centered layout with video background */}
      <section className="min-h-screen flex flex-col justify-center items-center relative overflow-hidden text-center">
        {/* Video background */}
        <div className="absolute inset-0 z-0">
          <video
            autoPlay
            muted
            loop
            playsInline
            className="w-full h-full object-cover"
            style={{ filter: "brightness(0.3)" }}
          >
            <source src="/hero.mp4" type="video/mp4" />
          </video>
          {/* Gradient overlay for text readability */}
          <div className="absolute inset-0" style={{ background: "linear-gradient(to bottom, rgba(8,8,8,0.6) 0%, rgba(8,8,8,0.4) 50%, rgba(8,8,8,0.85) 100%)" }} />
        </div>

        <div className="max-w-4xl mx-auto px-6 md:px-12 w-full relative z-10">
          {/* Overline — like Steyn's "Leading Industry Experts" */}
          <p
            className="text-accent tracking-widest uppercase mb-10 landing-fade-up"
            style={{ fontFamily: "Inter, sans-serif", fontSize: "12px", letterSpacing: "0.35em", animationDelay: "0.4s" }}
          >
            Alternative Investment Fund
          </p>

          {/* Main heading — centered like Steyn Group */}
          <h1
            className="landing-fade-up"
            style={{
              fontFamily: "'Playfair Display', serif",
              fontSize: "clamp(2.75rem, 7vw, 6rem)",
              fontWeight: 400,
              lineHeight: 1.0,
              letterSpacing: "-0.02em",
              color: "var(--color-text-primary)",
              animationDelay: "0.6s",
            }}
          >
            An Alternative Fund Focused
            <br />
            on Collectible Assets
          </h1>

          {/* Gold divider — centered */}
          <div
            className="h-px bg-accent/40 mx-auto mt-12 mb-10 landing-line-reveal"
            style={{ maxWidth: "80px", animationDelay: "1s" }}
          />

          {/* Subheading — concise like Steyn Group tagline */}
          <p
            className="max-w-2xl mx-auto text-text-secondary leading-relaxed landing-fade-up"
            style={{ fontFamily: "'Playfair Display', serif", fontSize: "1.2rem", fontWeight: 400, animationDelay: "1.1s" }}
          >
            West Investments is an alternative investment fund specialising in collectible assets across trading card games, comics, books, and memorabilia.
          </p>

          {/* CTA — like Citadel's strong call to action */}
          <div className="mt-14 landing-fade-up" style={{ animationDelay: "1.3s" }}>
            <button
              onClick={() => router.push("/sign-in")}
              className="group inline-flex items-center gap-3 border border-accent/50 text-accent px-10 py-4 hover:bg-accent hover:text-background transition-all cursor-pointer"
              style={{ fontFamily: "Inter, sans-serif", fontSize: "11px", letterSpacing: "0.25em", textTransform: "uppercase" }}
            >
              View Portfolio
              <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
            </button>
          </div>
        </div>

        {/* Scroll indicator */}
        <div className="absolute bottom-12 left-1/2 -translate-x-1/2 z-10 landing-fade-in" style={{ animationDelay: "2s" }}>
          <div className="w-px h-16 bg-gradient-to-b from-transparent via-accent/30 to-transparent" />
        </div>
      </section>

      {/* Ethos Section — Discreet. Trusted. Professional. */}
      <section
        id="ethos"
        ref={setRef("ethos")}
        className="py-20 md:py-28 border-t border-border/20"
      >
        <div className="max-w-7xl mx-auto px-6 md:px-12 text-center">
          <h2
            className={`mb-10 ${isVisible("ethos") ? "landing-fade-up" : "opacity-0"}`}
            style={{
              fontFamily: "'Playfair Display', serif",
              fontSize: "clamp(1.75rem, 3.5vw, 2.75rem)",
              fontWeight: 400,
              lineHeight: 1.25,
              letterSpacing: "0.02em",
              color: "var(--color-text-primary)",
              animationDelay: "0.2s",
            }}
          >
            Discreet. Trusted. Professional.
          </h2>
          <div
            className={`h-px bg-accent/40 mx-auto mb-10 ${isVisible("ethos") ? "landing-line-reveal" : "opacity-0"}`}
            style={{ maxWidth: "80px", animationDelay: "0.4s" }}
          />
          <p
            className={`max-w-2xl mx-auto text-text-secondary leading-relaxed ${isVisible("ethos") ? "landing-fade-up" : "opacity-0"}`}
            style={{ fontFamily: "Inter, sans-serif", fontSize: "0.95rem", lineHeight: 1.8, animationDelay: "0.5s" }}
          >
            At West Investments, we recognise that our clients value discretion as highly as performance. When handling sensitive information and high-value collectible assets, we operate with the utmost professionalism, confidentiality, and care. Our commitment is to provide a trusted, highly personalised service while safeguarding both your privacy and your interests at every stage.
          </p>
          <div
            className={`flex items-center justify-center gap-8 md:gap-14 flex-wrap mt-14 ${isVisible("ethos") ? "landing-fade-up" : "opacity-0"}`}
            style={{ animationDelay: "0.7s" }}
          >
            {["London", "New York", "Tokyo"].map((city) => (
              <div key={city} className="flex items-center gap-2.5">
                <MapPin className="w-4 h-4 text-accent" />
                <span
                  className="text-text-secondary"
                  style={{ fontFamily: "Inter, sans-serif", fontSize: "0.85rem", letterSpacing: "0.1em" }}
                >
                  {city}
                </span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* About Section — Steyn Group "The Group" style, full-width statement */}
      <section
        id="about"
        ref={setRef("about")}
        className="py-20 md:py-28 border-t border-border/20 relative overflow-hidden"
      >
        {/* Background image */}
        <div className="absolute inset-0 z-0">
          <img
            src="/about-bg.png"
            alt=""
            className="w-full h-full object-cover"
            style={{ filter: "brightness(0.55)" }}
          />
          <div className="absolute inset-0" style={{ background: "linear-gradient(to bottom, rgba(8,8,8,0.5) 0%, rgba(8,8,8,0.3) 50%, rgba(8,8,8,0.7) 100%)" }} />
        </div>

        <div className="max-w-7xl mx-auto px-6 md:px-12 relative z-10">
          <div className="max-w-3xl">
            <p
              className={`text-accent tracking-widest uppercase mb-8 ${isVisible("about") ? "landing-fade-up" : "opacity-0"}`}
              style={{ fontFamily: "Inter, sans-serif", fontSize: "11px", letterSpacing: "0.3em", animationDelay: "0.1s" }}
            >
              About Us
            </p>
            <h2
              className={`mb-10 ${isVisible("about") ? "landing-fade-up" : "opacity-0"}`}
              style={{
                fontFamily: "'Playfair Display', serif",
                fontSize: "clamp(1.75rem, 3.5vw, 2.75rem)",
                fontWeight: 400,
                lineHeight: 1.25,
                color: "var(--color-text-primary)",
                animationDelay: "0.2s",
              }}
            >
              Backed by over 25 years of market experience and a strong track record in collectible assets, we pursue a disciplined, research-led strategy focused on rarity, quality, provenance, and long-term value.
            </h2>
            <div
              className={`h-px bg-border/40 mb-10 ${isVisible("about") ? "landing-line-reveal" : "opacity-0"}`}
              style={{ maxWidth: "80px", animationDelay: "0.4s" }}
            />
            <p
              className={`text-text-secondary leading-relaxed ${isVisible("about") ? "landing-fade-up" : "opacity-0"}`}
              style={{ fontFamily: "Inter, sans-serif", fontSize: "0.95rem", lineHeight: 1.8, animationDelay: "0.5s" }}
            >
              We invest selectively in culturally significant assets where scarcity and collector demand support enduring investment potential. Our approach combines deep specialist knowledge with institutional-grade infrastructure, providing investors with the tools, transparency, and insight needed to navigate markets where traditional data is scarce and conviction matters most.
            </p>
          </div>
        </div>
      </section>

      {/* What We Do Section — cleaner, Citadel-style content blocks */}
      <section
        id="what-we-do"
        ref={setRef("what-we-do")}
        className="py-20 md:py-28 border-t border-border/20"
      >
        <div className="max-w-7xl mx-auto px-6 md:px-12">
          <p
            className={`text-accent tracking-widest uppercase mb-8 ${isVisible("what-we-do") ? "landing-fade-up" : "opacity-0"}`}
            style={{ fontFamily: "Inter, sans-serif", fontSize: "11px", letterSpacing: "0.3em", animationDelay: "0.1s" }}
          >
            What We Do
          </p>
          <h2
            className={`max-w-2xl mb-14 ${isVisible("what-we-do") ? "landing-fade-up" : "opacity-0"}`}
            style={{
              fontFamily: "'Playfair Display', serif",
              fontSize: "clamp(1.75rem, 3.5vw, 2.75rem)",
              fontWeight: 400,
              lineHeight: 1.25,
              color: "var(--color-text-primary)",
              animationDelay: "0.2s",
            }}
          >
            We identify, acquire, and manage high-conviction positions across non-traditional asset classes.
          </h2>

          <div className="grid md:grid-cols-2 gap-12 md:gap-14">
            {[
              {
                title: "Asset Acquisition",
                description: "We target culturally significant collectibles across trading card games, comics, books, and memorabilia — items where provenance, condition, and rarity underpin long-term value.",
                delay: "0.3s",
                icon: Search,
              },
              {
                title: "Portfolio Management",
                description: "Real-time valuation tracking, comprehensive P&L analytics, and performance reporting across all holdings. Every position is monitored and managed with institutional rigour.",
                delay: "0.4s",
                icon: BarChart3,
              },
              {
                title: "Market Intelligence",
                description: "Proprietary pricing data and market insights sourced from leading auction houses and platforms worldwide, informed by over 25 years of specialist experience.",
                delay: "0.5s",
                icon: Globe,
              },
              {
                title: "Governance & Transparency",
                description: "Structured oversight with provenance tracking, condition evidence, and transparent reporting for every position. Investors receive full visibility across their holdings.",
                delay: "0.6s",
                icon: ShieldCheck,
              },
            ].map(({ title, description, delay, icon: Icon }) => (
              <div
                key={title}
                className={`${isVisible("what-we-do") ? "landing-fade-up" : "opacity-0"}`}
                style={{ animationDelay: delay }}
              >
                <div className="flex items-center gap-3 mb-4">
                  <Icon className="w-5 h-5 text-accent" />
                  <h3
                    className="text-text-primary"
                    style={{ fontFamily: "'Playfair Display', serif", fontSize: "1.25rem", fontWeight: 500 }}
                  >
                    {title}
                  </h3>
                </div>
                <p className="text-text-muted leading-relaxed" style={{ fontFamily: "Inter, sans-serif", fontSize: "0.9rem", lineHeight: 1.8 }}>
                  {description}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Portfolio Preview Section */}
      <section
        id="preview"
        ref={setRef("preview")}
        className="py-20 md:py-28 border-t border-border/20 relative overflow-hidden"
      >
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute top-1/3 left-1/2 -translate-x-1/2 w-[1000px] h-[600px] rounded-full" style={{ background: "radial-gradient(ellipse, rgba(212,175,55,0.04) 0%, transparent 70%)" }} />
        </div>
        <div className="max-w-7xl mx-auto px-6 md:px-12 relative">
          <div className="text-center mb-12">
            <p
              className={`text-accent tracking-widest uppercase mb-8 ${isVisible("preview") ? "landing-fade-up" : "opacity-0"}`}
              style={{ fontFamily: "Inter, sans-serif", fontSize: "11px", letterSpacing: "0.3em", animationDelay: "0.1s" }}
            >
              The Platform
            </p>
            <h2
              className={`${isVisible("preview") ? "landing-fade-up" : "opacity-0"}`}
              style={{
                fontFamily: "'Playfair Display', serif",
                fontSize: "clamp(1.75rem, 3.5vw, 2.75rem)",
                fontWeight: 400,
                lineHeight: 1.25,
                color: "var(--color-text-primary)",
                animationDelay: "0.2s",
              }}
            >
              Your portfolio, <span className="text-accent">at a glance</span>
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
                { label: "Total Value", value: "$54,100", change: "+$26,700 (97.3%)", positive: true },
                { label: "Total Invested", value: "$27,400", change: null, positive: true },
                { label: "Total P/L", value: "$26,700", change: "+97.3%", positive: true },
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
              <div className="flex items-center justify-between mb-2">
                <div>
                  <div className="text-xs font-semibold text-text-primary" style={{ fontFamily: "Inter, sans-serif" }}>Portfolio Value</div>
                  <div className="flex items-baseline gap-2 mt-1">
                    <span className="text-lg font-bold text-text-primary" style={{ fontFamily: "Inter, sans-serif" }}>$54,100</span>
                    <span className="text-xs font-medium text-success" style={{ fontFamily: "Inter, sans-serif" }}>+$26,700</span>
                  </div>
                  <div className="flex flex-wrap items-center gap-x-4 gap-y-1 mt-1.5">
                    <span className="text-[10px] text-text-muted" style={{ fontFamily: "Inter, sans-serif" }}>
                      <span className="inline-block w-1.5 h-1.5 rounded-full bg-[#a78bfa] mr-1" />Graded Cards: $28,500
                    </span>
                    <span className="text-[10px] text-text-muted" style={{ fontFamily: "Inter, sans-serif" }}>
                      <span className="inline-block w-1.5 h-1.5 rounded-full bg-[#f97316] mr-1" />Raw Cards: $14,600
                    </span>
                    <span className="text-[10px] text-text-muted" style={{ fontFamily: "Inter, sans-serif" }}>
                      <span className="inline-block w-1.5 h-1.5 rounded-full bg-[#22c55e] mr-1" />Sealed Products: $11,000
                    </span>
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
              {/* Legend row */}
              <div className="flex items-center gap-4 mb-3">
                {[
                  { color: "#a78bfa", label: "Graded Cards" },
                  { color: "#f97316", label: "Raw Cards" },
                  { color: "#22c55e", label: "Sealed Products" },
                ].map((item) => (
                  <div key={item.label} className="flex items-center gap-1.5">
                    <div className="w-2 h-2 rounded-full" style={{ backgroundColor: item.color }} />
                    <span className="text-[10px] text-text-muted" style={{ fontFamily: "Inter, sans-serif" }}>{item.label}</span>
                  </div>
                ))}
                <div className="flex items-center gap-1.5">
                  <svg width="12" height="2" className="shrink-0"><line x1="0" y1="1" x2="12" y2="1" stroke="#9090a8" strokeWidth="1.5" strokeDasharray="3 2" /></svg>
                  <span className="text-[10px] text-text-muted" style={{ fontFamily: "Inter, sans-serif" }}>Cost Basis</span>
                </div>
              </div>
              {/* SVG chart with axes */}
              <div className="relative h-40 md:h-52">
                {/* Y-axis labels */}
                <div className="absolute left-0 top-0 bottom-4 flex flex-col justify-between pointer-events-none" style={{ width: "40px" }}>
                  {["$60.0k", "$45.0k", "$30.0k", "$15.0k", "$0"].map((label) => (
                    <span key={label} className="text-[9px] text-text-muted leading-none" style={{ fontFamily: "Inter, sans-serif" }}>{label}</span>
                  ))}
                </div>
                <div className="absolute left-10 right-0 top-0 bottom-0">
                  <svg viewBox="0 0 400 140" className="w-full h-full" preserveAspectRatio="none">
                    <defs>
                      <linearGradient id="preview-grad-graded" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#a78bfa" stopOpacity="0.3" />
                        <stop offset="100%" stopColor="#a78bfa" stopOpacity="0.02" />
                      </linearGradient>
                      <linearGradient id="preview-grad-raw" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#f97316" stopOpacity="0.25" />
                        <stop offset="100%" stopColor="#f97316" stopOpacity="0.02" />
                      </linearGradient>
                      <linearGradient id="preview-grad-sealed" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#22c55e" stopOpacity="0.25" />
                        <stop offset="100%" stopColor="#22c55e" stopOpacity="0.02" />
                      </linearGradient>
                    </defs>
                    {/* Grid lines */}
                    {[14, 42, 70, 98, 126].map((y) => (
                      <line key={y} x1="0" y1={y} x2="400" y2={y} stroke="#2a2a2a" strokeWidth="0.5" strokeDasharray="4 3" />
                    ))}
                    {/* Sealed area fill (green — $11k, bottom of stack) */}
                    <path d="M0,126 L40,126 C55,126 60,118 80,112 C120,108 160,107 200,106 C240,105 300,105 360,105 L400,105 L400,126 Z" fill="url(#preview-grad-sealed)" />
                    {/* Sealed line (green — top of sealed band ~$11k) */}
                    <path d="M0,126 L40,126 C55,126 60,118 80,112 C120,108 160,107 200,106 C240,105 300,105 360,105 L400,105" fill="none" stroke="#22c55e" strokeWidth="1.5" />
                    {/* Raw area fill (orange — $14.6k, stacked on sealed) */}
                    <path d="M0,126 L40,126 C55,126 60,100 80,88 C120,82 160,80 200,79 C240,78 300,78 360,78 L400,78 L400,105 L360,105 C300,105 240,105 200,106 C160,107 120,108 80,112 C60,118 55,126 40,126 Z" fill="url(#preview-grad-raw)" />
                    {/* Raw line (orange — top of raw band ~$25.6k) */}
                    <path d="M0,126 L40,126 C55,126 60,100 80,88 C120,82 160,80 200,79 C240,78 300,78 360,78 L400,78" fill="none" stroke="#f97316" strokeWidth="1.5" />
                    {/* Graded area fill (purple — $28.5k, stacked on raw) */}
                    <path d="M0,126 L40,126 C55,126 60,58 80,38 C120,28 160,26 200,25 C240,24 300,24 360,25 L400,25 L400,78 L360,78 C300,78 240,78 200,79 C160,80 120,82 80,88 C60,100 55,126 40,126 Z" fill="url(#preview-grad-graded)" />
                    {/* Graded line (purple — top of stack, total ~$54.1k) */}
                    <path d="M0,126 L40,126 C55,126 60,58 80,38 C120,28 160,26 200,25 C240,24 300,24 360,25 L400,25" fill="none" stroke="#a78bfa" strokeWidth="2" />
                    {/* Cost basis dashed line (~$27.4k ≈ y:75) */}
                    <path d="M0,126 L40,126 C55,126 60,80 80,75 C120,75 160,75 200,75 C240,75 300,75 360,75 L400,75" fill="none" stroke="#9090a8" strokeWidth="1" strokeDasharray="6 4" />
                  </svg>
                </div>
              </div>
              {/* X-axis date labels */}
              <div className="flex justify-between pl-10 mt-1">
                {["Feb 25", "Mar 1", "Mar 7", "Mar 13", "Mar 19", "Mar 25", "Mar 31"].map((d) => (
                  <span key={d} className="text-[9px] text-text-muted" style={{ fontFamily: "Inter, sans-serif" }}>{d}</span>
                ))}
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
                  { name: "Mario Poncho Pikachu", set: "Special Box Promo", type: "Graded", grade: "PSA 10", value: "$5,200", invested: "$2,400", pnl: "+116.7%", positive: true, image: "/cards/mario-poncho-pikachu.png" },
                  { name: "Michael Jordan", set: "1986 Fleer #57", type: "Graded", grade: "PSA 10", value: "$18,500", invested: "$12,000", pnl: "+54.2%", positive: true, image: "/cards/michael-jordan.png" },
                  { name: "Lugia", set: "Neo Genesis", type: "Graded", grade: "PSA 9", value: "$4,800", invested: "$2,200", pnl: "+118.2%", positive: true, image: "https://images.pokemontcg.io/neo1/9.png" },
                  { name: "Umbreon VMAX", set: "Evolving Skies", type: "Raw", grade: null, value: "$6,400", invested: "$3,800", pnl: "+68.4%", positive: true, image: "https://images.pokemontcg.io/swsh7/215.png" },
                  { name: "Poncho Magikarp & Gyarados", set: "Special Box", type: "Sealed", grade: null, value: "$11,000", invested: "$1,600", pnl: "+587.5%", positive: true, image: "/cards/luigi-poncho-box.png" },
                  { name: "Charizard", set: "Base Set #4", type: "Raw", grade: null, value: "$8,200", invested: "$5,400", pnl: "+51.9%", positive: true, image: "https://images.pokemontcg.io/base1/4.png" },
                ].map((asset) => (
                  <div key={asset.name} className="bg-background border border-border/60 rounded-xl overflow-hidden">
                    <div className="aspect-[4/3] overflow-hidden flex items-center justify-center relative">
                      <img
                        src={asset.image}
                        alt={asset.name}
                        loading="lazy"
                        className="object-contain p-2 md:p-3 w-full h-full"
                      />
                      <div className="absolute top-2 left-2 flex gap-1">
                        <span className={`px-1.5 py-0.5 rounded text-[9px] font-semibold ${
                          asset.type === "Graded" ? "bg-[#a78bfa]/20 text-[#a78bfa]" :
                          asset.type === "Raw" ? "bg-[#f97316]/20 text-[#f97316]" :
                          "bg-[#22c55e]/20 text-[#22c55e]"
                        }`}>
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

          <p
            className={`text-center text-text-muted mt-8 text-xs ${isVisible("preview") ? "landing-fade-up" : "opacity-0"}`}
            style={{ fontFamily: "Inter, sans-serif", letterSpacing: "0.05em", animationDelay: "0.5s" }}
          >
            Real-time portfolio tracking with live pricing, P&amp;L analytics, and performance charts
          </p>
        </div>
      </section>

      {/* How It Works — "Let us manage your portfolio" */}
      <section
        id="how-it-works"
        ref={setRef("how-it-works")}
        className="py-20 md:py-28 border-t border-border/20 relative overflow-hidden"
      >
        <div className="absolute inset-0 pointer-events-none">
          <img src="/manage.png" alt="" className="absolute inset-0 w-full h-full object-cover opacity-20" />
          <div className="absolute inset-0" style={{ background: "linear-gradient(to bottom, rgba(8,8,8,0.7) 0%, rgba(8,8,8,0.4) 50%, rgba(8,8,8,0.7) 100%)" }} />
          <div className="absolute top-1/3 left-1/2 -translate-x-1/2 w-[1000px] h-[600px] rounded-full" style={{ background: "radial-gradient(ellipse, rgba(212,175,55,0.04) 0%, transparent 70%)" }} />
        </div>
        <div className="max-w-7xl mx-auto px-6 md:px-12 relative">
          <div className="max-w-3xl mx-auto text-center mb-14">
            <p
              className={`text-accent tracking-widest uppercase mb-8 ${isVisible("how-it-works") ? "landing-fade-up" : "opacity-0"}`}
              style={{ fontFamily: "Inter, sans-serif", fontSize: "11px", letterSpacing: "0.3em", animationDelay: "0.1s" }}
            >
              How It Would Work For You
            </p>
            <h2
              className={`${isVisible("how-it-works") ? "landing-fade-up" : "opacity-0"}`}
              style={{
                fontFamily: "'Playfair Display', serif",
                fontSize: "clamp(1.75rem, 3.5vw, 2.75rem)",
                fontWeight: 400,
                lineHeight: 1.25,
                color: "var(--color-text-primary)",
                animationDelay: "0.2s",
              }}
            >
              Let us manage your portfolio
            </h2>
          </div>

          <div className="grid md:grid-cols-3 gap-10 md:gap-12">
            {[
              {
                step: "01",
                title: "Consultation",
                description: "We discuss your investment goals, risk appetite, and areas of interest within the collectibles market to develop a tailored strategy.",
                delay: "0.3s",
              },
              {
                step: "02",
                title: "Acquisition & Management",
                description: "Our team identifies, acquires, and manages positions on your behalf — leveraging decades of market expertise and proprietary pricing data.",
                delay: "0.45s",
              },
              {
                step: "03",
                title: "Reporting & Access",
                description: "Track your portfolio at any time through our secure platform. Real-time valuations, performance analytics, and complete transparency across all holdings.",
                delay: "0.6s",
              },
            ].map(({ step, title, description, delay }) => (
              <div
                key={step}
                className={`${isVisible("how-it-works") ? "landing-fade-up" : "opacity-0"}`}
                style={{ animationDelay: delay }}
              >
                <p className="text-accent tracking-widest mb-5" style={{ fontFamily: "Inter, sans-serif", fontSize: "13px", letterSpacing: "0.2em" }}>
                  {step}
                </p>
                <h3
                  className="text-text-primary mb-4"
                  style={{ fontFamily: "'Playfair Display', serif", fontSize: "1.25rem", fontWeight: 500 }}
                >
                  {title}
                </h3>
                <p className="text-text-muted leading-relaxed" style={{ fontFamily: "Inter, sans-serif", fontSize: "0.9rem", lineHeight: 1.8 }}>
                  {description}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Philosophy — Steyn Group-inspired centered quote */}
      <section
        id="values"
        ref={setRef("values")}
        className="py-20 md:py-28 border-t border-border/20 relative"
      >
        <div className="max-w-7xl mx-auto px-6 md:px-12 relative">
          <div className="max-w-3xl mx-auto text-center">
            <div
              className={`h-px bg-accent/30 mx-auto mb-12 ${isVisible("values") ? "landing-line-reveal" : "opacity-0"}`}
              style={{ maxWidth: "60px", animationDelay: "0.1s" }}
            />
            <h2
              className={`mb-10 ${isVisible("values") ? "landing-fade-up" : "opacity-0"}`}
              style={{
                fontFamily: "'Playfair Display', serif",
                fontSize: "clamp(1.5rem, 3vw, 2.25rem)",
                fontWeight: 400,
                lineHeight: 1.35,
                fontStyle: "italic",
                color: "var(--color-text-primary)",
                animationDelay: "0.2s",
              }}
            >
              &ldquo;We believe alternative assets deserve the same rigour and transparency as any institutional portfolio. Our mandate is to preserve and grow capital through conviction-led investing in culturally significant collectibles.&rdquo;
            </h2>
            <div
              className={`h-px bg-accent/30 mx-auto mb-8 ${isVisible("values") ? "landing-line-reveal" : "opacity-0"}`}
              style={{ maxWidth: "60px", animationDelay: "0.5s" }}
            />
            <p
              className={`text-text-muted text-xs tracking-widest uppercase ${isVisible("values") ? "landing-fade-up" : "opacity-0"}`}
              style={{ fontFamily: "Inter, sans-serif", letterSpacing: "0.2em", animationDelay: "0.6s" }}
            >
              West Investments
            </p>
          </div>
        </div>
      </section>

      {/* Contact Us — Citadel-style clean CTA section */}
      <section
        id="contact"
        ref={setRef("contact")}
        className="py-20 md:py-28 border-t border-border/20 relative overflow-hidden"
      >
        <div className="absolute inset-0 pointer-events-none">
          <img src="/getintouch.png" alt="" className="absolute inset-0 w-full h-full object-cover opacity-20" />
          <div className="absolute inset-0" style={{ background: "linear-gradient(to bottom, rgba(8,8,8,0.7) 0%, rgba(8,8,8,0.4) 50%, rgba(8,8,8,0.7) 100%)" }} />
          <div className="absolute top-1/3 left-1/2 -translate-x-1/2 w-[1000px] h-[600px] rounded-full" style={{ background: "radial-gradient(ellipse, rgba(212,175,55,0.04) 0%, transparent 70%)" }} />
        </div>
        <div className="max-w-7xl mx-auto px-6 md:px-12 text-center relative">
          <p
            className={`text-accent tracking-widest uppercase mb-8 ${isVisible("contact") ? "landing-fade-up" : "opacity-0"}`}
            style={{ fontFamily: "Inter, sans-serif", fontSize: "11px", letterSpacing: "0.3em", animationDelay: "0.1s" }}
          >
            Contact Us
          </p>
          <h2
            className={`mb-8 ${isVisible("contact") ? "landing-fade-up" : "opacity-0"}`}
            style={{
              fontFamily: "'Playfair Display', serif",
              fontSize: "clamp(1.75rem, 3.5vw, 2.75rem)",
              fontWeight: 400,
              lineHeight: 1.25,
              color: "var(--color-text-primary)",
              animationDelay: "0.2s",
            }}
          >
            Get in touch
          </h2>
          <p
            className={`text-text-secondary max-w-lg mx-auto mb-14 ${isVisible("contact") ? "landing-fade-up" : "opacity-0"}`}
            style={{ fontFamily: "Inter, sans-serif", fontSize: "0.95rem", lineHeight: 1.8, animationDelay: "0.3s" }}
          >
            Interested in learning more about West Investments and how we can manage your collectible asset portfolio? We would be pleased to hear from you.
          </p>
          <a
            href="mailto:info@west.investments"
            className={`inline-flex items-center gap-3 border border-accent/50 text-accent px-10 py-4 hover:bg-accent hover:text-background transition-all ${isVisible("contact") ? "landing-fade-up" : "opacity-0"}`}
            style={{ fontFamily: "Inter, sans-serif", fontSize: "11px", letterSpacing: "0.25em", animationDelay: "0.4s", textDecoration: "none", textTransform: "uppercase" }}
          >
            Get In Touch
            <ArrowRight className="w-4 h-4" />
          </a>
        </div>
      </section>

      {/* Disclaimer */}
      <section className="border-t border-border/20 py-12">
        <div className="max-w-7xl mx-auto px-6 md:px-12">
          <p className="text-text-muted text-xs leading-relaxed" style={{ fontFamily: "Inter, sans-serif", letterSpacing: "0.02em" }}>
            Disclaimer: Portfolio examples shown are for illustrative purposes only. All figures, valuations, prices, returns, and timeframes are hypothetical and do not represent actual product prices, recent sale values, realised performance, or any guarantee of future results.
          </p>
          <p className="text-text-muted text-xs leading-relaxed mt-3" style={{ fontFamily: "Inter, sans-serif", letterSpacing: "0.02em" }}>
            Collectible asset values may fluctuate and past performance is not a reliable indicator of future results.
          </p>
        </div>
      </section>

      {/* Footer — Steyn Group-inspired minimal footer with nav links */}
      <footer className="border-t border-border/20 py-16">
        <div className="max-w-7xl mx-auto px-6 md:px-12">
          <div className="flex flex-col md:flex-row items-center justify-between gap-8">
            <img src="/logo.png" alt="West Investments" className="h-8 object-contain opacity-40" />
            <div className="flex items-center gap-8">
              <a href="#about" className="text-text-muted hover:text-text-secondary transition-colors" style={{ fontFamily: "Inter, sans-serif", fontSize: "11px", letterSpacing: "0.1em", textTransform: "uppercase" }}>
                About Us
              </a>
              <a href="#what-we-do" className="text-text-muted hover:text-text-secondary transition-colors" style={{ fontFamily: "Inter, sans-serif", fontSize: "11px", letterSpacing: "0.1em", textTransform: "uppercase" }}>
                What We Do
              </a>
              <a href="#contact" className="text-text-muted hover:text-text-secondary transition-colors" style={{ fontFamily: "Inter, sans-serif", fontSize: "11px", letterSpacing: "0.1em", textTransform: "uppercase" }}>
                Contact
              </a>
            </div>
          </div>
          <div className="mt-10 pt-8 border-t border-border/15 flex flex-col md:flex-row items-center justify-between gap-4">
            <p className="text-text-muted text-xs" style={{ fontFamily: "Inter, sans-serif", letterSpacing: "0.05em" }}>
              &copy; {new Date().getFullYear()} West Investments Ltd. All rights reserved.
            </p>
            <div className="flex items-center gap-6">
              <Link href="/privacy" className="text-text-muted text-xs hover:text-text-secondary transition-colors" style={{ fontFamily: "Inter, sans-serif", letterSpacing: "0.05em" }}>
                Privacy Policy
              </Link>
              <Link href="/terms" className="text-text-muted text-xs hover:text-text-secondary transition-colors" style={{ fontFamily: "Inter, sans-serif", letterSpacing: "0.05em" }}>
                Terms
              </Link>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
