import Link from "next/link";
import { Reveal } from "./Reveal";

export function FinalCTA() {
  return (
    <section className="border-t border-[var(--cz-border)] py-14 text-center sm:py-20">
      <Reveal>
        <div className="mx-auto max-w-[640px] rounded-[20px] border border-[var(--cz-border)] bg-[var(--cz-surface)] p-8 sm:p-10">
          <h2 className="mx-auto max-w-[18ch] text-[28px] leading-[1.12] font-extrabold tracking-[-0.03em] text-[var(--cz-text-primary)] sm:text-[36px]">
            Ready to find your people?
          </h2>
          <p className="mx-auto mt-4 max-w-[48ch] text-[15px] leading-[21px] text-[var(--cz-text-secondary)]">
            Two-minute signup. Verify your email with an OTP, add your college
            and course, follow 3 students — your Following feed is live. Publish
            your first post or a full article today.
          </p>
          <div className="mt-7 flex flex-wrap items-center justify-center gap-3">
            <Link
              href="/signup"
              className="inline-flex h-[48px] items-center justify-center rounded-full bg-[var(--cz-accent)] px-8 text-[15px] font-bold text-[var(--cz-text-inverse)] transition-all hover:bg-[var(--cz-accent-hover)] active:scale-[0.98]"
            >
              Join CampusZen
            </Link>
            <Link
              href="/login"
              className="inline-flex h-[48px] items-center justify-center rounded-full border border-[var(--cz-border-strong)] px-8 text-[15px] font-bold text-[var(--cz-text-primary)] transition-colors hover:bg-[var(--cz-surface-strong)] active:scale-[0.98]"
            >
              Log in
            </Link>
          </div>
          <p className="mt-4 text-[13px] text-[var(--cz-text-tertiary)]">
            gmail.com + proton.me · Free · Dark mode included
          </p>
        </div>
      </Reveal>
    </section>
  );
}
