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
  Check,
  Menu,
  X,
} from "lucide-react";

/* ------------------------------------------------------------------ */
/*  Design 2 — "The Vault" — Geometric Luxury                        */
/*  Extreme negative space, gold geometric accents, membership card   */
/*  visualization, vertical timeline roadmap, ornate borders          */
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

export default function Design2() {
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
    <div className="min-h-screen" style={{ fontFamily: "'Bodoni Moda', 'Didot', Georgia, serif" }}>
      <style>{`@import url('https://fonts.googleapis.com/css2?family=Bodoni+Moda:ital,opsz,wght@0,6..96,400;0,6..96,500;0,6..96,700;1,6..96,400&display=swap');`}</style>

      {/* Navigation */}
      <nav className="fixed top-0 left-0 right-0 z-50 landing-fade-in border-b border-border/20" style={{ animationDelay: "0.2s", backdropFilter: "blur(16px)", backgroundColor: "rgba(10,10,10,0.9)" }}>
        <div className="max-w-7xl mx-auto px-6 md:px-12 py-5 flex items-center justify-between">
          <Link href="/"><img src="/logo.png" alt="West Investments" className="h-10 md:h-12 object-contain" /></Link>
          <div className="hidden md:flex items-center gap-10">
            <Link href="/" className="text-text-secondary hover:text-text-primary transition-colors" style={{ fontFamily: "Inter, sans-serif", letterSpacing: "0.12em", fontSize: "11px", textTransform: "uppercase" }}>Home</Link>
            <a href="#membership" className="text-text-secondary hover:text-text-primary transition-colors" style={{ fontFamily: "Inter, sans-serif", letterSpacing: "0.12em", fontSize: "11px", textTransform: "uppercase" }}>Membership</a>
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
            <a href="#membership" onClick={() => setMobileMenuOpen(false)} className="block py-3 text-text-secondary hover:text-text-primary" style={{ fontFamily: "Inter, sans-serif", letterSpacing: "0.12em", fontSize: "11px", textTransform: "uppercase" }}>Membership</a>
            <a href="#subscribe" onClick={() => setMobileMenuOpen(false)} className="block py-3 text-text-secondary hover:text-text-primary" style={{ fontFamily: "Inter, sans-serif", letterSpacing: "0.12em", fontSize: "11px", textTransform: "uppercase" }}>Join</a>
            <button onClick={() => { setMobileMenuOpen(false); router.push("/sign-in"); }} className="w-full mt-2 text-xs tracking-widest uppercase border border-accent/40 text-accent px-6 py-2.5 hover:bg-accent hover:text-background transition-all cursor-pointer" style={{ fontFamily: "Inter, sans-serif", letterSpacing: "0.2em" }}>Client Login</button>
          </div>
        )}
      </nav>

      {/* ============ HERO — Geometric frame ============ */}
      <section className="min-h-screen flex items-center justify-center px-6 md:px-12 relative">
        {/* Subtle geometric pattern background */}
        <div className="absolute inset-0 opacity-[0.03]" style={{ backgroundImage: "repeating-linear-gradient(45deg, transparent, transparent 60px, #D4AF37 60px, #D4AF37 61px)", backgroundSize: "85px 85px" }} />

        <div className="max-w-3xl mx-auto text-center relative">
          {/* Ornate top border */}
          <div className="flex items-center justify-center gap-4 mb-16 landing-fade-up" style={{ animationDelay: "0.3s" }}>
            <div className="h-px w-16 bg-accent/40" />
            <div className="w-2 h-2 rotate-45 border border-accent/40" />
            <div className="h-px w-16 bg-accent/40" />
          </div>

          <p className="text-accent text-[10px] uppercase tracking-[0.5em] mb-10 landing-fade-up" style={{ fontFamily: "Inter, sans-serif", animationDelay: "0.4s" }}>
            Est. 2024 — Limited to {TOTAL_SPACES.toLocaleString()} Members
          </p>

          <h1 className="text-5xl md:text-7xl lg:text-8xl font-normal text-text-primary leading-[1.05] mb-10 landing-fade-up" style={{ animationDelay: "0.6s" }}>
            The Collectibles<br />Community
          </h1>

          <p className="text-text-secondary text-lg md:text-xl leading-relaxed max-w-xl mx-auto mb-14 landing-fade-up" style={{ animationDelay: "0.8s", fontFamily: "Inter, sans-serif", fontWeight: 300 }}>
            Membership to the West Investments exclusive community is intentionally limited. To maintain a high level of access, discretion, and service, availability is carefully managed.
          </p>

          <div className="landing-fade-up" style={{ animationDelay: "1s" }}>
            <a href="#subscribe" className="inline-flex items-center gap-3 px-10 py-4 bg-accent text-background text-xs font-medium tracking-[0.2em] uppercase hover:bg-accent-hover transition-colors" style={{ fontFamily: "Inter, sans-serif" }}>
              Request Membership
            </a>
          </div>

          {/* Ornate bottom border */}
          <div className="flex items-center justify-center gap-4 mt-16 landing-fade-up" style={{ animationDelay: "1.1s" }}>
            <div className="h-px w-16 bg-accent/40" />
            <div className="w-2 h-2 rotate-45 border border-accent/40" />
            <div className="h-px w-16 bg-accent/40" />
          </div>
        </div>
      </section>

      {/* ============ MEMBERSHIP CARD — Visual ============ */}
      <section
        id="membership"
        ref={setRef("membership")}
        className="py-24 md:py-32 px-6 md:px-12"
        style={{ opacity: isVisible("membership") ? 1 : 0, transform: isVisible("membership") ? "none" : "translateY(40px)", transition: "all 1s cubic-bezier(0.16, 1, 0.3, 1)" }}
      >
        <div className="max-w-4xl mx-auto">
          {/* Membership card visualization */}
          <div className="relative mx-auto max-w-lg" style={{ aspectRatio: "1.6/1" }}>
            <div className="absolute inset-0 rounded-2xl border border-accent/30 p-8 md:p-10 flex flex-col justify-between" style={{ background: "linear-gradient(135deg, rgba(17,17,17,1) 0%, rgba(30,30,30,0.8) 50%, rgba(17,17,17,1) 100%)" }}>
              {/* Card top */}
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-text-muted text-[9px] uppercase tracking-[0.4em]" style={{ fontFamily: "Inter, sans-serif" }}>West Investments</p>
                  <p className="text-accent text-[10px] uppercase tracking-[0.3em] mt-1" style={{ fontFamily: "Inter, sans-serif" }}>Exclusive Member</p>
                </div>
                <Crown className="w-6 h-6 text-accent/60" />
              </div>
              {/* Card bottom */}
              <div>
                <p className="text-text-primary text-lg md:text-xl font-light tracking-wide mb-1">Collectibles Community</p>
                <div className="flex items-center justify-between">
                  <p className="text-text-muted text-[10px] tracking-[0.3em] uppercase" style={{ fontFamily: "Inter, sans-serif" }}>{spacesRemaining.toLocaleString()} / {TOTAL_SPACES.toLocaleString()} spaces</p>
                  <p className="text-accent text-lg font-light">£270<span className="text-text-muted text-xs"> /yr</span></p>
                </div>
              </div>
            </div>
            {/* Glow effect */}
            <div className="absolute -inset-1 rounded-2xl opacity-20 blur-xl" style={{ background: "linear-gradient(135deg, #D4AF37 0%, transparent 50%, #D4AF37 100%)" }} />
          </div>

          <div className="text-center mt-16">
            <p className="text-text-secondary text-lg leading-relaxed max-w-xl mx-auto" style={{ fontFamily: "Inter, sans-serif", fontWeight: 300 }}>
              Within our community, we are committed to offering <span className="text-accent">100%</span> of fair market value for qualifying assets.
            </p>
          </div>
        </div>
      </section>

      {/* ============ FEATURES — Two columns ============ */}
      <section
        id="features-section"
        ref={setRef("features-section")}
        className="py-24 md:py-32 px-6 md:px-12"
        style={{ opacity: isVisible("features-section") ? 1 : 0, transform: isVisible("features-section") ? "none" : "translateY(40px)", transition: "all 1s cubic-bezier(0.16, 1, 0.3, 1)" }}
      >
        <div className="max-w-5xl mx-auto">
          {/* Section header */}
          <div className="text-center mb-20">
            <div className="flex items-center justify-center gap-4 mb-8">
              <div className="h-px w-12 bg-accent/30" />
              <p className="text-accent text-[10px] uppercase tracking-[0.4em]" style={{ fontFamily: "Inter, sans-serif" }}>Membership Benefits</p>
              <div className="h-px w-12 bg-accent/30" />
            </div>
            <h2 className="text-3xl md:text-5xl text-text-primary font-normal">Included With Your Membership</h2>
          </div>

          {/* Active features — large cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-24">
            {activeFeatures.map((f) => {
              const Icon = f.icon;
              return (
                <div key={f.title} className="relative border border-accent/20 rounded-xl p-8 text-center group hover:border-accent/40 transition-all duration-500" style={{ background: "linear-gradient(180deg, rgba(212,175,55,0.03) 0%, transparent 100%)" }}>
                  <div className="w-14 h-14 rounded-full border border-accent/20 flex items-center justify-center mx-auto mb-6 group-hover:border-accent/40 transition-colors">
                    <Icon className="w-6 h-6 text-accent" />
                  </div>
                  <h3 className="text-text-primary text-lg mb-3">{f.title}</h3>
                  <p className="text-text-secondary text-sm leading-relaxed" style={{ fontFamily: "Inter, sans-serif", fontWeight: 300 }}>{f.description}</p>
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                    <span className="inline-flex items-center gap-1 px-3 py-1 bg-background border border-success/30 rounded-full text-success text-[9px] font-bold uppercase tracking-widest" style={{ fontFamily: "Inter, sans-serif" }}>
                      <Check className="w-3 h-3" /> Active
                    </span>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Coming soon — Vertical timeline */}
          <div className="text-center mb-16">
            <div className="flex items-center justify-center gap-4 mb-8">
              <div className="h-px w-12 bg-accent/30" />
              <p className="text-accent text-[10px] uppercase tracking-[0.4em]" style={{ fontFamily: "Inter, sans-serif" }}>On the Roadmap</p>
              <div className="h-px w-12 bg-accent/30" />
            </div>
            <h2 className="text-3xl md:text-5xl text-text-primary font-normal mb-4">Coming Soon</h2>
            <p className="text-text-secondary text-sm max-w-lg mx-auto" style={{ fontFamily: "Inter, sans-serif", fontWeight: 300 }}>
              We&apos;re building more tools and features for our members. These are on the roadmap and included in your membership at no extra cost.
            </p>
          </div>

          <div className="relative max-w-2xl mx-auto">
            {/* Vertical line */}
            <div className="absolute left-6 md:left-1/2 top-0 bottom-0 w-px bg-border/50 md:-translate-x-px" />

            {comingSoonFeatures.map((f, i) => {
              const Icon = f.icon;
              const isLeft = i % 2 === 0;
              return (
                <div key={f.title} className={`relative flex items-start gap-6 mb-8 ${isLeft ? "md:flex-row" : "md:flex-row-reverse"}`}>
                  {/* Timeline dot */}
                  <div className="absolute left-6 md:left-1/2 w-3 h-3 rounded-full bg-surface border-2 border-accent/30 -translate-x-1.5 mt-1.5 z-10" />

                  {/* Content */}
                  <div className={`ml-16 md:ml-0 md:w-[calc(50%-2rem)] ${isLeft ? "md:pr-8 md:text-right" : "md:pl-8 md:text-left"}`}>
                    <div className={`flex items-center gap-3 mb-2 ${isLeft ? "md:justify-end" : "md:justify-start"}`}>
                      <Icon className="w-4 h-4 text-accent/50" />
                      <h3 className="text-text-primary text-sm font-medium" style={{ fontFamily: "Inter, sans-serif" }}>{f.title}</h3>
                    </div>
                    <p className="text-text-muted text-xs leading-relaxed" style={{ fontFamily: "Inter, sans-serif", fontWeight: 300 }}>{f.description}</p>
                  </div>

                  {/* Spacer for opposite side */}
                  <div className="hidden md:block md:w-[calc(50%-2rem)]" />
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* ============ SUBSCRIBE ============ */}
      <section id="subscribe" className="py-24 md:py-32 px-6 md:px-12">
        <div className="max-w-xl mx-auto">
          {/* Ornate border frame */}
          <div className="relative">
            {/* Corner accents */}
            <div className="absolute -top-3 -left-3 w-8 h-8 border-t-2 border-l-2 border-accent/40" />
            <div className="absolute -top-3 -right-3 w-8 h-8 border-t-2 border-r-2 border-accent/40" />
            <div className="absolute -bottom-3 -left-3 w-8 h-8 border-b-2 border-l-2 border-accent/40" />
            <div className="absolute -bottom-3 -right-3 w-8 h-8 border-b-2 border-r-2 border-accent/40" />

            <div className="border border-border rounded-xl p-8 md:p-12">
              <div className="text-center mb-10">
                <div className="flex items-center justify-center gap-4 mb-6">
                  <div className="h-px w-8 bg-accent/30" />
                  <Crown className="w-5 h-5 text-accent" />
                  <div className="h-px w-8 bg-accent/30" />
                </div>
                <h3 className="text-3xl text-text-primary mb-3">Subscribe</h3>
                <p className="text-text-secondary text-sm" style={{ fontFamily: "Inter, sans-serif", fontWeight: 300 }}>
                  Join our collectibles community and get instant access to all membership benefits.
                </p>
                <div className="flex items-baseline justify-center gap-1 mt-4">
                  <span className="text-3xl text-accent font-light">£270</span>
                  <span className="text-text-muted text-sm" style={{ fontFamily: "Inter, sans-serif" }}>per year</span>
                </div>
              </div>

              {submitted ? (
                <div className="text-center py-8">
                  <CheckCircle className="w-14 h-14 text-success mx-auto mb-5" />
                  <h4 className="text-xl text-text-primary mb-3">Subscription Received</h4>
                  <p className="text-text-secondary text-sm" style={{ fontFamily: "Inter, sans-serif", fontWeight: 300 }}>
                    Thank you for subscribing. We will be in touch shortly via WhatsApp to confirm your membership.
                  </p>
                </div>
              ) : (
                <form onSubmit={handleSubmit} className="space-y-5">
                  {[
                    { id: "name2", label: "Full Name", type: "text", required: true, value: formName, onChange: setFormName, placeholder: "Enter your full name" },
                    { id: "whatsapp2", label: "Number", type: "tel", required: true, value: whatsapp, onChange: setWhatsapp, placeholder: "+44 7700 000000" },
                    { id: "dob2", label: "Date of Birth", type: "date", required: true, value: dob, onChange: setDob, placeholder: "" },
                    { id: "interests2", label: "Interests", type: "text", required: false, value: interests, onChange: setInterests, placeholder: "e.g. Pokémon, Comics, Sports Cards" },
                    { id: "referral2", label: "Referral Name", type: "text", required: false, value: referral, onChange: setReferral, placeholder: "Who referred you?", optional: true },
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
                    <label htmlFor="profile2" className="block text-xs text-text-muted uppercase tracking-widest mb-2" style={{ fontFamily: "Inter, sans-serif" }}>Profile</label>
                    <textarea
                      id="profile2"
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
