import { Reveal } from "./Reveal";

export function Scope() {
  return (
    <section className="border-t border-[var(--cz-border)] py-12 sm:py-16">
      <Reveal>
        <p className="text-[13px] font-bold uppercase tracking-widest text-[var(--cz-accent)]">
          Scope
        </p>
        <h2 className="mt-2 max-w-[22ch] text-[28px] leading-[1.12] font-extrabold tracking-[-0.03em] text-[var(--cz-text-primary)] sm:text-[34px]">
          Text-first. No noise.
        </h2>
        <p className="mt-4 max-w-[60ch] text-[15px] leading-[22px] text-[var(--cz-text-secondary)]">
          CampusZen does one loop well — discover, follow, post, interact — now
          with long-form articles, author analytics, and verification on top.
          Communities, DMs, and clips come later, only when the core feels
          right.
        </p>
        <div className="mt-5 flex flex-wrap gap-2">
          {[
            "In: posts + polls + media",
            "In: articles 50k",
            "In: analytics",
            "In: verification",
            "In: SSE + push",
          ].map((t) => (
            <span
              key={t}
              className="rounded-full bg-[var(--cz-accent-soft)] px-3 py-1 text-[13px] font-bold text-[var(--cz-accent)]"
            >
              {t}
            </span>
          ))}
        </div>
        <p className="mt-4 text-[14px] leading-[20px] text-[var(--cz-text-tertiary)]">
          Out: DMs · Stories / clips · Marketplace · Premium
        </p>
      </Reveal>
    </section>
  );
}
