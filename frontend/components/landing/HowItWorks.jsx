import { Reveal } from "./Reveal";

const steps = [
  [
    "01",
    "Discover students",
    "Find people by college, course, and year — plus suggestions, hashtag feeds, and college pages.",
  ],
  [
    "02",
    "Follow your people",
    "Build a feed out of classmates, seniors, and hackathon teammates. Following and Discovery tabs stay chronological.",
  ],
  [
    "03",
    "Post short updates",
    "Thoughts, questions, wins — up to 500 characters, with an image or a poll. Edit or delete anytime.",
  ],
  [
    "04",
    "Interact, get notified",
    "Like, reply, repost, and bookmark. Notifications arrive in-app and push live over SSE.",
  ],
];

export function HowItWorks() {
  return (
    <section className="border-t border-[var(--cz-border)] py-12 sm:py-16">
      <Reveal>
        <h2 className="max-w-[20ch] text-[28px] leading-[1.15] font-extrabold tracking-[-0.03em] text-[var(--cz-text-primary)] sm:text-[34px]">
          The whole loop, in four steps.
        </h2>
      </Reveal>
      <div className="mt-8 grid gap-x-10 gap-y-8 sm:grid-cols-2">
        {steps.map(([n, title, desc], i) => (
          <Reveal key={n} delay={i * 0.06}>
            <div className="border-t border-[var(--cz-border)] pt-4">
              <p className="text-[13px] font-bold tabular-nums text-[var(--cz-text-tertiary)]">
                {n}
              </p>
              <h3 className="mt-1.5 text-[17px] font-bold leading-[21px] text-[var(--cz-text-primary)]">
                {title}
              </h3>
              <p className="mt-1.5 max-w-[40ch] text-[15px] leading-[20px] text-[var(--cz-text-secondary)]">
                {desc}
              </p>
            </div>
          </Reveal>
        ))}
      </div>
    </section>
  );
}
