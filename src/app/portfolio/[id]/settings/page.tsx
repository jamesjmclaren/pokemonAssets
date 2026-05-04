"use client";

import { useUser } from "@clerk/nextjs";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { ArrowLeft, UserPlus, Trash2, Copy, Check, Shield, Eye, Globe, Link2 } from "lucide-react";
import Link from "next/link";

const SUPER_ADMIN_EMAILS = [
  "jamesjmclaren@gmail.com",
  "k1west.cityboy@gmail.com",
];

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
  const [isPublic, setIsPublic] = useState(false);
  const [publicToken, setPublicToken] = useState<string | null>(null);
  const [publicToggling, setPublicToggling] = useState(false);
  const [copiedPublicLink, setCopiedPublicLink] = useState(false);

  const isOwner = user?.id === ownerId;
  const isSuperAdmin = user?.emailAddresses
    ?.some((e) => SUPER_ADMIN_EMAILS.includes(e.emailAddress.toLowerCase())) ?? false;

  useEffect(() => {
    if (isLoaded && user) {
      fetchData();
    }
  }, [isLoaded, user, portfolioId]);

  async function fetchData() {
    try {
      const [membersRes, invitationsRes, portfolioRes] = await Promise.all([
        fetch(`/api/portfolios/${portfolioId}/members`),
        fetch(`/api/portfolios/${portfolioId}/invitations`),
        fetch(`/api/portfolios/${portfolioId}`),
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

      if (portfolioRes.ok) {
        const data = await portfolioRes.json();
        setIsPublic(data.is_public ?? false);
        setPublicToken(data.public_token ?? null);
      }
    } catch (error) {
      console.error("Failed to fetch data:", error);
    } finally {
      setLoading(false);
    }
  }

  async function togglePublicLink(enable: boolean) {
    setPublicToggling(true);
    try {
      const res = await fetch(`/api/portfolios/${portfolioId}/public`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ is_public: enable }),
      });
      if (res.ok) {
        const data = await res.json();
        setIsPublic(data.is_public);
        setPublicToken(data.public_token);
      }
    } catch (error) {
      console.error("Failed to toggle public link:", error);
    } finally {
      setPublicToggling(false);
    }
  }

  function copyPublicLink() {
    if (!publicToken) return;
    navigator.clipboard.writeText(`${window.location.origin}/p/${publicToken}`);
    setCopiedPublicLink(true);
    setTimeout(() => setCopiedPublicLink(false), 2000);
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

      {/* Public Sharing */}
      {isOwner && (
        <section className="bg-zinc-800 border border-zinc-700 rounded-xl p-6 mb-6">
          <h2 className="text-lg font-semibold text-white mb-1 flex items-center gap-2">
            <Globe className="w-5 h-5" />
            Public Sharing
          </h2>
          <p className="text-sm text-zinc-400 mb-4">
            Share a read-only view of your collection showing market prices. Purchase prices and personal info are never shown.
          </p>

          <div className="flex items-center justify-between">
            <span className="text-white font-medium">Public link</span>
            <button
              onClick={() => togglePublicLink(!isPublic)}
              disabled={publicToggling}
              className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none disabled:opacity-50 ${
                isPublic ? "bg-accent" : "bg-zinc-600"
              }`}
            >
              <span
                className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                  isPublic ? "translate-x-6" : "translate-x-1"
                }`}
              />
            </button>
          </div>

          {isPublic && publicToken && (
            <div className="mt-4 p-3 bg-zinc-900 rounded-lg flex items-center gap-3">
              <Link2 className="w-4 h-4 text-zinc-400 shrink-0" />
              <span className="text-sm text-zinc-300 flex-1 truncate">
                {typeof window !== "undefined"
                  ? `${window.location.origin}/p/${publicToken}`
                  : `/p/${publicToken}`}
              </span>
              <button
                onClick={copyPublicLink}
                className="p-1.5 hover:bg-zinc-700 rounded-lg transition-colors shrink-0"
                title="Copy link"
              >
                {copiedPublicLink ? (
                  <Check className="w-4 h-4 text-green-400" />
                ) : (
                  <Copy className="w-4 h-4 text-zinc-400" />
                )}
              </button>
            </div>
          )}
        </section>
      )}

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
            {isSuperAdmin ? (
              <select
                value={inviteRole}
                onChange={(e) => setInviteRole(e.target.value as "admin" | "read_only")}
                className="px-4 py-2 bg-zinc-900 border border-zinc-700 rounded-lg text-white focus:outline-none focus:border-blue-500"
              >
                <option value="read_only">Read Only</option>
                <option value="admin">Admin</option>
              </select>
            ) : (
              <span className="px-4 py-2 bg-zinc-900 border border-zinc-700 rounded-lg text-zinc-400 flex items-center gap-1.5">
                <Eye className="w-4 h-4" /> Read Only
              </span>
            )}
          </div>
          <button
            type="submit"
            disabled={inviting || !inviteEmail.trim()}
            className="px-6 py-2 bg-accent hover:bg-accent-hover disabled:bg-zinc-700 disabled:text-zinc-500 text-black rounded-lg transition-colors"
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
