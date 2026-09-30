import Link from "next/link";
import { Reveal } from "./Reveal";

export function FinalCTA() {
  return (
    <section className="border-t border-[var(--cz-border)] py-14 text-center sm:py-20">
      <Reveal>
        <h2 className="mx-auto max-w-[18ch] text-[28px] leading-[1.15] font-extrabold tracking-[-0.03em] text-[var(--cz-text-primary)] sm:text-[34px]">
          Ready to find your people?
        </h2>
        <p className="mx-auto mt-4 max-w-[44ch] text-[15px] leading-[21px] text-[var(--cz-text-secondary)]">
          Two-minute signup. Verify your email, complete your profile, and
          you&apos;re in.
        </p>
        <div className="mt-7 flex flex-wrap items-center justify-center gap-3">
          <Link
            href="/signup"
            className="inline-flex h-[44px] items-center justify-center rounded-full bg-[var(--cz-accent)] px-7 text-[15px] font-bold text-[var(--cz-text-inverse)] transition-colors hover:bg-[var(--cz-accent-hover)]"
          >
            Join CampusZen
          </Link>
          <Link
            href="/login"
            className="inline-flex h-[44px] items-center justify-center rounded-full border border-[var(--cz-border-strong)] px-7 text-[15px] font-bold text-[var(--cz-text-primary)] transition-colors hover:bg-[var(--cz-surface-strong)]"
          >
            Log in
          </Link>
        </div>
      </Reveal>
    </section>
  );
}
