import Link from "next/link";
import { HeroVisual } from "./HeroVisual";
import { Reveal } from "./Reveal";

export function Hero() {
  return (
    <section className="py-12 sm:py-16">
      <div className="grid items-center gap-10 lg:grid-cols-12 lg:gap-8">
        <div className="lg:col-span-7">
          <Reveal>
            <h1 className="text-[42px] leading-[1.03] font-extrabold tracking-[-0.035em] text-[var(--cz-text-primary)] sm:text-[56px]">
              CampusZen is the campus
              <br />
              conversation, in one feed.
            </h1>
          </Reveal>

          <Reveal delay={0.06}>
            <p className="mt-5 max-w-[46ch] text-[15px] leading-[21px] text-[var(--cz-text-secondary)]">
              Discover students by college and course, follow the people you
              actually know, and post short updates. One accent colour, one
              timeline, no noise.
            </p>
          </Reveal>

          <Reveal delay={0.12}>
            <div className="mt-7 flex flex-wrap items-center gap-3">
              <Link
                href="/signup"
                className="inline-flex h-[44px] items-center justify-center rounded-full bg-[var(--cz-accent)] px-6 text-[15px] font-bold text-[var(--cz-text-inverse)] transition-colors hover:bg-[var(--cz-accent-hover)]"
              >
                Create account
              </Link>
              <Link
                href="/login"
                className="inline-flex h-[44px] items-center justify-center rounded-full border border-[var(--cz-border-strong)] px-6 text-[15px] font-bold text-[var(--cz-text-primary)] transition-colors hover:bg-[var(--cz-surface-strong)]"
              >
                Log in
              </Link>
            </div>
            <p className="mt-4 text-[13px] leading-[18px] text-[var(--cz-text-secondary)]">
              Free to join · Verified emails · 500-character posts
            </p>
          </Reveal>
        </div>

        <div className="lg:col-span-5">
          <Reveal delay={0.14} y={20}>
            <HeroVisual />
          </Reveal>
        </div>
      </div>
    </section>
  );
}
