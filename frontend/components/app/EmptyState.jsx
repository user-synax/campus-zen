import { Loader2 } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";

/** Loading placeholder shaped like a post row — same rhythm, no card. */
export function PostSkeleton({ rows = 4 }) {
  return (
    <div>
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="cz-row animate-pulse px-4 py-3">
          <div className="flex gap-3">
            <div className="h-10 w-10 shrink-0 rounded-full bg-[var(--cz-skeleton)]" />
            <div className="flex-1 space-y-2">
              <div className="h-3 w-40 rounded bg-[var(--cz-skeleton)]" />
              <div className="h-4 w-full rounded bg-[var(--cz-skeleton)]" />
              <div className="h-4 w-3/4 rounded bg-[var(--cz-skeleton)]" />
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

/** End-of-feed / pagination footer shared by every timeline. */
export function FeedFooter({ loading, hasMore, emptyLabel = "You're all caught up", error = null, onRetry = null }) {
  if (loading) {
    return (
      <div className="flex items-center justify-center gap-2 py-6 text-[15px] text-[var(--cz-text-secondary)]">
        <Loader2 className="h-4 w-4 animate-spin" aria-hidden /> Loading more posts
      </div>
    );
  }
  if (error) {
    return (
      <div className="flex flex-col items-center gap-2 py-6">
        <p className="text-[15px] text-[var(--cz-text-secondary)]">{error}</p>
        {onRetry ? (
          <button
            type="button"
            onClick={onRetry}
            className="inline-flex h-[36px] items-center rounded-full border border-[var(--cz-border-strong)] px-4 text-[14px] font-bold text-[var(--cz-accent)] transition-colors hover:bg-[var(--cz-accent-soft)]"
          >
            Try again
          </button>
        ) : null}
      </div>
    );
  }
  if (hasMore) return null;
  return (
    <p className="py-8 text-center text-[13px] text-[var(--cz-text-secondary)]">
      {emptyLabel}
    </p>
  );
}

export function EmptyState({
  icon: Icon,
  title,
  description,
  actionLabel,
  actionHref,
  onAction,
}) {
  return (
    <div className="flex flex-col items-center justify-center px-6 py-14 text-center">
      {Icon ? (
        <span className="mb-4 grid h-12 w-12 place-items-center rounded-full text-[var(--cz-text-secondary)]">
          <Icon className="h-7 w-7" strokeWidth={1.6} aria-hidden />
        </span>
      ) : null}
      <h3 className="text-[20px] font-extrabold leading-6 text-[var(--cz-text-primary)]">
        {title}
      </h3>
      {description ? (
        <p className="mt-2 max-w-[40ch] text-[15px] leading-[20px] text-[var(--cz-text-secondary)]">
          {description}
        </p>
      ) : null}
      {actionLabel && (actionHref || onAction) ? (
        actionHref ? (
          <Link href={actionHref} className="mt-6 inline-flex">
            <Button size="default">{actionLabel}</Button>
          </Link>
        ) : (
          <Button onClick={onAction} size="default" className="mt-6">
            {actionLabel}
          </Button>
        )
      ) : null}
    </div>
  );
}
