import { Search as SearchIcon, Users } from "lucide-react";
import { EmptyState } from "@/components/app/EmptyState";

export default function SearchPage() {
  return (
    <div className="mx-auto w-full max-w-[640px] space-y-4">
      <h1 className="text-[18px] font-semibold tracking-[-0.02em]">Search</h1>

      <div className="flex items-center gap-2 rounded-[12px] border border-[var(--cz-border)] bg-[var(--cz-surface)] px-3 h-[42px]">
        <SearchIcon className="h-4 w-4 text-[var(--cz-text-secondary)] shrink-0" />
        <input placeholder="Search students or posts… (coming soon)" disabled className="flex-1 bg-transparent outline-none text-[14px] placeholder:text-[var(--cz-text-secondary)]/50 text-[var(--cz-text-primary)]" />
        <span className="hidden sm:inline text-[11px] tracking-[0.04em] uppercase text-[var(--cz-text-secondary)]/60">MVP</span>
      </div>

      <EmptyState
        icon={Users}
        title="Search is empty"
        description="Search for users and posts will land here. For MVP: GET /api/search?q= . No mock data yet."
      />

      <div className="grid sm:grid-cols-2 gap-3">
        <div className="rounded-[12px] border border-[var(--cz-border)] bg-[rgba(255,255,255,0.02)] p-4">
          <h3 className="text-[13px] font-medium">Search users</h3>
          <p className="mt-1 text-[12px] leading-[16px] text-[var(--cz-text-secondary)]">Find by username, display name, college, or course. Indexed on username + email.</p>
        </div>
        <div className="rounded-[12px] border border-[var(--cz-border)] bg-[rgba(255,255,255,0.02)] p-4">
          <h3 className="text-[13px] font-medium">Search posts</h3>
          <p className="mt-1 text-[12px] leading-[16px] text-[var(--cz-text-secondary)]">Full-text on post text (500 chars). Results link to profiles/posts.</p>
        </div>
      </div>
    </div>
  );
}
