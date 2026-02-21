"use client";

import { useUser } from "@clerk/nextjs";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { Plus, Briefcase } from "lucide-react";
import { usePortfolio } from "@/lib/portfolio-context";

export default function OnboardingPage() {
  const { user, isLoaded } = useUser();
  const router = useRouter();
  const { portfolios, refetch } = usePortfolio();
  const [loading, setLoading] = useState(true);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [portfolioName, setPortfolioName] = useState("");
  const [portfolioDescription, setPortfolioDescription] = useState("");
  const [creating, setCreating] = useState(false);

  useEffect(() => {
    if (isLoaded && user) {
      // If user already has portfolios, redirect to dashboard
      if (portfolios.length > 0) {
        router.push("/dashboard");
      } else {
        setLoading(false);
      }
    }
  }, [isLoaded, user, portfolios, router]);

  async function createPortfolio(e: React.FormEvent) {
    e.preventDefault();
    if (!portfolioName.trim()) return;

    setCreating(true);
    try {
      const res = await fetch("/api/portfolios", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: portfolioName,
          description: portfolioDescription,
        }),
      });

      if (res.ok) {
        await refetch();
        router.push("/dashboard");
      }
    } catch (error) {
      console.error("Failed to create portfolio:", error);
    } finally {
      setCreating(false);
    }
  }

  if (!isLoaded || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-zinc-950">
        <div className="animate-pulse text-zinc-400">Loading...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-zinc-950 p-4">
      <div className="max-w-md w-full">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-white mb-2">
            Welcome to N&C Assets
          </h1>
          <p className="text-zinc-400">
            Create a portfolio to start tracking your collection
          </p>
        </div>

        {!showCreateForm ? (
          <button
            onClick={() => setShowCreateForm(true)}
            className="w-full bg-zinc-800 hover:bg-zinc-700 border border-zinc-700 rounded-xl p-6 flex items-center gap-4 transition-colors"
          >
            <div className="w-12 h-12 rounded-full bg-blue-500/10 flex items-center justify-center">
              <Plus className="w-6 h-6 text-blue-400" />
            </div>
            <div className="text-left">
              <h3 className="text-lg font-semibold text-white">Create Portfolio</h3>
              <p className="text-zinc-400 text-sm">
                Start a new collection portfolio
              </p>
            </div>
          </button>
        ) : (
          <form
            onSubmit={createPortfolio}
            className="bg-zinc-800 border border-zinc-700 rounded-xl p-6"
          >
            <div className="flex items-center gap-3 mb-6">
              <div className="w-10 h-10 rounded-full bg-blue-500/10 flex items-center justify-center">
                <Briefcase className="w-5 h-5 text-blue-400" />
              </div>
              <h3 className="text-lg font-semibold text-white">New Portfolio</h3>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-zinc-400 mb-1">
                  Portfolio Name
                </label>
                <input
                  type="text"
                  value={portfolioName}
                  onChange={(e) => setPortfolioName(e.target.value)}
                  placeholder="My Collection"
                  className="w-full px-4 py-2 bg-zinc-900 border border-zinc-700 rounded-lg text-white placeholder-zinc-500 focus:outline-none focus:border-blue-500"
                  autoFocus
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-zinc-400 mb-1">
                  Description (optional)
                </label>
                <textarea
                  value={portfolioDescription}
                  onChange={(e) => setPortfolioDescription(e.target.value)}
                  placeholder="Describe your collection..."
                  rows={3}
                  className="w-full px-4 py-2 bg-zinc-900 border border-zinc-700 rounded-lg text-white placeholder-zinc-500 focus:outline-none focus:border-blue-500 resize-none"
                />
              </div>
            </div>

            <div className="flex gap-3 mt-6">
              <button
                type="button"
                onClick={() => setShowCreateForm(false)}
                className="flex-1 px-4 py-2 bg-zinc-700 hover:bg-zinc-600 text-white rounded-lg transition-colors"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={creating || !portfolioName.trim()}
                className="flex-1 px-4 py-2 bg-blue-600 hover:bg-blue-500 disabled:bg-zinc-700 disabled:text-zinc-500 text-white rounded-lg transition-colors"
              >
                {creating ? "Creating..." : "Create"}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
