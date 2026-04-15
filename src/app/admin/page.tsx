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
} from "lucide-react";

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
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [sending, setSending] = useState(false);
  const [invitations, setInvitations] = useState<Invitation[]>([]);
  const [isAdmin, setIsAdmin] = useState(false);
  const [copiedId, setCopiedId] = useState<number | null>(null);

  useEffect(() => {
    if (isLoaded && user) {
      const userEmail = user.primaryEmailAddress?.emailAddress?.toLowerCase();
      setIsAdmin(
        ADMIN_EMAILS.some((e) => e.toLowerCase() === userEmail)
      );
    }
  }, [isLoaded, user]);

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
        <h1 className="text-xl font-semibold text-text-primary">
          Access Denied
        </h1>
        <p className="text-text-secondary text-sm">
          You do not have permission to access this page.
        </p>
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

  return (
    <div className="max-w-2xl mx-auto">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-text-primary mb-2">
          Admin — Invite Members
        </h1>
        <p className="text-text-secondary text-sm">
          Generate invite links for new members. They can sign up using any
          method (Google, email, etc.). Optionally provide their email to also
          send the link automatically.
        </p>
      </div>

      {/* Invite Form */}
      <div className="bg-surface border border-border rounded-xl p-6 mb-8">
        <div className="flex items-center gap-3 mb-5">
          <div className="w-10 h-10 rounded-lg bg-accent/10 flex items-center justify-center">
            <UserPlus className="w-5 h-5 text-accent" />
          </div>
          <div>
            <h2 className="text-text-primary font-medium">
              Generate Invite Link
            </h2>
            <p className="text-text-muted text-xs">
              Enter their name and optionally their email to send the link
            </p>
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
              {sending ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <LinkIcon className="w-4 h-4" />
              )}
              {sending ? "Generating..." : "Generate"}
            </button>
          </div>
        </form>
      </div>

      {/* Recent Invitations */}
      {invitations.length > 0 && (
        <div className="bg-surface border border-border rounded-xl p-6">
          <h2 className="text-text-primary font-medium mb-4">
            Recent Invitations
          </h2>
          <div className="space-y-3">
            {invitations.map((inv, i) => (
              <div
                key={`${inv.name}-${i}`}
                className={`p-4 rounded-lg border ${
                  inv.status === "success"
                    ? "bg-success/5 border-success/20"
                    : "bg-danger/5 border-danger/20"
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
                      {inv.email && (
                        <span className="text-text-muted font-normal ml-2">
                          {inv.email}
                        </span>
                      )}
                    </p>
                    <p
                      className={`text-xs mt-0.5 ${
                        inv.status === "success"
                          ? "text-success"
                          : "text-danger"
                      }`}
                    >
                      {inv.emailSent && (
                        <Mail className="w-3 h-3 inline mr-1 -mt-0.5" />
                      )}
                      {inv.message}
                    </p>
                  </div>
                  <span className="text-text-muted text-xs shrink-0">
                    {inv.timestamp}
                  </span>
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
                      {copiedId === i ? (
                        <Check className="w-4 h-4 text-success" />
                      ) : (
                        <Copy className="w-4 h-4" />
                      )}
                    </button>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
