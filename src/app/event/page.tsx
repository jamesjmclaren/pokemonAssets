"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useEffect, useRef } from "react";
import { Menu, X, ChevronRight, Send, CheckCircle, MapPin, Calendar, Users } from "lucide-react";

const CARD_TYPES = ["TCG", "Sports", "Collectibles", "Other"] as const;
type CardType = (typeof CARD_TYPES)[number];

const TABLE_COUNTS = [0, 1, 2, 3] as const;
type TableCount = 0 | 1 | 2 | 3;

interface DayAvailability {
  available: number;
  booked: number;
}

interface Availability {
  total: number;
  Saturday: DayAvailability;
  Sunday: DayAvailability;
}

export default function EventPage() {
  const router = useRouter();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [visibleSections, setVisibleSections] = useState<Set<string>>(new Set());
  const sectionRefs = useRef<Map<string, HTMLElement>>(new Map());

  const [availability, setAvailability] = useState<Availability | null>(null);

  // Form state
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [businessName, setBusinessName] = useState("");
  const [instagramHandle, setInstagramHandle] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [cardTypes, setCardTypes] = useState<CardType[]>([]);
  const [saturdayTables, setSaturdayTables] = useState<TableCount>(0);
  const [sundayTables, setSundayTables] = useState<TableCount>(0);
  const [tcAgreeNoPower, setTcAgreeNoPower] = useState(false);
  const [tcAgreeRandom, setTcAgreeRandom] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    fetch("/api/events/availability")
      .then((r) => r.json())
      .then((d) => { if (d.total) setAvailability(d as Availability); })
      .catch(() => {});
  }, []);

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting)
            setVisibleSections((prev) => new Set(prev).add(entry.target.id));
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

  const toggleCardType = (type: CardType) => {
    setCardTypes((prev) =>
      prev.includes(type) ? prev.filter((t) => t !== type) : [...prev, type]
    );
  };

  const satAvailable = availability?.Saturday.available ?? null;
  const sunAvailable = availability?.Sunday.available ?? null;
  const noDaysSelected = saturdayTables === 0 && sundayTables === 0;
  const satExceeds = satAvailable !== null && saturdayTables > satAvailable;
  const sunExceeds = sunAvailable !== null && sundayTables > sunAvailable;
  const canSubmit =
    !submitting &&
    !noDaysSelected &&
    !satExceeds &&
    !sunExceeds &&
    cardTypes.length > 0 &&
    tcAgreeNoPower &&
    tcAgreeRandom;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!firstName.trim() || !lastName.trim() || !businessName.trim() || !email.trim() || !phone.trim()) return;
    if (!tcAgreeNoPower || !tcAgreeRandom) {
      setError("Please accept both terms and conditions to continue.");
      return;
    }
    if (cardTypes.length === 0) {
      setError("Please select at least one card type.");
      return;
    }
    if (noDaysSelected) {
      setError("Please select tables for at least one day.");
      return;
    }
    setSubmitting(true);
    setError("");
    try {
      const res = await fetch("/api/events/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          first_name: firstName.trim(),
          last_name: lastName.trim(),
          business_name: businessName.trim(),
          instagram_handle: instagramHandle.trim(),
          email: email.trim(),
          phone: phone.trim(),
          card_types: cardTypes,
          saturday_tables: saturdayTables,
          sunday_tables: sundayTables,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Something went wrong.");
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

  // Per-day table picker component
  const DayTablePicker = ({
    label,
    sublabel,
    value,
    onChange,
    availableCount,
  }: {
    label: string;
    sublabel: string;
    value: TableCount;
    onChange: (n: TableCount) => void;
    availableCount: number | null;
  }) => {
    const soldOut = availableCount !== null && availableCount === 0;
    return (
      <div className={`border rounded-xl p-4 transition-colors ${value > 0 ? "border-accent/40 bg-accent/5" : "border-border"}`}>
        <div className="flex items-center justify-between mb-3">
          <div>
            <p className="text-text-primary text-sm font-medium" style={{ fontFamily: "Inter, sans-serif" }}>{label}</p>
            <p className="text-text-muted text-xs" style={{ fontFamily: "Inter, sans-serif" }}>
              {sublabel}
              {availableCount !== null && (
                <span className={`ml-2 ${soldOut ? "text-danger" : "text-accent/70"}`}>
                  {soldOut ? "· Sold out" : `· ${availableCount} left`}
                </span>
              )}
            </p>
          </div>
          {value > 0 && (
            <span className="text-accent text-xs font-medium" style={{ fontFamily: "Inter, sans-serif" }}>
              {value} table{value > 1 ? "s" : ""}
            </span>
          )}
        </div>
        <div className="grid grid-cols-4 gap-2">
          {TABLE_COUNTS.map((n) => {
            const disabled = soldOut && n > 0;
            const exceeds = availableCount !== null && n > availableCount;
            return (
              <button
                key={n}
                type="button"
                onClick={() => !disabled && !exceeds && onChange(n as TableCount)}
                disabled={disabled || exceeds}
                className={`py-2 text-sm border rounded-lg transition-all ${
                  value === n
                    ? "border-accent bg-accent text-background cursor-pointer"
                    : disabled || exceeds
                    ? "border-border text-text-muted/30 cursor-not-allowed opacity-40"
                    : "border-border text-text-muted hover:border-accent/40 hover:text-text-secondary cursor-pointer"
                }`}
                style={{ fontFamily: "Inter, sans-serif" }}
              >
                {n === 0 ? "—" : n}
              </button>
            );
          })}
        </div>
      </div>
    );
  };

  return (
    <div className="min-h-screen" style={{ fontFamily: "'Cormorant Garamond', Georgia, serif" }}>
      <style>{`@import url('https://fonts.googleapis.com/css2?family=Cormorant+Garamond:ital,wght@0,300;0,400;0,500;0,600;1,300;1,400&display=swap');`}</style>

      {/* Navigation */}
      <nav className="fixed top-0 left-0 right-0 z-50 landing-fade-in border-b border-border/20" style={{ animationDelay: "0.2s", backdropFilter: "blur(16px)", backgroundColor: "rgba(10,10,10,0.9)" }}>
        <div className="max-w-7xl mx-auto px-6 md:px-12 py-5 flex items-center justify-between">
          <Link href="/"><img src="/logo.png" alt="West Investments" className="h-10 md:h-12 object-contain" /></Link>
          <div className="hidden md:flex items-center gap-10">
            <Link href="/" className="text-text-secondary hover:text-text-primary transition-colors" style={{ fontFamily: "Inter, sans-serif", letterSpacing: "0.12em", fontSize: "11px", textTransform: "uppercase" }}>Home</Link>
            <Link href="/community" className="text-text-secondary hover:text-text-primary transition-colors" style={{ fontFamily: "Inter, sans-serif", letterSpacing: "0.12em", fontSize: "11px", textTransform: "uppercase" }}>Community</Link>
            <button onClick={() => router.push("/sign-in")} className="text-xs tracking-widest uppercase border border-accent/40 text-accent px-6 py-2.5 hover:bg-accent hover:text-background transition-all cursor-pointer" style={{ fontFamily: "Inter, sans-serif", letterSpacing: "0.2em" }}>Client Login</button>
          </div>
          <button onClick={() => setMobileMenuOpen(!mobileMenuOpen)} className="md:hidden p-2 -mr-2 text-text-secondary hover:text-text-primary" aria-label="Toggle menu">
            {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        </div>
        {mobileMenuOpen && (
          <div className="md:hidden border-t border-border/20 px-6 py-4 space-y-1" style={{ backgroundColor: "rgba(10,10,10,0.95)" }}>
            <Link href="/" onClick={() => setMobileMenuOpen(false)} className="block py-3 text-text-secondary hover:text-text-primary" style={{ fontFamily: "Inter, sans-serif", letterSpacing: "0.12em", fontSize: "11px", textTransform: "uppercase" }}>Home</Link>
            <Link href="/community" onClick={() => setMobileMenuOpen(false)} className="block py-3 text-text-secondary hover:text-text-primary" style={{ fontFamily: "Inter, sans-serif", letterSpacing: "0.12em", fontSize: "11px", textTransform: "uppercase" }}>Community</Link>
            <button onClick={() => { setMobileMenuOpen(false); router.push("/sign-in"); }} className="w-full mt-2 text-xs tracking-widest uppercase border border-accent/40 text-accent px-6 py-2.5 hover:bg-accent hover:text-background transition-all cursor-pointer" style={{ fontFamily: "Inter, sans-serif", letterSpacing: "0.2em" }}>Client Login</button>
          </div>
        )}
      </nav>

      {/* Hero */}
      <section className="relative min-h-screen flex items-end pb-24 overflow-hidden">
        <div className="absolute inset-0 z-0 bg-background">
          <div className="absolute inset-0 flex items-center justify-center">
            <img src="/logo.png" alt="" className="w-[500px] md:w-[700px] lg:w-[800px] object-contain" style={{ opacity: 0.06, clipPath: "inset(0 0 30% 0)" }} />
          </div>
          <div className="absolute inset-0" style={{ background: "linear-gradient(to top, rgba(8,8,8,1) 0%, rgba(8,8,8,0.6) 40%, rgba(8,8,8,0.3) 100%)" }} />
        </div>
        <div className="relative z-10 max-w-7xl mx-auto px-6 md:px-12 w-full">
          <div className="max-w-3xl">
            <p className="text-accent text-xs uppercase tracking-[0.35em] mb-6 landing-fade-up" style={{ fontFamily: "Inter, sans-serif", animationDelay: "0.4s" }}>West Investments — Exhibitor Stalls &amp; Spaces</p>
            <h1 className="text-5xl md:text-7xl lg:text-8xl font-light text-text-primary leading-[0.95] mb-8 landing-fade-up" style={{ animationDelay: "0.6s" }}>
              TCG<br />Card<br /><em className="text-accent font-light italic">Show</em>
            </h1>
            <p className="text-text-secondary text-lg md:text-xl leading-relaxed max-w-xl mb-6 landing-fade-up" style={{ animationDelay: "0.8s", fontFamily: "Inter, sans-serif", fontWeight: 300 }}>
              Secure your exhibitor table at ExCeL London. TCG, Sports, Collectibles and more — open to all serious collectors and traders.
            </p>
            <div className="flex flex-wrap gap-6 mb-10 landing-fade-up" style={{ animationDelay: "0.9s" }}>
              {[
                { icon: Calendar, label: "4th–5th June" },
                { icon: MapPin, label: "ExCeL London" },
                { icon: Users, label: `${availability?.total ?? 176} Tables Per Day` },
              ].map(({ icon: Icon, label }) => (
                <div key={label} className="flex items-center gap-2 text-text-muted text-sm" style={{ fontFamily: "Inter, sans-serif" }}>
                  <Icon className="w-4 h-4 text-accent/60" />{label}
                </div>
              ))}
            </div>
            <a href="#book" className="inline-flex items-center gap-3 px-8 py-4 bg-accent text-background text-sm font-medium tracking-widest uppercase hover:bg-accent-hover transition-colors landing-fade-up" style={{ fontFamily: "Inter, sans-serif", letterSpacing: "0.15em", animationDelay: "1s" }}>
              Book a Table <ChevronRight className="w-4 h-4" />
            </a>
          </div>
        </div>
      </section>

      {/* Stats bar */}
      <section id="stats" ref={setRef("stats")} className="border-y border-border/30 py-0" style={{ opacity: isVisible("stats") ? 1 : 0, transform: isVisible("stats") ? "none" : "translateY(20px)", transition: "all 0.8s cubic-bezier(0.16, 1, 0.3, 1)" }}>
        <div className="max-w-7xl mx-auto grid grid-cols-2 md:grid-cols-4 divide-x divide-border/30">
          {[
            { value: availability ? `${availability.Saturday.available}` : "—", label: "Saturday Tables Left", sub: "4th June" },
            { value: availability ? `${availability.Sunday.available}` : "—", label: "Sunday Tables Left", sub: "5th June" },
            { value: "TBD", label: "Price Per Table", sub: "one-time payment" },
            { value: "3", label: "Max Per Vendor Per Day", sub: "to ensure fair access" },
          ].map((stat) => (
            <div key={stat.label} className="px-6 py-10 md:py-12 text-center">
              <p className="text-3xl md:text-5xl font-light text-accent mb-2">{stat.value}</p>
              <p className="text-text-primary tracking-widest uppercase mb-1" style={{ fontFamily: "Inter, sans-serif", letterSpacing: "0.15em", fontSize: "9px" }}>{stat.label}</p>
              <p className="text-text-muted text-xs" style={{ fontFamily: "Inter, sans-serif" }}>{stat.sub}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Card types info */}
      <section id="info" ref={setRef("info")} className="py-24 md:py-28 px-6 md:px-12" style={{ opacity: isVisible("info") ? 1 : 0, transform: isVisible("info") ? "none" : "translateY(30px)", transition: "all 0.8s cubic-bezier(0.16, 1, 0.3, 1)" }}>
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-16">
            <p className="text-accent text-xs uppercase tracking-[0.3em] mb-4" style={{ fontFamily: "Inter, sans-serif" }}>What to Expect</p>
            <h2 className="text-3xl md:text-5xl font-light text-text-primary mb-6">Card Types Welcome</h2>
            <div className="w-24 h-px bg-accent/40 mx-auto" />
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
            {[
              { label: "TCG", desc: "Pokémon, Magic, Yu-Gi-Oh!, and all trading card games." },
              { label: "Sports", desc: "Football, Basketball, Cricket, and all sports cards." },
              { label: "Collectibles", desc: "Sealed product, graded cards, and collectible items." },
              { label: "Other", desc: "Accessories and other card-adjacent items." },
            ].map((item) => (
              <div key={item.label} className="text-center px-4 py-8 border border-border/40 rounded-2xl hover:border-accent/30 transition-colors">
                <h3 className="text-xl font-light text-accent mb-3">{item.label}</h3>
                <p className="text-text-secondary text-xs leading-relaxed" style={{ fontFamily: "Inter, sans-serif", fontWeight: 300 }}>{item.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Booking form */}
      <section id="book" className="py-24 md:py-32 px-6 md:px-12 bg-surface/30">
        <div className="max-w-6xl mx-auto">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 lg:gap-20 items-start">

            {/* Left — pitch */}
            <div className="lg:sticky lg:top-32">
              <p className="text-accent text-xs uppercase tracking-[0.3em] mb-6" style={{ fontFamily: "Inter, sans-serif" }}>Exhibitor Registration</p>
              <h2 className="text-4xl md:text-5xl font-light text-text-primary leading-tight mb-8">Reserve your<br /><em className="text-accent italic">space</em></h2>
              <div className="w-16 h-px bg-accent/40 mb-8" />
              <p className="text-text-secondary text-lg leading-relaxed mb-8" style={{ fontFamily: "Inter, sans-serif", fontWeight: 300 }}>
                Secure your exhibitor stall at the West Investments TCG Card Show at ExCeL London. Book for one or both days.
              </p>
              <div className="space-y-3 mb-8">
                {[
                  "Secure online payment via Stripe",
                  "Instant booking confirmation by email",
                  "Table assignments communicated closer to the event",
                  "Display cases can be booked at a later date",
                ].map((point) => (
                  <div key={point} className="flex items-start gap-3">
                    <CheckCircle className="w-4 h-4 text-accent mt-0.5 shrink-0" />
                    <p className="text-text-secondary text-sm" style={{ fontFamily: "Inter, sans-serif", fontWeight: 300 }}>{point}</p>
                  </div>
                ))}
              </div>
              <div className="bg-surface border border-border/50 rounded-xl p-5 space-y-2">
                <p className="text-text-muted text-xs leading-relaxed" style={{ fontFamily: "Inter, sans-serif" }}>⚠️ This booking does not include internet or power. These can be purchased at a later date from ExCeL London.</p>
                <p className="text-text-muted text-xs leading-relaxed" style={{ fontFamily: "Inter, sans-serif" }}>⚠️ Table purchases are final and cannot be refunded or exchanged after booking.</p>
              </div>
            </div>

            {/* Right — form */}
            <div>
              <div className="bg-background border border-accent/15 rounded-2xl p-8 md:p-10">
                <form onSubmit={handleSubmit} className="space-y-5">
                  <div className="text-center mb-8">
                    <h3 className="text-2xl font-light text-text-primary mb-2">Book Your Stall</h3>
                    <div className="w-12 h-px bg-accent/30 mx-auto" />
                  </div>

                  {/* Name row */}
                  <div className="grid grid-cols-2 gap-3">
                    {[
                      { id: "firstName", label: "First Name", value: firstName, onChange: setFirstName, placeholder: "Jane" },
                      { id: "lastName", label: "Last Name", value: lastName, onChange: setLastName, placeholder: "Smith" },
                    ].map((field) => (
                      <div key={field.id}>
                        <label htmlFor={field.id} className="block text-xs text-text-muted uppercase tracking-widest mb-2" style={{ fontFamily: "Inter, sans-serif" }}>{field.label}</label>
                        <input id={field.id} type="text" required value={field.value} onChange={(e) => field.onChange(e.target.value)} placeholder={field.placeholder} className="w-full px-4 py-3 bg-surface-hover border border-border rounded-xl text-text-primary text-sm placeholder:text-text-muted focus:outline-none focus:border-accent/50 focus:ring-1 focus:ring-accent/20" style={{ fontFamily: "Inter, sans-serif" }} />
                      </div>
                    ))}
                  </div>

                  {/* Text fields */}
                  {[
                    { id: "businessName", label: "Business Name", type: "text", required: true, value: businessName, onChange: setBusinessName, placeholder: "Your trading name" },
                    { id: "email", label: "Email", type: "email", required: true, value: email, onChange: setEmail, placeholder: "you@example.com" },
                    { id: "phone", label: "Mobile Phone", type: "tel", required: true, value: phone, onChange: setPhone, placeholder: "+44 7700 000000" },
                    { id: "instagram", label: "Instagram Handle", type: "text", required: false, value: instagramHandle, onChange: setInstagramHandle, placeholder: "@yourhandle", optional: true },
                  ].map((field) => (
                    <div key={field.id}>
                      <label htmlFor={field.id} className="block text-xs text-text-muted uppercase tracking-widest mb-2" style={{ fontFamily: "Inter, sans-serif" }}>
                        {field.label}{"optional" in field && <span className="normal-case tracking-normal text-text-muted/60 ml-1">(optional)</span>}
                      </label>
                      <input id={field.id} type={field.type} required={field.required} value={field.value} onChange={(e) => field.onChange(e.target.value)} placeholder={field.placeholder} className="w-full px-4 py-3 bg-surface-hover border border-border rounded-xl text-text-primary text-sm placeholder:text-text-muted focus:outline-none focus:border-accent/50 focus:ring-1 focus:ring-accent/20" style={{ fontFamily: "Inter, sans-serif" }} />
                    </div>
                  ))}

                  {/* Card Type — multi-select */}
                  <div>
                    <label className="block text-xs text-text-muted uppercase tracking-widest mb-1" style={{ fontFamily: "Inter, sans-serif" }}>Card Type</label>
                    <p className="text-text-muted text-[10px] mb-3" style={{ fontFamily: "Inter, sans-serif" }}>Select all that apply</p>
                    <div className="grid grid-cols-2 gap-2">
                      {CARD_TYPES.map((type) => {
                        const selected = cardTypes.includes(type);
                        return (
                          <button
                            key={type}
                            type="button"
                            onClick={() => toggleCardType(type)}
                            className={`py-2.5 text-sm border rounded-xl transition-all cursor-pointer flex items-center justify-center gap-2 ${selected ? "border-accent bg-accent/10 text-accent" : "border-border text-text-muted hover:border-accent/30 hover:text-text-secondary"}`}
                            style={{ fontFamily: "Inter, sans-serif" }}
                          >
                            {selected && (
                              <svg className="w-3.5 h-3.5 shrink-0" viewBox="0 0 14 14" fill="none">
                                <path d="M2 7l4 4 6-6" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                              </svg>
                            )}
                            {type}
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {/* Day + tables — per day */}
                  <div>
                    <label className="block text-xs text-text-muted uppercase tracking-widest mb-1" style={{ fontFamily: "Inter, sans-serif" }}>Tables Per Day</label>
                    <p className="text-text-muted text-[10px] mb-3" style={{ fontFamily: "Inter, sans-serif" }}>Select "—" for days you are not attending. Max 3 tables per day.</p>
                    <div className="space-y-3">
                      <DayTablePicker
                        label="Saturday 4th June"
                        sublabel="Day 1"
                        value={saturdayTables}
                        onChange={setSaturdayTables}
                        availableCount={satAvailable}
                      />
                      <DayTablePicker
                        label="Sunday 5th June"
                        sublabel="Day 2"
                        value={sundayTables}
                        onChange={setSundayTables}
                        availableCount={sunAvailable}
                      />
                    </div>
                    {satExceeds && satAvailable !== null && (
                      <p className="text-danger text-xs mt-2" style={{ fontFamily: "Inter, sans-serif" }}>Only {satAvailable} Saturday table{satAvailable === 1 ? "" : "s"} remaining.</p>
                    )}
                    {sunExceeds && sunAvailable !== null && (
                      <p className="text-danger text-xs mt-1" style={{ fontFamily: "Inter, sans-serif" }}>Only {sunAvailable} Sunday table{sunAvailable === 1 ? "" : "s"} remaining.</p>
                    )}
                  </div>

                  {/* T&Cs */}
                  <div className="space-y-4 pt-2">
                    <p className="text-xs text-text-muted uppercase tracking-widest" style={{ fontFamily: "Inter, sans-serif" }}>Terms &amp; Conditions</p>
                    {[
                      { id: "tc-power", checked: tcAgreeNoPower, onChange: setTcAgreeNoPower, label: "I understand this booking does not include internet or power. These can be purchased at a later date from ExCeL London." },
                      { id: "tc-random", checked: tcAgreeRandom, onChange: setTcAgreeRandom, label: "I understand that these tables and booths will be allocated completely randomly." },
                    ].map((tc) => (
                      <label key={tc.id} htmlFor={tc.id} className="flex items-start gap-3 cursor-pointer group">
                        <div className="relative mt-0.5 shrink-0">
                          <input id={tc.id} type="checkbox" checked={tc.checked} onChange={(e) => tc.onChange(e.target.checked)} className="sr-only" />
                          <div className={`w-4 h-4 border rounded transition-all ${tc.checked ? "bg-accent border-accent" : "border-border group-hover:border-accent/50"}`}>
                            {tc.checked && (
                              <svg className="w-3 h-3 text-background m-0.5" viewBox="0 0 12 12" fill="none">
                                <path d="M2 6l3 3 5-5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                              </svg>
                            )}
                          </div>
                        </div>
                        <span className="text-text-secondary text-xs leading-relaxed" style={{ fontFamily: "Inter, sans-serif", fontWeight: 300 }}>{tc.label}</span>
                      </label>
                    ))}
                    <p className="text-text-muted text-xs leading-relaxed pt-1" style={{ fontFamily: "Inter, sans-serif" }}>
                      Note: Display cases can be booked at a later date. Table purchases are final and cannot be refunded or exchanged after booking.
                    </p>
                  </div>

                  {/* Pre-booking notice */}
                  <div className="border border-accent/20 rounded-xl px-5 py-4 bg-accent/5">
                    <p className="text-text-secondary text-xs leading-relaxed text-center" style={{ fontFamily: "Inter, sans-serif", fontWeight: 300 }}>
                      Please ensure you have spoken with a member of the team before booking your exhibitor space here. Non-refundable.{" "}
                      <a href="mailto:info@west.investments" className="text-accent underline">info@west.investments</a>
                      {" "}or DM via Instagram.
                    </p>
                  </div>

                  {error && <p className="text-danger text-sm text-center">{error}</p>}

                  <button
                    type="submit"
                    disabled={!canSubmit}
                    className="w-full inline-flex items-center justify-center gap-3 px-8 py-4 bg-accent text-background text-sm font-medium tracking-widest uppercase hover:bg-accent-hover transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                    style={{ fontFamily: "Inter, sans-serif", letterSpacing: "0.15em" }}
                  >
                    {submitting
                      ? "Processing..."
                      : `Reserve Tables${saturdayTables > 0 && sundayTables > 0 ? " — Both Days" : saturdayTables > 0 ? " — Saturday" : sundayTables > 0 ? " — Sunday" : ""}`}
                    {!submitting && <Send className="w-4 h-4" />}
                  </button>

                  <p className="text-text-muted text-[10px] text-center leading-relaxed" style={{ fontFamily: "Inter, sans-serif" }}>
                    Secure payment via Stripe. By booking you agree to our{" "}
                    <Link href="/terms" className="underline hover:text-text-secondary">Terms</Link>{" "}and{" "}
                    <Link href="/privacy" className="underline hover:text-text-secondary">Privacy Policy</Link>.
                  </p>
                </form>
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
            <a href="mailto:info@west.investments" className="hover:text-text-secondary">info@west.investments</a>
          </div>
        </div>
      </footer>
    </div>
  );
}
