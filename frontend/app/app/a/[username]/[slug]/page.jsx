"use client";

import { useQueryClient } from "@tanstack/react-query";
import { FileText, Loader2 } from "lucide-react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { CzImage } from "@/components/app/CzImage";
import { EmptyState } from "@/components/app/EmptyState";
import { Markdown } from "@/components/app/Markdown";
import { PageHeader } from "@/components/app/PageHeader";
import { PostCard } from "@/components/app/PostCard";
import { ReplyComposer } from "@/components/app/ReplyComposer";
import { RichText } from "@/components/app/RichText";
import { Button } from "@/components/ui/button";
import { UserBadge } from "@/components/ui/verified-badge";
import { withAvatarRing } from "@/lib/avatar";
import { useArticle, useMe, useReplies } from "@/lib/hooks/queries";

function timeAgo(date) {
  const diff = Date.now() - new Date(date).getTime();
  const s = Math.floor(diff / 1000);
  if (s < 60) return "now";
  const m = Math.floor(s / 60);
  if (m < 60) return `${m}m`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h`;
  const days = Math.floor(h / 24);
  if (days < 7) return `${days}d`;
  return new Date(date).toLocaleDateString("en-IN", { month: "short", day: "numeric", year: "numeric" });
}

/** ~220 wpm — the honest floor for a read-time estimate. */
function readingMinutes(body) {
  const words = String(body || "")
    .trim()
    .split(/\s+/)
    .filter(Boolean).length;
  return Math.max(1, Math.round(words / 220));
}

/**
 * Progress through the article body: 0 at the moment its first line slides
 * under the header, 1 when the last line reaches the reading anchor.
 * Scroll is rAF-throttled and the listener detaches on unmount.
 * `key` re-attaches the listener once the article body mounts (the first
 * effect pass runs while the query is still pending).
 */
function useReadingProgress(ref, key) {
  const [progress, setProgress] = useState(0);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    let raf = 0;
    const compute = () => {
      raf = 0;
      const start = el.getBoundingClientRect().top + window.scrollY;
      const p = (window.scrollY + 140 - start) / Math.max(1, el.offsetHeight);
      setProgress(Math.min(1, Math.max(0, p)));
    };
    const schedule = () => {
      if (!raf) raf = requestAnimationFrame(compute);
    };
    compute();
    window.addEventListener("scroll", schedule, { passive: true });
    window.addEventListener("resize", schedule);
    return () => {
      if (raf) cancelAnimationFrame(raf);
      window.removeEventListener("scroll", schedule);
      window.removeEventListener("resize", schedule);
    };
  }, [ref, key]);
  return progress;
}

export default function ArticleReaderPage() {
  const { username, slug } = useParams();
  const queryClient = useQueryClient();
  const { data: meData } = useMe();
  const me = meData?.data?.user || null;
  const isGuest = !me;

  const { data, isPending, error } = useArticle(username, slug);
  const post = data?.data?.post || null;

  const bodyRef = useRef(null);
  const progress = useReadingProgress(bodyRef, post?._id);

  const {
    data: repliesData,
    isPending: repliesLoading,
    fetchNextPage: fetchNextRepliesPage,
    hasNextPage: hasMoreReplies,
    isFetchingNextPage: isFetchingNextReplies,
  } = useReplies(post?._id);

  const replies = repliesData?.pages?.flatMap((p) => p.data?.comments || []) || [];

  if (isPending) {
    return (
      <div className="grid place-items-center py-20">
        <Loader2 className="h-6 w-6 animate-spin text-[var(--cz-text-secondary)]" aria-label="Loading article" />
      </div>
    );
  }

  if (error || !post) {
    return (
      <div>
        <PageHeader href="/app" title="Article" />
        <EmptyState
          icon={FileText}
          title="Article not found"
          description={error?.data?.message || error?.message || "This article may have been deleted."}
          actionLabel="Back to feed"
          actionHref="/app"
        />
      </div>
    );
  }

  const minutes = readingMinutes(post.body);
  const replyCount = post.replyCount || replies.length;

  return (
    <div>
      <PageHeader href="/app" title="Article" subtitle={`@${post.author?.username}/${post.slug}`} />

      {/* Reading progress — a hairline that fills as the body scrolls past
          the anchor, pinned right under the sticky header. */}
      <div aria-hidden className="sticky top-[106px] z-[9] h-[2px] md:top-[53px]">
        <div
          className="h-full origin-left bg-[var(--cz-accent)]"
          style={{ transform: `scaleX(${progress})` }}
        />
      </div>

      <div className="mx-auto w-full max-w-[720px]">
        <article className="px-4 pt-5 md:px-6">
          <div className="flex items-center gap-3">
            <Link href={`/u/${post.author?.username}`} className="shrink-0">
              <span className={withAvatarRing(post.author, "grid h-11 w-11 place-items-center overflow-hidden rounded-full bg-[var(--cz-border-strong)] text-[14px] font-bold")}>
                {post.author?.avatarUrl ? (
                  <CzImage src={post.author.avatarUrl} alt={post.author.username} className="h-full w-full rounded-full" imgClassName="h-full w-full" />
                ) : (
                  (post.author?.username || "U").slice(0, 1).toUpperCase()
                )}
              </span>
            </Link>
            <div className="min-w-0">
              <div className="flex items-center gap-1">
                <span className="truncate text-[15px] font-bold text-[var(--cz-text-primary)]">{post.author?.fullName || post.author?.username}</span>
                <UserBadge user={post.author} size="sm" />
              </div>
              <p className="truncate text-[13px] text-[var(--cz-text-secondary)]">
                @{post.author?.username} · {timeAgo(post.createdAt)}
                {post.edited ? " · edited" : ""} · {minutes} min read
              </p>
            </div>
          </div>

          <h1 className="mt-4 break-words text-[28px] leading-[34px] font-extrabold tracking-tight text-[var(--cz-text-primary)] md:text-[34px] md:leading-[40px]">
            {post.title}
          </h1>
          {post.description ? (
            <p className="mt-3 text-[17px] leading-[26px] text-[var(--cz-text-secondary)]">{post.description}</p>
          ) : null}

          <div ref={bodyRef} className="mt-5 border-t border-[var(--cz-border)] pt-5">
            <Markdown body={post.body} className="cz-article" />
          </div>
        </article>

        <div className="mt-2 border-t border-[var(--cz-border)]">
          <PostCard
            post={post}
            currentUser={me}
            isDetail
            hideArticleCard
            onDelete={() => (window.location.href = "/app")}
            onUpdate={(u) => {
              queryClient.setQueryData(["article", username?.toLowerCase(), slug?.toLowerCase()], (old) => {
                if (!old) return old;
                return { ...old, data: { ...old.data, post: u } };
              });
            }}
          />
        </div>

        <ReplyComposer
          postId={post._id}
          currentUser={me}
          onCreated={(comment, replyCount) => {
            if (comment) {
              queryClient.setQueryData(["replies", post._id, 1], (old) => {
                if (!old) return old;
                const first = old.pages?.[0];
                if (!first) return old;
                return { ...old, pages: [{ ...first, data: { ...first.data, comments: [comment, ...(first.data?.comments || [])] } }, ...old.pages.slice(1)] };
              });
            }
            queryClient.setQueryData(["article", username?.toLowerCase(), slug?.toLowerCase()], (old) => {
              if (!old) return old;
              return { ...old, data: { ...old.data, post: { ...old.data.post, replyCount: replyCount ?? old.data.post.replyCount } } };
            });
          }}
        />

        <div className="flex items-center justify-between px-4 py-3">
          <h2 className="text-[20px] leading-6 font-extrabold text-[var(--cz-text-primary)]">
            {replyCount} {replyCount === 1 ? "reply" : "replies"}
          </h2>
          {isGuest ? (
            <Link href="/login" className="text-[15px] font-bold text-[var(--cz-accent)] hover:underline">
              Log in to reply
            </Link>
          ) : null}
        </div>

        {repliesLoading && replies.length === 0 ? (
          <div className="grid place-items-center py-12">
            <Loader2 className="h-5 w-5 animate-spin text-[var(--cz-text-secondary)]" aria-label="Loading replies" />
          </div>
        ) : replies.length === 0 ? (
          <EmptyState title="No replies yet" description="Be the first to reply — mention this article with ${author/slug} anywhere." />
        ) : (
          <div>
            {replies.map((c) => (
              <div key={c._id} className="cz-row flex gap-3 px-4 py-3">
                <Link href={`/u/${c.author?.username}`} className="shrink-0">
                  <span className={withAvatarRing(c.author, "grid h-10 w-10 place-items-center overflow-hidden rounded-full bg-[var(--cz-border-strong)] text-[13px] font-bold")}>
                    {c.author?.avatarUrl ? (
                      <CzImage src={c.author.avatarUrl} alt={c.author.username} className="h-full w-full rounded-full" imgClassName="h-full w-full" />
                    ) : (
                      (c.author?.username || "U").slice(0, 1).toUpperCase()
                    )}
                  </span>
                </Link>
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-x-1 leading-[20px]">
                    <span className="truncate text-[15px] font-bold">{c.author?.fullName || c.author?.username}</span>
                    <UserBadge user={c.author} size="sm" />
                    <span className="truncate text-[15px] text-[var(--cz-text-secondary)]">@{c.author?.username}</span>
                    <span className="shrink-0 text-[15px] text-[var(--cz-text-secondary)]">· {timeAgo(c.createdAt)}</span>
                  </div>
                  <p className="mt-0.5 whitespace-pre-wrap break-words text-[15px] leading-[20px]">
                    <RichText text={c.text} />
                  </p>
                </div>
              </div>
            ))}
            {hasMoreReplies ? (
              <div className="p-4">
                <Button onClick={() => fetchNextRepliesPage()} disabled={isFetchingNextReplies} variant="secondary" className="w-full">
                  {isFetchingNextReplies ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" aria-hidden /> Loading
                    </>
                  ) : (
                    "Show more replies"
                  )}
                </Button>
              </div>
            ) : null}
          </div>
        )}
      </div>
    </div>
  );
}
