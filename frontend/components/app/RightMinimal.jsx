import Link from "next/link";
import { Users, Hash } from "lucide-react";

export function RightMinimal() {
  return (
    <div className="flex flex-col gap-4">
      <div className="rounded-[16px] border border-[var(--cz-border)] bg-[var(--cz-surface)] overflow-hidden">
        <div className="h-px w-full bg-gradient-to-r from-transparent via-[rgba(255,206,173,0.12)] to-transparent" />
        <div className="p-4">
          <h3 className="text-[11px] font-semibold tracking-[0.08em] uppercase text-[var(--cz-text-secondary)] flex items-center gap-1.5">
            <Users className="h-3.5 w-3.5" /> Suggested
          </h3>
          <p className="mt-2 text-[12px] leading-[16px] text-[var(--cz-text-secondary)]">Discover students — coming soon. For now, explore via Search.</p>
          <Link
            href="/app/search"
            className="mt-3 inline-flex items-center justify-center rounded-[10px] border border-[var(--cz-border)] bg-transparent px-3 h-[32px] text-[12px] font-medium text-[var(--cz-text-primary)] hover:bg-[rgba(255,206,173,0.06)] transition-colors w-full"
          >
            Go to Search
          </Link>
        </div>
      </div>

      <div className="rounded-[16px] border border-[var(--cz-border)] bg-[rgba(255,255,255,0.02)] p-4">
        <h3 className="text-[11px] font-semibold tracking-[0.08em] uppercase text-[var(--cz-text-secondary)] flex items-center gap-1.5">
          <Hash className="h-3.5 w-3.5" /> Trending
        </h3>
        <p className="mt-2 text-[12px] leading-[16px] text-[var(--cz-text-secondary)]/70">No trends yet — posts will show here once feed is live.</p>
      </div>

      <div className="rounded-[12px] border border-dashed border-[var(--cz-border)] px-3 py-3 text-[11px] leading-[15px] text-[var(--cz-text-secondary)]/60">
        Minimal right rail for MVP — keeps focus on feed. Will grow in V1 with bookmarks & hashtags.
      </div>
    </div>
  );
}
