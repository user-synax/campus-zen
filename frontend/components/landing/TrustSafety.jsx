import { Reveal } from "./Reveal";

const points = [
  [
    "Built for student identity",
    "Every profile shows college, branch, and year — so you know who you're talking to.",
  ],
  [
    "Safe by default",
    "Verified emails, secure sessions, and rate-limited auth keep accounts protected.",
  ],
  [
    "You're in control",
    "Block, report, or delete anytime. No public follower counts to game.",
  ],
];

export function TrustSafety() {
  return (
    <section className="border-t border-[var(--cz-border)] py-14 sm:py-20">
      <Reveal>
        <p className="text-[11px] font-medium uppercase tracking-[0.16em] text-[var(--cz-text-secondary)]">
          Student-first &amp; safe
        </p>
        <h2 className="mt-4 max-w-[24ch] text-[24px] font-semibold leading-[1.15] tracking-[-0.03em] sm:text-[32px]">
          Made for campus. Safe by design.
        </h2>
        <p className="mt-4 max-w-[52ch] text-[14px] leading-[22px] text-[var(--cz-text-secondary)]">
          General networks weren&apos;t built around student life. CampusZen
          keeps identity clear and moderation simple from day one.
        </p>
      </Reveal>
      <div className="mt-10 grid gap-x-10 gap-y-8 sm:grid-cols-3">
        {points.map(([title, desc], i) => (
          <Reveal key={title} delay={i * 0.06}>
            <div className="border-t border-[var(--cz-border)] pt-5">
              <h3 className="text-[14px] font-medium tracking-[-0.01em]">
                {title}
              </h3>
              <p className="mt-1.5 text-[13px] leading-[20px] text-[var(--cz-text-secondary)]">
                {desc}
              </p>
            </div>
          </Reveal>
        ))}
      </div>
    </section>
  );
}
