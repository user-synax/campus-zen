import { Reveal } from "./Reveal";

export function Scope() {
  return (
    <section className="border-t border-[var(--cz-border)] py-12 sm:py-16">
      <Reveal>
        <h2 className="max-w-[22ch] text-[28px] leading-[1.15] font-extrabold tracking-[-0.03em] text-[var(--cz-text-primary)] sm:text-[34px]">
          No DMs. No reels. No noise.
        </h2>
        <p className="mt-4 max-w-[56ch] text-[15px] leading-[22px] text-[var(--cz-text-secondary)]">
          CampusZen does one loop well — discover, follow, post, interact.
          Communities, chats, and clips come later, only when the core feels
          right.
        </p>
        <p className="mt-5 text-[15px] leading-[20px] text-[var(--cz-text-tertiary)]">
          No stories · No clips · No marketplace · No premium
        </p>
      </Reveal>
    </section>
  );
}
