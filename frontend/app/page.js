import { Features } from "@/components/landing/Features";
import { FinalCTA } from "@/components/landing/FinalCTA";
import { Hero } from "@/components/landing/Hero";
import { HowItWorks } from "@/components/landing/HowItWorks";
import { LandingFooter } from "@/components/landing/LandingFooter";
import { LandingNav } from "@/components/landing/LandingNav";
import { LandingRedirect } from "@/components/landing/LandingRedirect";
import { Scope } from "@/components/landing/Scope";
import { TrustSafety } from "@/components/landing/TrustSafety";

export default function Home() {
  return (
    <div className="min-h-dvh bg-[var(--cz-bg)] text-[var(--cz-text-primary)]">
      <LandingRedirect />
      <LandingNav />
      <main className="mx-auto max-w-[960px] px-4 sm:px-6">
        <Hero />
        <HowItWorks />
        <Features />
        <TrustSafety />
        <Scope />
        <FinalCTA />
      </main>
      <LandingFooter />
    </div>
  );
}
