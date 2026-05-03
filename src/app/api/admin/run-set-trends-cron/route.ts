import { auth, currentUser } from "@clerk/nextjs/server";
import { NextRequest, NextResponse } from "next/server";

const ADMIN_EMAILS = [
  "jamesjmclaren@gmail.com",
  "k1west.cityboy@gmail.com",
];

// Long-running set-trends cron sweep. Vercel will allow up to 5 min.
export const maxDuration = 300;

export async function POST(request: NextRequest) {
  const { userId } = await auth();
  const user = await currentUser();

  if (!userId || !user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const userEmail = user.primaryEmailAddress?.emailAddress?.toLowerCase();
  if (!userEmail || !ADMIN_EMAILS.some((e) => e.toLowerCase() === userEmail)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const cronSecret = process.env.CRON_SECRET;
  if (!cronSecret) {
    return NextResponse.json({ error: "CRON_SECRET not configured" }, { status: 500 });
  }

  // Forward optional ?sets= and ?max= passthrough.
  const passthrough = new URLSearchParams();
  const sets = request.nextUrl.searchParams.get("sets");
  const max = request.nextUrl.searchParams.get("max");
  if (sets) passthrough.set("sets", sets);
  if (max) passthrough.set("max", max);

  const origin = request.nextUrl.origin;
  const url = `${origin}/api/cron/set-price-trends${
    passthrough.toString() ? `?${passthrough.toString()}` : ""
  }`;

  try {
    const res = await fetch(url, {
      headers: { Authorization: `Bearer ${cronSecret}` },
    });
    const body = await res.json();
    return NextResponse.json(body, { status: res.status });
  } catch (err) {
    return NextResponse.json(
      { error: "Cron call failed", detail: err instanceof Error ? err.message : String(err) },
      { status: 502 }
    );
  }
}
