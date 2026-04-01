"use client";

import { useUser } from "@clerk/nextjs";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { ArrowRight } from "lucide-react";

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
    <div className="landing-grain">
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
            <button
              onClick={() => router.push("/sign-in")}
              className="hidden md:block text-text-secondary hover:text-text-primary transition-colors cursor-pointer bg-transparent border-none"
              style={{ fontFamily: "Inter, sans-serif", letterSpacing: "0.12em", fontSize: "11px", textTransform: "uppercase" }}
            >
              Portfolio
            </button>
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

      {/* Hero Section — Steyn Group-inspired centered layout */}
      <section className="min-h-screen flex flex-col justify-center items-center relative overflow-hidden text-center">
        {/* Background glow */}
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[1000px] h-[1000px] rounded-full" style={{ background: "radial-gradient(circle, rgba(212,175,55,0.03) 0%, transparent 60%)" }} />
        </div>

        <div className="max-w-4xl mx-auto px-6 md:px-12 w-full relative">
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
        <div className="absolute bottom-12 left-1/2 -translate-x-1/2 landing-fade-in" style={{ animationDelay: "2s" }}>
          <div className="w-px h-16 bg-gradient-to-b from-transparent via-accent/30 to-transparent" />
        </div>
      </section>

      {/* About Section — Steyn Group "The Group" style, full-width statement */}
      <section
        id="about"
        ref={setRef("about")}
        className="py-32 md:py-44 border-t border-border/20"
      >
        <div className="max-w-7xl mx-auto px-6 md:px-12">
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
        className="py-32 md:py-44 border-t border-border/20"
      >
        <div className="max-w-7xl mx-auto px-6 md:px-12">
          <p
            className={`text-accent tracking-widest uppercase mb-8 ${isVisible("what-we-do") ? "landing-fade-up" : "opacity-0"}`}
            style={{ fontFamily: "Inter, sans-serif", fontSize: "11px", letterSpacing: "0.3em", animationDelay: "0.1s" }}
          >
            What We Do
          </p>
          <h2
            className={`max-w-2xl mb-20 ${isVisible("what-we-do") ? "landing-fade-up" : "opacity-0"}`}
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

          <div className="grid md:grid-cols-2 gap-16 md:gap-20">
            {[
              {
                title: "Asset Acquisition",
                description: "We target culturally significant collectibles across trading card games, comics, books, and memorabilia — items where provenance, condition, and rarity underpin long-term value.",
                delay: "0.3s",
              },
              {
                title: "Portfolio Management",
                description: "Real-time valuation tracking, comprehensive P&L analytics, and performance reporting across all holdings. Every position is monitored and managed with institutional rigour.",
                delay: "0.4s",
              },
              {
                title: "Market Intelligence",
                description: "Proprietary pricing data and market insights sourced from leading auction houses and platforms worldwide, informed by over 25 years of specialist experience.",
                delay: "0.5s",
              },
              {
                title: "Governance & Transparency",
                description: "Structured oversight with provenance tracking, condition evidence, and transparent reporting for every position. Investors receive full visibility across their holdings.",
                delay: "0.6s",
              },
            ].map(({ title, description, delay }) => (
              <div
                key={title}
                className={`${isVisible("what-we-do") ? "landing-fade-up" : "opacity-0"}`}
                style={{ animationDelay: delay }}
              >
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

      {/* How It Works — "Let us manage your portfolio" */}
      <section
        id="how-it-works"
        ref={setRef("how-it-works")}
        className="py-32 md:py-44 border-t border-border/20 relative overflow-hidden"
      >
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute top-1/3 left-1/2 -translate-x-1/2 w-[1000px] h-[600px] rounded-full" style={{ background: "radial-gradient(ellipse, rgba(212,175,55,0.04) 0%, transparent 70%)" }} />
        </div>
        <div className="max-w-7xl mx-auto px-6 md:px-12 relative">
          <div className="max-w-3xl mx-auto text-center mb-20">
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

          <div className="grid md:grid-cols-3 gap-12 md:gap-16">
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
        className="py-32 md:py-44 border-t border-border/20 relative"
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
        className="py-32 md:py-44 border-t border-border/20"
      >
        <div className="max-w-7xl mx-auto px-6 md:px-12 text-center">
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
            href="mailto:info@westinvestments.com"
            className={`inline-flex items-center gap-3 border border-accent/50 text-accent px-10 py-4 hover:bg-accent hover:text-background transition-all ${isVisible("contact") ? "landing-fade-up" : "opacity-0"}`}
            style={{ fontFamily: "Inter, sans-serif", fontSize: "11px", letterSpacing: "0.25em", animationDelay: "0.4s", textDecoration: "none", textTransform: "uppercase" }}
          >
            Get In Touch
            <ArrowRight className="w-4 h-4" />
          </a>
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
              <span className="text-text-muted text-xs" style={{ fontFamily: "Inter, sans-serif", letterSpacing: "0.05em" }}>
                Privacy Policy
              </span>
              <span className="text-text-muted text-xs" style={{ fontFamily: "Inter, sans-serif", letterSpacing: "0.05em" }}>
                Terms
              </span>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
