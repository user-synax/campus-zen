import { Reveal } from "./Reveal";

const points = [
  [
    "Built for student identity",
    "Every profile shows college, course, and year with follower, following, and post counts — so you know who you're talking to.",
  ],
  [
    "Safe by default",
    "OTP-verified emails, bcrypt hashing, HTTP-only cookies, Zod validation, and per-route rate limits keep accounts protected.",
  ],
  [
    "You're in control",
    "Block (mutual hide + auto-unfollow), report, bookmark, or delete anytime. Reported posts hide instantly on your device.",
  ],
];

export function TrustSafety() {
  return (
    <section className="border-t border-[var(--cz-border)] py-12 sm:py-16">
      <Reveal>
        <h2 className="max-w-[22ch] text-[28px] leading-[1.15] font-extrabold tracking-[-0.03em] text-[var(--cz-text-primary)] sm:text-[34px]">
          Made for campus. Safe by design.
        </h2>
        <p className="mt-4 max-w-[56ch] text-[15px] leading-[22px] text-[var(--cz-text-secondary)]">
          General networks weren&apos;t built around student life. CampusZen
          keeps identity clear and moderation simple from day one.
        </p>
      </Reveal>
      <div className="mt-8 grid gap-x-10 gap-y-8 sm:grid-cols-3">
        {points.map(([title, desc], i) => (
          <Reveal key={title} delay={i * 0.06}>
            <div className="border-t border-[var(--cz-border)] pt-4">
              <h3 className="text-[17px] font-bold leading-[21px] text-[var(--cz-text-primary)]">
                {title}
              </h3>
              <p className="mt-1.5 text-[15px] leading-[20px] text-[var(--cz-text-secondary)]">
                {desc}
              </p>
            </div>
          </Reveal>
        ))}
      </div>
    </section>
  );
}
