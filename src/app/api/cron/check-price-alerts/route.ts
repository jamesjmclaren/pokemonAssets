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
      tcgplayer: number | null;
      ebay: number | null;
      cardmarket: number | null;
      track_tcgplayer: boolean;
      track_ebay: boolean;
      track_cardmarket: boolean;
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

              await sendEmail(
                primaryEmail,
                userName,
                `Price alert: ${alert.card_name}`,
                `
                  <h2 style="color:#1a1a1a">Price Alert Triggered</h2>
                  <p>Hi ${userName},</p>
                  <p>The price for <strong>${alert.card_name}</strong> (${tierLabel(alert.condition_tier as string)}) has <strong>${direction} your target of ${target}</strong>.</p>
                  <table style="border-collapse:collapse;margin:16px 0;font-size:14px">
                    <tr style="background:#f5f5f5">
                      <th style="padding:8px 16px;text-align:left">Source</th>
                      <th style="padding:8px 16px;text-align:right">Current Price</th>
                    </tr>
                    ${triggeredSources.map((s) => {
                      const [src, price] = s.split(": ");
                      return `<tr><td style="padding:6px 16px;border-bottom:1px solid #eee">${src}</td><td style="padding:6px 16px;border-bottom:1px solid #eee;text-align:right;font-weight:bold">${price}</td></tr>`;
                    }).join("")}
                  </table>
                  <p style="color:#666;font-size:12px">You will not receive another alert for this card for 24 hours. Manage your alerts at <a href="https://portfolio.westinvestments.co.uk/dashboard/tracking">West Investments</a>.</p>
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
          tcgplayer: newTcgplayer,
          ebay: newEbay,
          cardmarket: newCardmarket,
          track_tcgplayer: alert.track_tcgplayer as boolean,
          track_ebay: alert.track_ebay as boolean,
          track_cardmarket: alert.track_cardmarket as boolean,
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

        const rows = cards.map((c) => {
          const sources: string[] = [];
          if (c.track_tcgplayer) sources.push(`<td style="padding:6px 16px;border-bottom:1px solid #eee;text-align:right">${formatUsd(c.tcgplayer)}</td>`);
          if (c.track_ebay) sources.push(`<td style="padding:6px 16px;border-bottom:1px solid #eee;text-align:right">${formatUsd(c.ebay)}</td>`);
          if (c.track_cardmarket) sources.push(`<td style="padding:6px 16px;border-bottom:1px solid #eee;text-align:right">${formatUsd(c.cardmarket)}</td>`);
          return `<tr>
            <td style="padding:6px 16px;border-bottom:1px solid #eee"><strong>${c.card_name}</strong><br><span style="color:#888;font-size:12px">${c.set_name}</span></td>
            <td style="padding:6px 16px;border-bottom:1px solid #eee;color:#666">${tierLabel(c.condition_tier)}</td>
            ${sources.join("")}
          </tr>`;
        }).join("");

        // Build source header columns from the first card's tracked sources (may vary per card)
        const hasAnyTcg = cards.some((c) => c.track_tcgplayer);
        const hasAnyEbay = cards.some((c) => c.track_ebay);
        const hasAnyCm = cards.some((c) => c.track_cardmarket);

        const sourceHeaders = [
          ...(hasAnyTcg ? [`<th style="padding:8px 16px;text-align:right">TCGPlayer</th>`] : []),
          ...(hasAnyEbay ? [`<th style="padding:8px 16px;text-align:right">eBay</th>`] : []),
          ...(hasAnyCm ? [`<th style="padding:8px 16px;text-align:right">CardMarket</th>`] : []),
        ].join("");

        await sendEmail(
          primaryEmail,
          userName,
          `Your daily Pokémon card price digest`,
          `
            <h2 style="color:#1a1a1a">Your Daily Price Digest</h2>
            <p>Hi ${userName}, here are today's prices for your tracked cards:</p>
            <table style="border-collapse:collapse;margin:16px 0;font-size:14px;width:100%">
              <tr style="background:#f5f5f5">
                <th style="padding:8px 16px;text-align:left">Card</th>
                <th style="padding:8px 16px;text-align:left">Condition</th>
                ${sourceHeaders}
              </tr>
              ${rows}
            </table>
            <p style="color:#666;font-size:12px">Manage your tracked cards at <a href="https://portfolio.westinvestments.co.uk/dashboard/tracking">West Investments</a>.</p>
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
