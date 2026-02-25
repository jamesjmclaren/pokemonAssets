"use client";

import { useUser, SignIn } from "@clerk/nextjs";
import { useRouter, useParams } from "next/navigation";
import { useEffect, useState } from "react";
import { CheckCircle, XCircle, Loader2 } from "lucide-react";

export default function AcceptInvitePage() {
  const { user, isLoaded, isSignedIn } = useUser();
  const router = useRouter();
  const params = useParams();
  const token = params.token as string;

  const [status, setStatus] = useState<"loading" | "success" | "error" | "signing-in">("loading");
  const [errorMessage, setErrorMessage] = useState("");

  useEffect(() => {
    if (!isLoaded) return;

    if (!isSignedIn) {
      setStatus("signing-in");
      return;
    }

    acceptInvitation();
  }, [isLoaded, isSignedIn, token]);

  async function acceptInvitation() {
    try {
      const res = await fetch("/api/invitations/accept", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token }),
      });

      if (res.ok) {
        setStatus("success");
        setTimeout(() => {
          router.push("/dashboard");
        }, 2000);
      } else {
        const data = await res.json();
        setErrorMessage(data.error || "Failed to accept invitation");
        setStatus("error");
      }
    } catch {
      setErrorMessage("Failed to accept invitation");
      setStatus("error");
    }
  }

  if (status === "signing-in") {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-zinc-950 p-4">
        <p className="text-zinc-400 mb-6">Sign in to accept your invitation</p>
        <SignIn
          forceRedirectUrl={`/invite/${token}`}
          signUpForceRedirectUrl={`/invite/${token}`}
        />
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-zinc-950 p-4">
      <div className="max-w-md w-full text-center">
        {status === "loading" && (
          <div className="flex flex-col items-center gap-4">
            <Loader2 className="w-12 h-12 text-blue-400 animate-spin" />
            <p className="text-zinc-400">Accepting invitation...</p>
          </div>
        )}

        {status === "success" && (
          <div className="flex flex-col items-center gap-4">
            <CheckCircle className="w-16 h-16 text-green-400" />
            <h1 className="text-2xl font-bold text-white">Invitation Accepted</h1>
            <p className="text-zinc-400">Redirecting to dashboard...</p>
          </div>
        )}

        {status === "error" && (
          <div className="flex flex-col items-center gap-4">
            <XCircle className="w-16 h-16 text-red-400" />
            <h1 className="text-2xl font-bold text-white">Invitation Failed</h1>
            <p className="text-zinc-400">{errorMessage}</p>
            <button
              onClick={() => router.push("/dashboard")}
              className="mt-4 px-6 py-2 bg-accent hover:bg-accent-hover text-black rounded-lg transition-colors"
            >
              Go to Dashboard
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
