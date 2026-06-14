import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { createClient } from "@supabase/supabase-js";
import { isCurrentUserAdmin } from "@/lib/admin";
import { TABLE_TYPE_BY_LABEL, TYPE_LABELS, type TableTypeKey } from "@/lib/event-floor-plan";
import { brandedEmailHtml } from "@/lib/event-emails";
import { escapeHtml } from "@/lib/escape-html";
import { getEventSlug } from "@/lib/event-config";

function getSupabaseAdmin() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}

// Production → real event; preview/dev → test event (shared DB). See event-config.
const DEFAULT_SLUG = getEventSlug();

// Admin-only: free a booked table (use after refunding the payment in Stripe).
// Deletes the paid booking row + any leftover hold so the table opens back up.
export async function POST(req: NextRequest) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!(await isCurrentUserAdmin())) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { slug = DEFAULT_SLUG, day, label } = await req.json();
  if ((day !== "Saturday" && day !== "Sunday") || typeof label !== "string" || !(label in TABLE_TYPE_BY_LABEL)) {
    return NextResponse.json({ error: "Invalid request." }, { status: 400 });
  }

  const supabase = getSupabaseAdmin();
  const { data: event } = await supabase
    .from("events")
    .select("id, name, venue")
    .eq("slug", slug)
    .single();
  if (!event) return NextResponse.json({ error: "Event not found." }, { status: 404 });

  const { error } = await supabase
    .from("event_bookings_v2")
    .delete()
    .eq("event_id", event.id)
    .eq("event_day", day)
    .eq("table_label", label)
    .eq("payment_status", "paid");
  if (error) {
    return NextResponse.json({ error: "Failed to release the table." }, { status: 500 });
  }

  // Clear any stale hold on the same table too.
  await supabase
    .from("event_table_holds")
    .delete()
    .eq("event_id", event.id)
    .eq("event_day", day)
    .eq("table_label", label);

  // Notify anyone on the waitlist for this type + day that one opened up.
  const type = TABLE_TYPE_BY_LABEL[label] as TableTypeKey;
  let notified = 0;
  try {
    const { data: waiters } = await supabase
      .from("event_waitlist")
      .select("id, name, email")
      .eq("event_id", event.id)
      .eq("event_day", day)
      .eq("table_type_key", type)
      .is("notified_at", null);

    if (waiters && waiters.length > 0) {
      const mailerooKey = process.env.MAILEROO_API_KEY!;
      const domain = process.env.MAILEROO_DOMAIN || "west.investments";
      const bookUrl = `${req.nextUrl.origin}/event`;
      for (const w of waiters) {
        const html = brandedEmailHtml({
          heading: "A table just opened up",
          intro: `Good news, ${escapeHtml(w.name)} — a <strong style="color:#e9e3d6;">${TYPE_LABELS[type]}</strong> table for <strong style="color:#e9e3d6;">${escapeHtml(day)}</strong> at ${escapeHtml(event.name)} is available again. These go quickly, so book soon.`,
          bodyHtml: "",
          ctaUrl: bookUrl,
          ctaLabel: "Book your table",
          footerNote: "You're receiving this because you joined the waitlist.",
        });
        try {
          await fetch("https://smtp.maileroo.com/api/v2/emails", {
            method: "POST",
            headers: { "X-Api-Key": mailerooKey, "Content-Type": "application/json" },
            body: JSON.stringify({
              from: { address: `noreply@${domain}`, display_name: "West Investments" },
              to: { address: w.email, display_name: w.name },
              reply_to: { address: "info@west.investments", display_name: "West Investments" },
              subject: `A ${TYPE_LABELS[type]} table opened up — ${event.name}`,
              html,
            }),
          });
          notified++;
        } catch (e) {
          console.error("waitlist notify email failed:", e);
        }
      }
      await supabase
        .from("event_waitlist")
        .update({ notified_at: new Date().toISOString() })
        .in("id", waiters.map((w) => w.id));
    }
  } catch (e) {
    console.error("waitlist notify lookup failed:", e);
  }

  return NextResponse.json({ ok: true, notified });
}
