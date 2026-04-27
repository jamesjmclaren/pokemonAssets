"use client";

import { useUser } from "@clerk/nextjs";
import { useState, useEffect } from "react";
import {
  UserPlus,
  CheckCircle,
  AlertCircle,
  Loader2,
  Shield,
  Copy,
  Check,
  Mail,
  Link as LinkIcon,
  Store,
  BadgeCheck,
} from "lucide-react";
import type { Vendor } from "@/types";

const ADMIN_EMAILS = [
  "jamesjmclaren@gmail.com",
  "k1west.cityboy@gmail.com",
];

interface Invitation {
  name: string;
  email: string;
  link: string;
  status: "success" | "error";
  emailSent: boolean;
  message: string;
  timestamp: string;
}

export default function AdminPage() {
  const { user, isLoaded } = useUser();
  const [tab, setTab] = useState<"invites" | "vendors">("invites");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [sending, setSending] = useState(false);
  const [invitations, setInvitations] = useState<Invitation[]>([]);
  const [isAdmin, setIsAdmin] = useState(false);
  const [copiedId, setCopiedId] = useState<number | null>(null);

  // Vendors tab state
  const [vendors, setVendors] = useState<Vendor[]>([]);
  const [vendorsLoading, setVendorsLoading] = useState(false);
  const [verifyingId, setVerifyingId] = useState<string | null>(null);

  useEffect(() => {
    if (isLoaded && user) {
      const userEmail = user.primaryEmailAddress?.emailAddress?.toLowerCase();
      setIsAdmin(ADMIN_EMAILS.some((e) => e.toLowerCase() === userEmail));
    }
  }, [isLoaded, user]);

  useEffect(() => {
    if (tab === "vendors" && isAdmin) {
      setVendorsLoading(true);
      fetch("/api/admin/vendors")
        .then((r) => r.json())
        .then((data) => setVendors(Array.isArray(data) ? data : []))
        .catch(() => setVendors([]))
        .finally(() => setVendorsLoading(false));
    }
  }, [tab, isAdmin]);

  if (!isLoaded) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        <Loader2 className="w-6 h-6 animate-spin text-text-muted" />
      </div>
    );
  }

  if (!isAdmin) {
    return (
      <div className="min-h-[60vh] flex flex-col items-center justify-center gap-4">
        <Shield className="w-12 h-12 text-text-muted" />
        <h1 className="text-xl font-semibold text-text-primary">Access Denied</h1>
        <p className="text-text-secondary text-sm">You do not have permission to access this page.</p>
      </div>
    );
  }

  const copyToClipboard = (text: string, index: number) => {
    navigator.clipboard.writeText(text);
    setCopiedId(index);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const handleInvite = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmedName = name.trim();
    if (!trimmedName) return;

    setSending(true);
    try {
      const res = await fetch("/api/admin/invite", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: trimmedName,
          email: email.trim().toLowerCase() || undefined,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        setInvitations((prev) => [
          {
            name: trimmedName,
            email: email.trim(),
            link: "",
            status: "error",
            emailSent: false,
            message: data.error || "Failed to generate invite",
            timestamp: new Date().toLocaleTimeString("en-GB"),
          },
          ...prev,
        ]);
      } else {
        setInvitations((prev) => [
          {
            name: trimmedName,
            email: email.trim(),
            link: data.link,
            status: "success",
            emailSent: data.emailSent || false,
            message: data.emailSent
              ? "Invite link generated and emailed"
              : "Invite link generated — copy and share it",
            timestamp: new Date().toLocaleTimeString("en-GB"),
          },
          ...prev,
        ]);
        setName("");
        setEmail("");
      }
    } catch {
      setInvitations((prev) => [
        {
          name: trimmedName,
          email: email.trim(),
          link: "",
          status: "error",
          emailSent: false,
          message: "Network error. Please try again.",
          timestamp: new Date().toLocaleTimeString("en-GB"),
        },
        ...prev,
      ]);
    } finally {
      setSending(false);
    }
  };

  const handleToggleVerified = async (vendor: Vendor) => {
    setVerifyingId(vendor.id);
    try {
      const res = await fetch("/api/admin/vendors", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: vendor.id, is_verified: !vendor.is_verified }),
      });
      if (res.ok) {
        const updated = await res.json();
        setVendors((prev) => prev.map((v) => (v.id === updated.id ? { ...v, is_verified: updated.is_verified } : v)));
      }
    } finally {
      setVerifyingId(null);
    }
  };

  return (
    <div className="max-w-2xl mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-text-primary mb-1">Admin</h1>
        <p className="text-text-secondary text-sm">Manage members and marketplace vendors.</p>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 mb-6 border-b border-border">
        {(["invites", "vendors"] as const).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`px-4 py-2.5 text-sm font-medium capitalize transition-colors border-b-2 -mb-px ${
              tab === t
                ? "border-accent text-accent"
                : "border-transparent text-text-muted hover:text-text-secondary"
            }`}
          >
            {t === "invites" ? "Invite Members" : "Vendors"}
          </button>
        ))}
      </div>

      {/* ── INVITE TAB ── */}
      {tab === "invites" && (
        <>
          <p className="text-text-secondary text-sm mb-6">
            Generate invite links for new members. They can sign up using any method (Google, email, etc.).
            Optionally provide their email to also send the link automatically.
          </p>

          <div className="bg-surface border border-border rounded-xl p-6 mb-8">
            <div className="flex items-center gap-3 mb-5">
              <div className="w-10 h-10 rounded-lg bg-accent/10 flex items-center justify-center">
                <UserPlus className="w-5 h-5 text-accent" />
              </div>
              <div>
                <h2 className="text-text-primary font-medium">Generate Invite Link</h2>
                <p className="text-text-muted text-xs">Enter their name and optionally their email to send the link</p>
              </div>
            </div>

            <form onSubmit={handleInvite} className="space-y-3">
              <input
                type="text"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Full name"
                className="w-full px-4 py-3 bg-background border border-border rounded-lg text-text-primary text-sm placeholder:text-text-muted focus:outline-none focus:border-accent/50 focus:ring-1 focus:ring-accent/20"
              />
              <div className="flex gap-3">
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="Email (optional — to send link via email)"
                  className="flex-1 px-4 py-3 bg-background border border-border rounded-lg text-text-primary text-sm placeholder:text-text-muted focus:outline-none focus:border-accent/50 focus:ring-1 focus:ring-accent/20"
                />
                <button
                  type="submit"
                  disabled={sending || !name.trim()}
                  className="inline-flex items-center gap-2 px-6 py-3 bg-accent text-background text-sm font-medium rounded-lg hover:bg-accent-hover transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {sending ? <Loader2 className="w-4 h-4 animate-spin" /> : <LinkIcon className="w-4 h-4" />}
                  {sending ? "Generating..." : "Generate"}
                </button>
              </div>
            </form>
          </div>

          {invitations.length > 0 && (
            <div className="bg-surface border border-border rounded-xl p-6">
              <h2 className="text-text-primary font-medium mb-4">Recent Invitations</h2>
              <div className="space-y-3">
                {invitations.map((inv, i) => (
                  <div
                    key={`${inv.name}-${i}`}
                    className={`p-4 rounded-lg border ${
                      inv.status === "success" ? "bg-success/5 border-success/20" : "bg-danger/5 border-danger/20"
                    }`}
                  >
                    <div className="flex items-start gap-3">
                      {inv.status === "success" ? (
                        <CheckCircle className="w-4 h-4 text-success mt-0.5 shrink-0" />
                      ) : (
                        <AlertCircle className="w-4 h-4 text-danger mt-0.5 shrink-0" />
                      )}
                      <div className="flex-1 min-w-0">
                        <p className="text-text-primary text-sm font-medium">
                          {inv.name}
                          {inv.email && <span className="text-text-muted font-normal ml-2">{inv.email}</span>}
                        </p>
                        <p className={`text-xs mt-0.5 ${inv.status === "success" ? "text-success" : "text-danger"}`}>
                          {inv.emailSent && <Mail className="w-3 h-3 inline mr-1 -mt-0.5" />}
                          {inv.message}
                        </p>
                      </div>
                      <span className="text-text-muted text-xs shrink-0">{inv.timestamp}</span>
                    </div>

                    {inv.link && (
                      <div className="mt-3 ml-7 flex items-center gap-2">
                        <code className="flex-1 px-3 py-2 bg-background border border-border rounded text-xs text-text-secondary truncate">
                          {inv.link}
                        </code>
                        <button
                          onClick={() => copyToClipboard(inv.link, i)}
                          className="shrink-0 p-2 rounded-lg bg-background border border-border hover:bg-surface-hover transition-colors text-text-secondary hover:text-text-primary"
                          title="Copy link"
                        >
                          {copiedId === i ? <Check className="w-4 h-4 text-success" /> : <Copy className="w-4 h-4" />}
                        </button>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}
        </>
      )}

      {/* ── VENDORS TAB ── */}
      {tab === "vendors" && (
        <div className="bg-surface border border-border rounded-xl p-6">
          <div className="flex items-center gap-3 mb-5">
            <div className="w-10 h-10 rounded-lg bg-accent/10 flex items-center justify-center">
              <Store className="w-5 h-5 text-accent" />
            </div>
            <div>
              <h2 className="text-text-primary font-medium">Marketplace Vendors</h2>
              <p className="text-text-muted text-xs">Grant or revoke the verified badge for vendor shops.</p>
            </div>
          </div>

          {vendorsLoading ? (
            <div className="flex items-center justify-center py-10">
              <Loader2 className="w-5 h-5 animate-spin text-text-muted" />
            </div>
          ) : vendors.length === 0 ? (
            <p className="text-center text-text-muted text-sm py-10">No vendors yet.</p>
          ) : (
            <div className="space-y-2">
              {vendors.map((vendor) => (
                <div
                  key={vendor.id}
                  className="flex items-center justify-between gap-4 p-4 rounded-lg border border-border bg-background"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <Store className="w-4 h-4 text-text-muted shrink-0" />
                    <div className="min-w-0">
                      <div className="flex items-center gap-1.5">
                        <span className="text-sm font-medium text-text-primary truncate">{vendor.shop_name}</span>
                        {vendor.is_verified && (
                          <BadgeCheck className="w-4 h-4 text-blue-400 shrink-0" />
                        )}
                      </div>
                      <span className="text-xs text-text-muted">{vendor.is_active ? "Active" : "Inactive"}</span>
                    </div>
                  </div>

                  <button
                    onClick={() => handleToggleVerified(vendor)}
                    disabled={verifyingId === vendor.id}
                    className={`shrink-0 inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed ${
                      vendor.is_verified
                        ? "bg-blue-500/10 text-blue-400 hover:bg-blue-500/20 border border-blue-500/20"
                        : "bg-surface-hover border border-border text-text-secondary hover:text-text-primary hover:border-border-hover"
                    }`}
                  >
                    {verifyingId === vendor.id ? (
                      <Loader2 className="w-3 h-3 animate-spin" />
                    ) : (
                      <BadgeCheck className="w-3 h-3" />
                    )}
                    {vendor.is_verified ? "Verified" : "Mark Verified"}
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
