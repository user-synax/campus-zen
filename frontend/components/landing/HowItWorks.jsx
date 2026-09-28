import { Reveal } from "./Reveal";

const steps = [
  [
    "01",
    "Discover students",
    "Find people by college, course, and year — not by algorithm roulette.",
  ],
  [
    "02",
    "Follow your people",
    "Build a feed out of classmates, seniors, and hackathon teammates.",
  ],
  [
    "03",
    "Post short updates",
    "Thoughts, questions, wins — up to 500 characters. Edit or delete anytime.",
  ],
  [
    "04",
    "Interact, get notified",
    "Like, reply, and repost. Know when someone engages with your post.",
  ],
];

export function HowItWorks() {
  return (
    <section className="border-t border-[var(--cz-border)] py-14 sm:py-20">
      <Reveal>
        <p className="text-[11px] font-medium uppercase tracking-[0.16em] text-[var(--cz-text-secondary)]">
          How it works
        </p>
        <h2 className="mt-4 max-w-[22ch] text-[24px] font-semibold leading-[1.15] tracking-[-0.03em] sm:text-[32px]">
          The whole loop, in four steps.
        </h2>
      </Reveal>
      <div className="mt-10 grid gap-x-10 gap-y-8 sm:grid-cols-2">
        {steps.map(([n, title, desc], i) => (
          <Reveal key={n} delay={i * 0.06}>
            <div className="border-t border-[var(--cz-border)] pt-5">
              <p className="text-[12px] font-medium tabular-nums text-[var(--cz-text-secondary)]/70">
                {n}
              </p>
              <h3 className="mt-2 text-[15px] font-medium tracking-[-0.01em]">
                {title}
              </h3>
              <p className="mt-1.5 max-w-[38ch] text-[13px] leading-[20px] text-[var(--cz-text-secondary)]">
                {desc}
              </p>
            </div>
          </Reveal>
        ))}
      </div>
    </section>
  );
}
