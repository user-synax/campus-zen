import { Reveal } from "./Reveal";

const points = [
  [
    "Built for student identity",
    "College, course, and year on every profile — plus follower, following, and post counts, pinned post, and merit verification (50 posts or 100 followers).",
  ],
  [
    "Safe by default",
    "OTP-verified email, bcrypt hashing, HTTP-only rotating sessions, Zod validation, per-route rate limits, and env-gated admin review queue.",
  ],
  [
    "You're in control",
    "Private accounts + follow requests, reply/mention policies, mutual-hide block with auto-unfollow, report with instant local hide + appeals, export/deactivate/delete.",
  ],
];

export function TrustSafety() {
  return (
    <section className="border-t border-[var(--cz-border)] py-12 sm:py-16">
      <Reveal>
        <p className="text-[13px] font-bold uppercase tracking-widest text-[var(--cz-accent)]">
          Trust &amp; safety
        </p>
        <h2 className="mt-2 max-w-[22ch] text-[28px] leading-[1.12] font-extrabold tracking-[-0.03em] text-[var(--cz-text-primary)] sm:text-[34px]">
          Made for campus. Safe by design.
        </h2>
        <p className="mt-4 max-w-[60ch] text-[15px] leading-[22px] text-[var(--cz-text-secondary)]">
          General networks weren&apos;t built around student life. CampusZen
          keeps identity clear and moderation simple from day one — block and
          report are enforced in feed, search, profiles, and notifications.
        </p>
      </Reveal>
      <div className="mt-8 grid gap-x-10 gap-y-8 sm:grid-cols-3">
        {points.map(([title, desc], i) => (
          <Reveal key={title} delay={i * 0.06}>
            <div className="rounded-[16px] border border-[var(--cz-border)] bg-[var(--cz-surface)] p-5">
              <h3 className="text-[16px] font-bold leading-[21px] text-[var(--cz-text-primary)]">
                {title}
              </h3>
              <p className="mt-1.5 text-[14px] leading-[20px] text-[var(--cz-text-secondary)]">
                {desc}
              </p>
            </div>
          </Reveal>
        ))}
      </div>
    </section>
  );
}
