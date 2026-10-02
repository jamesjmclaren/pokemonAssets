import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";

// Minimal holding page. The previous full homepage now lives at /legacy
// (src/app/legacy/page.tsx → src/components/landing/FullLandingPage.tsx).
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

      <div className="relative z-10 px-6 flex flex-col items-center">
        <h1 className="landing-fade-in">
          <img
            src="/logo.png"
            alt="West Investments"
            className="w-64 md:w-96 max-w-full h-auto object-contain"
          />
        </h1>

        <a
          href="mailto:info@west.investments"
          className="mt-12 text-text-secondary hover:text-accent transition-colors landing-fade-up"
          style={{ fontFamily: "Inter, sans-serif", fontSize: "13px", letterSpacing: "0.15em", animationDelay: "0.6s" }}
        >
          info@west.investments
        </a>
      </div>
    </section>
  );
}
