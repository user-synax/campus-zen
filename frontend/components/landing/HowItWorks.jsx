import { Reveal } from "./Reveal";

const steps = [
  [
    "01",
    "Discover students",
    "Directory + search across students, posts, and colleges — plus suggestions, hashtag feeds, trending, and college member lists.",
  ],
  [
    "02",
    "Follow your people",
    "Classmates, seniors, hackathon teammates. Private accounts use follow requests; Following + Discovery tabs stay chronological.",
  ],
  [
    "03",
    "Post short or go long",
    "500-char updates with photos, GIFs, 60s video, or polls. Need depth? Publish a 50k Markdown article at @you/slug.",
  ],
  [
    "04",
    "Interact, measure, get verified",
    "Like, reply, repost, bookmark — live over SSE + push. Authors get 24h/7d insights; 50 posts or 100 followers unlocks verification.",
  ],
];

export function HowItWorks() {
  return (
    <section className="border-t border-[var(--cz-border)] py-12 sm:py-16">
      <Reveal>
        <p className="text-[13px] font-bold uppercase tracking-widest text-[var(--cz-accent)]">
          How it works
        </p>
        <h2 className="mt-2 max-w-[20ch] text-[28px] leading-[1.12] font-extrabold tracking-[-0.03em] text-[var(--cz-text-primary)] sm:text-[34px]">
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
              <p className="mt-1.5 max-w-[44ch] text-[15px] leading-[20px] text-[var(--cz-text-secondary)]">
                {desc}
              </p>
            </div>
          </Reveal>
        ))}
      </div>
    </section>
  );
}
