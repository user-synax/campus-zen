import Link from "next/link";
import { HeroVisual } from "./HeroVisual";
import { Reveal } from "./Reveal";

export function Hero() {
  return (
    <section className="py-14 sm:py-20">
      <div className="grid items-center gap-12 lg:grid-cols-12 lg:gap-10">
        {/* left — editorial, left-aligned */}
        <div className="lg:col-span-7">
          <Reveal>
            <div className="flex items-center justify-between gap-4 text-[11px] font-medium uppercase tracking-[0.16em]">
              <span className="inline-flex items-center gap-2 text-[var(--cz-text-secondary)]">
                <span
                  aria-hidden
                  className="h-1.5 w-1.5 rounded-full bg-emerald-400"
                />
                A social network for students
              </span>
              <span className="hidden text-[var(--cz-text-secondary)]/50 sm:inline">
                IN / 2026
              </span>
            </div>
          </Reveal>

          <Reveal delay={0.06}>
            <h1 className="mt-6 text-[42px] font-semibold leading-[0.98] tracking-[-0.045em] sm:text-[64px]">
              <span className="block text-white">Where campus</span>
              <span className="block text-[var(--cz-text-primary)]">
                actually connects.
              </span>
            </h1>
          </Reveal>

          <Reveal delay={0.12}>
            <p className="mt-5 max-w-[44ch] text-[15px] leading-[25px] text-[var(--cz-text-secondary)]">
              Discover students, share short posts, and keep up with campus life
              —{" "}
              <span className="text-white/85">
                without the noise of everywhere else.
              </span>
            </p>
          </Reveal>

          <Reveal delay={0.18}>
            <div className="mt-8 flex flex-wrap items-center gap-3">
              <Link
                href="/signup"
                className="inline-flex h-[44px] items-center justify-center rounded-[12px] bg-[var(--cz-text-primary)] px-7 text-[14px] font-medium text-[var(--cz-text-inverse)] transition-colors hover:bg-[#ffd9c0]"
              >
                Create account
              </Link>
              <Link
                href="/login"
                className="inline-flex h-[44px] items-center justify-center rounded-[12px] border border-[var(--cz-border)] px-7 text-[14px] font-medium text-white transition-colors hover:bg-[var(--cz-surface)]"
              >
                Log in
              </Link>
            </div>
            <p className="mt-5 text-[12px] leading-[18px] text-[var(--cz-text-secondary)]/70">
              <span className="text-white/60">Free to join</span>
              <span aria-hidden> &nbsp;·&nbsp; </span>
              Verified emails
              <span aria-hidden> &nbsp;·&nbsp; </span>
              500-character posts
            </p>
          </Reveal>
        </div>

        {/* right — interactive network */}
        <div className="lg:col-span-5">
          <Reveal delay={0.14} y={20}>
            <HeroVisual />
          </Reveal>
        </div>
      </div>
    </section>
  );
}
