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
  Sparkles,
  Menu,
  X,
} from "lucide-react";

/* ------------------------------------------------------------------ */
/*  Design 3 — "Collector's Circle" — Warm & Atmospheric              */
/*  Rich photography, storytelling layout, warm amber lighting feel,  */
/*  community-focused imagery, alternating image+text sections        */
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

export default function Design3() {
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
    <div className="min-h-screen" style={{ fontFamily: "'Libre Baskerville', Georgia, serif" }}>
      <style>{`@import url('https://fonts.googleapis.com/css2?family=Libre+Baskerville:ital,wght@0,400;0,700;1,400&display=swap');`}</style>

      {/* Navigation */}
      <nav className="fixed top-0 left-0 right-0 z-50 landing-fade-in border-b border-border/20" style={{ animationDelay: "0.2s", backdropFilter: "blur(16px)", backgroundColor: "rgba(10,10,10,0.9)" }}>
        <div className="max-w-7xl mx-auto px-6 md:px-12 py-5 flex items-center justify-between">
          <Link href="/"><img src="/logo.png" alt="West Investments" className="h-10 md:h-12 object-contain" /></Link>
          <div className="hidden md:flex items-center gap-10">
            <Link href="/" className="text-text-secondary hover:text-text-primary transition-colors" style={{ fontFamily: "Inter, sans-serif", letterSpacing: "0.12em", fontSize: "11px", textTransform: "uppercase" }}>Home</Link>
            <a href="#about" className="text-text-secondary hover:text-text-primary transition-colors" style={{ fontFamily: "Inter, sans-serif", letterSpacing: "0.12em", fontSize: "11px", textTransform: "uppercase" }}>About</a>
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
            <a href="#about" onClick={() => setMobileMenuOpen(false)} className="block py-3 text-text-secondary hover:text-text-primary" style={{ fontFamily: "Inter, sans-serif", letterSpacing: "0.12em", fontSize: "11px", textTransform: "uppercase" }}>About</a>
            <a href="#subscribe" onClick={() => setMobileMenuOpen(false)} className="block py-3 text-text-secondary hover:text-text-primary" style={{ fontFamily: "Inter, sans-serif", letterSpacing: "0.12em", fontSize: "11px", textTransform: "uppercase" }}>Join</a>
            <button onClick={() => { setMobileMenuOpen(false); router.push("/sign-in"); }} className="w-full mt-2 text-xs tracking-widest uppercase border border-accent/40 text-accent px-6 py-2.5 hover:bg-accent hover:text-background transition-all cursor-pointer" style={{ fontFamily: "Inter, sans-serif", letterSpacing: "0.2em" }}>Client Login</button>
          </div>
        )}
      </nav>

      {/* ============ HERO — Warm atmospheric ============ */}
      <section className="relative min-h-screen flex items-center overflow-hidden">
        {/* Two-panel hero */}
        <div className="absolute inset-0 grid grid-cols-1 lg:grid-cols-2">
          {/* Left — dark with warm gradient */}
          <div style={{ background: "linear-gradient(135deg, #080808 0%, #12100c 50%, #0d0b08 100%)" }} />
          {/* Right — image */}
          <div className="hidden lg:block relative">
            <img
              src="https://images.unsplash.com/photo-1614680376739-414d95ff43df?auto=format&fit=crop&w=1200&q=80"
              alt=""
              className="w-full h-full object-cover"
              style={{ filter: "brightness(0.4) saturate(0.6) sepia(0.3)" }}
            />
            <div className="absolute inset-0" style={{ background: "linear-gradient(to right, #080808 0%, transparent 40%)" }} />
            {/* Warm light overlay */}
            <div className="absolute inset-0" style={{ background: "radial-gradient(ellipse at 70% 50%, rgba(212,175,55,0.08) 0%, transparent 60%)" }} />
          </div>
        </div>

        <div className="relative z-10 max-w-7xl mx-auto px-6 md:px-12 w-full py-32">
          <div className="max-w-xl">
            <div className="flex items-center gap-3 mb-8 landing-fade-up" style={{ animationDelay: "0.4s" }}>
              <Sparkles className="w-4 h-4 text-accent" />
              <span className="text-accent text-xs uppercase tracking-[0.3em]" style={{ fontFamily: "Inter, sans-serif" }}>
                Limited to {TOTAL_SPACES.toLocaleString()} members
              </span>
            </div>

            <h1 className="text-4xl md:text-6xl text-text-primary leading-[1.15] mb-8 landing-fade-up" style={{ animationDelay: "0.6s" }}>
              A community built on trust, passion, and shared ambition
            </h1>

            <p className="text-text-secondary text-lg leading-relaxed mb-10 landing-fade-up" style={{ animationDelay: "0.8s", fontFamily: "Inter, sans-serif", fontWeight: 300 }}>
              Membership to the West Investments exclusive community is intentionally limited. To maintain a high level of access, discretion, and service, availability is carefully managed.
            </p>

            <div className="flex flex-col sm:flex-row gap-4 landing-fade-up" style={{ animationDelay: "1s" }}>
              <a href="#subscribe" className="inline-flex items-center gap-3 px-8 py-4 bg-accent text-background text-sm font-medium tracking-widest uppercase hover:bg-accent-hover transition-colors" style={{ fontFamily: "Inter, sans-serif", letterSpacing: "0.15em" }}>
                Join the Circle <ArrowRight className="w-4 h-4" />
              </a>
            </div>
          </div>
        </div>
      </section>

      {/* ============ ABOUT STRIP — Warm amber accent ============ */}
      <section
        id="about"
        ref={setRef("about")}
        className="relative py-20 px-6 md:px-12 overflow-hidden"
        style={{
          background: "linear-gradient(135deg, rgba(212,175,55,0.06) 0%, rgba(8,8,8,1) 50%, rgba(212,175,55,0.04) 100%)",
          opacity: isVisible("about") ? 1 : 0,
          transform: isVisible("about") ? "none" : "translateY(30px)",
          transition: "all 0.8s cubic-bezier(0.16, 1, 0.3, 1)",
        }}
      >
        <div className="max-w-4xl mx-auto text-center">
          <p className="text-accent text-xs uppercase tracking-[0.3em] mb-6" style={{ fontFamily: "Inter, sans-serif" }}>Our Promise</p>
          <blockquote className="text-2xl md:text-4xl text-text-primary leading-relaxed font-normal italic">
            &ldquo;Within our community, we are committed to offering <span className="text-accent not-italic">100%</span> of fair market value for qualifying assets.&rdquo;
          </blockquote>
          <div className="mt-8 flex items-center justify-center gap-4">
            <div className="h-px w-8 bg-accent/30" />
            <p className="text-text-muted text-xs uppercase tracking-widest" style={{ fontFamily: "Inter, sans-serif" }}>West Investments</p>
            <div className="h-px w-8 bg-accent/30" />
          </div>
        </div>
      </section>

      {/* ============ WHAT YOU GET — Storytelling sections ============ */}
      <section
        id="what-you-get"
        ref={setRef("what-you-get")}
        className="py-24 md:py-32 px-6 md:px-12"
        style={{ opacity: isVisible("what-you-get") ? 1 : 0, transform: isVisible("what-you-get") ? "none" : "translateY(30px)", transition: "all 0.8s cubic-bezier(0.16, 1, 0.3, 1)" }}
      >
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-16">
            <p className="text-accent text-xs uppercase tracking-[0.3em] mb-4" style={{ fontFamily: "Inter, sans-serif" }}>What You Get</p>
            <h2 className="text-3xl md:text-4xl text-text-primary mb-6">Included With Your Membership</h2>
            <div className="w-16 h-px bg-accent/40 mx-auto" />
          </div>

          {/* Active features — alternating image + text */}
          <div className="space-y-16 md:space-y-24">
            {activeFeatures.map((f, i) => {
              const Icon = f.icon;
              const images = [
                "https://images.unsplash.com/photo-1556761175-b413da4baf72?auto=format&fit=crop&w=800&q=80",
                "https://images.unsplash.com/photo-1540575467063-178a50c2df87?auto=format&fit=crop&w=800&q=80",
                "https://images.unsplash.com/photo-1551288049-bebda4e38f71?auto=format&fit=crop&w=800&q=80",
              ];
              const isReversed = i % 2 === 1;
              return (
                <div key={f.title} className={`grid grid-cols-1 md:grid-cols-2 gap-8 md:gap-16 items-center ${isReversed ? "md:direction-rtl" : ""}`}>
                  {/* Image */}
                  <div className={`relative rounded-2xl overflow-hidden ${isReversed ? "md:order-2" : ""}`} style={{ aspectRatio: "4/3" }}>
                    <img
                      src={images[i]}
                      alt={f.title}
                      className="w-full h-full object-cover"
                      style={{ filter: "brightness(0.5) saturate(0.7) sepia(0.15)" }}
                    />
                    {/* Warm light flare */}
                    <div className="absolute inset-0" style={{ background: "radial-gradient(ellipse at 30% 70%, rgba(212,175,55,0.15) 0%, transparent 50%)" }} />
                    <div className="absolute inset-0 border border-accent/10 rounded-2xl" />
                  </div>

                  {/* Text */}
                  <div className={isReversed ? "md:order-1 md:text-right" : ""}>
                    <div className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-success/10 border border-success/20 mb-6`}>
                      <span className="w-1.5 h-1.5 rounded-full bg-success" />
                      <span className="text-success text-[10px] uppercase tracking-widest font-bold" style={{ fontFamily: "Inter, sans-serif" }}>Available Now</span>
                    </div>
                    <div className={`flex items-center gap-4 mb-4 ${isReversed ? "md:justify-end" : ""}`}>
                      <div className="w-12 h-12 rounded-xl bg-accent/10 flex items-center justify-center">
                        <Icon className="w-6 h-6 text-accent" />
                      </div>
                    </div>
                    <h3 className="text-2xl md:text-3xl text-text-primary mb-4">{f.title}</h3>
                    <p className="text-text-secondary text-base leading-relaxed" style={{ fontFamily: "Inter, sans-serif", fontWeight: 300 }}>{f.description}</p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* ============ PRICING HIGHLIGHT ============ */}
      <section
        id="pricing"
        ref={setRef("pricing")}
        className="py-20 px-6 md:px-12"
        style={{ opacity: isVisible("pricing") ? 1 : 0, transform: isVisible("pricing") ? "none" : "translateY(30px)", transition: "all 0.8s cubic-bezier(0.16, 1, 0.3, 1)" }}
      >
        <div className="max-w-md mx-auto text-center">
          <div className="relative bg-surface border border-accent/20 rounded-2xl p-10" style={{ background: "linear-gradient(180deg, rgba(212,175,55,0.04) 0%, rgba(17,17,17,1) 100%)" }}>
            <Crown className="w-8 h-8 text-accent mx-auto mb-4" />
            <p className="text-text-muted text-xs uppercase tracking-[0.3em] mb-4" style={{ fontFamily: "Inter, sans-serif" }}>Annual Membership</p>
            <div className="flex items-baseline justify-center gap-1 mb-2">
              <span className="text-5xl text-accent font-normal">£270</span>
              <span className="text-text-muted text-sm" style={{ fontFamily: "Inter, sans-serif" }}>/year</span>
            </div>
            <p className="text-text-secondary text-sm mb-6" style={{ fontFamily: "Inter, sans-serif", fontWeight: 300 }}>All current and upcoming features included</p>
            <div className="flex items-center gap-3 justify-center mb-4">
              <div className="flex-1 bg-surface-hover rounded-full h-2 overflow-hidden">
                <div className="h-full bg-accent rounded-full" style={{ width: `${Math.max(((TOTAL_SPACES - spacesRemaining) / TOTAL_SPACES) * 100, 2)}%` }} />
              </div>
            </div>
            <p className="text-text-muted text-xs" style={{ fontFamily: "Inter, sans-serif" }}>
              {spacesRemaining.toLocaleString()} of {TOTAL_SPACES.toLocaleString()} spaces available
            </p>
          </div>
        </div>
      </section>

      {/* ============ COMING SOON — Warm grid ============ */}
      <section
        id="roadmap3"
        ref={setRef("roadmap3")}
        className="py-24 md:py-32 px-6 md:px-12"
        style={{
          background: "linear-gradient(180deg, transparent 0%, rgba(212,175,55,0.02) 50%, transparent 100%)",
          opacity: isVisible("roadmap3") ? 1 : 0,
          transform: isVisible("roadmap3") ? "none" : "translateY(30px)",
          transition: "all 0.8s cubic-bezier(0.16, 1, 0.3, 1)",
        }}
      >
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-16">
            <p className="text-accent text-xs uppercase tracking-[0.3em] mb-4" style={{ fontFamily: "Inter, sans-serif" }}>Building Together</p>
            <h2 className="text-3xl md:text-4xl text-text-primary mb-4">Coming Soon</h2>
            <p className="text-text-secondary text-sm max-w-lg mx-auto mb-6" style={{ fontFamily: "Inter, sans-serif", fontWeight: 300 }}>
              We&apos;re building more tools and features for our members. These are on the roadmap and included in your membership at no extra cost.
            </p>
            <div className="w-16 h-px bg-accent/40 mx-auto" />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {comingSoonFeatures.map((f, i) => {
              const Icon = f.icon;
              return (
                <div key={f.title} className="group relative bg-surface/60 border border-border/60 rounded-xl p-6 hover:border-accent/20 transition-all duration-300">
                  <div className="flex items-start gap-4">
                    <div className="w-10 h-10 rounded-lg bg-accent/5 flex items-center justify-center shrink-0 group-hover:bg-accent/10 transition-colors">
                      <Icon className="w-5 h-5 text-accent/50 group-hover:text-accent transition-colors" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1.5">
                        <h3 className="text-text-primary text-sm font-medium truncate" style={{ fontFamily: "Inter, sans-serif" }}>{f.title}</h3>
                      </div>
                      <p className="text-text-muted text-xs leading-relaxed" style={{ fontFamily: "Inter, sans-serif", fontWeight: 300 }}>{f.description}</p>
                    </div>
                  </div>
                  <span className="absolute top-4 right-4 px-2 py-0.5 rounded-full bg-accent/5 text-accent/50 text-[9px] font-bold uppercase tracking-widest" style={{ fontFamily: "Inter, sans-serif" }}>Soon</span>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* ============ SUBSCRIBE ============ */}
      <section id="subscribe" className="py-24 md:py-32 px-6 md:px-12">
        <div className="max-w-6xl mx-auto">
          <div className="grid grid-cols-1 lg:grid-cols-5 gap-12 items-start">
            {/* Left image column */}
            <div className="hidden lg:block lg:col-span-2 space-y-4">
              <div className="rounded-2xl overflow-hidden border border-border/20" style={{ aspectRatio: "3/4" }}>
                <img
                  src="https://images.unsplash.com/photo-1611532736597-de2d4265fba3?auto=format&fit=crop&w=600&q=80"
                  alt="Collectibles"
                  className="w-full h-full object-cover"
                  style={{ filter: "brightness(0.45) saturate(0.6) sepia(0.2)" }}
                />
              </div>
            </div>

            {/* Right form column */}
            <div className="lg:col-span-3">
              <div className="bg-surface border border-accent/15 rounded-2xl p-8 md:p-10">
                <div className="mb-8">
                  <p className="text-accent text-xs uppercase tracking-[0.3em] mb-4" style={{ fontFamily: "Inter, sans-serif" }}>Become a Member</p>
                  <h3 className="text-2xl md:text-3xl text-text-primary mb-3">Subscribe</h3>
                  <p className="text-text-secondary text-sm" style={{ fontFamily: "Inter, sans-serif", fontWeight: 300 }}>
                    Join our collectibles community and get instant access to all membership benefits.
                  </p>
                  <p className="text-accent font-medium text-sm mt-3" style={{ fontFamily: "Inter, sans-serif" }}>£270 per year</p>
                </div>

                {submitted ? (
                  <div className="text-center py-10">
                    <CheckCircle className="w-14 h-14 text-success mx-auto mb-5" />
                    <h4 className="text-xl text-text-primary mb-3">Subscription Received</h4>
                    <p className="text-text-secondary text-sm" style={{ fontFamily: "Inter, sans-serif", fontWeight: 300 }}>
                      Thank you for subscribing. We will be in touch shortly via WhatsApp to confirm your membership.
                    </p>
                  </div>
                ) : (
                  <form onSubmit={handleSubmit} className="space-y-5">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                      <div>
                        <label htmlFor="name3" className="block text-xs text-text-muted uppercase tracking-widest mb-2" style={{ fontFamily: "Inter, sans-serif" }}>Full Name</label>
                        <input id="name3" type="text" required value={formName} onChange={(e) => setFormName(e.target.value)} placeholder="Enter your full name" className="w-full px-4 py-3 bg-surface-hover border border-border rounded-xl text-text-primary text-sm placeholder:text-text-muted focus:outline-none focus:border-accent/50 focus:ring-1 focus:ring-accent/20" style={{ fontFamily: "Inter, sans-serif" }} />
                      </div>
                      <div>
                        <label htmlFor="whatsapp3" className="block text-xs text-text-muted uppercase tracking-widest mb-2" style={{ fontFamily: "Inter, sans-serif" }}>Number</label>
                        <input id="whatsapp3" type="tel" required value={whatsapp} onChange={(e) => setWhatsapp(e.target.value)} placeholder="+44 7700 000000" className="w-full px-4 py-3 bg-surface-hover border border-border rounded-xl text-text-primary text-sm placeholder:text-text-muted focus:outline-none focus:border-accent/50 focus:ring-1 focus:ring-accent/20" style={{ fontFamily: "Inter, sans-serif" }} />
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                      <div>
                        <label htmlFor="dob3" className="block text-xs text-text-muted uppercase tracking-widest mb-2" style={{ fontFamily: "Inter, sans-serif" }}>Date of Birth</label>
                        <input id="dob3" type="date" required value={dob} onChange={(e) => setDob(e.target.value)} className="w-full px-4 py-3 bg-surface-hover border border-border rounded-xl text-text-primary text-sm placeholder:text-text-muted focus:outline-none focus:border-accent/50 focus:ring-1 focus:ring-accent/20" style={{ fontFamily: "Inter, sans-serif" }} />
                      </div>
                      <div>
                        <label htmlFor="interests3" className="block text-xs text-text-muted uppercase tracking-widest mb-2" style={{ fontFamily: "Inter, sans-serif" }}>Interests</label>
                        <input id="interests3" type="text" value={interests} onChange={(e) => setInterests(e.target.value)} placeholder="e.g. Pokémon, Comics, Sports Cards" className="w-full px-4 py-3 bg-surface-hover border border-border rounded-xl text-text-primary text-sm placeholder:text-text-muted focus:outline-none focus:border-accent/50 focus:ring-1 focus:ring-accent/20" style={{ fontFamily: "Inter, sans-serif" }} />
                      </div>
                    </div>

                    <div>
                      <label htmlFor="profile3" className="block text-xs text-text-muted uppercase tracking-widest mb-2" style={{ fontFamily: "Inter, sans-serif" }}>Profile</label>
                      <textarea id="profile3" value={profile} onChange={(e) => setProfile(e.target.value)} placeholder="Tell us a bit about yourself" rows={3} className="w-full px-4 py-3 bg-surface-hover border border-border rounded-xl text-text-primary text-sm placeholder:text-text-muted focus:outline-none focus:border-accent/50 focus:ring-1 focus:ring-accent/20 resize-none" style={{ fontFamily: "Inter, sans-serif" }} />
                    </div>

                    <div>
                      <label htmlFor="referral3" className="block text-xs text-text-muted uppercase tracking-widest mb-2" style={{ fontFamily: "Inter, sans-serif" }}>
                        Referral Name <span className="normal-case tracking-normal text-text-muted/60">(optional)</span>
                      </label>
                      <input id="referral3" type="text" value={referral} onChange={(e) => setReferral(e.target.value)} placeholder="Who referred you?" className="w-full px-4 py-3 bg-surface-hover border border-border rounded-xl text-text-primary text-sm placeholder:text-text-muted focus:outline-none focus:border-accent/50 focus:ring-1 focus:ring-accent/20" style={{ fontFamily: "Inter, sans-serif" }} />
                    </div>

                    {error && <p className="text-danger text-sm text-center">{error}</p>}

                    <button type="submit" disabled={submitting} className="w-full inline-flex items-center justify-center gap-3 px-8 py-4 bg-accent text-background text-sm font-medium tracking-widest uppercase hover:bg-accent-hover transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed" style={{ fontFamily: "Inter, sans-serif", letterSpacing: "0.15em" }}>
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
