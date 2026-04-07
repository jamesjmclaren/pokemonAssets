"use client";

export const dynamic = "force-dynamic";

import { useUser } from "@clerk/nextjs";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Shield, Users, Trash2, Package, DollarSign, Loader2 } from "lucide-react";
import { isAdminEmail } from "@/lib/admin";
import { formatCurrency, formatDate } from "@/lib/format";

interface Member {
  id: string;
  user_id: string;
  email: string;
  role: string;
  accepted_at: string;
}

interface ManagedPortfolio {
  id: string;
  name: string;
  description: string | null;
  created_at: string;
  members: Member[];
  asset_count: number;
  total_value: number;
}

export default function AdminPage() {
  const { user, isLoaded } = useUser();
  const router = useRouter();
  const [portfolios, setPortfolios] = useState<ManagedPortfolio[]>([]);
  const [loading, setLoading] = useState(true);
  const [removing, setRemoving] = useState<string | null>(null);

  const userEmail = user?.emailAddresses?.[0]?.emailAddress;
  const isAdmin = isAdminEmail(userEmail);

  useEffect(() => {
    if (isLoaded && !isAdmin) {
      router.push("/dashboard");
    }
  }, [isLoaded, isAdmin, router]);

  useEffect(() => {
    if (isLoaded && isAdmin) {
      fetchManagedPortfolios();
    }
  }, [isLoaded, isAdmin]);

  async function fetchManagedPortfolios() {
    try {
      const res = await fetch("/api/admin/portfolios");
      if (res.ok) {
        const data = await res.json();
        setPortfolios(data);
      }
    } catch (error) {
      console.error("Failed to fetch managed portfolios:", error);
    } finally {
      setLoading(false);
    }
  }

  async function removeManaged(portfolioId: string) {
    if (!confirm("Remove this portfolio from managed? You will no longer see it here, but the portfolio and its data will remain intact.")) {
      return;
    }

    setRemoving(portfolioId);
    try {
      const res = await fetch(`/api/admin/portfolios/${portfolioId}`, {
        method: "PATCH",
      });
      if (res.ok) {
        setPortfolios((prev) => prev.filter((p) => p.id !== portfolioId));
      }
    } catch (error) {
      console.error("Failed to remove managed status:", error);
    } finally {
      setRemoving(null);
    }
  }

  if (!isLoaded || !isAdmin) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-pulse text-zinc-400">Loading...</div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto">
      <div className="flex items-center gap-3 mb-8">
        <div className="w-10 h-10 rounded-xl bg-accent/10 flex items-center justify-center">
          <Shield className="w-5 h-5 text-accent" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-white">Admin</h1>
          <p className="text-sm text-zinc-400">Managed client portfolios</p>
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="w-6 h-6 text-zinc-400 animate-spin" />
        </div>
      ) : portfolios.length === 0 ? (
        <div className="bg-zinc-800 border border-zinc-700 rounded-xl p-12 text-center">
          <Package className="w-10 h-10 text-zinc-500 mx-auto mb-3" />
          <p className="text-zinc-400 text-sm">
            No managed portfolios yet. Create a portfolio and mark it as
            &quot;Managed&quot; to see it here.
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {portfolios.map((portfolio) => (
            <div
              key={portfolio.id}
              className="bg-zinc-800 border border-zinc-700 rounded-xl p-6"
            >
              <div className="flex items-start justify-between mb-4">
                <div>
                  <h3 className="text-lg font-semibold text-white">
                    {portfolio.name}
                  </h3>
                  {portfolio.description && (
                    <p className="text-sm text-zinc-400 mt-1">
                      {portfolio.description}
                    </p>
                  )}
                  <p className="text-xs text-zinc-500 mt-1">
                    Created {formatDate(portfolio.created_at)}
                  </p>
                </div>
                <button
                  onClick={() => removeManaged(portfolio.id)}
                  disabled={removing === portfolio.id}
                  className="p-2 hover:bg-red-500/10 rounded-lg transition-colors disabled:opacity-50"
                  title="Remove from managed"
                >
                  {removing === portfolio.id ? (
                    <Loader2 className="w-4 h-4 text-zinc-400 animate-spin" />
                  ) : (
                    <Trash2 className="w-4 h-4 text-red-400" />
                  )}
                </button>
              </div>

              {/* Stats */}
              <div className="flex gap-6 mb-4">
                <div className="flex items-center gap-2 text-sm text-zinc-300">
                  <Package className="w-4 h-4 text-zinc-500" />
                  <span>{portfolio.asset_count} assets</span>
                </div>
                <div className="flex items-center gap-2 text-sm text-zinc-300">
                  <DollarSign className="w-4 h-4 text-zinc-500" />
                  <span>{formatCurrency(portfolio.total_value)}</span>
                </div>
              </div>

              {/* Client members */}
              {portfolio.members.length > 0 ? (
                <div className="border-t border-zinc-700 pt-4">
                  <p className="text-xs text-zinc-500 uppercase tracking-widest mb-2 flex items-center gap-1.5">
                    <Users className="w-3.5 h-3.5" />
                    Clients
                  </p>
                  <div className="space-y-2">
                    {portfolio.members.map((member) => (
                      <div
                        key={member.id}
                        className="flex items-center justify-between px-3 py-2 bg-zinc-900 rounded-lg"
                      >
                        <span className="text-sm text-white">
                          {member.email}
                        </span>
                        <span className="text-[10px] font-bold uppercase tracking-wide px-1.5 py-0.5 rounded bg-blue-500/15 text-blue-400">
                          {member.role === "read_only" ? "Viewer" : "Admin"}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              ) : (
                <div className="border-t border-zinc-700 pt-4">
                  <p className="text-sm text-zinc-500">
                    No clients invited yet
                  </p>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
