// Branded HTML email template + calendar helpers for event bookings.
// Dark, gold-accented, table-based layout that renders in email clients.

const LOGO_URL = "https://west.investments/logo.png";
const GOLD = "#D4AF37";

export function brandedEmailHtml(opts: {
  heading: string;
  intro: string;
  bodyHtml: string;
  ctaUrl?: string;
  ctaLabel?: string;
  footerNote?: string;
}): string {
  const { heading, intro, bodyHtml, ctaUrl, ctaLabel, footerNote } = opts;
  return `<!DOCTYPE html><html><body style="margin:0;padding:0;background:#0b0b0c;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#0b0b0c;padding:24px 12px;font-family:Arial,Helvetica,sans-serif;">
    <tr><td align="center">
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;background:#141416;border:1px solid #26262b;border-radius:16px;overflow:hidden;">
        <tr><td style="padding:26px 32px 16px;text-align:center;border-bottom:1px solid #26262b;">
          <img src="${LOGO_URL}" alt="West Investments" width="120" style="display:inline-block;max-width:120px;height:auto;" />
        </td></tr>
        <tr><td style="padding:28px 32px;">
          <h1 style="margin:0;color:#f5f0e8;font-size:22px;font-weight:600;">${heading}</h1>
          <div style="height:2px;width:46px;background:${GOLD};margin:12px 0 18px;"></div>
          <p style="margin:0 0 18px;color:#b9b3a6;font-size:14px;line-height:1.6;">${intro}</p>
          ${bodyHtml}
          ${
            ctaUrl
              ? `<div style="margin:26px 0 6px;"><a href="${ctaUrl}" style="display:inline-block;background:${GOLD};color:#111;text-decoration:none;font-weight:700;font-size:13px;letter-spacing:0.03em;padding:12px 24px;border-radius:8px;">${ctaLabel ?? "View"}</a></div>`
              : ""
          }
        </td></tr>
        <tr><td style="padding:18px 32px 26px;border-top:1px solid #26262b;color:#7c7768;font-size:12px;line-height:1.7;">
          ${footerNote ? `${footerNote}<br/><br/>` : ""}
          Questions? <a href="mailto:info@west.investments" style="color:${GOLD};text-decoration:none;">info@west.investments</a><br/>
          West Investments Ltd
        </td></tr>
      </table>
    </td></tr>
  </table></body></html>`;
}

/** A boxed reference + rows card for booking details. `rows` are [label, value]. */
export function summaryCard(reference: string, rows: [string, string][]): string {
  const rowHtml = rows
    .map(
      ([k, v]) =>
        `<tr><td style="padding:6px 0;color:#7c7768;font-size:12px;width:42%;vertical-align:top;">${k}</td>
         <td style="padding:6px 0;color:#e9e3d6;font-size:13px;font-weight:600;">${v}</td></tr>`
    )
    .join("");
  return `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#1b1b1e;border:1px solid #2c2c31;border-radius:12px;">
    <tr><td style="padding:16px 18px;border-bottom:1px solid #2c2c31;">
      <p style="margin:0 0 4px;color:#7c7768;font-size:11px;text-transform:uppercase;letter-spacing:0.12em;">Booking reference</p>
      <p style="margin:0;color:${GOLD};font-size:20px;font-weight:700;letter-spacing:0.1em;">${reference}</p>
    </td></tr>
    <tr><td style="padding:10px 18px 14px;">
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0">${rowHtml}</table>
    </td></tr>
  </table>`;
}

const pad = (n: number) => String(n).padStart(2, "0");
const toIcsDate = (d: Date) => `${d.getUTCFullYear()}${pad(d.getUTCMonth() + 1)}${pad(d.getUTCDate())}`;

/** All-day VEVENT spanning the event dates (DTEND is exclusive, so +1 day). */
export function buildEventIcs(opts: {
  uid: string;
  title: string;
  description: string;
  location: string;
  startDate: string; // YYYY-MM-DD
  endDate: string; // YYYY-MM-DD (inclusive)
}): string {
  const start = new Date(opts.startDate + "T00:00:00Z");
  const endExclusive = new Date(opts.endDate + "T00:00:00Z");
  endExclusive.setUTCDate(endExclusive.getUTCDate() + 1);
  const stamp = `${toIcsDate(new Date())}T000000Z`;
  const esc = (s: string) => s.replace(/([,;\\])/g, "\\$1").replace(/\n/g, "\\n");
  return [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//West Investments//Collectors Exhibition//EN",
    "CALSCALE:GREGORIAN",
    "METHOD:PUBLISH",
    "BEGIN:VEVENT",
    `UID:${opts.uid}`,
    `DTSTAMP:${stamp}`,
    `DTSTART;VALUE=DATE:${toIcsDate(start)}`,
    `DTEND;VALUE=DATE:${toIcsDate(endExclusive)}`,
    `SUMMARY:${esc(opts.title)}`,
    `LOCATION:${esc(opts.location)}`,
    `DESCRIPTION:${esc(opts.description)}`,
    "END:VEVENT",
    "END:VCALENDAR",
  ].join("\r\n");
}

export function googleCalendarUrl(opts: {
  title: string;
  details: string;
  location: string;
  startDate: string;
  endDate: string;
}): string {
  const start = new Date(opts.startDate + "T00:00:00Z");
  const endExclusive = new Date(opts.endDate + "T00:00:00Z");
  endExclusive.setUTCDate(endExclusive.getUTCDate() + 1);
  const params = new URLSearchParams({
    action: "TEMPLATE",
    text: opts.title,
    dates: `${toIcsDate(start)}/${toIcsDate(endExclusive)}`,
    location: opts.location,
    details: opts.details,
  });
  return `https://calendar.google.com/calendar/render?${params.toString()}`;
}
