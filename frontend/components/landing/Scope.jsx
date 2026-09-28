import { Reveal } from "./Reveal";

export function Scope() {
  return (
    <section className="border-t border-[var(--cz-border)] py-14 sm:py-20">
      <Reveal>
        <p className="text-[11px] font-medium uppercase tracking-[0.16em] text-[var(--cz-text-secondary)]">
          Focused by design
        </p>
        <h2 className="mt-4 max-w-[24ch] text-[24px] font-semibold leading-[1.15] tracking-[-0.03em] sm:text-[32px]">
          No DMs. No reels. No noise.
        </h2>
        <p className="mt-4 max-w-[52ch] text-[14px] leading-[22px] text-[var(--cz-text-secondary)]">
          CampusZen does one loop well — discover, follow, post, interact.
          Communities, chats, and clips come later, only when the core feels
          right.
        </p>
        <p className="mt-6 text-[12px] leading-[20px] tracking-wide text-[var(--cz-text-secondary)]/60">
          No stories &nbsp;·&nbsp; No clips &nbsp;·&nbsp; No marketplace
          &nbsp;·&nbsp; No premium
        </p>
      </Reveal>
    </section>
  );
}
