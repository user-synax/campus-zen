"use client";

import { useQueryClient } from "@tanstack/react-query";
import { FileText, Loader2 } from "lucide-react";
import Link from "next/link";
import { useParams } from "next/navigation";
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
import { excerptOf } from "@/lib/articles";
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

export default function ArticleReaderPage() {
  const { username, slug } = useParams();
  const queryClient = useQueryClient();
  const { data: meData } = useMe();
  const me = meData?.data?.user || null;
  const isGuest = !me;

  const { data, isPending, error } = useArticle(username, slug);
  const post = data?.data?.post || null;

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

  return (
    <div>
      <PageHeader href="/app" title="Article" subtitle={`@${post.author?.username}/${post.slug}`} />

      <article className="px-4 py-4">
        <div className="flex items-center gap-3">
          <Link href={`/u/${post.author?.username}`} className="shrink-0">
            <span className={withAvatarRing(post.author, "grid h-10 w-10 place-items-center overflow-hidden rounded-full bg-[var(--cz-border-strong)] text-[13px] font-bold")}>
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
            <p className="text-[13px] text-[var(--cz-text-secondary)]">
              @{post.author?.username} · {timeAgo(post.createdAt)}{post.edited ? " · edited" : ""} · {"${"}
              {post.author?.username}/{post.slug}
              {"}"}
            </p>
          </div>
        </div>

        <h1 className="mt-3 text-[26px] font-extrabold leading-[32px] tracking-tight text-[var(--cz-text-primary)]">{post.title}</h1>
        {(post.description || excerptOf(post, 200)) ? (
          <p className="mt-1 text-[15px] leading-[22px] text-[var(--cz-text-secondary)]">{post.description || excerptOf(post, 200)}</p>
        ) : null}

        <div className="mt-4 border-t border-[var(--cz-border)] pt-4">
          <Markdown body={post.body} />
        </div>
      </article>

      <div className="border-t border-[var(--cz-border)]">
        <PostCard
          post={post}
          currentUser={me}
          isDetail
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
          {post.replyCount || replies.length} {(post.replyCount || replies.length) === 1 ? "reply" : "replies"}
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
  );
}
