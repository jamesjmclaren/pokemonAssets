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
  ArrowRight,
  Lock,
  Layers,
  Menu,
  X,
} from "lucide-react";

/* ------------------------------------------------------------------ */
/*  Design 4 — "Command Deck" — Tech-Forward / Data-Driven            */
/*  Glassmorphism, bento grid, animated gradient mesh, dashboard      */
/*  preview, pill badges, monospace accents, sleek and modern         */
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
  { icon: FileBarChart, title: "Portfolio Reporting", description: "Access tailored reports, market trends, and portfolio analytics designed to give you a clearer view of performance.", comingSoon: true },
  { icon: ArrowLeftRight, title: "Buy, Sell & Trade History", description: "Quickly view comparable pricing across online listings and recent market activity.", comingSoon: true },
  { icon: Zap, title: "Advanced Portfolio Tracking", description: "More powerful tools to monitor the performance and movement of your collection.", comingSoon: true },
  { icon: Bell, title: "Price Alerts & Tracking", description: "Stay informed with alerts on pricing changes and key market movements.", comingSoon: true },
  { icon: Calculator, title: "Trade Calculator", description: "Analyse, compare, and record trades with greater accuracy and confidence.", comingSoon: true },
  { icon: BarChart3, title: "Enhanced Reports, Trends & Analytics", description: "Deeper insights to support more informed collecting and trading decisions.", comingSoon: true },
  { icon: Receipt, title: "Tax Reporting Support", description: "Simplified reports designed to assist with tax and accounting preparation.", comingSoon: true },
  { icon: Clock, title: "Daily Sales Recap", description: "Browse verified sales from the previous day in one easy-to-view summary.", comingSoon: true },
  { icon: Camera, title: "Camera Search", description: "Use your camera to search millions of cards instantly.", comingSoon: true },
  { icon: BadgeCheck, title: "Verified Vendor Profiles", description: "Connect with trusted vendors through verified profiles.", comingSoon: true },
];

export default function Design4() {
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
      const res = await fetch("/api/community", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: formName.trim(), whatsapp: whatsapp.trim(), dob: dob.trim(), profile: profile.trim(), interests: interests.trim(), referral: referral.trim() }),
      });
      if (!res.ok) { const data = await res.json(); throw new Error(data.error || "Something went wrong."); }
      setSubmitted(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  const activeFeatures = features.filter((f) => !f.comingSoon);
  const comingSoonFeatures = features.filter((f) => f.comingSoon);

  return (
    <div className="min-h-screen" style={{ fontFamily: "'Sora', sans-serif" }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Sora:wght@200;300;400;500;600&family=JetBrains+Mono:wght@400;500&display=swap');
        @keyframes meshFloat {
          0%, 100% { transform: translate(0, 0) scale(1); }
          25% { transform: translate(30px, -40px) scale(1.05); }
          50% { transform: translate(-20px, 20px) scale(0.95); }
          75% { transform: translate(10px, 30px) scale(1.02); }
        }
        @keyframes glow {
          0%, 100% { opacity: 0.4; }
          50% { opacity: 0.7; }
        }
      `}</style>

      {/* Navigation */}
      <nav className="fixed top-0 left-0 right-0 z-50 landing-fade-in border-b border-border/20" style={{ animationDelay: "0.2s", backdropFilter: "blur(16px)", backgroundColor: "rgba(10,10,10,0.9)" }}>
        <div className="max-w-7xl mx-auto px-6 md:px-12 py-5 flex items-center justify-between">
          <Link href="/"><img src="/logo.png" alt="West Investments" className="h-10 md:h-12 object-contain" /></Link>
          <div className="hidden md:flex items-center gap-10">
            <Link href="/" className="text-text-secondary hover:text-text-primary transition-colors" style={{ fontFamily: "Inter, sans-serif", letterSpacing: "0.12em", fontSize: "11px", textTransform: "uppercase" }}>Home</Link>
            <a href="#platform" className="text-text-secondary hover:text-text-primary transition-colors" style={{ fontFamily: "Inter, sans-serif", letterSpacing: "0.12em", fontSize: "11px", textTransform: "uppercase" }}>Platform</a>
            <a href="#subscribe" className="text-text-secondary hover:text-text-primary transition-colors" style={{ fontFamily: "Inter, sans-serif", letterSpacing: "0.12em", fontSize: "11px", textTransform: "uppercase" }}>Join</a>
            <button onClick={() => router.push("/sign-in")} className="text-xs tracking-widest uppercase border border-accent/40 text-accent px-6 py-2.5 hover:bg-accent hover:text-background transition-all cursor-pointer" style={{ fontFamily: "Inter, sans-serif", letterSpacing: "0.2em" }}>Client Login</button>
          </div>
          <button onClick={() => setMobileMenuOpen(!mobileMenuOpen)} className="md:hidden p-2 -mr-2 text-text-secondary hover:text-text-primary" aria-label="Toggle menu">
            {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        </div>
        {mobileMenuOpen && (
          <div className="md:hidden border-t border-border/20 px-6 py-4 space-y-1" style={{ backgroundColor: "rgba(10,10,10,0.95)" }}>
            <Link href="/" onClick={() => setMobileMenuOpen(false)} className="block py-3 text-text-secondary hover:text-text-primary" style={{ fontFamily: "Inter, sans-serif", letterSpacing: "0.12em", fontSize: "11px", textTransform: "uppercase" }}>Home</Link>
            <a href="#platform" onClick={() => setMobileMenuOpen(false)} className="block py-3 text-text-secondary hover:text-text-primary" style={{ fontFamily: "Inter, sans-serif", letterSpacing: "0.12em", fontSize: "11px", textTransform: "uppercase" }}>Platform</a>
            <a href="#subscribe" onClick={() => setMobileMenuOpen(false)} className="block py-3 text-text-secondary hover:text-text-primary" style={{ fontFamily: "Inter, sans-serif", letterSpacing: "0.12em", fontSize: "11px", textTransform: "uppercase" }}>Join</a>
            <button onClick={() => { setMobileMenuOpen(false); router.push("/sign-in"); }} className="w-full mt-2 text-xs tracking-widest uppercase border border-accent/40 text-accent px-6 py-2.5 hover:bg-accent hover:text-background transition-all cursor-pointer" style={{ fontFamily: "Inter, sans-serif", letterSpacing: "0.2em" }}>Client Login</button>
          </div>
        )}
      </nav>

      {/* ============ HERO — Animated mesh gradient ============ */}
      <section className="relative min-h-screen flex items-center overflow-hidden px-6 md:px-12">
        {/* Animated gradient mesh */}
        <div className="absolute inset-0 overflow-hidden">
          <div className="absolute w-[600px] h-[600px] rounded-full opacity-20 blur-[120px]" style={{ background: "radial-gradient(circle, #D4AF37 0%, transparent 70%)", top: "10%", left: "60%", animation: "meshFloat 15s ease-in-out infinite" }} />
          <div className="absolute w-[400px] h-[400px] rounded-full opacity-10 blur-[100px]" style={{ background: "radial-gradient(circle, #E5C158 0%, transparent 70%)", bottom: "20%", left: "10%", animation: "meshFloat 20s ease-in-out infinite reverse" }} />
          <div className="absolute w-[300px] h-[300px] rounded-full opacity-10 blur-[80px]" style={{ background: "radial-gradient(circle, #D4AF37 0%, transparent 70%)", top: "50%", right: "20%", animation: "meshFloat 12s ease-in-out infinite 3s" }} />
          {/* Grid lines */}
          <div className="absolute inset-0 opacity-[0.03]" style={{ backgroundImage: "linear-gradient(#D4AF37 1px, transparent 1px), linear-gradient(90deg, #D4AF37 1px, transparent 1px)", backgroundSize: "60px 60px" }} />
        </div>

        <div className="relative z-10 max-w-7xl mx-auto w-full py-32">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
            {/* Left — text */}
            <div>
              <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full border border-accent/20 mb-8 landing-fade-up" style={{ backdropFilter: "blur(8px)", backgroundColor: "rgba(212,175,55,0.05)", animationDelay: "0.4s" }}>
                <Lock className="w-3.5 h-3.5 text-accent" />
                <span className="text-accent text-xs font-medium" style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: "11px" }}>
                  {spacesRemaining.toLocaleString()}/{TOTAL_SPACES.toLocaleString()} SLOTS OPEN
                </span>
              </div>

              <h1 className="text-4xl md:text-6xl font-extralight text-text-primary leading-[1.1] mb-8 landing-fade-up" style={{ animationDelay: "0.6s" }}>
                The collectibles platform built for <span className="text-accent font-light">serious investors</span>
              </h1>

              <p className="text-text-secondary text-lg leading-relaxed max-w-lg mb-10 landing-fade-up" style={{ animationDelay: "0.8s", fontWeight: 300 }}>
                Membership to the West Investments exclusive community is intentionally limited to just {TOTAL_SPACES.toLocaleString()} clients worldwide. Within our community, we are committed to offering <span className="text-accent font-medium">100%</span> of fair market value for qualifying assets.
              </p>

              <div className="flex flex-col sm:flex-row gap-4 landing-fade-up" style={{ animationDelay: "1s" }}>
                <a href="#subscribe" className="inline-flex items-center gap-3 px-8 py-4 bg-accent text-background text-sm font-medium tracking-wider hover:bg-accent-hover transition-colors rounded-lg">
                  Get Access <ArrowRight className="w-4 h-4" />
                </a>
                <a href="#platform" className="inline-flex items-center gap-3 px-8 py-4 border border-border text-text-secondary text-sm tracking-wider hover:border-accent/30 hover:text-text-primary transition-all rounded-lg" style={{ backdropFilter: "blur(8px)", backgroundColor: "rgba(17,17,17,0.5)" }}>
                  See Features
                </a>
              </div>
            </div>

            {/* Right — dashboard mockup */}
            <div className="hidden lg:block landing-fade-up" style={{ animationDelay: "0.8s" }}>
              <div className="relative">
                {/* Glow behind */}
                <div className="absolute -inset-4 rounded-2xl opacity-30 blur-2xl" style={{ background: "linear-gradient(135deg, rgba(212,175,55,0.2) 0%, transparent 50%, rgba(212,175,55,0.1) 100%)" }} />

                {/* Mock dashboard card */}
                <div className="relative rounded-2xl border border-border/50 overflow-hidden" style={{ backdropFilter: "blur(20px)", backgroundColor: "rgba(17,17,17,0.8)" }}>
                  {/* Title bar */}
                  <div className="flex items-center gap-2 px-5 py-3 border-b border-border/30">
                    <div className="flex gap-1.5">
                      <div className="w-2.5 h-2.5 rounded-full bg-danger/60" />
                      <div className="w-2.5 h-2.5 rounded-full bg-warning/60" />
                      <div className="w-2.5 h-2.5 rounded-full bg-success/60" />
                    </div>
                    <span className="text-text-muted text-[10px] ml-2" style={{ fontFamily: "'JetBrains Mono', monospace" }}>portfolio.westinvestments.co.uk</span>
                  </div>

                  {/* Mock content */}
                  <div className="p-5 space-y-4">
                    {/* Stats row */}
                    <div className="grid grid-cols-3 gap-3">
                      {[
                        { label: "Portfolio Value", value: "£24,850", change: "+12.4%" },
                        { label: "Total Assets", value: "47", change: "+3" },
                        { label: "Monthly Return", value: "£2,130", change: "+8.7%" },
                      ].map((s) => (
                        <div key={s.label} className="bg-surface-hover/50 rounded-lg p-3 border border-border/20">
                          <p className="text-text-muted text-[9px] uppercase tracking-wider mb-1" style={{ fontFamily: "'JetBrains Mono', monospace" }}>{s.label}</p>
                          <p className="text-text-primary text-sm font-medium">{s.value}</p>
                          <p className="text-success text-[10px]" style={{ fontFamily: "'JetBrains Mono', monospace" }}>{s.change}</p>
                        </div>
                      ))}
                    </div>

                    {/* Mock chart */}
                    <div className="bg-surface-hover/30 rounded-lg p-4 border border-border/20" style={{ height: "120px" }}>
                      <svg viewBox="0 0 400 100" className="w-full h-full" preserveAspectRatio="none">
                        <defs>
                          <linearGradient id="chartGrad" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="0%" stopColor="#D4AF37" stopOpacity="0.3" />
                            <stop offset="100%" stopColor="#D4AF37" stopOpacity="0" />
                          </linearGradient>
                        </defs>
                        <path d="M0,80 Q50,70 100,60 T200,40 T300,25 T400,15 L400,100 L0,100 Z" fill="url(#chartGrad)" />
                        <path d="M0,80 Q50,70 100,60 T200,40 T300,25 T400,15" fill="none" stroke="#D4AF37" strokeWidth="2" />
                      </svg>
                    </div>

                    {/* Mock asset list */}
                    <div className="space-y-2">
                      {["Charizard VMAX", "PSA 10 Base Set", "Booster Box"].map((name) => (
                        <div key={name} className="flex items-center justify-between py-2 px-3 bg-surface-hover/30 rounded-lg border border-border/10">
                          <div className="flex items-center gap-3">
                            <div className="w-6 h-6 rounded bg-accent/10" />
                            <span className="text-text-primary text-xs">{name}</span>
                          </div>
                          <span className="text-success text-[10px]" style={{ fontFamily: "'JetBrains Mono', monospace" }}>+{(Math.random() * 20 + 5).toFixed(1)}%</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ============ METRICS BAR ============ */}
      <section
        id="metrics"
        ref={setRef("metrics")}
        className="py-6 px-6 md:px-12 border-y border-border/20"
        style={{ opacity: isVisible("metrics") ? 1 : 0, transform: isVisible("metrics") ? "none" : "translateY(20px)", transition: "all 0.8s cubic-bezier(0.16, 1, 0.3, 1)" }}
      >
        <div className="max-w-7xl mx-auto flex flex-wrap items-center justify-center gap-8 md:gap-16 py-4">
          {[
            { value: spacesRemaining.toLocaleString(), label: "SPACES LEFT" },
            { value: "£270", label: "PER YEAR" },
            { value: "100%", label: "FAIR MARKET" },
            { value: "13+", label: "FEATURES" },
          ].map((m) => (
            <div key={m.label} className="text-center">
              <p className="text-accent text-2xl md:text-3xl font-extralight mb-1">{m.value}</p>
              <p className="text-text-muted text-[9px] tracking-[0.3em] uppercase" style={{ fontFamily: "'JetBrains Mono', monospace" }}>{m.label}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ============ PLATFORM — Bento Grid ============ */}
      <section
        id="platform"
        ref={setRef("platform")}
        className="py-24 md:py-32 px-6 md:px-12"
        style={{ opacity: isVisible("platform") ? 1 : 0, transform: isVisible("platform") ? "none" : "translateY(30px)", transition: "all 0.8s cubic-bezier(0.16, 1, 0.3, 1)" }}
      >
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-16">
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full border border-accent/20 mb-6" style={{ backgroundColor: "rgba(212,175,55,0.05)" }}>
              <Layers className="w-3.5 h-3.5 text-accent" />
              <span className="text-accent text-[10px] uppercase tracking-widest font-medium" style={{ fontFamily: "'JetBrains Mono', monospace" }}>Active Features</span>
            </div>
            <h2 className="text-3xl md:text-5xl font-extralight text-text-primary mb-4">Included With Your Membership</h2>
            <p className="text-text-secondary text-sm max-w-md mx-auto" style={{ fontWeight: 300 }}>Everything you need to manage, track, and grow your collection.</p>
          </div>

          {/* Bento grid — active features */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-20">
            {activeFeatures.map((f, i) => {
              const Icon = f.icon;
              const isLarge = i === 0;
              return (
                <div
                  key={f.title}
                  className={`group relative rounded-2xl border border-border/40 p-8 hover:border-accent/30 transition-all duration-500 ${isLarge ? "md:col-span-2 md:row-span-1" : ""}`}
                  style={{ backdropFilter: "blur(8px)", backgroundColor: "rgba(17,17,17,0.6)", background: `linear-gradient(135deg, rgba(17,17,17,0.8) 0%, rgba(${isLarge ? "212,175,55,0.03" : "17,17,17,0.6"}) 100%)` }}
                >
                  <div className="flex items-start justify-between mb-6">
                    <div className="w-12 h-12 rounded-xl border border-accent/15 flex items-center justify-center group-hover:border-accent/30 transition-colors" style={{ backgroundColor: "rgba(212,175,55,0.05)" }}>
                      <Icon className="w-6 h-6 text-accent" />
                    </div>
                    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full border border-success/20 text-success text-[10px] font-medium" style={{ fontFamily: "'JetBrains Mono', monospace", backgroundColor: "rgba(34,197,94,0.05)" }}>
                      <span className="w-1.5 h-1.5 rounded-full bg-success" style={{ animation: "glow 2s ease-in-out infinite" }} /> LIVE
                    </span>
                  </div>
                  <h3 className="text-text-primary text-lg font-light mb-3">{f.title}</h3>
                  <p className="text-text-secondary text-sm leading-relaxed" style={{ fontWeight: 300 }}>{f.description}</p>
                </div>
              );
            })}
          </div>

          {/* Coming soon — Compact bento */}
          <div className="text-center mb-12">
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full border border-accent/20 mb-6" style={{ backgroundColor: "rgba(212,175,55,0.05)" }}>
              <Zap className="w-3.5 h-3.5 text-accent" />
              <span className="text-accent text-[10px] uppercase tracking-widest font-medium" style={{ fontFamily: "'JetBrains Mono', monospace" }}>Roadmap</span>
            </div>
            <h2 className="text-3xl md:text-5xl font-extralight text-text-primary mb-4">Coming Soon</h2>
            <p className="text-text-secondary text-sm max-w-lg mx-auto mb-6" style={{ fontWeight: 300 }}>
              We&apos;re building more tools and features for our members. These are on the roadmap and included in your membership at no extra cost.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
            {comingSoonFeatures.map((f) => {
              const Icon = f.icon;
              return (
                <div key={f.title} className="group relative rounded-xl border border-border/30 p-5 hover:border-accent/20 transition-all duration-300" style={{ backdropFilter: "blur(8px)", backgroundColor: "rgba(17,17,17,0.4)" }}>
                  <div className="flex items-start gap-3">
                    <div className="w-8 h-8 rounded-lg border border-border/30 flex items-center justify-center shrink-0 group-hover:border-accent/20 transition-colors" style={{ backgroundColor: "rgba(212,175,55,0.03)" }}>
                      <Icon className="w-4 h-4 text-accent/40 group-hover:text-accent/70 transition-colors" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <h3 className="text-text-primary text-xs font-medium mb-1 truncate">{f.title}</h3>
                      <p className="text-text-muted text-[11px] leading-relaxed line-clamp-2" style={{ fontWeight: 300 }}>{f.description}</p>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* ============ SUBSCRIBE — Clean modern ============ */}
      <section id="subscribe" className="py-24 md:py-32 px-6 md:px-12 relative">
        {/* Subtle gradient background */}
        <div className="absolute inset-0 opacity-30" style={{ background: "radial-gradient(ellipse at 50% 0%, rgba(212,175,55,0.08) 0%, transparent 50%)" }} />

        <div className="relative z-10 max-w-xl mx-auto">
          <div className="rounded-2xl border border-border/40 overflow-hidden" style={{ backdropFilter: "blur(20px)", backgroundColor: "rgba(17,17,17,0.7)" }}>
            {/* Header */}
            <div className="px-8 md:px-10 pt-10 pb-6 text-center border-b border-border/20">
              <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full border border-accent/20 mb-5" style={{ backgroundColor: "rgba(212,175,55,0.05)" }}>
                <Crown className="w-3.5 h-3.5 text-accent" />
                <span className="text-accent text-[10px] uppercase tracking-widest font-medium" style={{ fontFamily: "'JetBrains Mono', monospace" }}>Membership</span>
              </div>
              <h3 className="text-2xl md:text-3xl font-extralight text-text-primary mb-3">Subscribe</h3>
              <p className="text-text-secondary text-sm" style={{ fontWeight: 300 }}>
                Join our collectibles community and get instant access to all membership benefits.
              </p>
              <div className="flex items-baseline justify-center gap-1 mt-4">
                <span className="text-3xl text-accent font-extralight">£270</span>
                <span className="text-text-muted text-sm">/year</span>
              </div>
            </div>

            {/* Form */}
            <div className="px-8 md:px-10 py-8">
              {submitted ? (
                <div className="text-center py-8">
                  <CheckCircle className="w-14 h-14 text-success mx-auto mb-5" />
                  <h4 className="text-xl font-light text-text-primary mb-3">Subscription Received</h4>
                  <p className="text-text-secondary text-sm" style={{ fontWeight: 300 }}>
                    Thank you for subscribing. We will be in touch shortly via WhatsApp to confirm your membership.
                  </p>
                </div>
              ) : (
                <form onSubmit={handleSubmit} className="space-y-4">
                  {[
                    { id: "name4", label: "Full Name", type: "text", required: true, value: formName, onChange: setFormName, placeholder: "Enter your full name" },
                    { id: "whatsapp4", label: "Number", type: "tel", required: true, value: whatsapp, onChange: setWhatsapp, placeholder: "+44 7700 000000" },
                    { id: "dob4", label: "Date of Birth", type: "date", required: true, value: dob, onChange: setDob, placeholder: "" },
                    { id: "interests4", label: "Interests", type: "text", required: false, value: interests, onChange: setInterests, placeholder: "e.g. Pokémon, Comics, Sports Cards" },
                    { id: "referral4", label: "Referral Name", type: "text", required: false, value: referral, onChange: setReferral, placeholder: "Who referred you?", optional: true },
                  ].map((field) => (
                    <div key={field.id}>
                      <label htmlFor={field.id} className="block text-[10px] text-text-muted uppercase tracking-widest mb-1.5" style={{ fontFamily: "'JetBrains Mono', monospace" }}>
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
                        className="w-full px-4 py-3 bg-surface-hover/50 border border-border/40 rounded-xl text-text-primary text-sm placeholder:text-text-muted focus:outline-none focus:border-accent/50 focus:ring-1 focus:ring-accent/20"
                      />
                    </div>
                  ))}

                  <div>
                    <label htmlFor="profile4" className="block text-[10px] text-text-muted uppercase tracking-widest mb-1.5" style={{ fontFamily: "'JetBrains Mono', monospace" }}>Profile</label>
                    <textarea
                      id="profile4"
                      value={profile}
                      onChange={(e) => setProfile(e.target.value)}
                      placeholder="Tell us a bit about yourself"
                      rows={3}
                      className="w-full px-4 py-3 bg-surface-hover/50 border border-border/40 rounded-xl text-text-primary text-sm placeholder:text-text-muted focus:outline-none focus:border-accent/50 focus:ring-1 focus:ring-accent/20 resize-none"
                    />
                  </div>

                  {error && <p className="text-danger text-sm text-center">{error}</p>}

                  <button
                    type="submit"
                    disabled={submitting}
                    className="w-full inline-flex items-center justify-center gap-3 px-8 py-4 bg-accent text-background text-sm font-medium tracking-wider hover:bg-accent-hover transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed rounded-xl"
                  >
                    {submitting ? "Processing..." : "Pay Now — £270/yr"}
                    {!submitting && <Send className="w-4 h-4" />}
                  </button>

                  <p className="text-text-muted text-[10px] text-center leading-relaxed">
                    By subscribing you agree to our <Link href="/terms" className="underline hover:text-text-secondary">Terms</Link> and <Link href="/privacy" className="underline hover:text-text-secondary">Privacy Policy</Link>
                  </p>
                </form>
              )}
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-border/30 py-10 px-6 md:px-12">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-4">
          <img src="/logo.png" alt="West Investments" className="h-8 object-contain opacity-50" />
          <div className="flex items-center gap-6 text-xs text-text-muted">
            <Link href="/terms" className="hover:text-text-secondary">Terms</Link>
            <Link href="/privacy" className="hover:text-text-secondary">Privacy</Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
