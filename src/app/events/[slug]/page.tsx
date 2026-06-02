"use client";

import Link from "next/link";
import { useRouter, useParams } from "next/navigation";
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
} from "lucide-react";

// ─── Types ────────────────────────────────────────────────────────────────────

type DayKey = "Saturday" | "Sunday";
type TableTypeKey = "standard" | "corner" | "premier_corner";
type CardType = "TCG" | "Sports" | "Collectibles" | "Memorabilia" | "Other";

interface TableUnit {
  id: string;
  type: TableTypeKey;
  // A unit is one or more grid cells drawn together and sold as a single item.
  rects: { x: number; y: number; w: number; h: number }[];
}

interface AvailabilityTypeData {
  type_key: string;
  label: string;
  description: string;
  price_pence: number;
  total_available: number;
  display_color: string;
  sort_order: number;
  Saturday: { booked: number; available: number };
  Sunday: { booked: number; available: number };
}

interface AvailabilityData {
  eventId: string;
  slug: string;
  name: string;
  venue: string;
  days: string[];
  is_active: boolean;
  tableTypes: AvailabilityTypeData[];
}

// ─── Floor plan layout ────────────────────────────────────────────────────────
// Exact mirror of the vendor spreadsheet. Each character is one grid cell:
//   2 (blue)  = a single standard table, sold individually (£100)
//   1 (green) = end corner — a cell cluster sold as one unit (£200)
//   3 (red)   = premier corner — a cell cluster sold as one unit (£275)
//   . = empty (aisle / booth interior)
// Tables form hollow rectangular booth islands — a top block and a bottom block
// split by a centre aisle — exactly as laid out in the spreadsheet.
// Units: 120 standard singles · 12 end corner · 16 premier corner.
//
// SVG viewBox: "0 0 774 510"
const FLOOR_GRID = [
  ".11...11...11...11...11...11......",
  "1..1.1..1.1..1.1..1.1..1.1..1.....",
  "2..2.2..2.2..2.2..2.2..2.2..2.....",
  "2..2.2..2.2..2.2..2.2..2.2..2.....",
  "2..2.2..2.2..2.2..2.2..2.2..2.....",
  "2..2.2..2.2..2.3..3.2..2.2..2..33.",
  "2..2.2..2.2..2..33..2..2.2..2.3..3",
  "2..2.2..2.2..2......2..2.2..2.3..3",
  "3..3.3..3.3..3......3..3.3..3..33.",
  ".33...33...33........33...33......",
  "..................................",
  "..................................",
  ".33...33...33...33...33...33...33.",
  "3..3.3..3.3..3.3..3.3..3.3..3.3..3",
  "3..3.2..2.2..2.2..2.2..2.2..2.2..2",
  ".33..2..2.2..2.2..2.2..2.2..2.2..2",
  ".....2..2.2..2.1..1.2..2.2..2.2..2",
  ".....2..2.2..2..11..2..2.2..2.2..2",
  ".....2..2.2..2......2..2.2..2.2..2",
  ".....1..1.1..1......1..1.1..1.1..1",
  "......11...11........11...11...11.",
];

const CELL = 19;   // table square size
const STEP = 22;   // grid pitch
const ORIGIN_X = 12;
const ORIGIN_Y = 12;

function cellRect(r: number, c: number) {
  return { x: ORIGIN_X + c * STEP, y: ORIGIN_Y + r * STEP, w: CELL, h: CELL };
}

function generateTableLayout(): TableUnit[] {
  const units: TableUnit[] = [];
  const R = FLOOR_GRID.length;
  const val = (r: number, c: number): string => {
    if (r < 0 || r >= R) return ".";
    const row = FLOOR_GRID[r];
    return c < 0 || c >= row.length ? "." : row[c] || ".";
  };

  // Standard singles — every blue "2" cell is its own table (£100).
  let sIdx = 1;
  for (let r = 0; r < R; r++) {
    for (let c = 0; c < FLOOR_GRID[r].length; c++) {
      if (val(r, c) === "2") {
        units.push({ id: `S-${sIdx++}`, type: "standard", rects: [cellRect(r, c)] });
      }
    }
  }

  // Grouped units — each connected cluster of "1" (green) / "3" (red), split
  // into chunks of 4 cells, is one sellable unit (£200 / £275).
  const groups: { value: string; type: TableTypeKey; prefix: string }[] = [
    { value: "1", type: "corner", prefix: "C" },
    { value: "3", type: "premier_corner", prefix: "PC" },
  ];
  for (const { value, type, prefix } of groups) {
    const seen = FLOOR_GRID.map((row) => Array(row.length).fill(false));
    let uIdx = 1;
    for (let r = 0; r < R; r++) {
      for (let c = 0; c < FLOOR_GRID[r].length; c++) {
        if (val(r, c) !== value || seen[r][c]) continue;
        // Flood fill (8-connected) to gather the whole cluster
        const comp: [number, number][] = [];
        const stack: [number, number][] = [[r, c]];
        seen[r][c] = true;
        while (stack.length) {
          const [y, x] = stack.pop()!;
          comp.push([y, x]);
          for (let dy = -1; dy <= 1; dy++) {
            for (let dx = -1; dx <= 1; dx++) {
              if (!dy && !dx) continue;
              const ny = y + dy;
              const nx = x + dx;
              if (val(ny, nx) === value && seen[ny] && !seen[ny][nx]) {
                seen[ny][nx] = true;
                stack.push([ny, nx]);
              }
            }
          }
        }
        // Split the cluster into 4-cell units (reading order)
        comp.sort((a, b) => a[0] - b[0] || a[1] - b[1]);
        for (let i = 0; i < comp.length; i += 4) {
          units.push({
            id: `${prefix}-${uIdx++}`,
            type,
            rects: comp.slice(i, i + 4).map(([yy, xx]) => cellRect(yy, xx)),
          });
        }
      }
    }
  }

  return units;
}

const TABLE_LAYOUT = generateTableLayout();

const CARD_TYPES: CardType[] = ["TCG", "Sports", "Collectibles", "Memorabilia", "Other"];

// Colours mirror the spreadsheet: standard = green, end corner = blue, premier = red.
const TYPE_COLORS: Record<TableTypeKey, { fill: string; selected: string; sold: string; label: string }> = {
  standard:       { fill: "#3b82f6", selected: "#93c5fd", sold: "#374151", label: "Standard" },
  corner:         { fill: "#22c55e", selected: "#86efac", sold: "#374151", label: "End Corner" },
  premier_corner: { fill: "#ef4444", selected: "#fca5a5", sold: "#374151", label: "Premier Corner" },
};

// ─── Main page ────────────────────────────────────────────────────────────────

export default function EventPage() {
  const router = useRouter();
  const params = useParams<{ slug: string }>();
  const slug = params.slug;

  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [availability, setAvailability] = useState<AvailabilityData | null>(null);
  const [loadingAvail, setLoadingAvail] = useState(true);

  // Floor plan state
  const [activeDay, setActiveDay] = useState<DayKey>("Saturday");
  // Selected cell IDs per day
  const [selectedCells, setSelectedCells] = useState<Record<DayKey, Set<string>>>({
    Saturday: new Set(),
    Sunday: new Set(),
  });

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

  useEffect(() => {
    if (!slug) return;
    fetch(`/api/events/${slug}/availability`)
      .then((r) => r.json())
      .then((d) => {
        if (d.tableTypes) setAvailability(d as AvailabilityData);
      })
      .catch(() => {})
      .finally(() => setLoadingAvail(false));
  }, [slug]);

  // ── Helpers ────────────────────────────────────────────────────────────────

  const getTypeData = useCallback(
    (typeKey: TableTypeKey) =>
      availability?.tableTypes.find((t) => t.type_key === typeKey) ?? null,
    [availability]
  );

  const selectedCountForType = useCallback(
    (typeKey: TableTypeKey, day: DayKey): number =>
      [...selectedCells[day]].filter(
        (id) => TABLE_LAYOUT.find((c) => c.id === id)?.type === typeKey
      ).length,
    [selectedCells]
  );

  const isCellSold = useCallback(
    (cell: TableUnit, day: DayKey): boolean => {
      const td = getTypeData(cell.type);
      if (!td) return false;
      return td[day].available <= selectedCountForType(cell.type, day);
    },
    [getTypeData, selectedCountForType]
  );

  const handleCellClick = useCallback(
    (cell: TableUnit) => {
      const isSelected = selectedCells[activeDay].has(cell.id);
      if (isSelected) {
        setSelectedCells((prev) => ({
          ...prev,
          [activeDay]: new Set([...prev[activeDay]].filter((id) => id !== cell.id)),
        }));
      } else if (!isCellSold(cell, activeDay)) {
        setSelectedCells((prev) => ({
          ...prev,
          [activeDay]: new Set([...prev[activeDay], cell.id]),
        }));
      }
    },
    [activeDay, selectedCells, isCellSold]
  );

  // ── Cart derived state ─────────────────────────────────────────────────────

  interface CartItem {
    typeKey: TableTypeKey;
    label: string;
    day: DayKey;
    quantity: number;
    unitPricePence: number;
  }

  const cartItems: CartItem[] = [];
  for (const day of ["Saturday", "Sunday"] as DayKey[]) {
    const typeGroups: Partial<Record<TableTypeKey, number>> = {};
    for (const cellId of selectedCells[day]) {
      const cell = TABLE_LAYOUT.find((c) => c.id === cellId);
      if (cell) typeGroups[cell.type] = (typeGroups[cell.type] ?? 0) + 1;
    }
    for (const [typeKey, qty] of Object.entries(typeGroups) as [TableTypeKey, number][]) {
      const td = getTypeData(typeKey);
      if (td && qty > 0) {
        cartItems.push({
          typeKey,
          label: td.label,
          day,
          quantity: qty,
          unitPricePence: td.price_pence,
        });
      }
    }
  }

  const totalPence = cartItems.reduce((s, i) => s + i.quantity * i.unitPricePence, 0);
  const cartIsEmpty = cartItems.length === 0;

  const removeCartItem = (typeKey: TableTypeKey, day: DayKey) => {
    setSelectedCells((prev) => ({
      ...prev,
      [day]: new Set(
        [...prev[day]].filter(
          (id) => TABLE_LAYOUT.find((c) => c.id === id)?.type !== typeKey
        )
      ),
    }));
  };

  const clearCart = () => {
    setSelectedCells({ Saturday: new Set(), Sunday: new Set() });
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
          items: cartItems.map((i) => ({
            type_key: i.typeKey,
            day: i.day,
            quantity: i.quantity,
          })),
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
        .table-cell:hover { filter: brightness(1.25); }
        .table-cell.sold { cursor: not-allowed; }
        .table-cell.sold:hover { filter: none; }
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
              href="https://www.thestratfordhotel.co.uk"
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

          {/* Per-type availability */}
          <div className="grid grid-cols-3 divide-x divide-border/30">
            {(availability?.tableTypes ?? [
              { type_key: "standard",       label: "Standard",       Saturday: { available: null }, Sunday: { available: null } },
              { type_key: "corner",         label: "Corner",         Saturday: { available: null }, Sunday: { available: null } },
              { type_key: "premier_corner", label: "Premier Corner", Saturday: { available: null }, Sunday: { available: null } },
            ]).map((tt) => {
              const avail = (tt as AvailabilityTypeData)[activeDay]?.available ?? null;
              const isSold = avail === 0;
              const color = TYPE_COLORS[(tt.type_key as TableTypeKey)]?.fill ?? "#D4AF37";
              return (
                <div key={tt.type_key} className={`px-4 py-8 md:py-10 text-center ${isSold ? "bg-danger/5" : ""}`}>
                  {isSold ? (
                    <>
                      <p className="text-2xl md:text-4xl font-bold text-danger uppercase tracking-widest mb-1" style={{ fontFamily: "Inter, sans-serif" }}>SOLD</p>
                      <p className="text-danger/70 text-[9px] uppercase tracking-widest mb-1" style={{ fontFamily: "Inter, sans-serif" }}>{tt.label}</p>
                    </>
                  ) : (
                    <>
                      <p className="text-2xl md:text-4xl font-light mb-1" style={{ color }}>{avail ?? "—"}</p>
                      <p className="text-text-primary text-[9px] uppercase tracking-widest mb-1" style={{ fontFamily: "Inter, sans-serif" }}>{tt.label}</p>
                      <p className="text-text-muted text-xs" style={{ fontFamily: "Inter, sans-serif" }}>
                        {(tt as AvailabilityTypeData).price_pence
                          ? `£${((tt as AvailabilityTypeData).price_pence / 100).toFixed(0)} per unit`
                          : "—"}
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

              {/* SVG floor plan */}
              <div className="border border-border/40 rounded-xl overflow-hidden bg-[#111] p-2">
                <svg
                  viewBox="0 0 774 510"
                  style={{ width: "100%", height: "auto", display: "block" }}
                  role="img"
                  aria-label="Interactive floor plan — click tables to select them"
                >
                  {/* Hall outline */}
                  <rect x="4" y="4" width="766" height="494" rx="6"
                    fill="none" stroke="#2a2a2a" strokeWidth="2" />

                  {/* Centre aisle (between the top and bottom blocks) */}
                  <line x1="10" y1="254" x2="764" y2="254" stroke="#1f2937" strokeWidth="1" strokeDasharray="5 4" />
                  <text x="387" y="251" textAnchor="middle" fill="#374151" fontSize="9"
                    fontFamily="Inter, sans-serif" letterSpacing="3">CENTRE AISLE</text>

                  {/* Tables — one group per sellable unit (blue = single table; green/red clusters sold as one) */}
                  {TABLE_LAYOUT.map((unit) => {
                    const isSelected = selectedCells[activeDay].has(unit.id);
                    const sold = !loadingAvail && isCellSold(unit, activeDay) && !isSelected;
                    const colors = TYPE_COLORS[unit.type];
                    const fill = sold ? colors.sold : isSelected ? colors.selected : colors.fill;
                    const opacity = sold ? 0.35 : 1;
                    return (
                      <g
                        key={unit.id}
                        className={`table-cell ${sold ? "sold" : ""}`}
                        onClick={() => !sold && handleCellClick(unit)}
                      >
                        {unit.rects.map((rc, i) => (
                          <rect
                            key={i}
                            x={rc.x}
                            y={rc.y}
                            width={rc.w}
                            height={rc.h}
                            rx={2}
                            fill={fill}
                            opacity={opacity}
                            stroke={isSelected ? "#D4AF37" : "rgba(0,0,0,0.25)"}
                            strokeWidth={isSelected ? 2 : 0.5}
                          />
                        ))}
                      </g>
                    );
                  })}
                </svg>
              </div>

              {/* Legend */}
              <div className="flex flex-wrap gap-4 mt-4">
                {(["standard", "corner", "premier_corner"] as TableTypeKey[]).map((type) => {
                  const td = getTypeData(type);
                  const colors = TYPE_COLORS[type];
                  return (
                    <div key={type} className="flex items-center gap-2">
                      <div
                        className="w-4 h-3 rounded-sm"
                        style={{ backgroundColor: colors.fill }}
                      />
                      <span className="text-text-muted text-xs" style={{ fontFamily: "Inter, sans-serif" }}>
                        {colors.label}
                        {td ? ` — £${(td.price_pence / 100).toFixed(0)}` : ""}
                      </span>
                    </div>
                  );
                })}
                <div className="flex items-center gap-2">
                  <div className="w-4 h-3 rounded-sm bg-[#4b5563] opacity-40" />
                  <span className="text-text-muted text-xs" style={{ fontFamily: "Inter, sans-serif" }}>Sold</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-4 h-3 rounded-sm bg-accent/30 border border-accent" />
                  <span className="text-text-muted text-xs" style={{ fontFamily: "Inter, sans-serif" }}>Selected</span>
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
                    <h3 className="text-sm font-medium text-text-primary" style={{ fontFamily: "Inter, sans-serif" }}>
                      Your Selection
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
                          <div>
                            <p className="text-text-primary text-sm" style={{ fontFamily: "Inter, sans-serif" }}>
                              {item.label} × {item.quantity}
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
