"use client";

import { useCallback, useEffect, useState } from "react";
import { KeyRound, Plus, Trash2, Copy, Check, AlertTriangle } from "lucide-react";

interface ApiKey {
  id: string;
  name: string;
  description: string | null;
  revoked: boolean;
  expired: boolean;
  expiration: number | null;
  lastUsedAt: number | null;
  createdAt: number;
}

export default function ApiKeysPage() {
  const [keys, setKeys] = useState<ApiKey[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);
  const [newKeyName, setNewKeyName] = useState("");
  const [newKeyDescription, setNewKeyDescription] = useState("");
  const [createdSecret, setCreatedSecret] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const loadKeys = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/settings/api-keys");
      if (!res.ok) throw new Error("Failed to load API keys");
      const data = await res.json();
      setKeys(Array.isArray(data.keys) ? data.keys : []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load API keys");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadKeys();
  }, [loadKeys]);

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    if (!newKeyName.trim()) return;
    setCreating(true);
    setError(null);
    try {
      const res = await fetch("/api/settings/api-keys", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: newKeyName.trim(),
          description: newKeyDescription.trim() || undefined,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to create key");
      setCreatedSecret(data.secret || null);
      setNewKeyName("");
      setNewKeyDescription("");
      await loadKeys();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create key");
    } finally {
      setCreating(false);
    }
  }

  async function handleRevoke(id: string) {
    if (!confirm("Revoke this API key? Anyone using it will lose access immediately.")) return;
    try {
      const res = await fetch(`/api/settings/api-keys/${id}`, { method: "DELETE" });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || "Failed to revoke");
      }
      await loadKeys();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to revoke");
    }
  }

  function copySecret() {
    if (!createdSecret) return;
    navigator.clipboard.writeText(createdSecret);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  const activeKeys = keys.filter((k) => !k.revoked && !k.expired);
  const inactiveKeys = keys.filter((k) => k.revoked || k.expired);

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-semibold text-text-primary flex items-center gap-2">
          <KeyRound className="w-5 h-5 text-accent" />
          API Keys
        </h2>
        <p className="text-sm text-text-muted mt-1">
          Create keys to query your portfolio programmatically. See the{" "}
          <a href="/docs/api" className="text-accent hover:underline">
            API docs
          </a>{" "}
          for endpoints and examples.
        </p>
      </div>

      {createdSecret && (
        <div className="bg-success/5 border border-success/30 rounded-2xl p-4 space-y-3">
          <div className="flex items-start gap-2">
            <AlertTriangle className="w-5 h-5 text-success flex-shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-medium text-text-primary">
                Copy your key now — it will not be shown again.
              </p>
              <p className="text-xs text-text-muted mt-1">
                Store it somewhere safe (e.g. a password manager). If you lose it, revoke and create a new one.
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <code className="flex-1 bg-background border border-border rounded-lg px-3 py-2 text-xs font-mono text-text-primary overflow-x-auto">
              {createdSecret}
            </code>
            <button
              onClick={copySecret}
              className="flex items-center gap-1 px-3 py-2 bg-accent text-background rounded-lg text-xs font-medium hover:bg-accent-hover"
            >
              {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
              {copied ? "Copied" : "Copy"}
            </button>
          </div>
          <button
            onClick={() => setCreatedSecret(null)}
            className="text-xs text-text-muted hover:text-text-primary"
          >
            I&apos;ve saved it — dismiss
          </button>
        </div>
      )}

      <form
        onSubmit={handleCreate}
        className="bg-surface border border-border rounded-2xl p-4 md:p-6 space-y-3"
      >
        <h3 className="text-sm font-semibold text-text-primary">Create a new key</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <input
            type="text"
            placeholder="Name (e.g. Accounting Script)"
            value={newKeyName}
            onChange={(e) => setNewKeyName(e.target.value)}
            maxLength={60}
            required
            className="w-full px-3 py-2 bg-background border border-border rounded-lg text-sm text-text-primary placeholder:text-text-muted focus:outline-none focus:border-accent/50"
          />
          <input
            type="text"
            placeholder="Description (optional)"
            value={newKeyDescription}
            onChange={(e) => setNewKeyDescription(e.target.value)}
            maxLength={200}
            className="w-full px-3 py-2 bg-background border border-border rounded-lg text-sm text-text-primary placeholder:text-text-muted focus:outline-none focus:border-accent/50"
          />
        </div>
        <button
          type="submit"
          disabled={creating || !newKeyName.trim()}
          className="inline-flex items-center gap-2 px-4 py-2 bg-accent text-background rounded-lg text-sm font-medium hover:bg-accent-hover disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <Plus className="w-4 h-4" />
          {creating ? "Creating..." : "Create Key"}
        </button>
      </form>

      {error && (
        <div className="bg-danger/5 border border-danger/30 rounded-2xl p-3 text-sm text-danger">
          {error}
        </div>
      )}

      <div className="bg-surface border border-border rounded-2xl p-4 md:p-6">
        <h3 className="text-sm font-semibold text-text-primary mb-3">Active keys</h3>
        {loading ? (
          <p className="text-sm text-text-muted">Loading...</p>
        ) : activeKeys.length === 0 ? (
          <p className="text-sm text-text-muted">No active API keys. Create one above.</p>
        ) : (
          <ul className="divide-y divide-border">
            {activeKeys.map((k) => (
              <li key={k.id} className="flex items-center justify-between py-3 gap-3">
                <div className="min-w-0 flex-1">
                  <p className="text-sm text-text-primary font-medium truncate">{k.name}</p>
                  {k.description && (
                    <p className="text-xs text-text-muted truncate">{k.description}</p>
                  )}
                  <p className="text-[11px] text-text-muted mt-0.5">
                    Created {new Date(k.createdAt).toLocaleDateString()}
                    {k.lastUsedAt
                      ? ` · Last used ${new Date(k.lastUsedAt).toLocaleString()}`
                      : " · Never used"}
                  </p>
                </div>
                <button
                  onClick={() => handleRevoke(k.id)}
                  className="flex items-center gap-1 px-3 py-1.5 bg-danger/10 text-danger rounded-lg text-xs font-medium hover:bg-danger/20"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  Revoke
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>

      {inactiveKeys.length > 0 && (
        <div className="bg-surface border border-border rounded-2xl p-4 md:p-6">
          <h3 className="text-sm font-semibold text-text-muted mb-3">
            Revoked / expired ({inactiveKeys.length})
          </h3>
          <ul className="divide-y divide-border">
            {inactiveKeys.map((k) => (
              <li key={k.id} className="py-2">
                <p className="text-sm text-text-muted line-through">{k.name}</p>
                <p className="text-[11px] text-text-muted">
                  {k.revoked ? "Revoked" : "Expired"} ·{" "}
                  {new Date(k.createdAt).toLocaleDateString()}
                </p>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
