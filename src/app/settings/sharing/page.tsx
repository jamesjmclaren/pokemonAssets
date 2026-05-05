"use client";

import { useEffect, useState } from "react";
import { Globe, Link as LinkIcon, Copy, Check, RefreshCw } from "lucide-react";
import { usePortfolio } from "@/lib/portfolio-context";

export default function SharingSettingsPage() {
  const { currentPortfolio } = usePortfolio();
  const [isPublic, setIsPublic] = useState(false);
  const [publicToken, setPublicToken] = useState<string | null>(null);
  const [toggling, setToggling] = useState(false);
  const [regenerating, setRegenerating] = useState(false);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!currentPortfolio) return;
    fetch(`/api/portfolios/${currentPortfolio.id}`)
      .then((r) => r.json())
      .then((data) => {
        setIsPublic(data.is_public ?? false);
        setPublicToken(data.public_token ?? null);
      })
      .catch(console.error);
  }, [currentPortfolio]);

  async function toggle(enable: boolean) {
    if (!currentPortfolio) return;
    setToggling(true);
    try {
      const res = await fetch(`/api/portfolios/${currentPortfolio.id}/public`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ is_public: enable }),
      });
      if (res.ok) {
        const data = await res.json();
        setIsPublic(data.is_public);
        setPublicToken(data.public_token);
      }
    } finally {
      setToggling(false);
    }
  }

  async function regenerate() {
    if (!currentPortfolio || !confirm("This will invalidate your current public link. Anyone with the old link will lose access. Continue?")) return;
    setRegenerating(true);
    try {
      const res = await fetch(`/api/portfolios/${currentPortfolio.id}/public`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ is_public: true, regenerate: true }),
      });
      if (res.ok) {
        const data = await res.json();
        setIsPublic(data.is_public);
        setPublicToken(data.public_token);
      }
    } finally {
      setRegenerating(false);
    }
  }

  function copyLink() {
    if (!publicToken) return;
    navigator.clipboard.writeText(`${window.location.origin}/p/${publicToken}`);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  const isOwner = currentPortfolio?.role === "owner";
  const publicUrl = publicToken ? `${typeof window !== "undefined" ? window.location.origin : ""}/p/${publicToken}` : null;

  if (!currentPortfolio) {
    return (
      <div className="text-center py-16">
        <Globe className="w-12 h-12 text-text-muted mx-auto mb-3" />
        <p className="text-text-secondary">Select a portfolio to manage sharing.</p>
      </div>
    );
  }

  if (!isOwner) {
    return (
      <div className="text-center py-16">
        <Globe className="w-12 h-12 text-text-muted mx-auto mb-3" />
        <p className="text-text-secondary">Only the portfolio owner can manage public sharing.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-2xl">
      <div>
        <h2 className="text-lg font-semibold text-text-primary">Public Portfolio Link</h2>
        <p className="text-sm text-text-muted mt-1">
          Share a read-only view of <span className="text-text-primary font-medium">{currentPortfolio.name}</span> showing current market prices. Purchase prices and personal info are never shown.
        </p>
      </div>

      <section className="bg-surface border border-border rounded-2xl p-6 space-y-4">
        {/* Toggle */}
        <div className="flex items-center justify-between">
          <div>
            <p className="font-medium text-text-primary">Enable public link</p>
            <p className="text-sm text-text-muted mt-0.5">
              {isPublic ? "Anyone with the link can view your portfolio" : "Your portfolio is private"}
            </p>
          </div>
          <button
            onClick={() => toggle(!isPublic)}
            disabled={toggling}
            className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none disabled:opacity-50 ${
              isPublic ? "bg-accent" : "bg-border"
            }`}
          >
            <span
              className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                isPublic ? "translate-x-6" : "translate-x-1"
              }`}
            />
          </button>
        </div>

        {/* Link display */}
        {isPublic && publicUrl && (
          <>
            <div className="flex items-center gap-2 p-3 bg-background rounded-xl">
              <LinkIcon className="w-4 h-4 text-text-muted shrink-0" />
              <span className="text-sm text-text-muted truncate flex-1">{publicUrl}</span>
              <button
                onClick={copyLink}
                className="p-1.5 hover:bg-surface rounded-lg transition-colors shrink-0"
                title="Copy link"
              >
                {copied ? (
                  <Check className="w-4 h-4 text-green-400" />
                ) : (
                  <Copy className="w-4 h-4 text-text-muted" />
                )}
              </button>
            </div>

            <div className="border-t border-border pt-4">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="text-sm font-medium text-text-primary">Regenerate link</p>
                  <p className="text-xs text-text-muted mt-0.5">
                    Creates a new URL and invalidates the current one. Anyone with the old link will lose access.
                  </p>
                </div>
                <button
                  onClick={regenerate}
                  disabled={regenerating}
                  className="flex items-center gap-2 px-4 py-2 text-sm bg-zinc-700 hover:bg-zinc-600 disabled:opacity-50 text-white rounded-xl transition-colors shrink-0"
                >
                  <RefreshCw className={`w-4 h-4 ${regenerating ? "animate-spin" : ""}`} />
                  {regenerating ? "Regenerating..." : "Regenerate"}
                </button>
              </div>
            </div>
          </>
        )}
      </section>
    </div>
  );
}
