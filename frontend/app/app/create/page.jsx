import { PenLine, FileText } from "lucide-react";
import { EmptyState } from "@/components/app/EmptyState";

export default function CreatePage() {
  return (
    <div className="mx-auto w-full max-w-[640px] space-y-4">
      <h1 className="text-[18px] font-semibold tracking-[-0.02em]">Create</h1>

      <div className="rounded-[16px] border border-[var(--cz-border)] bg-[var(--cz-surface)] p-4">
        <div className="flex items-center gap-2 text-[13px] font-medium">
          <PenLine className="h-4 w-4 text-[var(--cz-muted)]" /> New post
        </div>
        <textarea
          disabled
          placeholder="What’s on your mind? (500 chars, text only for MVP — posting unlocks after backend POST /api/posts)"
          rows={4}
          className="mt-3 w-full rounded-[12px] border border-[var(--cz-border)] bg-[rgba(255,255,255,0.03)] px-3 py-3 text-[14px] leading-[20px] placeholder:text-[var(--cz-text-secondary)]/50 text-[var(--cz-text-primary)] outline-none resize-none"
        />
        <div className="mt-3 flex items-center justify-between">
          <span className="text-[11px] tracking-[0.06em] uppercase text-[var(--cz-text-secondary)]/60">MVP • Text only</span>
          <span className="inline-flex items-center justify-center rounded-[10px] bg-[var(--cz-text-primary)]/40 text-[var(--cz-text-inverse)]/60 px-4 h-[36px] text-[13px] font-medium cursor-not-allowed">Post</span>
        </div>
      </div>

      <EmptyState
        icon={FileText}
        title="Posting coming soon"
        description="Create posts with text, edit/delete your own, like/reply/repost — after feed and post APIs are wired."
      />
    </div>
  );
}
