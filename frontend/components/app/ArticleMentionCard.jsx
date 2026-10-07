"use client";

import Link from "next/link";
import { FileText } from "lucide-react";
import { useArticle } from "@/lib/hooks/queries";
import { articleUrl, excerptOf } from "@/lib/articles";

export function ArticleMentionCard({ username, slug, compact = false }) {
  const { data, isPending, isError } = useArticle(username, slug);
  const post = data?.data?.post;

  if (isPending) {
    return (
      <span className="mt-2 block animate-pulse rounded-[12px] border border-[var(--cz-border)] p-3 text-[13px] text-[var(--cz-text-secondary)]">
        Loading article…
      </span>
    );
  }
  if (isError || !post) {
    return (
      <span className="mt-2 block rounded-[12px] border border-dashed border-[var(--cz-border-strong)] p-3 text-[13px] text-[var(--cz-text-secondary)]">
        {"${"}
        {username}/{slug}
        {"}"} — article not found
      </span>
    );
  }

  return (
    <Link
      href={articleUrl(post.author?.username || username, post.slug || slug)}
      onClick={(e) => e.stopPropagation()}
      className="mt-2 flex items-start gap-3 rounded-[12px] border border-[var(--cz-border)] bg-[var(--cz-surface)] p-3 transition-colors hover:bg-[var(--cz-surface-strong)]"
    >
      <span className="grid h-9 w-9 shrink-0 place-items-center rounded-[10px] bg-[var(--cz-accent-soft)] text-[var(--cz-accent)]">
        <FileText className="h-4 w-4" aria-hidden />
      </span>
      <span className="min-w-0">
        <span className="block truncate text-[14px] font-bold text-[var(--cz-text-primary)]">
          {post.title || "Untitled article"}
        </span>
        <span className="block truncate text-[12px] text-[var(--cz-text-secondary)]">
          @{post.author?.username}/{post.slug} · {post.likeCount || 0} likes · {post.replyCount || 0} replies
        </span>
        {!compact ? (
          <span className="mt-0.5 line-clamp-2 block text-[13px] leading-[18px] text-[var(--cz-text-secondary)]">
            {excerptOf(post, 200)}
          </span>
        ) : null}
      </span>
    </Link>
  );
}
