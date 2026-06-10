"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useEffect, useRef, useCallback } from "react";
import {
  Menu,
  X,
  ChevronRight,
  Send,
  CheckCircle,
  MapPin,
  Calendar,
  Users,
  ShoppingCart,
  Trash2,
  Hotel,
  ZoomIn,
  ZoomOut,
  Maximize2,
  Clock,
} from "lucide-react";
import {
  FLOOR_PLAN,
  VIEWBOX_W,
  VIEWBOX_H,
  type TableUnit,
  type TableTypeKey,
} from "@/lib/event-floor-plan";

// ─── Types ────────────────────────────────────────────────────────────────────

type DayKey = "Saturday" | "Sunday";
type CardType = "TCG" | "Sports" | "Collectibles" | "Memorabilia" | "Other";

interface AvailabilityTypeData {
  type_key: string;
  label: string;
  description: string;
  price_pence: number;
  total_available: number;
  display_color: string;
  sort_order: number;
  Saturday: { booked: number; held?: number; available: number };
  Sunday: { booked: number; held?: number; available: number };
}

interface AvailabilityData {
  eventId: string;
  slug: string;
  name: string;
  venue: string;
  days: string[];
  is_active: boolean;
  tableTypes: AvailabilityTypeData[];
  // Specific table labels already paid for (sold), keyed by day.
  booked?: Record<string, string[]>;
  // Specific table labels currently held by anyone (incl. you), keyed by day.
  held?: Record<string, string[]>;
}

// Floor plan units come from the shared module (also used by the API + admin).
const TABLE_LAYOUT = FLOOR_PLAN;

// Sponsor areas — decorative, non-bookable zones. Coordinates are in SVG units
// (viewBox 0 0 772 464). Easy to nudge: change x/y/w/h below.
const SPONSOR_AREAS: { x: number; y: number; w: number; h: number; label: string }[] = [
  // Centre column, between the top group of tables and the centre aisle
  { x: 320, y: 168, w: 126, h: 60, label: "SPONSOR" },
  // Mirror of the above, just below the centre aisle (aisle is at y=254)
  { x: 320, y: 280, w: 126, h: 60, label: "SPONSOR" },
  // Top-right, north of the corner (red) tables
  { x: 648, y: 16, w: 110, h: 86, label: "SPONSOR" },
];

const CARD_TYPES: CardType[] = ["TCG", "Sports", "Collectibles", "Memorabilia", "Other"];

// Colours mirror the spreadsheet: standard = green, end corner = blue, premier = red.
const TYPE_COLORS: Record<TableTypeKey, { fill: string; selected: string; sold: string; label: string }> = {
  standard:       { fill: "#3b82f6", selected: "#93c5fd", sold: "#374151", label: "Standard" },
  corner:         { fill: "#22c55e", selected: "#86efac", sold: "#374151", label: "End Corner" },
  premier_corner: { fill: "#ef4444", selected: "#fca5a5", sold: "#374151", label: "Premier Corner" },
};

// Fallback pricing/inventory so the floor plan and cart work even before the
// availability API (database) is populated. Mirrors the migration v18 seed.
const TYPE_META: Record<TableTypeKey, { label: string; price_pence: number; total_available: number }> = {
  standard:       { label: "Standard Table", price_pence: 10000, total_available: 120 },
  corner:         { label: "End Corner",     price_pence: 20000, total_available: 24 },
  premier_corner: { label: "Premier Corner", price_pence: 27500, total_available: 32 },
};

// ─── Main page ────────────────────────────────────────────────────────────────

export default function EventBookingPage({ slug }: { slug: string }) {
  const router = useRouter();

  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [availability, setAvailability] = useState<AvailabilityData | null>(null);
  const [loadingAvail, setLoadingAvail] = useState(true);

  // Floor plan state
  const [activeDay, setActiveDay] = useState<DayKey>("Saturday");
  // Selected cell IDs per day (these are this browser's live holds)
  const [selectedCells, setSelectedCells] = useState<Record<DayKey, Set<string>>>({
    Saturday: new Set(),
    Sunday: new Set(),
  });
  const [pendingCell, setPendingCell] = useState<string | null>(null); // table mid hold/release

  // Reserve-on-select hold token + countdown
  const holdTokenRef = useRef<string>("");
  const [holdDeadline, setHoldDeadline] = useState<number | null>(null); // epoch ms
  const [nowMs, setNowMs] = useState<number>(Date.now());

  // Zoom & pan for the floor plan
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const dragRef = useRef<{ x: number; y: number; px: number; py: number } | null>(null);
  const movedRef = useRef(false); // true when a pan drag moved (suppresses the click)
  const plotRef = useRef<HTMLDivElement>(null);

  // Form state
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [businessName, setBusinessName] = useState("");
  const [instagramHandle, setInstagramHandle] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [cardTypes, setCardTypes] = useState<CardType[]>([]);
  const [tcAgreeNoPower, setTcAgreeNoPower] = useState(false);
  const [tcAgreeRandom, setTcAgreeRandom] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  // Scroll animations
  const [visibleSections, setVisibleSections] = useState<Set<string>>(new Set());
  const sectionRefs = useRef<Map<string, HTMLElement>>(new Map());
  const setRef = (id: string) => (el: HTMLElement | null) => {
    if (el) sectionRefs.current.set(id, el);
  };
  const isVisible = (id: string) => visibleSections.has(id);

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((e) => {
          if (e.isIntersecting) setVisibleSections((prev) => new Set(prev).add(e.target.id));
        });
      },
      { threshold: 0.08 }
    );
    sectionRefs.current.forEach((el) => observer.observe(el));
    return () => observer.disconnect();
  }, []);

  // Availability fetch + polling (so others' holds/sales appear live)
  const refreshAvailability = useCallback(() => {
    if (!slug) return;
    fetch(`/api/events/${slug}/availability`)
      .then((r) => r.json())
      .then((d) => { if (d.tableTypes) setAvailability(d as AvailabilityData); })
      .catch(() => {})
      .finally(() => setLoadingAvail(false));
  }, [slug]);

  useEffect(() => {
    refreshAvailability();
    const id = setInterval(refreshAvailability, 8000);
    return () => clearInterval(id);
  }, [refreshAvailability]);

  // One hold token per browser tab
  useEffect(() => {
    let t = sessionStorage.getItem("eventHoldToken");
    if (!t) {
      t = crypto.randomUUID
        ? crypto.randomUUID()
        : `${Date.now()}-${Math.random().toString(36).slice(2)}`;
      sessionStorage.setItem("eventHoldToken", t);
    }
    holdTokenRef.current = t;
    // Restore any holds this token still owns (e.g. after a refresh)
    fetch(`/api/events/${slug}/holds?token=${encodeURIComponent(t)}`)
      .then((r) => r.json())
      .then((d) => {
        if (d?.held) {
          setSelectedCells({
            Saturday: new Set<string>(d.held.Saturday ?? []),
            Sunday: new Set<string>(d.held.Sunday ?? []),
          });
        }
        if (d?.expires_at) setHoldDeadline(new Date(d.expires_at).getTime());
      })
      .catch(() => {});
  }, [slug]);

  // Countdown tick
  useEffect(() => {
    if (!holdDeadline) return;
    const id = setInterval(() => setNowMs(Date.now()), 1000);
    return () => clearInterval(id);
  }, [holdDeadline]);

  const totalSelected = selectedCells.Saturday.size + selectedCells.Sunday.size;

  // When the hold runs out, clear the selection and tell the vendor
  useEffect(() => {
    if (holdDeadline && nowMs >= holdDeadline && totalSelected > 0) {
      setSelectedCells({ Saturday: new Set(), Sunday: new Set() });
      setHoldDeadline(null);
      setError("Your 15-minute hold expired — please re-select your tables.");
      refreshAvailability();
    }
  }, [nowMs, holdDeadline, totalSelected, refreshAvailability]);

  // Drop the countdown once the cart is empty
  useEffect(() => {
    if (totalSelected === 0 && holdDeadline) setHoldDeadline(null);
  }, [totalSelected, holdDeadline]);

  // ── Helpers ────────────────────────────────────────────────────────────────

  const getTypeData = useCallback(
    (typeKey: TableTypeKey) =>
      availability?.tableTypes.find((t) => t.type_key === typeKey) ?? null,
    [availability]
  );

  // Type label/price/total with fallback to local constants when the API has no data yet.
  const getTypeMeta = useCallback(
    (typeKey: TableTypeKey) => {
      const td = getTypeData(typeKey);
      return {
        label: td?.label ?? TYPE_META[typeKey].label,
        price_pence: td?.price_pence ?? TYPE_META[typeKey].price_pence,
        total_available: td?.total_available ?? TYPE_META[typeKey].total_available,
      };
    },
    [getTypeData]
  );

  // Cell states. Sold = paid by anyone. Locked = held by someone else (not you).
  const isPaidSold = useCallback(
    (cell: TableUnit, day: DayKey) => !!availability?.booked?.[day]?.includes(cell.id),
    [availability]
  );
  const isHeldByOther = useCallback(
    (cell: TableUnit, day: DayKey) =>
      !!availability?.held?.[day]?.includes(cell.id) && !selectedCells[day].has(cell.id),
    [availability, selectedCells]
  );

  // Sort table numbers like S1, S2, … S10 (numeric within the letter prefix).
  const sortLabels = (a: string, b: string) => {
    const na = parseInt(a.replace(/\D/g, ""), 10);
    const nb = parseInt(b.replace(/\D/g, ""), 10);
    return a[0] === b[0] ? na - nb : a.localeCompare(b);
  };

  // Clicking a table reserves it (server hold) or releases it.
  const handleCellClick = useCallback(
    async (cell: TableUnit) => {
      if (movedRef.current) { movedRef.current = false; return; } // was a pan, not a tap
      const token = holdTokenRef.current;
      if (!token || pendingCell) return;
      const day = activeDay;
      const isSelected = selectedCells[day].has(cell.id);
      if (!isSelected && (isPaidSold(cell, day) || isHeldByOther(cell, day))) return;

      setPendingCell(cell.id);
      try {
        if (isSelected) {
          await fetch(`/api/events/${slug}/release`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ label: cell.id, day, holdToken: token }),
          });
          setSelectedCells((prev) => ({
            ...prev,
            [day]: new Set([...prev[day]].filter((id) => id !== cell.id)),
          }));
        } else {
          const res = await fetch(`/api/events/${slug}/hold`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ label: cell.id, day, holdToken: token }),
          });
          const data = await res.json();
          if (!res.ok) {
            setError(data.error || "That table is no longer available.");
            refreshAvailability();
            return;
          }
          setSelectedCells((prev) => ({ ...prev, [day]: new Set([...prev[day], cell.id]) }));
          if (data.expires_at) setHoldDeadline(new Date(data.expires_at).getTime());
          setError("");
        }
      } catch {
        setError("Network hiccup — please try that table again.");
      } finally {
        setPendingCell(null);
        refreshAvailability();
      }
    },
    [activeDay, selectedCells, slug, pendingCell, isPaidSold, isHeldByOther, refreshAvailability]
  );

  // ── Zoom & pan ─────────────────────────────────────────────────────────────
  useEffect(() => {
    const el = plotRef.current;
    if (!el) return;
    const onWheel = (e: WheelEvent) => {
      e.preventDefault();
      setZoom((z) => {
        const nz = Math.min(3, Math.max(1, +(z - e.deltaY * 0.0016).toFixed(2)));
        if (nz === 1) setPan({ x: 0, y: 0 });
        return nz;
      });
    };
    el.addEventListener("wheel", onWheel, { passive: false });
    return () => el.removeEventListener("wheel", onWheel);
  }, []);

  const zoomBy = (delta: number) =>
    setZoom((z) => {
      const nz = Math.min(3, Math.max(1, +(z + delta).toFixed(2)));
      if (nz === 1) setPan({ x: 0, y: 0 });
      return nz;
    });
  const resetView = () => { setZoom(1); setPan({ x: 0, y: 0 }); };
  const onPointerDown = (e: React.PointerEvent) => {
    if (zoom <= 1) return;
    dragRef.current = { x: e.clientX, y: e.clientY, px: pan.x, py: pan.y };
    movedRef.current = false;
  };
  const onPointerMove = (e: React.PointerEvent) => {
    const d = dragRef.current;
    if (!d) return;
    if (Math.abs(e.clientX - d.x) > 4 || Math.abs(e.clientY - d.y) > 4) movedRef.current = true;
    setPan({ x: d.px + (e.clientX - d.x), y: d.py + (e.clientY - d.y) });
  };
  const onPointerUp = () => { dragRef.current = null; };

  // ── Hold countdown ─────────────────────────────────────────────────────────
  const secondsLeft = holdDeadline ? Math.max(0, Math.ceil((holdDeadline - nowMs) / 1000)) : null;
  const countdown =
    secondsLeft != null
      ? `${Math.floor(secondsLeft / 60)}:${String(secondsLeft % 60).padStart(2, "0")}`
      : null;
  const countdownPct = secondsLeft != null ? Math.max(0, Math.min(100, (secondsLeft / (15 * 60)) * 100)) : 0;
  const countdownLow = secondsLeft != null && secondsLeft <= 120;

  // ── Cart derived state ─────────────────────────────────────────────────────

  interface CartItem {
    typeKey: TableTypeKey;
    label: string;
    day: DayKey;
    quantity: number;
    unitPricePence: number;
    tables: string[]; // specific table numbers, e.g. ["S1", "S5"]
  }

  const cartItems: CartItem[] = [];
  for (const day of ["Saturday", "Sunday"] as DayKey[]) {
    const byType: Partial<Record<TableTypeKey, string[]>> = {};
    for (const cellId of selectedCells[day]) {
      const cell = TABLE_LAYOUT.find((c) => c.id === cellId);
      if (cell) (byType[cell.type] ??= []).push(cell.id);
    }
    for (const [typeKey, labels] of Object.entries(byType) as [TableTypeKey, string[]][]) {
      if (labels.length > 0) {
        const meta = getTypeMeta(typeKey);
        cartItems.push({
          typeKey,
          label: meta.label,
          day,
          quantity: labels.length,
          unitPricePence: meta.price_pence,
          tables: labels.slice().sort(sortLabels),
        });
      }
    }
  }

  const totalPence = cartItems.reduce((s, i) => s + i.quantity * i.unitPricePence, 0);
  const cartIsEmpty = cartItems.length === 0;

  // Release a set of holds on the server (fire-and-forget) then refresh.
  const releaseHolds = (items: { label: string; day: DayKey }[]) => {
    const token = holdTokenRef.current;
    if (!token) return;
    Promise.all(
      items.map((it) =>
        fetch(`/api/events/${slug}/release`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ label: it.label, day: it.day, holdToken: token }),
        }).catch(() => {})
      )
    ).finally(refreshAvailability);
  };

  const removeCartItem = (typeKey: TableTypeKey, day: DayKey) => {
    const labels = [...selectedCells[day]].filter(
      (id) => TABLE_LAYOUT.find((c) => c.id === id)?.type === typeKey
    );
    releaseHolds(labels.map((label) => ({ label, day })));
    setSelectedCells((prev) => ({
      ...prev,
      [day]: new Set([...prev[day]].filter((id) => !labels.includes(id))),
    }));
  };

  const clearCart = () => {
    releaseHolds([
      ...[...selectedCells.Saturday].map((label) => ({ label, day: "Saturday" as DayKey })),
      ...[...selectedCells.Sunday].map((label) => ({ label, day: "Sunday" as DayKey })),
    ]);
    setSelectedCells({ Saturday: new Set(), Sunday: new Set() });
    setHoldDeadline(null);
  };

  // ── Submit ─────────────────────────────────────────────────────────────────

  const canSubmit =
    !submitting &&
    !cartIsEmpty &&
    cardTypes.length > 0 &&
    tcAgreeNoPower &&
    tcAgreeRandom;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (
      !firstName.trim() ||
      !lastName.trim() ||
      !businessName.trim() ||
      !email.trim() ||
      !phone.trim()
    )
      return;
    if (!tcAgreeNoPower || !tcAgreeRandom) {
      setError("Please accept both terms and conditions to continue.");
      return;
    }
    if (cardTypes.length === 0) {
      setError("Please select at least one card type.");
      return;
    }
    if (cartIsEmpty) {
      setError("Please select at least one table from the floor plan.");
      return;
    }
    setSubmitting(true);
    setError("");
    try {
      const res = await fetch(`/api/events/${slug}/checkout`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          // The server reads the tables from this token's live holds
          holdToken: holdTokenRef.current,
          first_name: firstName.trim(),
          last_name: lastName.trim(),
          business_name: businessName.trim(),
          instagram_handle: instagramHandle.trim(),
          email: email.trim(),
          phone: phone.trim(),
          card_types: cardTypes,
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

  const toggleCardType = (type: CardType) => {
    setCardTypes((prev) =>
      prev.includes(type) ? prev.filter((t) => t !== type) : [...prev, type]
    );
  };

  // ── Stats for header bar ───────────────────────────────────────────────────

  const totalAvailableToday =
    availability?.tableTypes.reduce((s, t) => s + t[activeDay].available, 0) ?? null;

  // ── Render ─────────────────────────────────────────────────────────────────

  return (
    <div
      className="min-h-screen bg-background"
      style={{ fontFamily: "'Cormorant Garamond', Georgia, serif" }}
    >
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Cormorant+Garamond:ital,wght@0,300;0,400;0,500;0,600;1,300;1,400&display=swap');
        .fade-up { opacity: 0; transform: translateY(24px); animation: fadeUp 0.8s cubic-bezier(0.16,1,0.3,1) forwards; }
        @keyframes fadeUp { to { opacity: 1; transform: none; } }
        .table-cell { cursor: pointer; transition: opacity 0.15s, filter 0.15s; }
        .table-cell:hover { filter: brightness(1.3) drop-shadow(0 0 2px rgba(212,175,55,0.5)); }
        .table-cell.sold { cursor: not-allowed; }
        .table-cell.sold:hover { filter: none; }
        .fade-table { opacity: 0; transform-box: fill-box; transform-origin: center; animation: fadeTable 0.5s ease-out forwards; }
        @keyframes fadeTable { from { opacity: 0; transform: scale(0.55); } to { opacity: 1; transform: scale(1); } }
        @keyframes pulseRing { 0%,100% { box-shadow: 0 0 0 0 rgba(212,175,55,0.35); } 50% { box-shadow: 0 0 0 4px rgba(212,175,55,0); } }
        .countdown-pulse { animation: pulseRing 1.6s ease-in-out infinite; }
        @keyframes slideUp { from { opacity: 0; transform: translateY(8px); } to { opacity: 1; transform: none; } }
        .slide-up { animation: slideUp 0.3s ease-out; }
      `}</style>

      {/* ── Navigation ─────────────────────────────────────────────────────── */}
      <nav
        className="fixed top-0 left-0 right-0 z-50 border-b border-border/20"
        style={{ backdropFilter: "blur(16px)", backgroundColor: "rgba(10,10,10,0.9)" }}
      >
        <div className="max-w-7xl mx-auto px-6 md:px-12 py-5 flex items-center justify-between">
          <Link href="/">
            <img src="/logo.png" alt="West Investments" className="h-10 md:h-12 object-contain" />
          </Link>
          <div className="hidden md:flex items-center gap-10">
            {["Home", "Community"].map((label) => (
              <Link
                key={label}
                href={label === "Home" ? "/" : "/community"}
                className="text-text-secondary hover:text-text-primary transition-colors"
                style={{ fontFamily: "Inter, sans-serif", letterSpacing: "0.12em", fontSize: "11px", textTransform: "uppercase" }}
              >
                {label}
              </Link>
            ))}
            <button
              onClick={() => router.push("/sign-in")}
              className="text-xs tracking-widest uppercase border border-accent/40 text-accent px-6 py-2.5 hover:bg-accent hover:text-background transition-all cursor-pointer"
              style={{ fontFamily: "Inter, sans-serif", letterSpacing: "0.2em" }}
            >
              Client Login
            </button>
          </div>
          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="md:hidden p-2 -mr-2 text-text-secondary"
          >
            {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        </div>
        {mobileMenuOpen && (
          <div
            className="md:hidden border-t border-border/20 px-6 py-4 space-y-1"
            style={{ backgroundColor: "rgba(10,10,10,0.95)" }}
          >
            <Link href="/" onClick={() => setMobileMenuOpen(false)} className="block py-3 text-text-secondary hover:text-text-primary" style={{ fontFamily: "Inter, sans-serif", fontSize: "11px", textTransform: "uppercase", letterSpacing: "0.12em" }}>Home</Link>
            <Link href="/community" onClick={() => setMobileMenuOpen(false)} className="block py-3 text-text-secondary hover:text-text-primary" style={{ fontFamily: "Inter, sans-serif", fontSize: "11px", textTransform: "uppercase", letterSpacing: "0.12em" }}>Community</Link>
          </div>
        )}
      </nav>

      {/* ── Hero ───────────────────────────────────────────────────────────── */}
      <section className="relative min-h-screen flex items-end pb-24 overflow-hidden">
        {/* Venue background — place copper-box-bg.jpg in /public/events/ */}
        <div className="absolute inset-0 z-0">
          <div
            className="absolute inset-0 bg-cover bg-center bg-no-repeat"
            style={{ backgroundImage: "url('/events/copper-box-bg.jpg')" }}
          />
          {/* Dark overlay */}
          <div
            className="absolute inset-0"
            style={{ background: "linear-gradient(to top, rgba(8,8,8,1) 0%, rgba(8,8,8,0.65) 45%, rgba(8,8,8,0.25) 100%)" }}
          />
          {/* Logo watermark fallback (shows when bg photo not yet present) */}
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
            <img
              src="/logo.png"
              alt=""
              className="w-[500px] md:w-[700px] object-contain"
              style={{ opacity: 0.05 }}
            />
          </div>
        </div>

        <div className="relative z-10 max-w-7xl mx-auto px-6 md:px-12 w-full">
          <div className="max-w-3xl">
            {/* Event logo — place collectors-exhibition-logo.png in /public/events/ */}
            <div className="mb-8 fade-up" style={{ animationDelay: "0.3s" }}>
              <img
                src="/events/collectors-exhibition-logo.png"
                alt="The Collectors Exhibition"
                className="h-16 md:h-20 object-contain object-left"
                onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }}
              />
            </div>

            <p
              className="text-accent text-xs uppercase tracking-[0.35em] mb-6 fade-up"
              style={{ fontFamily: "Inter, sans-serif", animationDelay: "0.4s" }}
            >
              West Investments — Exhibitor Stalls &amp; Spaces
            </p>
            <h1
              className="text-5xl md:text-7xl lg:text-8xl font-light text-text-primary leading-[0.95] mb-8 fade-up"
              style={{ animationDelay: "0.6s" }}
            >
              The
              <br />
              Collectors
              <br />
              <em className="text-accent font-light italic">Exhibition</em>
            </h1>

            <div
              className="flex flex-wrap gap-6 mb-10 fade-up"
              style={{ animationDelay: "0.8s" }}
            >
              {[
                { icon: Calendar, label: "4th–5th June 2027" },
                { icon: MapPin, label: "Copper Box Arena" },
                { icon: Users, label: "3,500+ Capacity (Standing)" },
              ].map(({ icon: Icon, label }) => (
                <div
                  key={label}
                  className="flex items-center gap-2 text-text-muted text-sm"
                  style={{ fontFamily: "Inter, sans-serif" }}
                >
                  <Icon className="w-4 h-4 text-accent/60" />
                  {label}
                </div>
              ))}
            </div>

            <a
              href="#floor-plan"
              className="inline-flex items-center gap-3 px-8 py-4 bg-accent text-background text-sm font-medium tracking-widest uppercase hover:bg-accent-hover transition-colors fade-up"
              style={{ fontFamily: "Inter, sans-serif", letterSpacing: "0.15em", animationDelay: "1s" }}
            >
              Select Your Table <ChevronRight className="w-4 h-4" />
            </a>
          </div>
        </div>
      </section>

      {/* ── Hotel callout ──────────────────────────────────────────────────── */}
      <section className="border-y border-accent/20 bg-accent/5 py-4 px-6 md:px-12">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-center gap-2 text-center sm:text-left">
          <Hotel className="w-4 h-4 text-accent shrink-0" />
          <p className="text-text-secondary text-sm" style={{ fontFamily: "Inter, sans-serif", fontWeight: 300 }}>
            Discounted hotel rates are available for vendors at{" "}
            <a
              href="https://www.manhattanloftgardens.com/the-stratford/"
              target="_blank"
              rel="noopener noreferrer"
              className="text-accent underline hover:text-accent-hover"
            >
              The Stratford Hotel
            </a>{" "}
            — 5 minutes walk from the venue.
          </p>
        </div>
      </section>

      {/* ── Stats bar ──────────────────────────────────────────────────────── */}
      <section
        id="stats"
        ref={setRef("stats")}
        className="border-b border-border/30 py-0"
        style={{
          opacity: isVisible("stats") ? 1 : 0,
          transform: isVisible("stats") ? "none" : "translateY(20px)",
          transition: "all 0.8s cubic-bezier(0.16, 1, 0.3, 1)",
        }}
      >
        <div className="max-w-7xl mx-auto">
          {/* Day tabs */}
          <div className="flex border-b border-border/30">
            {(["Saturday", "Sunday"] as DayKey[]).map((day) => (
              <button
                key={day}
                onClick={() => setActiveDay(day)}
                className={`flex-1 py-3 text-xs uppercase tracking-widest transition-colors ${
                  activeDay === day
                    ? "border-b-2 border-accent text-accent"
                    : "text-text-muted hover:text-text-secondary"
                }`}
                style={{ fontFamily: "Inter, sans-serif", letterSpacing: "0.2em" }}
              >
                {day}
              </button>
            ))}
          </div>

          {/* Per-type availability — available vs taken for the active day */}
          <div className="grid grid-cols-3 divide-x divide-border/30">
            {(["standard", "corner", "premier_corner"] as TableTypeKey[]).map((typeKey) => {
              const meta = getTypeMeta(typeKey);
              const td = getTypeData(typeKey);
              const total = meta.total_available;
              const taken = td ? td[activeDay].booked : 0;
              const avail = td ? td[activeDay].available : total;
              const isSold = avail === 0;
              const color = TYPE_COLORS[typeKey].fill;
              return (
                <div key={typeKey} className={`px-4 py-7 md:py-9 text-center ${isSold ? "bg-danger/5" : ""}`}>
                  {isSold ? (
                    <>
                      <p className="text-2xl md:text-4xl font-bold text-danger uppercase tracking-widest mb-1" style={{ fontFamily: "Inter, sans-serif" }}>SOLD OUT</p>
                      <p className="text-danger/70 text-[9px] uppercase tracking-widest mb-1" style={{ fontFamily: "Inter, sans-serif" }}>{TYPE_COLORS[typeKey].label}</p>
                      <p className="text-danger/50 text-xs" style={{ fontFamily: "Inter, sans-serif" }}>{total} of {total} taken</p>
                    </>
                  ) : (
                    <>
                      <p className="text-2xl md:text-4xl font-light mb-0.5" style={{ color }}>
                        {avail}
                        <span className="text-text-muted text-base md:text-lg font-light"> / {total}</span>
                      </p>
                      <p className="text-text-primary text-[9px] uppercase tracking-widest mb-1" style={{ fontFamily: "Inter, sans-serif" }}>{TYPE_COLORS[typeKey].label}</p>
                      <p className="text-text-muted text-xs" style={{ fontFamily: "Inter, sans-serif" }}>
                        available{taken > 0 ? ` · ${taken} taken` : ""}
                      </p>
                      <p className="text-text-muted/70 text-[10px] mt-0.5" style={{ fontFamily: "Inter, sans-serif" }}>
                        £{(meta.price_pence / 100).toFixed(0)} per unit
                      </p>
                    </>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* ── Card types section ─────────────────────────────────────────────── */}
      <section
        id="card-types"
        ref={setRef("card-types")}
        className="py-20 px-6 md:px-12"
        style={{
          opacity: isVisible("card-types") ? 1 : 0,
          transform: isVisible("card-types") ? "none" : "translateY(30px)",
          transition: "all 0.8s cubic-bezier(0.16, 1, 0.3, 1)",
        }}
      >
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-12">
            <p className="text-accent text-xs uppercase tracking-[0.3em] mb-4" style={{ fontFamily: "Inter, sans-serif" }}>
              What to Expect
            </p>
            <h2 className="text-3xl md:text-5xl font-light text-text-primary mb-6">
              Card Types Welcome
            </h2>
            <div className="w-24 h-px bg-accent/40 mx-auto" />
          </div>
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
            {[
              { label: "TCG",          desc: "Pokémon, Magic, Yu-Gi-Oh! and all trading card games." },
              { label: "Sports",       desc: "Football, Basketball, Cricket and all sports cards." },
              { label: "Collectibles", desc: "Sealed product, graded cards and collectible items." },
              { label: "Memorabilia",  desc: "Signed items, jerseys, programmes and sports memorabilia." },
              { label: "Other",        desc: "Accessories and other card-adjacent products." },
            ].map((item) => (
              <div
                key={item.label}
                className="text-center px-4 py-6 border border-border/40 rounded-2xl hover:border-accent/30 transition-colors"
              >
                <h3 className="text-lg font-light text-accent mb-2">{item.label}</h3>
                <p className="text-text-secondary text-xs leading-relaxed" style={{ fontFamily: "Inter, sans-serif", fontWeight: 300 }}>
                  {item.desc}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Floor plan + cart + form ──────────────────────────────────────── */}
      <section id="floor-plan" className="py-16 px-4 md:px-12 bg-surface/20">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-10">
            <p className="text-accent text-xs uppercase tracking-[0.3em] mb-3" style={{ fontFamily: "Inter, sans-serif" }}>
              Interactive Floor Plan
            </p>
            <h2 className="text-3xl md:text-4xl font-light text-text-primary mb-3">
              Select Your Tables
            </h2>
            <p className="text-text-muted text-sm max-w-xl mx-auto" style={{ fontFamily: "Inter, sans-serif", fontWeight: 300 }}>
              Choose a day, then click tables to add them to your cart. Click again to deselect.
            </p>
          </div>

          <div className="flex flex-col xl:flex-row gap-8 items-start">
            {/* ─ Floor plan ─────────────────────────────────────────── */}
            <div className="flex-1 min-w-0">
              {/* Day selector */}
              <div className="flex gap-2 mb-4">
                {(["Saturday", "Sunday"] as DayKey[]).map((day) => (
                  <button
                    key={day}
                    onClick={() => setActiveDay(day)}
                    className={`px-6 py-2.5 text-xs uppercase tracking-widest border transition-all ${
                      activeDay === day
                        ? "border-accent bg-accent text-background"
                        : "border-border text-text-muted hover:border-accent/40"
                    }`}
                    style={{ fontFamily: "Inter, sans-serif", letterSpacing: "0.18em" }}
                  >
                    {day}
                    {selectedCells[day].size > 0 && (
                      <span className="ml-2 inline-flex items-center justify-center w-4 h-4 rounded-full bg-accent/20 text-accent text-[9px]">
                        {selectedCells[day].size}
                      </span>
                    )}
                  </button>
                ))}
              </div>

              {/* SVG floor plan with zoom & pan */}
              <div
                ref={plotRef}
                className="relative rounded-2xl overflow-hidden border border-accent/15"
                style={{
                  background: "radial-gradient(130% 120% at 50% -10%, #17171d 0%, #0c0c0f 72%)",
                  touchAction: "none",
                }}
                onPointerDown={onPointerDown}
                onPointerMove={onPointerMove}
                onPointerUp={onPointerUp}
                onPointerLeave={onPointerUp}
              >
                {/* Zoom controls */}
                <div className="absolute top-3 right-3 z-10 flex flex-col gap-1.5">
                  {[
                    { icon: ZoomIn, on: () => zoomBy(0.4), label: "Zoom in" },
                    { icon: ZoomOut, on: () => zoomBy(-0.4), label: "Zoom out" },
                    { icon: Maximize2, on: resetView, label: "Reset view" },
                  ].map(({ icon: Icon, on, label }) => (
                    <button
                      key={label}
                      type="button"
                      onClick={on}
                      aria-label={label}
                      className="w-8 h-8 grid place-items-center rounded-lg bg-black/50 border border-white/10 text-text-secondary hover:text-accent hover:border-accent/40 backdrop-blur-sm transition-colors cursor-pointer"
                    >
                      <Icon className="w-4 h-4" />
                    </button>
                  ))}
                </div>
                {zoom > 1 && (
                  <div
                    className="absolute bottom-3 left-3 z-10 text-[10px] uppercase tracking-widest text-text-muted bg-black/40 px-2 py-1 rounded-md backdrop-blur-sm"
                    style={{ fontFamily: "Inter, sans-serif", letterSpacing: "0.15em" }}
                  >
                    Drag to pan · {Math.round(zoom * 100)}%
                  </div>
                )}

                <svg
                  viewBox={`0 0 ${VIEWBOX_W} ${VIEWBOX_H}`}
                  style={{
                    width: "100%",
                    height: "auto",
                    display: "block",
                    transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom})`,
                    transformOrigin: "center center",
                    transition: dragRef.current ? "none" : "transform 0.18s ease-out",
                    cursor: zoom > 1 ? "grab" : "default",
                  }}
                  role="img"
                  aria-label="Interactive floor plan — click tables to select them"
                >
                  <defs>
                    <filter id="tableGlow" x="-60%" y="-60%" width="220%" height="220%">
                      <feDropShadow dx="0" dy="0" stdDeviation="3" floodColor="#D4AF37" floodOpacity="0.95" />
                    </filter>
                  </defs>

                  {/* Hall outline */}
                  <rect x="4" y="4" width={VIEWBOX_W - 8} height={VIEWBOX_H - 8} rx="8"
                    fill="none" stroke="rgba(212,175,55,0.12)" strokeWidth="1.5" />

                  {/* Centre aisle */}
                  <line x1="14" y1="254" x2={VIEWBOX_W - 14} y2="254" stroke="rgba(255,255,255,0.06)" strokeWidth="1" strokeDasharray="6 5" />
                  <text x={VIEWBOX_W / 2} y="251" textAnchor="middle" fill="#4b5563" fontSize="8.5"
                    fontFamily="Inter, sans-serif" letterSpacing="3">CENTRE AISLE</text>

                  {/* Tables — yours (gold) · sold (grey) · on hold by others (amber) */}
                  {TABLE_LAYOUT.map((unit, idx) => {
                    const mine = selectedCells[activeDay].has(unit.id);
                    const sold = !loadingAvail && isPaidSold(unit, activeDay);
                    const locked = !loadingAvail && isHeldByOther(unit, activeDay);
                    const colors = TYPE_COLORS[unit.type];
                    const clickable = mine || (!sold && !locked);
                    const fill = mine ? "#D4AF37" : sold ? "#34343b" : locked ? "#6b5417" : colors.fill;
                    const opacity = sold ? 0.4 : locked ? 0.75 : 1;
                    const stateLabel = sold ? " (sold)" : locked ? " (on hold)" : mine ? " (yours)" : "";
                    return (
                      <g
                        key={unit.id}
                        className={`table-cell ${clickable ? "" : "sold"} fade-table`}
                        style={{ animationDelay: `${Math.min(idx * 3, 420)}ms` }}
                        onClick={() => clickable && handleCellClick(unit)}
                        filter={mine ? "url(#tableGlow)" : undefined}
                      >
                        <title>{`Table ${unit.label} — ${colors.label}${stateLabel}`}</title>
                        {unit.rects.map((rc, i) => (
                          <rect
                            key={i}
                            x={rc.x + 0.6}
                            y={rc.y + 0.6}
                            width={rc.w - 1.2}
                            height={rc.h - 1.2}
                            rx={3}
                            fill={fill}
                            opacity={opacity}
                            stroke={mine ? "#fffbe6" : "rgba(255,255,255,0.16)"}
                            strokeWidth={mine ? 1.6 : 0.5}
                          />
                        ))}
                        <text
                          x={unit.cx}
                          y={unit.cy + 2}
                          textAnchor="middle"
                          fontSize={mine ? 7 : 5.5}
                          fontWeight={mine ? 800 : 600}
                          fill={mine ? "#1a1a1a" : "#ffffff"}
                          fillOpacity={sold || locked ? 0.5 : mine ? 1 : 0.9}
                          fontFamily="Inter, sans-serif"
                          pointerEvents="none"
                        >
                          {unit.label}
                        </text>
                      </g>
                    );
                  })}

                  {/* Sponsor areas (non-bookable) */}
                  {SPONSOR_AREAS.map((s, i) => (
                    <g key={`sponsor-${i}`} pointerEvents="none">
                      <rect x={s.x} y={s.y} width={s.w} height={s.h} rx={6}
                        fill="rgba(212,175,55,0.06)" stroke="#D4AF37" strokeOpacity={0.45} strokeWidth={1} strokeDasharray="6 5" />
                      <text x={s.x + s.w / 2} y={s.y + s.h / 2 + 3} textAnchor="middle"
                        fontSize="9" fontWeight={700} fill="#D4AF37" fillOpacity={0.8}
                        fontFamily="Inter, sans-serif" letterSpacing="2">{s.label}</text>
                    </g>
                  ))}
                </svg>
              </div>

              {/* Legend */}
              <div className="flex flex-wrap gap-4 mt-4">
                {(["standard", "corner", "premier_corner"] as TableTypeKey[]).map((type) => {
                  const meta = getTypeMeta(type);
                  const colors = TYPE_COLORS[type];
                  return (
                    <div key={type} className="flex items-center gap-2">
                      <div
                        className="w-4 h-3 rounded-sm"
                        style={{ backgroundColor: colors.fill }}
                      />
                      <span className="text-text-muted text-xs" style={{ fontFamily: "Inter, sans-serif" }}>
                        {colors.label}
                        {` — £${(meta.price_pence / 100).toFixed(0)}`}
                      </span>
                    </div>
                  );
                })}
                <div className="flex items-center gap-2">
                  <div className="w-4 h-3 rounded-sm" style={{ backgroundColor: "#6b5417" }} />
                  <span className="text-text-muted text-xs" style={{ fontFamily: "Inter, sans-serif" }}>On hold</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-4 h-3 rounded-sm bg-[#34343b]" />
                  <span className="text-text-muted text-xs" style={{ fontFamily: "Inter, sans-serif" }}>Sold</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-4 h-3 rounded-sm" style={{ backgroundColor: "#D4AF37" }} />
                  <span className="text-text-muted text-xs" style={{ fontFamily: "Inter, sans-serif" }}>Your pick</span>
                </div>
              </div>
            </div>

            {/* ─ Cart + form ─────────────────────────────────────────── */}
            <div className="xl:w-[400px] shrink-0 xl:sticky xl:top-28">
              {/* Cart */}
              <div className="bg-background border border-accent/15 rounded-2xl p-6 mb-4">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-2">
                    <ShoppingCart className="w-4 h-4 text-accent" />
                    <h3 className="text-sm font-medium text-text-primary flex items-center" style={{ fontFamily: "Inter, sans-serif" }}>
                      Your Selection
                      {!cartIsEmpty && (
                        <span className="ml-2 inline-flex items-center justify-center min-w-[20px] h-5 px-1.5 rounded-full bg-accent text-background text-[10px] font-semibold">
                          {cartItems.reduce((s, i) => s + i.quantity, 0)}
                        </span>
                      )}
                    </h3>
                  </div>
                  {!cartIsEmpty && (
                    <button
                      onClick={clearCart}
                      className="text-text-muted hover:text-danger text-xs flex items-center gap-1 transition-colors"
                      style={{ fontFamily: "Inter, sans-serif" }}
                    >
                      <Trash2 className="w-3 h-3" /> Clear all
                    </button>
                  )}
                </div>

                {/* Hold countdown */}
                {!cartIsEmpty && countdown && (
                  <div
                    className={`mb-4 rounded-xl border px-4 py-3 slide-up ${
                      countdownLow ? "border-danger/40 bg-danger/10" : "border-accent/30 bg-accent/5"
                    }`}
                  >
                    <div className="flex items-center justify-between mb-1.5">
                      <span
                        className={`flex items-center gap-1.5 text-xs font-medium ${countdownLow ? "text-danger" : "text-accent"}`}
                        style={{ fontFamily: "Inter, sans-serif" }}
                      >
                        <Clock className="w-3.5 h-3.5" /> Tables held for you
                      </span>
                      <span
                        className={`text-sm font-bold tabular-nums ${countdownLow ? "text-danger" : "text-accent"}`}
                        style={{ fontFamily: "Inter, sans-serif" }}
                      >
                        {countdown}
                      </span>
                    </div>
                    <div className="h-1 rounded-full bg-white/10 overflow-hidden">
                      <div
                        className={`h-full rounded-full transition-all duration-1000 ease-linear ${countdownLow ? "bg-danger" : "bg-accent"}`}
                        style={{ width: `${countdownPct}%` }}
                      />
                    </div>
                    <p className="text-text-muted text-[10px] mt-1.5" style={{ fontFamily: "Inter, sans-serif" }}>
                      Complete payment before the timer ends or your tables are released.
                    </p>
                  </div>
                )}

                {cartIsEmpty ? (
                  <p className="text-text-muted text-sm text-center py-8" style={{ fontFamily: "Inter, sans-serif", fontWeight: 300 }}>
                    Click tables on the floor plan to add them here.
                  </p>
                ) : (
                  <>
                    <div className="space-y-2 mb-4">
                      {cartItems.map((item) => (
                        <div
                          key={`${item.typeKey}-${item.day}`}
                          className="flex items-center justify-between py-2 border-b border-border/30 last:border-0"
                        >
                          <div className="min-w-0 pr-2">
                            <p className="text-text-primary text-sm" style={{ fontFamily: "Inter, sans-serif" }}>
                              {item.label} × {item.quantity}
                            </p>
                            <p className="text-accent/80 text-xs font-medium" style={{ fontFamily: "Inter, sans-serif" }}>
                              {item.tables.join(", ")}
                            </p>
                            <p className="text-text-muted text-xs" style={{ fontFamily: "Inter, sans-serif" }}>
                              {item.day} · £{(item.unitPricePence / 100).toFixed(0)} each
                            </p>
                          </div>
                          <div className="flex items-center gap-3">
                            <span className="text-text-primary text-sm font-medium" style={{ fontFamily: "Inter, sans-serif" }}>
                              £{((item.quantity * item.unitPricePence) / 100).toFixed(0)}
                            </span>
                            <button
                              onClick={() => removeCartItem(item.typeKey, item.day)}
                              className="text-text-muted hover:text-danger transition-colors"
                            >
                              <X className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                    <div className="flex justify-between pt-2 border-t border-border/50">
                      <span className="text-text-primary text-sm font-medium" style={{ fontFamily: "Inter, sans-serif" }}>Total</span>
                      <span className="text-accent text-lg font-light">£{(totalPence / 100).toFixed(0)}</span>
                    </div>
                  </>
                )}
              </div>

              {/* Vendor form */}
              <div className="bg-background border border-accent/15 rounded-2xl p-6">
                <h3 className="text-xl font-light text-text-primary mb-2 text-center">
                  Your Details
                </h3>
                <div className="w-10 h-px bg-accent/30 mx-auto mb-6" />

                <form onSubmit={handleSubmit} className="space-y-4">
                  {/* Name */}
                  <div className="grid grid-cols-2 gap-3">
                    {[
                      { id: "firstName", label: "First Name", value: firstName, onChange: setFirstName, placeholder: "Jane" },
                      { id: "lastName",  label: "Last Name",  value: lastName,  onChange: setLastName,  placeholder: "Smith" },
                    ].map((f) => (
                      <div key={f.id}>
                        <label className="block text-xs text-text-muted uppercase tracking-widest mb-1.5" style={{ fontFamily: "Inter, sans-serif" }}>{f.label}</label>
                        <input
                          type="text" required value={f.value}
                          onChange={(e) => f.onChange(e.target.value)}
                          placeholder={f.placeholder}
                          className="w-full px-3 py-2.5 bg-surface-hover border border-border rounded-xl text-text-primary text-sm placeholder:text-text-muted focus:outline-none focus:border-accent/50 focus:ring-1 focus:ring-accent/20"
                          style={{ fontFamily: "Inter, sans-serif" }}
                        />
                      </div>
                    ))}
                  </div>

                  {/* Other fields */}
                  {[
                    { id: "businessName",     label: "Business Name",   type: "text",  required: true,  value: businessName,     onChange: setBusinessName,     placeholder: "Your trading name" },
                    { id: "email",            label: "Email",           type: "email", required: true,  value: email,            onChange: setEmail,            placeholder: "you@example.com" },
                    { id: "phone",            label: "Mobile Phone",    type: "tel",   required: true,  value: phone,            onChange: setPhone,            placeholder: "+44 7700 000000" },
                    { id: "instagramHandle",  label: "Instagram Handle",type: "text",  required: false, value: instagramHandle,  onChange: setInstagramHandle,  placeholder: "@yourhandle", optional: true },
                  ].map((f) => (
                    <div key={f.id}>
                      <label className="block text-xs text-text-muted uppercase tracking-widest mb-1.5" style={{ fontFamily: "Inter, sans-serif" }}>
                        {f.label}
                        {"optional" in f && <span className="normal-case tracking-normal text-text-muted/60 ml-1">(optional)</span>}
                      </label>
                      <input
                        type={f.type} required={f.required} value={f.value}
                        onChange={(e) => f.onChange(e.target.value)}
                        placeholder={f.placeholder}
                        className="w-full px-3 py-2.5 bg-surface-hover border border-border rounded-xl text-text-primary text-sm placeholder:text-text-muted focus:outline-none focus:border-accent/50 focus:ring-1 focus:ring-accent/20"
                        style={{ fontFamily: "Inter, sans-serif" }}
                      />
                    </div>
                  ))}

                  {/* Card types */}
                  <div>
                    <label className="block text-xs text-text-muted uppercase tracking-widest mb-1" style={{ fontFamily: "Inter, sans-serif" }}>Card Type</label>
                    <p className="text-text-muted text-[10px] mb-2.5" style={{ fontFamily: "Inter, sans-serif" }}>Select all that apply</p>
                    <div className="grid grid-cols-2 gap-2">
                      {CARD_TYPES.map((type) => {
                        const sel = cardTypes.includes(type);
                        return (
                          <button
                            key={type} type="button" onClick={() => toggleCardType(type)}
                            className={`py-2 text-xs border rounded-xl transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
                              sel ? "border-accent bg-accent/10 text-accent" : "border-border text-text-muted hover:border-accent/30"
                            }`}
                            style={{ fontFamily: "Inter, sans-serif" }}
                          >
                            {sel && (
                              <svg className="w-3 h-3 shrink-0" viewBox="0 0 14 14" fill="none">
                                <path d="M2 7l4 4 6-6" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                              </svg>
                            )}
                            {type}
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {/* T&Cs */}
                  <div className="space-y-3 pt-1">
                    <p className="text-xs text-text-muted uppercase tracking-widest" style={{ fontFamily: "Inter, sans-serif" }}>Terms &amp; Conditions</p>
                    {[
                      {
                        id: "tc-power",
                        checked: tcAgreeNoPower,
                        onChange: setTcAgreeNoPower,
                        label: "I understand this booking does not include internet or power. These can be purchased at a later date from the venue.",
                      },
                      {
                        id: "tc-random",
                        checked: tcAgreeRandom,
                        onChange: setTcAgreeRandom,
                        label: "I understand that tables and booths will be allocated and communicated closer to the event.",
                      },
                    ].map((tc) => (
                      <label key={tc.id} className="flex items-start gap-3 cursor-pointer group">
                        <div className="relative mt-0.5 shrink-0">
                          <input type="checkbox" checked={tc.checked} onChange={(e) => tc.onChange(e.target.checked)} className="sr-only" />
                          <div className={`w-4 h-4 border rounded transition-all ${tc.checked ? "bg-accent border-accent" : "border-border group-hover:border-accent/50"}`}>
                            {tc.checked && (
                              <svg className="w-3 h-3 text-background m-0.5" viewBox="0 0 12 12" fill="none">
                                <path d="M2 6l3 3 5-5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                              </svg>
                            )}
                          </div>
                        </div>
                        <span className="text-text-secondary text-xs leading-relaxed" style={{ fontFamily: "Inter, sans-serif", fontWeight: 300 }}>
                          {tc.label}
                        </span>
                      </label>
                    ))}
                    <p className="text-text-muted text-[10px] pt-1" style={{ fontFamily: "Inter, sans-serif" }}>
                      Table purchases are final and non-refundable after booking.
                    </p>
                  </div>

                  {/* Notice */}
                  <div className="border border-accent/20 rounded-xl px-4 py-3 bg-accent/5">
                    <p className="text-text-secondary text-xs leading-relaxed text-center" style={{ fontFamily: "Inter, sans-serif", fontWeight: 300 }}>
                      Please ensure you have spoken with a member of the team before booking.{" "}
                      <a href="mailto:info@west.investments" className="text-accent underline">
                        info@west.investments
                      </a>
                    </p>
                  </div>

                  {error && <p className="text-danger text-sm text-center" style={{ fontFamily: "Inter, sans-serif" }}>{error}</p>}

                  <button
                    type="submit"
                    disabled={!canSubmit}
                    className="w-full inline-flex items-center justify-center gap-3 px-8 py-4 bg-accent text-background text-sm font-medium tracking-widest uppercase hover:bg-accent-hover transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                    style={{ fontFamily: "Inter, sans-serif", letterSpacing: "0.15em" }}
                  >
                    {submitting ? "Processing..." : cartIsEmpty ? "Select Tables Above" : `Reserve — £${(totalPence / 100).toFixed(0)}`}
                    {!submitting && !cartIsEmpty && <Send className="w-4 h-4" />}
                  </button>

                  <p className="text-text-muted text-[10px] text-center leading-relaxed" style={{ fontFamily: "Inter, sans-serif" }}>
                    Secure payment via Stripe. By booking you agree to our{" "}
                    <Link href="/terms" className="underline hover:text-text-secondary">Terms</Link>{" "}
                    and{" "}
                    <Link href="/privacy" className="underline hover:text-text-secondary">Privacy Policy</Link>.
                  </p>
                </form>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── Footer ─────────────────────────────────────────────────────────── */}
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
