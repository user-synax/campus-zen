import Link from "next/link";
import { Reveal } from "./Reveal";

export function FinalCTA() {
  return (
    <section className="border-t border-[var(--cz-border)] py-16 text-center sm:py-24">
      <Reveal>
        <h2 className="mx-auto max-w-[18ch] text-[24px] font-semibold leading-[1.15] tracking-[-0.03em] sm:text-[32px]">
          Ready to find your people?
        </h2>
        <p className="mx-auto mt-3 max-w-[42ch] text-[14px] leading-[22px] text-[var(--cz-text-secondary)]">
          Two-minute signup. Verify your email, complete your profile, and
          you&apos;re in.
        </p>
        <div className="mt-7">
          <Link
            href="/signup"
            className="inline-flex h-[44px] items-center justify-center rounded-[12px] bg-[var(--cz-text-primary)] px-8 text-[14px] font-medium text-[var(--cz-text-inverse)] transition-colors hover:bg-[#ffd9c0]"
          >
            Join CampusZen
          </Link>
        </div>
        <p className="mt-4 text-[13px] text-[var(--cz-text-secondary)]">
          Already have an account?{" "}
          <Link
            href="/login"
            className="text-[var(--cz-text-primary)] underline decoration-[var(--cz-border-strong)] underline-offset-4 hover:decoration-[var(--cz-text-primary)]"
          >
            Log in
          </Link>
        </p>
      </Reveal>
    </section>
  );
}
