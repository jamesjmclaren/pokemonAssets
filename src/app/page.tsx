"use client";

import { useUser } from "@clerk/nextjs";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { ArrowRight, TrendingUp, Shield, BarChart3, Gem, Mail } from "lucide-react";

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
      {/* Navigation */}
      <nav className="fixed top-0 left-0 right-0 z-50 landing-fade-in" style={{ animationDelay: "0.2s", backdropFilter: "blur(12px)", backgroundColor: "rgba(10,10,10,0.85)" }}>
        <div className="max-w-7xl mx-auto px-6 md:px-12 py-6 flex items-center justify-between">
          <img src="/logo.png" alt="West Investments" className="h-10 md:h-12 object-contain" />
          <div className="flex items-center gap-8">
            <a href="#about" className="hidden md:block text-sm text-text-secondary hover:text-text-primary tracking-wide uppercase" style={{ fontFamily: "Inter, sans-serif", letterSpacing: "0.15em", fontSize: "11px" }}>
              About Us
            </a>
            <a href="#what-we-do" className="hidden md:block text-sm text-text-secondary hover:text-text-primary tracking-wide uppercase" style={{ fontFamily: "Inter, sans-serif", letterSpacing: "0.15em", fontSize: "11px" }}>
              What We Do
            </a>
            <button
              onClick={() => router.push("/sign-in")}
              className="hidden md:block text-sm text-text-secondary hover:text-text-primary tracking-wide uppercase cursor-pointer bg-transparent border-none"
              style={{ fontFamily: "Inter, sans-serif", letterSpacing: "0.15em", fontSize: "11px" }}
            >
              Portfolio
            </button>
            <a href="#contact" className="hidden md:block text-sm text-text-secondary hover:text-text-primary tracking-wide uppercase" style={{ fontFamily: "Inter, sans-serif", letterSpacing: "0.15em", fontSize: "11px" }}>
              Contact Us
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
            West Investments
          </p>

          {/* Main heading */}
          <h1
            className="landing-fade-up"
            style={{
              fontFamily: "'Playfair Display', serif",
              fontSize: "clamp(2.5rem, 6vw, 5.5rem)",
              fontWeight: 400,
              lineHeight: 1.05,
              letterSpacing: "-0.02em",
              color: "var(--color-text-primary)",
              animationDelay: "0.6s",
            }}
          >
            An Alternative Fund
            <br />
            Focused on <span className="text-accent">Collectible Assets</span>
          </h1>

          {/* Gold divider */}
          <div
            className="h-px bg-accent/50 mt-10 mb-8 landing-line-reveal"
            style={{ maxWidth: "120px", animationDelay: "1s" }}
          />

          {/* Subheading */}
          <p
            className="max-w-xl text-text-secondary leading-relaxed landing-fade-up"
            style={{ fontFamily: "'Playfair Display', serif", fontSize: "1.15rem", fontWeight: 400, animationDelay: "1.1s" }}
          >
            West Investments is an alternative investment fund specialising in collectible assets across trading card games, comics, books, and memorabilia.
          </p>

          {/* Secondary description */}
          <p
            className="max-w-xl text-text-muted leading-relaxed mt-6 landing-fade-up"
            style={{ fontFamily: "'Playfair Display', serif", fontSize: "1rem", fontWeight: 400, animationDelay: "1.25s" }}
          >
            Backed by over 25 years of market experience and a strong track record in collectible assets, we pursue a disciplined, research-led strategy focused on rarity, quality, provenance, and long-term value.
          </p>

          {/* CTA */}
          <button
            onClick={() => router.push("/sign-in")}
            className="group mt-12 inline-flex items-center gap-3 landing-fade-up cursor-pointer"
            style={{ animationDelay: "1.4s" }}
          >
            <span
              className="text-accent tracking-widest uppercase hover:text-accent-hover"
              style={{ fontFamily: "Inter, sans-serif", fontSize: "12px", letterSpacing: "0.25em" }}
            >
              View Portfolio
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
                About Us
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
                Conviction-led investing
                <br />
                in <span className="text-accent">collectible assets</span>
              </h2>
            </div>
            <div className={`flex flex-col justify-center ${isVisible("about") ? "landing-fade-up" : "opacity-0"}`} style={{ animationDelay: "0.4s" }}>
              <p className="text-text-secondary leading-relaxed text-base" style={{ fontFamily: "'Playfair Display', serif" }}>
                West Investments is an alternative investment fund specialising in collectible assets across trading card games, comics, books, and memorabilia. We invest selectively in culturally significant assets where scarcity and collector demand support enduring investment potential.
              </p>
              <p className="text-text-muted leading-relaxed text-base mt-6" style={{ fontFamily: "'Playfair Display', serif" }}>
                With over 25 years of market experience, we combine deep specialist knowledge with a disciplined, research-led approach — focusing on rarity, quality, provenance, and long-term value to deliver consistent returns for our investors.
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
                description: "We identify and acquire high-conviction positions across trading card games, comics, books, and memorabilia — targeting culturally significant items with enduring value.",
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
                description: "Proprietary pricing data and market insights sourced from leading platforms to inform investment decisions with over 25 years of specialist experience.",
                delay: "0.6s",
              },
              {
                icon: Shield,
                title: "Risk & Governance",
                description: "Structured oversight with provenance tracking, evidence management, and transparent reporting for every position in the portfolio.",
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

      {/* How It Works / Portfolio Section */}
      <section
        id="how-it-works"
        ref={setRef("how-it-works")}
        className="py-32 md:py-40 border-t border-border/30 relative overflow-hidden"
      >
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute top-1/3 left-1/2 -translate-x-1/2 w-[1000px] h-[600px] rounded-full" style={{ background: "radial-gradient(ellipse, rgba(212,175,55,0.05) 0%, transparent 70%)" }} />
        </div>
        <div className="max-w-7xl mx-auto px-6 md:px-12 relative">
          <div className="text-center mb-16">
            <p
              className={`text-text-muted tracking-widest uppercase mb-6 ${isVisible("how-it-works") ? "landing-fade-up" : "opacity-0"}`}
              style={{ fontFamily: "Inter, sans-serif", fontSize: "11px", letterSpacing: "0.3em", animationDelay: "0.1s" }}
            >
              How It Works
            </p>
            <h2
              className={`${isVisible("how-it-works") ? "landing-fade-up" : "opacity-0"}`}
              style={{
                fontFamily: "'Playfair Display', serif",
                fontSize: "clamp(2rem, 4vw, 3.5rem)",
                fontWeight: 400,
                lineHeight: 1.1,
                color: "var(--color-text-primary)",
                animationDelay: "0.2s",
              }}
            >
              Let us manage
              <br />
              <span className="text-accent">your portfolio</span>
            </h2>
          </div>

          <div className="grid md:grid-cols-3 gap-8 md:gap-12">
            {[
              {
                step: "01",
                title: "Onboarding",
                description: "We discuss your investment goals, risk appetite, and areas of interest within the collectibles market to build a tailored strategy.",
                delay: "0.3s",
              },
              {
                step: "02",
                title: "Acquisition & Management",
                description: "Our team identifies, acquires, and manages high-conviction positions on your behalf — leveraging decades of market expertise and proprietary data.",
                delay: "0.45s",
              },
              {
                step: "03",
                title: "Transparent Reporting",
                description: "Access your portfolio at any time through our platform. Track valuations, performance, and detailed analytics across all your holdings.",
                delay: "0.6s",
              },
            ].map(({ step, title, description, delay }) => (
              <div
                key={step}
                className={`${isVisible("how-it-works") ? "landing-fade-up" : "opacity-0"}`}
                style={{ animationDelay: delay }}
              >
                <p className="text-accent text-sm tracking-widest mb-4" style={{ fontFamily: "Inter, sans-serif", letterSpacing: "0.2em" }}>
                  {step}
                </p>
                <h3
                  className="text-text-primary mb-3"
                  style={{ fontFamily: "'Playfair Display', serif", fontSize: "1.25rem", fontWeight: 500 }}
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

      {/* Portfolio Preview Section */}
      <section
        id="preview"
        ref={setRef("preview")}
        className="py-32 md:py-40 border-t border-border/30 relative overflow-hidden"
      >
        <div className="max-w-7xl mx-auto px-6 md:px-12 relative">
          <div className="grid md:grid-cols-2 gap-16 md:gap-24">
            <div>
              <p
                className={`text-text-muted tracking-widest uppercase mb-6 ${isVisible("preview") ? "landing-fade-up" : "opacity-0"}`}
                style={{ fontFamily: "Inter, sans-serif", fontSize: "11px", letterSpacing: "0.3em", animationDelay: "0.1s" }}
              >
                The Platform
              </p>
              <h2
                className={`mb-8 ${isVisible("preview") ? "landing-fade-up" : "opacity-0"}`}
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
              <p
                className={`text-text-secondary leading-relaxed ${isVisible("preview") ? "landing-fade-up" : "opacity-0"}`}
                style={{ fontFamily: "'Playfair Display', serif", fontSize: "1.05rem", animationDelay: "0.3s" }}
              >
                Every investor receives secure access to our proprietary platform — providing real-time valuations, performance analytics, and complete transparency across all holdings.
              </p>
            </div>
            <div className={`flex flex-col gap-6 justify-center ${isVisible("preview") ? "landing-fade-up" : "opacity-0"}`} style={{ animationDelay: "0.4s" }}>
              {[
                { label: "Real-Time Valuations", description: "Live pricing data sourced from leading auction houses and marketplaces worldwide." },
                { label: "Performance Analytics", description: "Comprehensive P&L reporting, portfolio charts, and return tracking across every position." },
                { label: "Complete Transparency", description: "Provenance records, condition evidence, and full transaction history for every asset." },
              ].map(({ label, description }) => (
                <div key={label} className="border-l-2 border-accent/30 pl-6">
                  <h3 className="text-text-primary text-sm font-semibold mb-1" style={{ fontFamily: "Inter, sans-serif", letterSpacing: "0.05em" }}>
                    {label}
                  </h3>
                  <p className="text-text-muted text-sm leading-relaxed" style={{ fontFamily: "Inter, sans-serif" }}>
                    {description}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Philosophy Section */}
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
              &ldquo;We invest selectively in culturally significant assets where scarcity and collector demand support enduring investment potential.&rdquo;
            </h2>
            <div
              className={`h-px bg-accent/30 mx-auto mb-8 ${isVisible("values") ? "landing-line-reveal" : "opacity-0"}`}
              style={{ maxWidth: "60px", animationDelay: "0.5s" }}
            />
            <p
              className={`text-text-muted text-sm ${isVisible("values") ? "landing-fade-up" : "opacity-0"}`}
              style={{ fontFamily: "Inter, sans-serif", letterSpacing: "0.1em", animationDelay: "0.6s" }}
            >
              West Investments
            </p>
          </div>
        </div>
      </section>

      {/* Contact Us Section */}
      <section
        id="contact"
        ref={setRef("contact")}
        className="py-32 md:py-40 border-t border-border/30"
      >
        <div className="max-w-7xl mx-auto px-6 md:px-12 text-center">
          <p
            className={`text-text-muted tracking-widest uppercase mb-6 ${isVisible("contact") ? "landing-fade-up" : "opacity-0"}`}
            style={{ fontFamily: "Inter, sans-serif", fontSize: "11px", letterSpacing: "0.3em", animationDelay: "0.1s" }}
          >
            Get In Touch
          </p>
          <h2
            className={`mb-8 ${isVisible("contact") ? "landing-fade-up" : "opacity-0"}`}
            style={{
              fontFamily: "'Playfair Display', serif",
              fontSize: "clamp(2rem, 4vw, 3.5rem)",
              fontWeight: 400,
              lineHeight: 1.1,
              color: "var(--color-text-primary)",
              animationDelay: "0.2s",
            }}
          >
            Contact Us
          </h2>
          <p
            className={`text-text-secondary max-w-md mx-auto mb-12 ${isVisible("contact") ? "landing-fade-up" : "opacity-0"}`}
            style={{ fontFamily: "'Playfair Display', serif", fontSize: "1.05rem", animationDelay: "0.3s" }}
          >
            Interested in learning more about West Investments and how we can manage your collectible asset portfolio? We would be pleased to hear from you.
          </p>
          <a
            href="mailto:info@westinvestments.com"
            className={`inline-flex items-center gap-3 border border-accent text-accent px-10 py-4 hover:bg-accent hover:text-background tracking-widest uppercase ${isVisible("contact") ? "landing-fade-up" : "opacity-0"}`}
            style={{ fontFamily: "Inter, sans-serif", fontSize: "12px", letterSpacing: "0.25em", animationDelay: "0.4s", textDecoration: "none" }}
          >
            <Mail className="w-4 h-4" />
            Get In Touch
          </a>
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
