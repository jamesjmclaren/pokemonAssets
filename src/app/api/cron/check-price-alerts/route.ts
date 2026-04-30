import { NextRequest, NextResponse } from "next/server";
import { clerkClient } from "@clerk/nextjs/server";
import { supabase } from "@/lib/supabase";
import { getRawPoketraceCard, extractSourcePrices } from "@/lib/poketrace";
import type { PriceAlert } from "@/types";

const MAILEROO_FROM = `noreply@${process.env.MAILEROO_DOMAIN || "west.investments"}`;
const TWENTY_FOUR_HOURS_MS = 24 * 60 * 60 * 1000;

async function sendEmail(to: string, toName: string, subject: string, html: string) {
  await fetch("https://smtp.maileroo.com/api/v2/emails", {
    method: "POST",
    headers: {
      "X-Api-Key": process.env.MAILEROO_API_KEY!,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from: { address: MAILEROO_FROM, display_name: "West Investments" },
      to: { address: to, display_name: toName },
      subject,
      html,
    }),
  });
}

function formatUsd(n: number | null): string {
  if (n == null) return "N/A";
  return `$${n.toFixed(2)}`;
}

function tierLabel(tier: string): string {
  return tier.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

export async function GET(request: NextRequest) {
  const authHeader = request.headers.get("authorization");
  const cronSecret = process.env.CRON_SECRET;
  if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
    console.warn("[price-alert-cron] Unauthorized request");
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  console.log("[price-alert-cron] ===== Check price alerts started =====");

  try {
    const { data: rawAlerts, error: fetchError } = await supabase
      .from("price_alerts")
      .select("*")
      .eq("is_active", true);

    const alerts = (rawAlerts || []) as PriceAlert[];

    if (fetchError) {
      console.error("[price-alert-cron] Failed to fetch alerts:", fetchError.message);
      throw fetchError;
    }

    if (alerts.length === 0) {
      console.log("[price-alert-cron] No active alerts found");
      return NextResponse.json({ message: "No active alerts", processed: 0 });
    }

    console.log(`[price-alert-cron] Processing ${alerts.length} active alerts`);

    // Deduplicate Poketrace API calls by poketrace_id
    const cardCache = new Map<string, Record<string, { tcgplayer?: number; ebay?: number; cardmarket?: number }>>();

    // Fetch prices for each unique poketrace_id (sequential to avoid rate limiting)
    const uniqueIds = [...new Set(alerts.map((a) => a.poketrace_id))];
    for (const poketraceId of uniqueIds) {
      try {
        const card = await getRawPoketraceCard(poketraceId);
        if (!card) {
          cardCache.set(poketraceId, {});
          continue;
        }
        // Pre-compute source prices for every condition_tier needed for this card
        const tiersNeeded = [...new Set(
          alerts
            .filter((a) => a.poketrace_id === poketraceId)
            .map((a) => a.condition_tier)
        )];
        const tierMap: Record<string, { tcgplayer?: number; ebay?: number; cardmarket?: number }> = {};
        for (const tier of tiersNeeded) {
          const prices = extractSourcePrices(card, tier);
          tierMap[tier] = prices;
        }
        cardCache.set(poketraceId, tierMap);
        console.log(`[price-alert-cron] Fetched prices for ${poketraceId}: ${tiersNeeded.join(", ")}`);
      } catch (e: unknown) {
        console.warn(`[price-alert-cron] Failed to fetch ${poketraceId}:`, e instanceof Error ? e.message : e);
        cardCache.set(poketraceId, {});
      }
    }

    const now = Date.now();

    // Collect digest data per user: userId -> array of card rows
    const digestMap = new Map<string, Array<{
      card_name: string;
      set_name: string;
      condition_tier: string;
      image_url: string | null;
      tcgplayer: number | null;
      ebay: number | null;
      cardmarket: number | null;
      track_tcgplayer: boolean;
      track_ebay: boolean;
      track_cardmarket: boolean;
      target_low_price: number | null;
      target_high_price: number | null;
    }>>();

    let thresholdEmailsSent = 0;
    let pricesUpdated = 0;

    for (const alert of alerts) {
      const tierPrices = cardCache.get(alert.poketrace_id)?.[alert.condition_tier] ?? {};

      const newTcgplayer = alert.track_tcgplayer ? (tierPrices.tcgplayer ?? null) : null;
      const newEbay = alert.track_ebay ? (tierPrices.ebay ?? null) : null;
      const newCardmarket = alert.track_cardmarket ? (tierPrices.cardmarket ?? null) : null;

      // Update last_price_* columns
      const priceUpdate: Record<string, unknown> = {};
      if (alert.track_tcgplayer) priceUpdate.last_price_tcgplayer = newTcgplayer;
      if (alert.track_ebay) priceUpdate.last_price_ebay = newEbay;
      if (alert.track_cardmarket) priceUpdate.last_price_cardmarket = newCardmarket;

      if (Object.keys(priceUpdate).length > 0) {
        const { error: updateErr } = await supabase
          .from("price_alerts")
          .update(priceUpdate)
          .eq("id", alert.id);
        if (!updateErr) pricesUpdated++;
      }

      // Threshold check: use cheapest tracked price for low alerts, highest for high alerts
      const trackedPrices: number[] = [
        ...(alert.track_tcgplayer && newTcgplayer != null ? [newTcgplayer] : []),
        ...(alert.track_ebay && newEbay != null ? [newEbay] : []),
        ...(alert.track_cardmarket && newCardmarket != null ? [newCardmarket] : []),
      ];

      const debounced =
        alert.last_notified_at &&
        now - new Date(alert.last_notified_at as string).getTime() < TWENTY_FOUR_HOURS_MS;

      if (!debounced && trackedPrices.length > 0) {
        const lowestPrice = Math.min(...trackedPrices);
        const highestPrice = Math.max(...trackedPrices);

        const lowTriggered =
          alert.target_low_price != null && lowestPrice <= Number(alert.target_low_price);
        const highTriggered =
          alert.target_high_price != null && highestPrice >= Number(alert.target_high_price);

        if (lowTriggered || highTriggered) {
          try {
            const clerk = await clerkClient();
            const user = await clerk.users.getUser(alert.user_id as string);
            const primaryEmail = user.emailAddresses.find(
              (e) => e.id === user.primaryEmailAddressId
            )?.emailAddress;

            if (primaryEmail) {
              const userName = [user.firstName, user.lastName].filter(Boolean).join(" ") || "Collector";
              const triggeredSources: string[] = [];
              if (alert.track_tcgplayer && newTcgplayer != null) {
                if (lowTriggered && newTcgplayer <= Number(alert.target_low_price)) {
                  triggeredSources.push(`TCGPlayer: ${formatUsd(newTcgplayer)}`);
                }
                if (highTriggered && newTcgplayer >= Number(alert.target_high_price)) {
                  triggeredSources.push(`TCGPlayer: ${formatUsd(newTcgplayer)}`);
                }
              }
              if (alert.track_ebay && newEbay != null) {
                if (lowTriggered && newEbay <= Number(alert.target_low_price)) {
                  triggeredSources.push(`eBay: ${formatUsd(newEbay)}`);
                }
                if (highTriggered && newEbay >= Number(alert.target_high_price)) {
                  triggeredSources.push(`eBay: ${formatUsd(newEbay)}`);
                }
              }
              if (alert.track_cardmarket && newCardmarket != null) {
                if (lowTriggered && newCardmarket <= Number(alert.target_low_price)) {
                  triggeredSources.push(`CardMarket: ${formatUsd(newCardmarket)}`);
                }
                if (highTriggered && newCardmarket >= Number(alert.target_high_price)) {
                  triggeredSources.push(`CardMarket: ${formatUsd(newCardmarket)}`);
                }
              }

              const direction = lowTriggered ? "dropped below" : "risen above";
              const target = lowTriggered
                ? formatUsd(Number(alert.target_low_price))
                : formatUsd(Number(alert.target_high_price));

              const cardImageHtml = alert.image_url
                ? `<img src="${alert.image_url}" alt="${alert.card_name}" width="120" style="display:block;margin:0 auto 16px;border-radius:8px;box-shadow:0 4px 16px rgba(0,0,0,0.3)" />`
                : "";
              const alertColor = lowTriggered ? "#22c55e" : "#f59e0b";
              const alertIcon = lowTriggered ? "↓" : "↑";

              await sendEmail(
                primaryEmail,
                userName,
                `${alertIcon} Price alert: ${alert.card_name} ${direction} ${target}`,
                `
                  <div style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;max-width:520px;margin:0 auto;background:#ffffff">
                    <!-- Header -->
                    <div style="background:#0f172a;padding:24px 32px;border-radius:12px 12px 0 0">
                      <p style="margin:0;color:#94a3b8;font-size:12px;font-weight:600;letter-spacing:0.08em;text-transform:uppercase">West Investments</p>
                      <h1 style="margin:8px 0 0;color:#ffffff;font-size:20px;font-weight:700">Price Alert Triggered</h1>
                    </div>

                    <!-- Body -->
                    <div style="padding:32px;border:1px solid #e2e8f0;border-top:none;border-radius:0 0 12px 12px">
                      <p style="margin:0 0 24px;color:#475569;font-size:14px">Hi ${userName},</p>

                      <!-- Card block -->
                      <div style="background:#f8fafc;border-radius:12px;padding:24px;margin-bottom:24px;text-align:center">
                        ${cardImageHtml}
                        <p style="margin:0 0 4px;font-size:18px;font-weight:700;color:#0f172a">${alert.card_name}</p>
                        <p style="margin:0 0 12px;font-size:13px;color:#64748b">${alert.set_name ? `${alert.set_name} · ` : ""}${tierLabel(alert.condition_tier as string)}</p>
                        <div style="display:inline-block;background:${alertColor}20;border:1px solid ${alertColor}40;border-radius:999px;padding:6px 16px">
                          <span style="color:${alertColor};font-size:13px;font-weight:600">${alertIcon} Price has ${direction} your target of ${target}</span>
                        </div>
                      </div>

                      <!-- Price table -->
                      <p style="margin:0 0 12px;font-size:13px;font-weight:600;color:#0f172a">Current prices</p>
                      <table style="width:100%;border-collapse:collapse;font-size:14px;border-radius:8px;overflow:hidden">
                        <tr style="background:#f1f5f9">
                          <th style="padding:10px 16px;text-align:left;color:#475569;font-size:11px;font-weight:600;text-transform:uppercase;letter-spacing:0.06em">Source</th>
                          <th style="padding:10px 16px;text-align:right;color:#475569;font-size:11px;font-weight:600;text-transform:uppercase;letter-spacing:0.06em">Price</th>
                        </tr>
                        ${triggeredSources.map((s) => {
                          const [src, price] = s.split(": ");
                          return `<tr style="border-top:1px solid #e2e8f0"><td style="padding:12px 16px;color:#334155">${src}</td><td style="padding:12px 16px;text-align:right;font-weight:700;color:${alertColor}">${price}</td></tr>`;
                        }).join("")}
                      </table>

                      <p style="margin:24px 0 0;color:#94a3b8;font-size:12px">You won&apos;t receive another alert for this card for 24 hours. <a href="https://portfolio.westinvestments.co.uk/dashboard/tracking" style="color:#3b82f6">Manage your alerts →</a></p>
                    </div>
                  </div>
                `
              );

              await supabase
                .from("price_alerts")
                .update({ last_notified_at: new Date().toISOString() })
                .eq("id", alert.id);

              thresholdEmailsSent++;
              console.log(`[price-alert-cron] Threshold email sent for "${alert.card_name}" to ${primaryEmail}`);
            }
          } catch (e: unknown) {
            console.error(`[price-alert-cron] Failed to send threshold email for alert ${alert.id}:`, e instanceof Error ? e.message : e);
          }
        }
      }

      // Collect for daily digest
      if (alert.alert_daily_digest) {
        const userId = alert.user_id as string;
        if (!digestMap.has(userId)) digestMap.set(userId, []);
        digestMap.get(userId)!.push({
          card_name: alert.card_name as string,
          set_name: alert.set_name as string,
          condition_tier: alert.condition_tier as string,
          image_url: alert.image_url as string | null,
          tcgplayer: newTcgplayer,
          ebay: newEbay,
          cardmarket: newCardmarket,
          track_tcgplayer: alert.track_tcgplayer as boolean,
          track_ebay: alert.track_ebay as boolean,
          track_cardmarket: alert.track_cardmarket as boolean,
          target_low_price: alert.target_low_price != null ? Number(alert.target_low_price) : null,
          target_high_price: alert.target_high_price != null ? Number(alert.target_high_price) : null,
        });
      }
    }

    // Send daily digest emails (one per user)
    let digestEmailsSent = 0;
    for (const [userId, cards] of digestMap.entries()) {
      try {
        const clerk = await clerkClient();
        const user = await clerk.users.getUser(userId);
        const primaryEmail = user.emailAddresses.find(
          (e) => e.id === user.primaryEmailAddressId
        )?.emailAddress;

        if (!primaryEmail) continue;

        const userName = [user.firstName, user.lastName].filter(Boolean).join(" ") || "Collector";

        const cardRows = cards.map((c) => {
          const imgHtml = c.image_url
            ? `<img src="${c.image_url}" alt="${c.card_name}" width="48" height="68" style="display:block;border-radius:4px;object-fit:contain" />`
            : `<div style="width:48px;height:68px;background:#e2e8f0;border-radius:4px"></div>`;

          const priceCols: string[] = [];
          if (c.track_tcgplayer) {
            const triggered = c.target_low_price != null && c.tcgplayer != null && c.tcgplayer <= c.target_low_price;
            priceCols.push(`<td style="padding:16px 12px;text-align:right;font-weight:700;color:${triggered ? "#22c55e" : "#0f172a"};font-size:14px">${formatUsd(c.tcgplayer)}</td>`);
          }
          if (c.track_ebay) {
            const triggered = c.target_low_price != null && c.ebay != null && c.ebay <= c.target_low_price;
            priceCols.push(`<td style="padding:16px 12px;text-align:right;font-weight:700;color:${triggered ? "#22c55e" : "#0f172a"};font-size:14px">${formatUsd(c.ebay)}</td>`);
          }
          if (c.track_cardmarket) {
            const triggered = c.target_low_price != null && c.cardmarket != null && c.cardmarket <= c.target_low_price;
            priceCols.push(`<td style="padding:16px 12px;text-align:right;font-weight:700;color:${triggered ? "#22c55e" : "#0f172a"};font-size:14px">${formatUsd(c.cardmarket)}</td>`);
          }

          const alertBadges: string[] = [];
          if (c.target_low_price != null) alertBadges.push(`<span style="display:inline-block;background:#dcfce7;color:#16a34a;font-size:10px;font-weight:600;padding:2px 7px;border-radius:999px;margin-right:4px">↓ ${formatUsd(c.target_low_price)}</span>`);
          if (c.target_high_price != null) alertBadges.push(`<span style="display:inline-block;background:#fef9c3;color:#b45309;font-size:10px;font-weight:600;padding:2px 7px;border-radius:999px">↑ ${formatUsd(c.target_high_price)}</span>`);

          return `<tr style="border-top:1px solid #e2e8f0">
            <td style="padding:16px 12px;vertical-align:middle">${imgHtml}</td>
            <td style="padding:16px 12px;vertical-align:middle">
              <p style="margin:0 0 2px;font-size:14px;font-weight:700;color:#0f172a">${c.card_name}</p>
              <p style="margin:0 0 6px;font-size:12px;color:#64748b">${c.set_name}</p>
              <span style="display:inline-block;background:#f1f5f9;color:#475569;font-size:11px;font-weight:600;padding:2px 8px;border-radius:999px">${tierLabel(c.condition_tier)}</span>
              ${alertBadges.length > 0 ? `<br><span style="display:inline-block;margin-top:6px">${alertBadges.join("")}</span>` : ""}
            </td>
            ${priceCols.join("")}
          </tr>`;
        }).join("");

        const hasAnyTcg = cards.some((c) => c.track_tcgplayer);
        const hasAnyEbay = cards.some((c) => c.track_ebay);
        const hasAnyCm = cards.some((c) => c.track_cardmarket);
        const sourceHeaders = [
          ...(hasAnyTcg ? [`<th style="padding:10px 12px;text-align:right;color:#475569;font-size:11px;font-weight:600;text-transform:uppercase;letter-spacing:0.06em">TCGPlayer</th>`] : []),
          ...(hasAnyEbay ? [`<th style="padding:10px 12px;text-align:right;color:#475569;font-size:11px;font-weight:600;text-transform:uppercase;letter-spacing:0.06em">eBay</th>`] : []),
          ...(hasAnyCm ? [`<th style="padding:10px 12px;text-align:right;color:#475569;font-size:11px;font-weight:600;text-transform:uppercase;letter-spacing:0.06em">CardMarket</th>`] : []),
        ].join("");

        const today = new Date().toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" });

        await sendEmail(
          primaryEmail,
          userName,
          `Your Pokémon card price digest — ${today}`,
          `
            <div style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;max-width:600px;margin:0 auto;background:#ffffff">
              <!-- Header -->
              <div style="background:#0f172a;padding:24px 32px;border-radius:12px 12px 0 0">
                <p style="margin:0;color:#94a3b8;font-size:12px;font-weight:600;letter-spacing:0.08em;text-transform:uppercase">West Investments</p>
                <h1 style="margin:8px 0 4px;color:#ffffff;font-size:20px;font-weight:700">Your Daily Price Digest</h1>
                <p style="margin:0;color:#64748b;font-size:13px">${today}</p>
              </div>

              <!-- Body -->
              <div style="border:1px solid #e2e8f0;border-top:none;border-radius:0 0 12px 12px;overflow:hidden">
                <p style="margin:0;padding:20px 32px 16px;color:#475569;font-size:14px">Hi ${userName}, here are today's prices for your ${cards.length} tracked card${cards.length !== 1 ? "s" : ""}:</p>

                <table style="width:100%;border-collapse:collapse;font-size:14px">
                  <tr style="background:#f8fafc">
                    <th style="padding:10px 12px;text-align:left;color:#475569;font-size:11px;font-weight:600;text-transform:uppercase;letter-spacing:0.06em;width:56px"></th>
                    <th style="padding:10px 12px;text-align:left;color:#475569;font-size:11px;font-weight:600;text-transform:uppercase;letter-spacing:0.06em">Card</th>
                    ${sourceHeaders}
                  </tr>
                  ${cardRows}
                </table>

                <div style="padding:20px 32px;background:#f8fafc;border-top:1px solid #e2e8f0">
                  <p style="margin:0;color:#94a3b8;font-size:12px">Prices updated daily at 7am UTC. Green prices indicate a threshold alert has been triggered. <a href="https://portfolio.westinvestments.co.uk/dashboard/tracking" style="color:#3b82f6">Manage your tracked cards →</a></p>
                </div>
              </div>
            </div>
          `
        );

        digestEmailsSent++;
        console.log(`[price-alert-cron] Daily digest sent to ${primaryEmail} (${cards.length} cards)`);
      } catch (e: unknown) {
        console.error(`[price-alert-cron] Failed to send digest for user ${userId}:`, e instanceof Error ? e.message : e);
      }
    }

    console.log(`[price-alert-cron] ===== Done: ${pricesUpdated} prices updated, ${thresholdEmailsSent} threshold emails, ${digestEmailsSent} digest emails =====`);

    return NextResponse.json({
      message: "Price alert check complete",
      alerts_processed: alerts.length,
      prices_updated: pricesUpdated,
      threshold_emails_sent: thresholdEmailsSent,
      digest_emails_sent: digestEmailsSent,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error("[price-alert-cron] FAILED:", error instanceof Error ? error.message : error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to check price alerts" },
      { status: 500 }
    );
  }
}
