"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useEffect } from "react";
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
  ArrowRight,
  Send,
  CheckCircle,
} from "lucide-react";

const TOTAL_SPACES = 1000;
const MEMBERS_FILLED = 0;

interface Feature {
  icon: React.ElementType;
  title: string;
  description: string;
  comingSoon: boolean;
}

const currentFeatures: Feature[] = [
  {
    icon: TrendingUp,
    title: "Portfolio Tracking",
    description:
      "Monitor the value of your collection with daily real-time pricing updates.",
    comingSoon: true,
  },
  {
    icon: FileBarChart,
    title: "Portfolio Reporting",
    description:
      "Access tailored reports, market trends, and portfolio analytics designed to give you a clearer view of performance.",
    comingSoon: true,
  },
  {
    icon: ArrowLeftRight,
    title: "Buy, Sell & Trade History",
    description:
      "Quickly view comparable pricing across online listings and recent market activity.",
    comingSoon: true,
  },
  {
    icon: MessageCircle,
    title: "Private WhatsApp Trading Group",
    description:
      "Gain access to a curated private group of quality investors, buyers, and sellers.",
    comingSoon: false,
  },
  {
    icon: Calendar,
    title: "Private Trade Events",
    description:
      "Receive access to exclusive trade events and private opportunities. Subject to availability.",
    comingSoon: false,
  },
];

const upcomingFeatures: Feature[] = [
  {
    icon: Zap,
    title: "Advanced Portfolio Tracking",
    description:
      "More powerful tools to monitor the performance and movement of your collection.",
    comingSoon: true,
  },
  {
    icon: Bell,
    title: "Price Alerts & Tracking",
    description:
      "Stay informed with alerts on pricing changes and key market movements.",
    comingSoon: true,
  },
  {
    icon: Calculator,
    title: "Trade Calculator",
    description:
      "Analyse, compare, and record trades with greater accuracy and confidence.",
    comingSoon: true,
  },
  {
    icon: BarChart3,
    title: "Enhanced Reports, Trends & Analytics",
    description:
      "Deeper insights to support more informed collecting and trading decisions.",
    comingSoon: true,
  },
  {
    icon: Receipt,
    title: "Tax Reporting Support",
    description:
      "Simplified reports designed to assist with tax and accounting preparation.",
    comingSoon: true,
  },
  {
    icon: Clock,
    title: "Daily Sales Recap",
    description:
      "Browse verified sales from the previous day in one easy-to-view summary.",
    comingSoon: true,
  },
  {
    icon: Camera,
    title: "Camera Search",
    description: "Use your camera to search millions of cards instantly.",
    comingSoon: true,
  },
  {
    icon: BadgeCheck,
    title: "Verified Vendor Profiles",
    description: "Connect with trusted vendors through verified profiles.",
    comingSoon: true,
  },
];

function FeatureCard({ feature }: { feature: Feature }) {
  const Icon = feature.icon;
  return (
    <div className="group relative bg-surface border border-border rounded-2xl p-6 hover:border-accent/30 transition-all duration-300">
      {feature.comingSoon && (
        <span className="absolute top-4 right-4 px-2.5 py-1 rounded-full bg-accent/10 text-accent text-[10px] font-bold uppercase tracking-widest">
          Coming Soon
        </span>
      )}
      <div className="w-10 h-10 rounded-xl bg-accent/10 flex items-center justify-center mb-4">
        <Icon className="w-5 h-5 text-accent" />
      </div>
      <h3 className="text-text-primary font-semibold mb-2">{feature.title}</h3>
      <p className="text-text-secondary text-sm leading-relaxed">
        {feature.description}
      </p>
    </div>
  );
}

export default function JoinPage() {
  const router = useRouter();
  const spacesRemaining = TOTAL_SPACES - MEMBERS_FILLED;
  const [formName, setFormName] = useState("");
  const [whatsapp, setWhatsapp] = useState("");
  const [submitted, setSubmitted] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formName.trim() || !whatsapp.trim()) return;
    setSubmitting(true);
    // Simulate submission — replace with actual API call
    await new Promise((resolve) => setTimeout(resolve, 1000));
    setSubmitting(false);
    setSubmitted(true);
  };

  return (
    <div className="min-h-screen landing-grain">
      {/* Navigation */}
      <nav
        className="fixed top-0 left-0 right-0 z-50 landing-fade-in border-b border-border/20"
        style={{
          animationDelay: "0.2s",
          backdropFilter: "blur(16px)",
          backgroundColor: "rgba(10,10,10,0.9)",
        }}
      >
        <div className="max-w-7xl mx-auto px-6 md:px-12 py-5 flex items-center justify-between">
          <Link href="/">
            <img
              src="/logo.png"
              alt="West Investments"
              className="h-10 md:h-12 object-contain"
            />
          </Link>
          <div className="flex items-center gap-10">
            <Link
              href="/"
              className="hidden md:block text-text-secondary hover:text-text-primary transition-colors"
              style={{
                fontFamily: "Inter, sans-serif",
                letterSpacing: "0.12em",
                fontSize: "11px",
                textTransform: "uppercase",
              }}
            >
              Home
            </Link>
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

      {/* Hero */}
      <section className="pt-36 pb-20 px-6 md:px-12 text-center">
        <div className="max-w-3xl mx-auto">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-accent/10 border border-accent/20 mb-8 landing-fade-up">
            <Crown className="w-4 h-4 text-accent" />
            <span
              className="text-accent text-xs font-medium uppercase tracking-widest"
              style={{ fontFamily: "Inter, sans-serif" }}
            >
              Exclusive Membership
            </span>
          </div>
          <h1
            className="text-4xl md:text-5xl lg:text-6xl font-light text-text-primary mb-6 leading-tight landing-fade-up"
            style={{
              animationDelay: "0.1s",
              fontFamily: "Inter, sans-serif",
            }}
          >
            Join West Investments
          </h1>
          <p
            className="text-text-secondary text-lg md:text-xl leading-relaxed max-w-2xl mx-auto landing-fade-up"
            style={{ animationDelay: "0.2s" }}
          >
            Membership to the West Investments exclusive community is
            intentionally limited to just{" "}
            <span className="text-accent font-medium">
              {TOTAL_SPACES.toLocaleString()}
            </span>{" "}
            clients worldwide at any one time. To maintain a high level of
            access, discretion, and service, availability is carefully managed.
          </p>
        </div>
      </section>

      {/* Counter */}
      <section className="pb-20 px-6 md:px-12">
        <div
          className="max-w-md mx-auto text-center landing-fade-up"
          style={{ animationDelay: "0.3s" }}
        >
          <div className="bg-surface border border-border rounded-2xl p-8">
            <p
              className="text-text-muted text-xs uppercase tracking-widest mb-3"
              style={{ fontFamily: "Inter, sans-serif" }}
            >
              Spaces Available
            </p>
            <p className="text-5xl md:text-6xl font-light text-accent mb-2">
              {spacesRemaining.toLocaleString()}
            </p>
            <p className="text-text-secondary text-sm">
              of {TOTAL_SPACES.toLocaleString()} total memberships
            </p>
            <div className="mt-4 w-full bg-surface-hover rounded-full h-2 overflow-hidden">
              <div
                className="h-full bg-accent rounded-full transition-all duration-1000"
                style={{
                  width: `${((TOTAL_SPACES - spacesRemaining) / TOTAL_SPACES) * 100}%`,
                  minWidth: spacesRemaining < TOTAL_SPACES ? "2%" : "0%",
                }}
              />
            </div>
            <p className="text-text-muted text-xs mt-3">
              Counter refreshed annually
            </p>
          </div>
        </div>
      </section>

      {/* What You Get */}
      <section className="pb-20 px-6 md:px-12">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-12">
            <h2
              className="text-3xl md:text-4xl font-light text-text-primary mb-4"
              style={{ fontFamily: "Inter, sans-serif" }}
            >
              What You Get
            </h2>
            <div className="w-16 h-px bg-accent mx-auto" />
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {currentFeatures.map((feature) => (
              <FeatureCard key={feature.title} feature={feature} />
            ))}
          </div>
        </div>
      </section>

      {/* Coming Soon */}
      <section className="pb-20 px-6 md:px-12">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-12">
            <h2
              className="text-3xl md:text-4xl font-light text-text-primary mb-4"
              style={{ fontFamily: "Inter, sans-serif" }}
            >
              Coming Soon
            </h2>
            <div className="w-16 h-px bg-accent mx-auto mb-4" />
            <p className="text-text-secondary text-sm max-w-xl mx-auto">
              We are actively building the next generation of tools for serious
              collectors and investors.
            </p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {upcomingFeatures.map((feature) => (
              <FeatureCard key={feature.title} feature={feature} />
            ))}
          </div>
        </div>
      </section>

      {/* Application Form */}
      <section className="pb-24 px-6 md:px-12" id="apply">
        <div className="max-w-xl mx-auto">
          <div className="bg-surface border border-accent/20 rounded-2xl p-10">
            <div className="text-center mb-8">
              <h3
                className="text-2xl md:text-3xl font-light text-text-primary mb-3"
                style={{ fontFamily: "Inter, sans-serif" }}
              >
                Apply to Join
              </h3>
              <p className="text-text-secondary text-sm">
                Submit your details below and we will be in touch.
              </p>
            </div>

            {submitted ? (
              <div className="text-center py-8">
                <CheckCircle className="w-12 h-12 text-success mx-auto mb-4" />
                <h4 className="text-xl font-medium text-text-primary mb-2">
                  Application Received
                </h4>
                <p className="text-text-secondary text-sm">
                  Thank you for your interest. We will review your application
                  and be in touch shortly via WhatsApp.
                </p>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-5">
                <div>
                  <label
                    htmlFor="name"
                    className="block text-xs text-text-muted uppercase tracking-widest mb-2"
                    style={{ fontFamily: "Inter, sans-serif" }}
                  >
                    Full Name
                  </label>
                  <input
                    id="name"
                    type="text"
                    required
                    value={formName}
                    onChange={(e) => setFormName(e.target.value)}
                    placeholder="Enter your full name"
                    className="w-full px-4 py-3 bg-surface-hover border border-border rounded-xl text-text-primary text-sm placeholder:text-text-muted focus:outline-none focus:border-accent/50 focus:ring-1 focus:ring-accent/20"
                  />
                </div>
                <div>
                  <label
                    htmlFor="whatsapp"
                    className="block text-xs text-text-muted uppercase tracking-widest mb-2"
                    style={{ fontFamily: "Inter, sans-serif" }}
                  >
                    WhatsApp Number
                  </label>
                  <input
                    id="whatsapp"
                    type="tel"
                    required
                    value={whatsapp}
                    onChange={(e) => setWhatsapp(e.target.value)}
                    placeholder="+44 7700 000000"
                    className="w-full px-4 py-3 bg-surface-hover border border-border rounded-xl text-text-primary text-sm placeholder:text-text-muted focus:outline-none focus:border-accent/50 focus:ring-1 focus:ring-accent/20"
                  />
                </div>
                <button
                  type="submit"
                  disabled={submitting}
                  className="w-full inline-flex items-center justify-center gap-3 px-8 py-3.5 bg-accent text-background text-sm font-medium tracking-widest uppercase hover:bg-accent-hover transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                  style={{ fontFamily: "Inter, sans-serif", letterSpacing: "0.15em" }}
                >
                  {submitting ? "Submitting..." : "Submit Application"}
                  {!submitting && <Send className="w-4 h-4" />}
                </button>
              </form>
            )}
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-border/30 py-8 px-6 md:px-12">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-4">
          <img
            src="/logo.png"
            alt="West Investments"
            className="h-8 object-contain opacity-50"
          />
          <div className="flex items-center gap-6 text-xs text-text-muted">
            <Link href="/terms" className="hover:text-text-secondary">
              Terms
            </Link>
            <Link href="/privacy" className="hover:text-text-secondary">
              Privacy
            </Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
