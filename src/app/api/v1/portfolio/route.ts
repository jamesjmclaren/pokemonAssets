import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";
import { authenticateApiKey } from "@/lib/api-auth";

export const revalidate = 0;

interface PortfolioSummary {
  id: string;
  name: string;
  description: string | null;
  role: "owner" | "read_only" | "read_write";
  assetCount: number;
  totalCostUsd: number;
  totalValueUsd: number;
}

export async function GET(request: NextRequest) {
  const auth = await authenticateApiKey(request);
  if (!auth) {
    return NextResponse.json(
      { error: "Unauthorized: missing or invalid API key" },
      { status: 401 }
    );
  }

  const { data: owned } = await supabase
    .from("portfolios")
    .select("id, name, description")
    .eq("owner_id", auth.userId);

  const { data: member } = await supabase
    .from("portfolio_members")
    .select("role, portfolios(id, name, description)")
    .eq("user_id", auth.userId)
    .not("accepted_at", "is", null);

  const portfolios = [
    ...(owned || []).map((p) => ({
      id: p.id,
      name: p.name,
      description: p.description,
      role: "owner" as const,
    })),
    ...(member || []).map((m) => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const p = m.portfolios as any;
      return {
        id: p.id,
        name: p.name,
        description: p.description,
        role: m.role as "read_only" | "read_write",
      };
    }),
  ];

  if (portfolios.length === 0) {
    return NextResponse.json({ portfolios: [] });
  }

  const ids = portfolios.map((p) => p.id);
  const { data: assets } = await supabase
    .from("assets")
    .select("portfolio_id, purchase_price, current_price, status")
    .in("portfolio_id", ids);

  const summaryById = new Map<string, { count: number; cost: number; value: number }>();
  for (const a of assets || []) {
    if (a.status && a.status !== "ACTIVE") continue;
    const entry = summaryById.get(a.portfolio_id) ?? { count: 0, cost: 0, value: 0 };
    entry.count += 1;
    entry.cost += Number(a.purchase_price || 0);
    entry.value += Number(a.current_price ?? a.purchase_price ?? 0);
    summaryById.set(a.portfolio_id, entry);
  }

  const payload: PortfolioSummary[] = portfolios.map((p) => {
    const s = summaryById.get(p.id) ?? { count: 0, cost: 0, value: 0 };
    return {
      id: p.id,
      name: p.name,
      description: p.description,
      role: p.role,
      assetCount: s.count,
      totalCostUsd: Number(s.cost.toFixed(2)),
      totalValueUsd: Number(s.value.toFixed(2)),
    };
  });

  return NextResponse.json({ portfolios: payload });
}
