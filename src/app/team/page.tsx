"use client";

import { useEffect, useState } from "react";
import { usePortfolio } from "@/lib/portfolio-context";
import { UserPlus, Trash2, Copy, Check, Shield, Eye, Users, Crown, X } from "lucide-react";

interface Member {
  id: string;
  user_id: string;
  email: string;
  role: "admin" | "read_only";
  accepted_at: string;
}

interface Invitation {
  id: string;
  email: string;
  role: "admin" | "read_only";
  token: string;
  expires_at: string;
}

export default function TeamPage() {
  const { currentPortfolio, loading: portfolioLoading } = usePortfolio();
  const [members, setMembers] = useState<Member[]>([]);
  const [invitations, setInvitations] = useState<Invitation[]>([]);
  const [ownerId, setOwnerId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteRole, setInviteRole] = useState<"admin" | "read_only">("read_only");
  const [inviting, setInviting] = useState(false);
  const [copiedToken, setCopiedToken] = useState<string | null>(null);
  const [error, setError] = useState("");
  const [successMsg, setSuccessMsg] = useState("");

  const isOwner = currentPortfolio?.role === "owner";
  const canInvite = isOwner || currentPortfolio?.role === "admin";

  useEffect(() => {
    if (currentPortfolio) {
      fetchData();
    }
  }, [currentPortfolio]);

  async function fetchData() {
    if (!currentPortfolio) return;
    setLoading(true);
    try {
      const [membersRes, invitationsRes] = await Promise.all([
        fetch(`/api/portfolios/${currentPortfolio.id}/members`),
        fetch(`/api/portfolios/${currentPortfolio.id}/invitations`),
      ]);

      if (membersRes.ok) {
        const data = await membersRes.json();
        setMembers(data.members || []);
        setOwnerId(data.owner_id);
      }

      if (invitationsRes.ok) {
        const data = await invitationsRes.json();
        setInvitations(Array.isArray(data) ? data : []);
      }
    } catch (err) {
      console.error("Failed to fetch team data:", err);
    } finally {
      setLoading(false);
    }
  }

  async function sendInvitation(e: React.FormEvent) {
    e.preventDefault();
    if (!inviteEmail.trim() || !currentPortfolio) return;

    setInviting(true);
    setError("");
    setSuccessMsg("");
    try {
      const res = await fetch(`/api/portfolios/${currentPortfolio.id}/invitations`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: inviteEmail, role: inviteRole }),
      });

      const data = await res.json();

      if (res.ok) {
        setInviteEmail("");
        if (data.added_directly) {
          setSuccessMsg("User already has an account — added to the portfolio directly.");
        } else {
          setSuccessMsg("Invitation email sent successfully.");
        }
        fetchData();
      } else {
        setError(data.error || "Failed to send invitation");
      }
    } catch {
      setError("Failed to send invitation");
    } finally {
      setInviting(false);
    }
  }

  async function removeMember(memberId: string) {
    if (!confirm("Are you sure you want to remove this member?") || !currentPortfolio) return;

    try {
      const res = await fetch(
        `/api/portfolios/${currentPortfolio.id}/members?memberId=${memberId}`,
        { method: "DELETE" }
      );

      if (res.ok) {
        fetchData();
      }
    } catch (err) {
      console.error("Failed to remove member:", err);
    }
  }

  async function revokeInvitation(invitationId: string) {
    if (!confirm("Are you sure you want to revoke this invitation?") || !currentPortfolio) return;

    try {
      const res = await fetch(
        `/api/portfolios/${currentPortfolio.id}/invitations?invitationId=${invitationId}`,
        { method: "DELETE" }
      );

      if (res.ok) {
        fetchData();
      }
    } catch (err) {
      console.error("Failed to revoke invitation:", err);
    }
  }

  function copyInviteLink(token: string) {
    const link = `${window.location.origin}/invite/${token}`;
    navigator.clipboard.writeText(link);
    setCopiedToken(token);
    setTimeout(() => setCopiedToken(null), 2000);
  }

  if (portfolioLoading || loading) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-xl md:text-2xl font-bold text-text-primary">Team</h1>
          <p className="text-text-muted mt-1 text-sm">Loading...</p>
        </div>
        <div className="skeleton h-64 rounded-2xl" />
      </div>
    );
  }

  if (!currentPortfolio) {
    return (
      <div className="text-center py-16">
        <Users className="w-16 h-16 text-text-muted mx-auto mb-4" />
        <h2 className="text-xl font-bold text-text-primary">No Portfolio Selected</h2>
        <p className="text-text-secondary mt-2">Select a portfolio to manage team members.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-2xl">
      {/* Header */}
      <div>
        <h1 className="text-xl md:text-2xl font-bold text-text-primary">Team</h1>
        <p className="text-text-muted mt-1 text-sm">
          Manage who has access to {currentPortfolio.name}
        </p>
      </div>

      {/* Invite Form */}
      {canInvite && (
        <section className="bg-surface border border-border rounded-2xl p-6">
          <h2 className="text-lg font-semibold text-text-primary mb-4 flex items-center gap-2">
            <UserPlus className="w-5 h-5" />
            Invite Member
          </h2>

          <form onSubmit={sendInvitation} className="space-y-4">
            <div className="flex flex-col sm:flex-row gap-3">
              <input
                type="email"
                value={inviteEmail}
                onChange={(e) => setInviteEmail(e.target.value)}
                placeholder="Email address"
                className="flex-1 px-4 py-2.5 bg-background border border-border rounded-xl text-text-primary placeholder-text-muted focus:outline-none focus:border-accent"
              />
              <select
                value={inviteRole}
                onChange={(e) => setInviteRole(e.target.value as "admin" | "read_only")}
                className="px-4 py-2.5 bg-background border border-border rounded-xl text-text-primary focus:outline-none focus:border-accent"
              >
                <option value="read_only">Read Only</option>
                <option value="admin">Admin</option>
              </select>
            </div>

            <div className="flex items-center gap-4">
              <button
                type="submit"
                disabled={inviting || !inviteEmail.trim()}
                className="px-6 py-2.5 bg-accent hover:bg-accent-hover disabled:bg-surface disabled:text-text-muted text-black rounded-xl font-medium transition-colors"
              >
                {inviting ? "Sending..." : "Send Invitation"}
              </button>
              {error && <p className="text-red-400 text-sm">{error}</p>}
              {successMsg && <p className="text-green-400 text-sm">{successMsg}</p>}
            </div>
          </form>

          <div className="mt-4 p-3 bg-background rounded-xl">
            <p className="text-xs text-text-muted">
              <strong className="text-text-secondary">Admin:</strong> Can add/edit assets and invite members
            </p>
            <p className="text-xs text-text-muted mt-1">
              <strong className="text-text-secondary">Read Only:</strong> Can only view portfolio and assets
            </p>
          </div>
        </section>
      )}

      {/* Pending Invitations */}
      {invitations.length > 0 && (
        <section className="bg-surface border border-border rounded-2xl p-6">
          <h2 className="text-lg font-semibold text-text-primary mb-4">Pending Invitations</h2>
          <div className="space-y-3">
            {invitations.map((inv) => (
              <div
                key={inv.id}
                className="flex items-center justify-between p-4 bg-background rounded-xl"
              >
                <div>
                  <p className="text-text-primary font-medium">{inv.email}</p>
                  <p className="text-sm text-text-muted flex items-center gap-1 mt-0.5">
                    {inv.role === "admin" ? (
                      <>
                        <Shield className="w-3 h-3" /> Admin
                      </>
                    ) : (
                      <>
                        <Eye className="w-3 h-3" /> Read Only
                      </>
                    )}
                    <span className="mx-2">·</span>
                    Expires {new Date(inv.expires_at).toLocaleDateString()}
                  </p>
                </div>
                <div className="flex items-center gap-1">
                  <button
                    onClick={() => copyInviteLink(inv.token)}
                    className="p-2.5 hover:bg-surface rounded-xl transition-colors"
                    title="Copy invite link"
                  >
                    {copiedToken === inv.token ? (
                      <Check className="w-5 h-5 text-green-400" />
                    ) : (
                      <Copy className="w-5 h-5 text-text-muted" />
                    )}
                  </button>
                  {canInvite && (
                    <button
                      onClick={() => revokeInvitation(inv.id)}
                      className="p-2.5 hover:bg-red-500/10 rounded-xl transition-colors"
                      title="Revoke invitation"
                    >
                      <X className="w-5 h-5 text-red-400" />
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Current Members */}
      <section className="bg-surface border border-border rounded-2xl p-6">
        <h2 className="text-lg font-semibold text-text-primary mb-4">Members</h2>
        <div className="space-y-3">
          {/* Owner */}
          <div className="flex items-center justify-between p-4 bg-background rounded-xl">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-accent/10 flex items-center justify-center">
                <Crown className="w-5 h-5 text-accent" />
              </div>
              <div>
                <p className="text-text-primary font-medium">
                  {isOwner ? "You" : "Owner"}
                </p>
                <p className="text-sm text-text-muted flex items-center gap-1">
                  <Crown className="w-3 h-3" /> Owner
                </p>
              </div>
            </div>
          </div>

          {/* Members */}
          {members.map((member) => (
            <div
              key={member.id}
              className="flex items-center justify-between p-4 bg-background rounded-xl"
            >
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-surface flex items-center justify-center">
                  {member.role === "admin" ? (
                    <Shield className="w-5 h-5 text-text-muted" />
                  ) : (
                    <Eye className="w-5 h-5 text-text-muted" />
                  )}
                </div>
                <div>
                  <p className="text-text-primary font-medium">{member.email}</p>
                  <p className="text-sm text-text-muted flex items-center gap-1">
                    {member.role === "admin" ? (
                      <>
                        <Shield className="w-3 h-3" /> Admin
                      </>
                    ) : (
                      <>
                        <Eye className="w-3 h-3" /> Read Only
                      </>
                    )}
                  </p>
                </div>
              </div>
              {isOwner && (
                <button
                  onClick={() => removeMember(member.id)}
                  className="p-2.5 hover:bg-red-500/10 rounded-xl transition-colors"
                  title="Remove member"
                >
                  <Trash2 className="w-5 h-5 text-red-400" />
                </button>
              )}
            </div>
          ))}

          {members.length === 0 && (
            <p className="text-text-muted text-center py-6">
              No team members yet. Invite someone to collaborate.
            </p>
          )}
        </div>
      </section>
    </div>
  );
}
