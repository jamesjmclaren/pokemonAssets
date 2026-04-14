"use client";

import { useUser } from "@clerk/nextjs";
import { useState, useEffect } from "react";
import { Send, UserPlus, CheckCircle, AlertCircle, Loader2, Shield } from "lucide-react";

const ADMIN_EMAILS = [
  "jamesjmclaren@gmail.com",
  "k1west.cityboy@gmail.com",
];

interface Invitation {
  email: string;
  status: "sent" | "error";
  message: string;
  timestamp: string;
}

export default function AdminPage() {
  const { user, isLoaded } = useUser();
  const [email, setEmail] = useState("");
  const [sending, setSending] = useState(false);
  const [invitations, setInvitations] = useState<Invitation[]>([]);
  const [isAdmin, setIsAdmin] = useState(false);

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

  const handleInvite = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmedEmail = email.trim().toLowerCase();
    if (!trimmedEmail) return;

    setSending(true);
    try {
      const res = await fetch("/api/admin/invite", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: trimmedEmail }),
      });

      const data = await res.json();

      if (!res.ok) {
        setInvitations((prev) => [
          {
            email: trimmedEmail,
            status: "error",
            message: data.error || "Failed to send invitation",
            timestamp: new Date().toLocaleTimeString("en-GB"),
          },
          ...prev,
        ]);
      } else {
        setInvitations((prev) => [
          {
            email: trimmedEmail,
            status: "sent",
            message: data.message || "Invitation sent successfully",
            timestamp: new Date().toLocaleTimeString("en-GB"),
          },
          ...prev,
        ]);
        setEmail("");
      }
    } catch {
      setInvitations((prev) => [
        {
          email: trimmedEmail,
          status: "error",
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
          Send platform invitations to new members. They will receive an email
          with a link to create their account.
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
              Send Invitation
            </h2>
            <p className="text-text-muted text-xs">
              Enter the email address of the person you want to invite
            </p>
          </div>
        </div>

        <form onSubmit={handleInvite} className="flex gap-3">
          <input
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="email@example.com"
            className="flex-1 px-4 py-3 bg-background border border-border rounded-lg text-text-primary text-sm placeholder:text-text-muted focus:outline-none focus:border-accent/50 focus:ring-1 focus:ring-accent/20"
          />
          <button
            type="submit"
            disabled={sending || !email.trim()}
            className="inline-flex items-center gap-2 px-6 py-3 bg-accent text-background text-sm font-medium rounded-lg hover:bg-accent-hover transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {sending ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Send className="w-4 h-4" />
            )}
            {sending ? "Sending..." : "Invite"}
          </button>
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
                key={`${inv.email}-${i}`}
                className={`flex items-start gap-3 p-3 rounded-lg border ${
                  inv.status === "sent"
                    ? "bg-success/5 border-success/20"
                    : "bg-danger/5 border-danger/20"
                }`}
              >
                {inv.status === "sent" ? (
                  <CheckCircle className="w-4 h-4 text-success mt-0.5 shrink-0" />
                ) : (
                  <AlertCircle className="w-4 h-4 text-danger mt-0.5 shrink-0" />
                )}
                <div className="flex-1 min-w-0">
                  <p className="text-text-primary text-sm font-medium truncate">
                    {inv.email}
                  </p>
                  <p
                    className={`text-xs ${
                      inv.status === "sent"
                        ? "text-success"
                        : "text-danger"
                    }`}
                  >
                    {inv.message}
                  </p>
                </div>
                <span className="text-text-muted text-xs shrink-0">
                  {inv.timestamp}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
