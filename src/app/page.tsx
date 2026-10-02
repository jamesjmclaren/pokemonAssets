import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";

// Minimal holding page. The full homepage is paused (not deleted) in
// src/components/landing/FullLandingPage.tsx — see the note at the top of
// that file for how to restore it.
export default async function HoldingPage() {
  const { userId } = await auth();
  if (userId) {
    redirect("/dashboard");
  }

  return (
    <section className="relative min-h-screen flex items-center justify-center overflow-hidden">
      <div className="absolute inset-0 z-0">
        <video
          autoPlay
          muted
          loop
          playsInline
          className="w-full h-full object-cover"
          style={{ filter: "brightness(0.3)" }}
        >
          <source src="/hero.mp4" type="video/mp4" />
        </video>
        <div
          className="absolute inset-0"
          style={{ background: "linear-gradient(to bottom, rgba(8,8,8,0.6) 0%, rgba(8,8,8,0.4) 50%, rgba(8,8,8,0.85) 100%)" }}
        />
      </div>

      <h1 className="relative z-10 px-6 landing-fade-in">
        <img
          src="/logo.png"
          alt="West Investments"
          className="w-64 md:w-96 max-w-full h-auto object-contain"
        />
      </h1>
    </section>
  );
}
