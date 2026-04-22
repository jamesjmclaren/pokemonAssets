"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useEffect, useRef } from "react";
import {
  TrendingUp,
  FileBarChart,
  ArrowLeftRight,
  MessageCircle,
  Calendar,
  Zap,
  Bell,
  Calculator,
  BarChart3,
  Receipt,
  Clock,
  Camera,
  BadgeCheck,
  Crown,
  Send,
  CheckCircle,
  Shield,
  ShoppingBag,
  EyeOff,
  Users,
  Star,
  ChevronRight,
  Menu,
  X,
} from "lucide-react";

/* ------------------------------------------------------------------ */
/*  Design 1 — "Private Gallery" — Cinematic Editorial                */
/*  Full-bleed imagery, editorial serif typography, film grain,       */
/*  alternating sections, horizontal roadmap, split-screen form       */
/* ------------------------------------------------------------------ */

const TOTAL_SPACES = 1000;
const MEMBERS_FILLED = 0;

interface Feature {
  icon: React.ElementType;
  title: string;
  description: string;
  comingSoon: boolean;
}

const features: Feature[] = [
  { icon: MessageCircle, title: "Private WhatsApp Trading Group", description: "Gain access to a curated private group of quality investors, buyers, and sellers.", comingSoon: false },
  { icon: Calendar, title: "Private Trade Events", description: "Receive access to exclusive trade events and private opportunities. Subject to availability.", comingSoon: false },
  { icon: TrendingUp, title: "Portfolio Tracking", description: "Monitor the value of your collection with daily real-time pricing updates.", comingSoon: false },
  { icon: EyeOff, title: "Ad Free", description: "Enjoy a completely ad-free experience across the entire platform.", comingSoon: false },
  { icon: FileBarChart, title: "Portfolio Reporting", description: "Tailored reports with PDF & CSV export, date-range filtering, and market trend insights. Members get a clearer view of portfolio performance.", comingSoon: false },
  { icon: ArrowLeftRight, title: "Buy, Sell & Trade History", description: "Quickly view comparable pricing across online listings and recent market activity.", comingSoon: true },
  { icon: Zap, title: "Advanced Portfolio Tracking", description: "More powerful tools to monitor the performance and movement of your collection.", comingSoon: true },
  { icon: Bell, title: "Price Alerts & Tracking", description: "Stay informed with alerts on pricing changes and key market movements.", comingSoon: true },
  { icon: Calculator, title: "Trade Calculator", description: "Analyse, compare, and record trades with greater accuracy and confidence.", comingSoon: true },
  { icon: BarChart3, title: "Enhanced Reports, Trends & Analytics", description: "Deeper insights to support more informed collecting and trading decisions.", comingSoon: true },
  { icon: Receipt, title: "Tax Reporting Support", description: "UK tax-year presets (6 April – 5 April), realised-gains breakdown, and GBP conversion alongside USD for accounting preparation.", comingSoon: false },
  { icon: Clock, title: "Daily Movers", description: "See the biggest day-over-day price changes across your portfolio, powered by daily aggregated market data from Poketrace.", comingSoon: true },
  { icon: Camera, title: "Camera Search", description: "Use your camera to search millions of cards instantly.", comingSoon: true },
  { icon: BadgeCheck, title: "Verified Vendor Profiles", description: "Connect with trusted vendors through verified profiles.", comingSoon: true },
  { icon: ShoppingBag, title: "eBay LotBot", description: "See the total value of eBay lots with multiple items and find lots listed below the market value of everything included.", comingSoon: true },
];

export default function Design1() {
  const router = useRouter();
  const spacesRemaining = TOTAL_SPACES - MEMBERS_FILLED;
  const [formName, setFormName] = useState("");
  const [whatsapp, setWhatsapp] = useState("");
  const [dob, setDob] = useState("");
  const [profile, setProfile] = useState("");
  const [interests, setInterests] = useState("");
  const [referral, setReferral] = useState("");
  const [submitted, setSubmitted] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [visibleSections, setVisibleSections] = useState<Set<string>>(new Set());
  const sectionRefs = useRef<Map<string, HTMLElement>>(new Map());

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            setVisibleSections((prev) => new Set(prev).add(entry.target.id));
          }
        });
      },
      { threshold: 0.1 }
    );
    sectionRefs.current.forEach((el) => observer.observe(el));
    return () => observer.disconnect();
  }, []);

  const setRef = (id: string) => (el: HTMLElement | null) => {
    if (el) sectionRefs.current.set(id, el);
  };
  const isVisible = (id: string) => visibleSections.has(id);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formName.trim() || !whatsapp.trim() || !dob.trim()) return;
    setSubmitting(true);
    setError("");
    try {
      const res = await fetch("/api/stripe/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: formName.trim(), whatsapp: whatsapp.trim(), dob: dob.trim(), profile: profile.trim(), interests: interests.trim(), referral: referral.trim() }),
      });
      if (!res.ok) { const data = await res.json(); throw new Error(data.error || "Something went wrong."); }
      const data = await res.json();
      if (data.url) {
        window.location.href = data.url;
      } else {
        throw new Error("No checkout URL returned.");
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong. Please try again.");
      setSubmitting(false);
    }
  };

  const activeFeatures = features.filter((f) => !f.comingSoon);
  const comingSoonFeatures = features.filter((f) => f.comingSoon);

  return (
    <div className="min-h-screen" style={{ fontFamily: "'Cormorant Garamond', Georgia, serif" }}>
      {/* Google Font */}
      <style>{`@import url('https://fonts.googleapis.com/css2?family=Cormorant+Garamond:ital,wght@0,300;0,400;0,500;0,600;1,300;1,400&display=swap');`}</style>

      {/* Navigation */}
      <nav className="fixed top-0 left-0 right-0 z-50 landing-fade-in border-b border-border/20" style={{ animationDelay: "0.2s", backdropFilter: "blur(16px)", backgroundColor: "rgba(10,10,10,0.9)" }}>
        <div className="max-w-7xl mx-auto px-6 md:px-12 py-5 flex items-center justify-between">
          <Link href="/"><img src="/logo.png" alt="West Investments" className="h-10 md:h-12 object-contain" /></Link>
          <div className="hidden md:flex items-center gap-10">
            <Link href="/" className="text-text-secondary hover:text-text-primary transition-colors" style={{ fontFamily: "Inter, sans-serif", letterSpacing: "0.12em", fontSize: "11px", textTransform: "uppercase" }}>Home</Link>
            <a href="#features" className="text-text-secondary hover:text-text-primary transition-colors" style={{ fontFamily: "Inter, sans-serif", letterSpacing: "0.12em", fontSize: "11px", textTransform: "uppercase" }}>Features</a>
            <button onClick={() => router.push("/sign-in")} className="text-xs tracking-widest uppercase border border-accent/40 text-accent px-6 py-2.5 hover:bg-accent hover:text-background transition-all cursor-pointer" style={{ fontFamily: "Inter, sans-serif", letterSpacing: "0.2em" }}>Client Login</button>
          </div>
          <button onClick={() => setMobileMenuOpen(!mobileMenuOpen)} className="md:hidden p-2 -mr-2 text-text-secondary hover:text-text-primary" aria-label="Toggle menu">
            {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        </div>
        {mobileMenuOpen && (
          <div className="md:hidden border-t border-border/20 px-6 py-4 space-y-1" style={{ backgroundColor: "rgba(10,10,10,0.95)" }}>
            <Link href="/" onClick={() => setMobileMenuOpen(false)} className="block py-3 text-text-secondary hover:text-text-primary" style={{ fontFamily: "Inter, sans-serif", letterSpacing: "0.12em", fontSize: "11px", textTransform: "uppercase" }}>Home</Link>
            <a href="#features" onClick={() => setMobileMenuOpen(false)} className="block py-3 text-text-secondary hover:text-text-primary" style={{ fontFamily: "Inter, sans-serif", letterSpacing: "0.12em", fontSize: "11px", textTransform: "uppercase" }}>Features</a>
            <button onClick={() => { setMobileMenuOpen(false); router.push("/sign-in"); }} className="w-full mt-2 text-xs tracking-widest uppercase border border-accent/40 text-accent px-6 py-2.5 hover:bg-accent hover:text-background transition-all cursor-pointer" style={{ fontFamily: "Inter, sans-serif", letterSpacing: "0.2em" }}>Client Login</button>
          </div>
        )}
      </nav>

      {/* ============ HERO — Full-bleed cinematic ============ */}
      <section className="relative min-h-screen flex items-end pb-24 overflow-hidden">
        {/* Background — West Investments logo watermark (emblem only, no text) */}
        <div className="absolute inset-0 z-0 bg-background">
          <div className="absolute inset-0 flex items-center justify-center">
            <img
              src="/logo.png"
              alt=""
              className="w-[500px] md:w-[700px] lg:w-[800px] object-contain"
              style={{ opacity: 0.06, clipPath: "inset(0 0 30% 0)" }}
            />
          </div>
          <div className="absolute inset-0" style={{ background: "linear-gradient(to top, rgba(8,8,8,1) 0%, rgba(8,8,8,0.6) 40%, rgba(8,8,8,0.3) 100%)" }} />
        </div>

        <div className="relative z-10 max-w-7xl mx-auto px-6 md:px-12 w-full">
          <div className="max-w-3xl">
            <p className="text-accent text-xs uppercase tracking-[0.35em] mb-6 landing-fade-up" style={{ fontFamily: "Inter, sans-serif", animationDelay: "0.4s" }}>
              Exclusive — Limited to {TOTAL_SPACES.toLocaleString()} members worldwide
            </p>
            <h1 className="text-5xl md:text-7xl lg:text-8xl font-light text-text-primary leading-[0.95] mb-8 landing-fade-up" style={{ animationDelay: "0.6s" }}>
              Join the<br />Collectibles<br /><em className="text-accent font-light italic">Community</em>
            </h1>
            <p className="text-text-secondary text-lg md:text-xl leading-relaxed max-w-xl mb-10 landing-fade-up" style={{ animationDelay: "0.8s", fontFamily: "Inter, sans-serif", fontWeight: 300 }}>
              Join our exclusive global collectibles community and enjoy immediate access to member benefits. Complete the form and we&apos;ll be in touch to confirm your membership. Gain access to high-end collectible opportunities before they appear on public marketplaces.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 landing-fade-up" style={{ animationDelay: "1s" }}>
              <a href="#subscribe" className="inline-flex items-center gap-3 px-8 py-4 bg-accent text-background text-sm font-medium tracking-widest uppercase hover:bg-accent-hover transition-colors" style={{ fontFamily: "Inter, sans-serif", letterSpacing: "0.15em" }}>
                Apply for Membership <ChevronRight className="w-4 h-4" />
              </a>
              <a href="#features" className="inline-flex items-center gap-3 px-8 py-4 border border-text-muted/30 text-text-secondary text-sm tracking-widest uppercase hover:border-accent/50 hover:text-text-primary transition-all" style={{ fontFamily: "Inter, sans-serif", letterSpacing: "0.15em" }}>
                Explore Benefits
              </a>
            </div>
          </div>
        </div>
      </section>

      {/* ============ STATS BAR ============ */}
      <section
        id="stats-bar"
        ref={setRef("stats-bar")}
        className="border-y border-border/30 py-0"
        style={{ opacity: isVisible("stats-bar") ? 1 : 0, transform: isVisible("stats-bar") ? "none" : "translateY(20px)", transition: "all 0.8s cubic-bezier(0.16, 1, 0.3, 1)" }}
      >
        <div className="max-w-7xl mx-auto grid grid-cols-1 md:grid-cols-3 divide-y md:divide-y-0 md:divide-x divide-border/30">
          {[
            { value: `${spacesRemaining.toLocaleString()}`, label: "Spaces Available", sub: `of ${TOTAL_SPACES.toLocaleString()} total` },
            { value: "100%", label: "Fair Market Value", sub: "for qualifying assets" },
            { value: "£270", label: "Per Year", sub: "all features included" },
          ].map((stat) => (
            <div key={stat.label} className="px-8 py-10 md:py-12 text-center">
              <p className="text-4xl md:text-5xl font-light text-accent mb-2">{stat.value}</p>
              <p className="text-text-primary text-sm tracking-widest uppercase mb-1" style={{ fontFamily: "Inter, sans-serif", letterSpacing: "0.2em", fontSize: "10px" }}>{stat.label}</p>
              <p className="text-text-muted text-xs" style={{ fontFamily: "Inter, sans-serif" }}>{stat.sub}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ============ VALUE PROPOSITION ============ */}
      <section
        id="value-prop"
        ref={setRef("value-prop")}
        className="py-24 md:py-32 px-6 md:px-12"
        style={{ opacity: isVisible("value-prop") ? 1 : 0, transform: isVisible("value-prop") ? "none" : "translateY(30px)", transition: "all 0.8s cubic-bezier(0.16, 1, 0.3, 1)" }}
      >
        <div className="max-w-5xl mx-auto text-center">
          <p className="text-accent text-xs uppercase tracking-[0.3em] mb-6" style={{ fontFamily: "Inter, sans-serif" }}>Why West Investments</p>
          <h2 className="text-3xl md:text-5xl font-light text-text-primary leading-tight mb-8">
            Within our community, we are committed to offering <em className="text-accent italic">100% of fair market value</em> for qualifying assets
          </h2>
          <div className="w-24 h-px bg-accent/40 mx-auto mb-8" />
          <p className="text-text-secondary text-lg leading-relaxed max-w-2xl mx-auto" style={{ fontFamily: "Inter, sans-serif", fontWeight: 300 }}>
            More than a portfolio tool — a private network of serious collectors, investors, and traders who value discretion, quality, and fair dealing.
          </p>
        </div>
      </section>

      {/* ============ TRUST INDICATORS ============ */}
      <section
        id="trust"
        ref={setRef("trust")}
        className="pb-24 px-6 md:px-12"
        style={{ opacity: isVisible("trust") ? 1 : 0, transform: isVisible("trust") ? "none" : "translateY(30px)", transition: "all 0.8s cubic-bezier(0.16, 1, 0.3, 1)" }}
      >
        <div className="max-w-5xl mx-auto grid grid-cols-1 md:grid-cols-3 gap-8">
          {[
            { icon: Shield, title: "Vetted Members", desc: "Every member is reviewed to maintain community quality and trust." },
            { icon: Users, title: "Private Network", desc: "Direct access to serious collectors, investors, and verified vendors." },
            { icon: Star, title: "Premium Tools", desc: "Professional-grade portfolio tracking, analytics, and reporting." },
          ].map((item) => (
            <div key={item.title} className="text-center px-6">
              <div className="w-14 h-14 rounded-full border border-accent/20 flex items-center justify-center mx-auto mb-5">
                <item.icon className="w-6 h-6 text-accent" />
              </div>
              <h3 className="text-text-primary text-xl font-light mb-3">{item.title}</h3>
              <p className="text-text-secondary text-sm leading-relaxed" style={{ fontFamily: "Inter, sans-serif", fontWeight: 300 }}>{item.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ============ FEATURES — Active ============ */}
      <section
        id="features"
        ref={setRef("features")}
        className="py-24 md:py-32 px-6 md:px-12 bg-surface/50"
        style={{ opacity: isVisible("features") ? 1 : 0, transform: isVisible("features") ? "none" : "translateY(30px)", transition: "all 0.8s cubic-bezier(0.16, 1, 0.3, 1)" }}
      >
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-16">
            <p className="text-accent text-xs uppercase tracking-[0.3em] mb-4" style={{ fontFamily: "Inter, sans-serif" }}>Included Today</p>
            <h2 className="text-3xl md:text-5xl font-light text-text-primary mb-6">Included With Your Membership</h2>
            <div className="w-24 h-px bg-accent/40 mx-auto" />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {activeFeatures.map((f, i) => {
              const Icon = f.icon;
              return (
                <div key={f.title} className="relative bg-background border border-border rounded-2xl p-8 hover:border-accent/30 transition-all duration-500 group" style={{ transitionDelay: `${i * 100}ms` }}>
                  <div className="w-12 h-12 rounded-xl bg-accent/10 flex items-center justify-center mb-5 group-hover:bg-accent/20 transition-colors">
                    <Icon className="w-6 h-6 text-accent" />
                  </div>
                  <h3 className="text-text-primary text-xl font-light mb-3">{f.title}</h3>
                  <p className="text-text-secondary text-sm leading-relaxed" style={{ fontFamily: "Inter, sans-serif", fontWeight: 300 }}>{f.description}</p>
                  <div className="absolute top-6 right-6">
                    <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-success/10 text-success text-[10px] font-bold uppercase tracking-widest" style={{ fontFamily: "Inter, sans-serif" }}>
                      <span className="w-1.5 h-1.5 rounded-full bg-success" /> Live
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* ============ ROADMAP — Coming Soon ============ */}
      <section
        id="roadmap"
        ref={setRef("roadmap")}
        className="py-24 md:py-32 px-6 md:px-12"
        style={{ opacity: isVisible("roadmap") ? 1 : 0, transform: isVisible("roadmap") ? "none" : "translateY(30px)", transition: "all 0.8s cubic-bezier(0.16, 1, 0.3, 1)" }}
      >
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-16">
            <p className="text-accent text-xs uppercase tracking-[0.3em] mb-4" style={{ fontFamily: "Inter, sans-serif" }}>On the Roadmap</p>
            <h2 className="text-3xl md:text-5xl font-light text-text-primary mb-6">Coming Soon</h2>
            <p className="text-text-secondary text-sm max-w-lg mx-auto mb-6" style={{ fontFamily: "Inter, sans-serif", fontWeight: 300 }}>
              We&apos;re building more tools and features for our members. These are on the roadmap and included in your membership at no extra cost.
            </p>
            <div className="w-24 h-px bg-accent/40 mx-auto" />
          </div>

          {/* Horizontal timeline on desktop, vertical on mobile */}
          <div className="relative">
            {/* Connecting line */}
            <div className="hidden md:block absolute top-6 left-0 right-0 h-px bg-border/50" />

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
              {comingSoonFeatures.map((f, i) => {
                const Icon = f.icon;
                return (
                  <div key={f.title} className="relative bg-surface border border-border rounded-2xl p-6 hover:border-accent/20 transition-all duration-300 group">
                    <div className="absolute top-4 right-4">
                      <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-red-500/10 text-red-500 text-[10px] font-bold tracking-widest" style={{ fontFamily: "Inter, sans-serif" }}>* Not Live</span>
                    </div>
                    <div className="flex items-start gap-4">
                      <div className="w-10 h-10 rounded-lg bg-accent/5 flex items-center justify-center shrink-0 group-hover:bg-accent/10 transition-colors">
                        <Icon className="w-5 h-5 text-accent/60 group-hover:text-accent transition-colors" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap mb-1">
                          <h3 className="text-text-primary text-sm font-medium" style={{ fontFamily: "Inter, sans-serif" }}>{f.title}</h3>
                        </div>
                        <p className="text-text-muted text-xs leading-relaxed" style={{ fontFamily: "Inter, sans-serif", fontWeight: 300 }}>{f.description}</p>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </section>

      {/* ============ SUBSCRIBE — Split screen ============ */}
      <section id="subscribe" className="py-24 md:py-32 px-6 md:px-12 bg-surface/30">
        <div className="max-w-6xl mx-auto">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 lg:gap-20 items-start">
            {/* Left — Messaging */}
            <div className="lg:sticky lg:top-32">
              <p className="text-accent text-xs uppercase tracking-[0.3em] mb-6" style={{ fontFamily: "Inter, sans-serif" }}>Become a Member</p>
              <h2 className="text-4xl md:text-5xl font-light text-text-primary leading-tight mb-8">
                Your place in the<br /><em className="text-accent italic">inner circle</em>
              </h2>
              <div className="w-16 h-px bg-accent/40 mb-8" />
              <p className="text-text-secondary text-lg leading-relaxed mb-8" style={{ fontFamily: "Inter, sans-serif", fontWeight: 300 }}>
                Join our collectibles community and get instant access to all membership benefits. Complete the form and we&apos;ll be in touch via WhatsApp to confirm your membership.
              </p>
              <div className="flex items-baseline gap-2 mb-3">
                <span className="text-4xl text-accent font-light">£270</span>
                <span className="text-text-muted text-sm" style={{ fontFamily: "Inter, sans-serif" }}>per year</span>
              </div>
              <p className="text-text-muted text-xs" style={{ fontFamily: "Inter, sans-serif" }}>All current and upcoming features included. No hidden fees.</p>

              {/* Decorative image */}
              <div className="hidden lg:block mt-12 rounded-2xl overflow-hidden border border-border/30" style={{ aspectRatio: "16/9" }}>
                <img
                  src="/collectibles-banner.png"
                  alt="Collectibles"
                  className="w-full h-full object-cover"
                  style={{ filter: "grayscale(100%) brightness(0.6)" }}
                />
              </div>
            </div>

            {/* Right — Form */}
            <div>
              <div className="bg-background border border-accent/15 rounded-2xl p-8 md:p-10">
                {submitted ? (
                  <div className="text-center py-12">
                    <CheckCircle className="w-14 h-14 text-success mx-auto mb-5" />
                    <h4 className="text-2xl font-light text-text-primary mb-3">Subscription Received</h4>
                    <p className="text-text-secondary text-sm" style={{ fontFamily: "Inter, sans-serif", fontWeight: 300 }}>
                      Thank you for subscribing. We will be in touch shortly via WhatsApp to confirm your membership.
                    </p>
                  </div>
                ) : (
                  <form onSubmit={handleSubmit} className="space-y-5">
                    <div className="text-center mb-8">
                      <h3 className="text-2xl font-light text-text-primary mb-2">Subscribe</h3>
                      <div className="w-12 h-px bg-accent/30 mx-auto" />
                    </div>

                    {[
                      { id: "name", label: "Full Name", type: "text", required: true, value: formName, onChange: setFormName, placeholder: "Enter your full name" },
                      { id: "whatsapp", label: "Number", type: "tel", required: true, value: whatsapp, onChange: setWhatsapp, placeholder: "+44 7700 000000" },
                      { id: "dob", label: "Date of Birth", type: "date", required: true, value: dob, onChange: setDob, placeholder: "" },
                      { id: "interests", label: "Interests", type: "text", required: false, value: interests, onChange: setInterests, placeholder: "e.g. Pokémon, Comics, Sports Cards" },
                      { id: "referral", label: "Referral Name", type: "text", required: false, value: referral, onChange: setReferral, placeholder: "Who referred you?", optional: true },
                    ].map((field) => (
                      <div key={field.id}>
                        <label htmlFor={field.id} className="block text-xs text-text-muted uppercase tracking-widest mb-2" style={{ fontFamily: "Inter, sans-serif" }}>
                          {field.label}{" "}
                          {"optional" in field && <span className="normal-case tracking-normal text-text-muted/60">(optional)</span>}
                        </label>
                        <input
                          id={field.id}
                          type={field.type}
                          required={field.required}
                          value={field.value}
                          onChange={(e) => field.onChange(e.target.value)}
                          placeholder={field.placeholder}
                          className="w-full px-4 py-3 bg-surface-hover border border-border rounded-xl text-text-primary text-sm placeholder:text-text-muted focus:outline-none focus:border-accent/50 focus:ring-1 focus:ring-accent/20"
                          style={{ fontFamily: "Inter, sans-serif" }}
                        />
                      </div>
                    ))}

                    <div>
                      <label htmlFor="profile" className="block text-xs text-text-muted uppercase tracking-widest mb-2" style={{ fontFamily: "Inter, sans-serif" }}>Profile</label>
                      <textarea
                        id="profile"
                        value={profile}
                        onChange={(e) => setProfile(e.target.value)}
                        placeholder="Tell us a bit about yourself"
                        rows={3}
                        className="w-full px-4 py-3 bg-surface-hover border border-border rounded-xl text-text-primary text-sm placeholder:text-text-muted focus:outline-none focus:border-accent/50 focus:ring-1 focus:ring-accent/20 resize-none"
                        style={{ fontFamily: "Inter, sans-serif" }}
                      />
                    </div>

                    {error && <p className="text-danger text-sm text-center">{error}</p>}

                    <button
                      type="submit"
                      disabled={submitting}
                      className="w-full inline-flex items-center justify-center gap-3 px-8 py-4 bg-accent text-background text-sm font-medium tracking-widest uppercase hover:bg-accent-hover transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                      style={{ fontFamily: "Inter, sans-serif", letterSpacing: "0.15em" }}
                    >
                      {submitting ? "Processing..." : "Pay Now — £270/yr"}
                      {!submitting && <Send className="w-4 h-4" />}
                    </button>

                    <p className="text-text-muted text-[10px] text-center leading-relaxed" style={{ fontFamily: "Inter, sans-serif" }}>
                      By subscribing you agree to our <Link href="/terms" className="underline hover:text-text-secondary">Terms</Link> and <Link href="/privacy" className="underline hover:text-text-secondary">Privacy Policy</Link>
                    </p>
                  </form>
                )}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Referral Bonus Note */}
      <section className="px-6 md:px-12 py-12">
        <div className="max-w-5xl mx-auto text-center">
          <p className="text-text-secondary text-sm leading-relaxed" style={{ fontFamily: "Inter, sans-serif", fontWeight: 300 }}>
            ** £20 referral bonus for approved and onboarded community members. Please put their full names. Eg. Paul Smith.
          </p>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-border/30 py-10 px-6 md:px-12">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-4">
          <img src="/logo.png" alt="West Investments" className="h-8 object-contain opacity-50" />
          <div className="flex items-center gap-6 text-xs text-text-muted" style={{ fontFamily: "Inter, sans-serif" }}>
            <Link href="/terms" className="hover:text-text-secondary">Terms</Link>
            <Link href="/privacy" className="hover:text-text-secondary">Privacy</Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
