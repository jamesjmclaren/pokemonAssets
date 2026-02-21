"use client";

import { useUser } from "@clerk/nextjs";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { ArrowLeft, UserPlus, Trash2, Copy, Check, Shield, Eye } from "lucide-react";
import Link from "next/link";

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

export default function PortfolioSettingsPage() {
  const { user, isLoaded } = useUser();
  const params = useParams();
  const router = useRouter();
  const portfolioId = params.id as string;

  const [members, setMembers] = useState<Member[]>([]);
  const [invitations, setInvitations] = useState<Invitation[]>([]);
  const [ownerId, setOwnerId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteRole, setInviteRole] = useState<"admin" | "read_only">("read_only");
  const [inviting, setInviting] = useState(false);
  const [copiedToken, setCopiedToken] = useState<string | null>(null);

  const isOwner = user?.id === ownerId;

  useEffect(() => {
    if (isLoaded && user) {
      fetchData();
    }
  }, [isLoaded, user, portfolioId]);

  async function fetchData() {
    try {
      const [membersRes, invitationsRes] = await Promise.all([
        fetch(`/api/portfolios/${portfolioId}/members`),
        fetch(`/api/portfolios/${portfolioId}/invitations`),
      ]);

      if (membersRes.ok) {
        const data = await membersRes.json();
        setMembers(data.members);
        setOwnerId(data.owner_id);
      }

      if (invitationsRes.ok) {
        const data = await invitationsRes.json();
        setInvitations(data);
      }
    } catch (error) {
      console.error("Failed to fetch data:", error);
    } finally {
      setLoading(false);
    }
  }

  async function sendInvitation(e: React.FormEvent) {
    e.preventDefault();
    if (!inviteEmail.trim()) return;

    setInviting(true);
    try {
      const res = await fetch(`/api/portfolios/${portfolioId}/invitations`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: inviteEmail, role: inviteRole }),
      });

      if (res.ok) {
        setInviteEmail("");
        fetchData();
      } else {
        const data = await res.json();
        alert(data.error || "Failed to send invitation");
      }
    } catch (error) {
      console.error("Failed to send invitation:", error);
    } finally {
      setInviting(false);
    }
  }

  async function removeMember(memberId: string) {
    if (!confirm("Are you sure you want to remove this member?")) return;

    try {
      const res = await fetch(
        `/api/portfolios/${portfolioId}/members?memberId=${memberId}`,
        { method: "DELETE" }
      );

      if (res.ok) {
        fetchData();
      }
    } catch (error) {
      console.error("Failed to remove member:", error);
    }
  }

  function copyInviteLink(token: string) {
    const link = `${window.location.origin}/invite/${token}`;
    navigator.clipboard.writeText(link);
    setCopiedToken(token);
    setTimeout(() => setCopiedToken(null), 2000);
  }

  if (!isLoaded || loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-pulse text-zinc-400">Loading...</div>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto">
      <Link
        href="/dashboard"
        className="inline-flex items-center gap-2 text-zinc-400 hover:text-white mb-6 transition-colors"
      >
        <ArrowLeft className="w-4 h-4" />
        Back to Dashboard
      </Link>

      <h1 className="text-2xl font-bold text-white mb-8">Portfolio Settings</h1>

      {/* Invite Form */}
      <section className="bg-zinc-800 border border-zinc-700 rounded-xl p-6 mb-6">
        <h2 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
          <UserPlus className="w-5 h-5" />
          Invite Member
        </h2>

        <form onSubmit={sendInvitation} className="space-y-4">
          <div className="flex gap-3">
            <input
              type="email"
              value={inviteEmail}
              onChange={(e) => setInviteEmail(e.target.value)}
              placeholder="Email address"
              className="flex-1 px-4 py-2 bg-zinc-900 border border-zinc-700 rounded-lg text-white placeholder-zinc-500 focus:outline-none focus:border-blue-500"
            />
            <select
              value={inviteRole}
              onChange={(e) => setInviteRole(e.target.value as "admin" | "read_only")}
              className="px-4 py-2 bg-zinc-900 border border-zinc-700 rounded-lg text-white focus:outline-none focus:border-blue-500"
            >
              <option value="read_only">Read Only</option>
              <option value="admin">Admin</option>
            </select>
          </div>
          <button
            type="submit"
            disabled={inviting || !inviteEmail.trim()}
            className="px-6 py-2 bg-blue-600 hover:bg-blue-500 disabled:bg-zinc-700 disabled:text-zinc-500 text-white rounded-lg transition-colors"
          >
            {inviting ? "Sending..." : "Send Invitation"}
          </button>
        </form>
      </section>

      {/* Pending Invitations */}
      {invitations.length > 0 && (
        <section className="bg-zinc-800 border border-zinc-700 rounded-xl p-6 mb-6">
          <h2 className="text-lg font-semibold text-white mb-4">Pending Invitations</h2>
          <div className="space-y-3">
            {invitations.map((inv) => (
              <div
                key={inv.id}
                className="flex items-center justify-between p-3 bg-zinc-900 rounded-lg"
              >
                <div>
                  <p className="text-white">{inv.email}</p>
                  <p className="text-sm text-zinc-400 flex items-center gap-1">
                    {inv.role === "admin" ? (
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
                <button
                  onClick={() => copyInviteLink(inv.token)}
                  className="p-2 hover:bg-zinc-700 rounded-lg transition-colors"
                  title="Copy invite link"
                >
                  {copiedToken === inv.token ? (
                    <Check className="w-4 h-4 text-green-400" />
                  ) : (
                    <Copy className="w-4 h-4 text-zinc-400" />
                  )}
                </button>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Current Members */}
      <section className="bg-zinc-800 border border-zinc-700 rounded-xl p-6">
        <h2 className="text-lg font-semibold text-white mb-4">Members</h2>
        <div className="space-y-3">
          {/* Owner */}
          <div className="flex items-center justify-between p-3 bg-zinc-900 rounded-lg">
            <div>
              <p className="text-white">
                {isOwner ? "You" : "Owner"}
                <span className="ml-2 text-xs bg-blue-500/20 text-blue-400 px-2 py-0.5 rounded">
                  Owner
                </span>
              </p>
            </div>
          </div>

          {/* Members */}
          {members.map((member) => (
            <div
              key={member.id}
              className="flex items-center justify-between p-3 bg-zinc-900 rounded-lg"
            >
              <div>
                <p className="text-white">
                  {member.email}
                  {member.user_id === user?.id && (
                    <span className="ml-2 text-zinc-400">(You)</span>
                  )}
                </p>
                <p className="text-sm text-zinc-400 flex items-center gap-1">
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
              {isOwner && member.user_id !== user?.id && (
                <button
                  onClick={() => removeMember(member.id)}
                  className="p-2 hover:bg-red-500/10 rounded-lg transition-colors"
                  title="Remove member"
                >
                  <Trash2 className="w-4 h-4 text-red-400" />
                </button>
              )}
            </div>
          ))}

          {members.length === 0 && (
            <p className="text-zinc-500 text-center py-4">No members yet</p>
          )}
        </div>
      </section>
    </div>
  );
}
