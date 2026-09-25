import { FileText, Users, Search as SearchIcon } from "lucide-react";
import { EmptyState } from "@/components/app/EmptyState";

export default function AppHome() {
  return (
    <div className="mx-auto w-full max-w-[640px] space-y-4">
      {/* header */}
      <div className="flex items-center justify-between">
        <h1 className="text-[18px] font-semibold tracking-[-0.02em]">Home</h1>
        <span className="hidden sm:inline-flex items-center gap-1.5 rounded-full border border-[var(--cz-border)] bg-[var(--cz-surface)] px-2.5 py-1 text-[11px] font-medium tracking-[0.06em] uppercase text-[var(--cz-text-secondary)]">
          Following • Newest
        </span>
      </div>

      {/* compose placeholder */}
      <div className="rounded-[16px] border border-[var(--cz-border)] bg-[var(--cz-surface)] p-3 sm:p-4">
        <div className="flex items-center gap-3">
          <span className="h-9 w-9 rounded-full bg-[var(--cz-muted)]/20 border border-[var(--cz-muted)]/20 grid place-items-center text-[12px] font-semibold text-[var(--cz-muted)]">You</span>
          <span className="flex-1 rounded-full border border-[var(--cz-border)] bg-[rgba(255,255,255,0.03)] px-3 py-2 text-[13px] text-[var(--cz-text-secondary)]">Share something on campus…</span>
          <span className="hidden sm:inline-flex rounded-full bg-[var(--cz-text-primary)] text-[var(--cz-text-inverse)] px-4 h-[36px] items-center text-[13px] font-medium opacity-60">Post</span>
        </div>
        <p className="mt-3 text-[11px] leading-[15px] text-[var(--cz-text-secondary)]/60">Posting goes live after feed. For now the feed is empty — no mock data.</p>
      </div>

      {/* empty feed */}
      <EmptyState
        icon={FileText}
        title="No posts yet"
        description="Your Following feed is empty. Follow students you discover and their posts will show here, newest first."
        actionLabel="Discover students"
        actionHref="/app/search"
      />

      <EmptyState
        icon={Users}
        title="No following yet"
        description="You’re not following anyone. Find classmates by college and course to get started."
        actionLabel="Go to Search"
        actionHref="/app/search"
      />

      <div className="rounded-[12px] border border-dashed border-[var(--cz-border)] p-3 text-center text-[11px] leading-[15px] text-[var(--cz-text-secondary)]/60">
        Empty states only for MVP — keeps UI fast and honest. Will show real posts once `POST /api/posts` + `GET /api/posts/feed` land.
      </div>
    </div>
  );
}
