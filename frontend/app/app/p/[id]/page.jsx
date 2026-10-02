"use client";

import { useQueryClient } from "@tanstack/react-query";
import { Loader2 } from "lucide-react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { CzImage } from "@/components/app/CzImage";
import { EmptyState } from "@/components/app/EmptyState";
import { PageHeader } from "@/components/app/PageHeader";
import { PostCard } from "@/components/app/PostCard";
import { ReplyComposer } from "@/components/app/ReplyComposer";
import { RichText } from "@/components/app/RichText";
import { Button } from "@/components/ui/button";
import { withAvatarRing } from "@/lib/avatar";
import { isHiddenPost } from "@/lib/hiddenPosts";
import { useMe, usePost, useReplies } from "@/lib/hooks/queries";

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
  return new Date(date).toLocaleDateString("en-IN", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

export default function PostDetailPage() {
  const { id } = useParams();
  const queryClient = useQueryClient();

  const { data: meData } = useMe();
  const me = meData?.data?.user || null;
  const isGuest = !me;

  const { data: postData, isPending, error } = usePost(id);
  const post = postData?.data?.post || null;

  const {
    data: repliesData,
    isPending: repliesLoading,
    fetchNextPage: fetchNextRepliesPage,
    hasNextPage: hasMoreReplies,
    isFetchingNextPage: isFetchingNextReplies,
  } = useReplies(id);

  const replies =
    repliesData?.pages?.flatMap((p) => p.data?.comments || []) || [];

  if (isPending) {
    return (
      <div className="grid place-items-center py-20">
        <Loader2
          className="h-6 w-6 animate-spin text-[var(--cz-text-secondary)]"
          aria-label="Loading post"
        />
      </div>
    );
  }

  if (error || !post) {
    return (
      <div>
        <PageHeader href="/app" title="Post" />
        <EmptyState
          icon={Loader2}
          title="Post not found"
          description={
            error?.data?.message ||
            error?.message ||
            "This post may have been deleted by its author."
          }
          actionLabel="Back to feed"
          actionHref="/app"
        />
      </div>
    );
  }

  if (isHiddenPost(post._id)) {
    return (
      <div>
        <PageHeader href="/app" title="Post" />
        <EmptyState
          icon={Loader2}
          title="You hid this post"
          description="You reported it and chose not to see it anymore."
          actionLabel="Back to feed"
          actionHref="/app"
        />
      </div>
    );
  }

  return (
    <div>
      <PageHeader
        href="/app"
        title="Post"
        subtitle={`${timeAgo(post.createdAt)}${post.edited ? " · edited" : ""}`}
      />

      {/* The detail page is the only place replies live, so the composer
          belongs here too — PostCard no longer carries one. */}
      <PostCard
        post={post}
        currentUser={me}
        isDetail
        onDelete={() => (window.location.href = "/app")}
        onUpdate={(u) => {
          queryClient.setQueryData(["post", id], (old) => {
            if (!old) return old;
            return { ...old, data: { ...old.data, post: u } };
          });
        }}
      />

      <ReplyComposer
        postId={post._id}
        currentUser={me}
        onCreated={(comment, replyCount) => {
          if (comment) {
            // Splice into the first cached page so the new reply shows up
            // without a refetch, matching how useReplies pages the list.
            queryClient.setQueryData(["replies", id, 1], (old) => {
              if (!old) return old;
              const first = old.pages?.[0];
              if (!first) return old;
              return {
                ...old,
                pages: [
                  {
                    ...first,
                    data: {
                      ...first.data,
                      comments: [comment, ...(first.data?.comments || [])],
                    },
                  },
                  ...old.pages.slice(1),
                ],
              };
            });
          }
          queryClient.setQueryData(["post", id], (old) => {
            if (!old) return old;
            return {
              ...old,
              data: {
                ...old.data,
                post: {
                  ...old.data.post,
                  replyCount: replyCount ?? old.data.post.replyCount,
                },
              },
            };
          });
        }}
      />

      <div className="flex items-center justify-between px-4 py-3">
        <h2 className="text-[20px] leading-6 font-extrabold text-[var(--cz-text-primary)]">
          {post.replyCount || replies.length}{" "}
          {(post.replyCount || replies.length) === 1 ? "reply" : "replies"}
        </h2>
        {isGuest ? (
          <Link
            href="/login"
            className="text-[15px] font-bold text-[var(--cz-accent)] hover:underline"
          >
            Log in to reply
          </Link>
        ) : null}
      </div>

      {isGuest ? (
        <div className="flex flex-col items-start gap-3 border-b border-[var(--cz-border)] px-4 py-4 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-[15px] leading-[20px] text-[var(--cz-text-secondary)]">
            Join CampusZen to reply, follow and post.
          </p>
          <div className="flex shrink-0 items-center gap-2">
            <Link href="/login">
              <Button variant="secondary">Log in</Button>
            </Link>
            <Link href="/signup">
              <Button>Sign up</Button>
            </Link>
          </div>
        </div>
      ) : null}

      {repliesLoading && replies.length === 0 ? (
        <div className="grid place-items-center py-12">
          <Loader2
            className="h-5 w-5 animate-spin text-[var(--cz-text-secondary)]"
            aria-label="Loading replies"
          />
        </div>
      ) : replies.length === 0 ? (
        <EmptyState
          title="No replies yet"
          description="Be the first to reply — up to 500 characters, emoji allowed."
        />
      ) : (
        <div>
          {replies.map((c) => (
            <div key={c._id} className="cz-row flex gap-3 px-4 py-3">
              <Link href={`/u/${c.author?.username}`} className="shrink-0">
                <span className={withAvatarRing(c.author, "grid h-10 w-10 place-items-center overflow-hidden rounded-full bg-[var(--cz-border-strong)] text-[13px] font-bold text-[var(--cz-text-primary)]")}>
                  {c.author?.avatarUrl ? (
                    <CzImage
                      src={c.author.avatarUrl}
                      alt={c.author.username}
                      className="h-full w-full rounded-full"
                      imgClassName="h-full w-full"
                    />
                  ) : (
                    (c.author?.username || "U").slice(0, 1).toUpperCase()
                  )}
                </span>
              </Link>
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-x-1 leading-[20px]">
                  <span className="truncate text-[15px] font-bold text-[var(--cz-text-primary)]">
                    {c.author?.fullName || c.author?.username}
                  </span>
                  <span className="truncate text-[15px] text-[var(--cz-text-secondary)]">
                    @{c.author?.username}
                  </span>
                  <span className="shrink-0 text-[15px] text-[var(--cz-text-secondary)]">
                    · {timeAgo(c.createdAt)}
                  </span>
                </div>
                <p className="mt-0.5 whitespace-pre-wrap break-words text-[15px] leading-[20px] text-[var(--cz-text-primary)]">
                  <RichText text={c.text} />
                </p>
              </div>
            </div>
          ))}
          {hasMoreReplies ? (
            <div className="p-4">
              <Button
                onClick={() => fetchNextRepliesPage()}
                disabled={isFetchingNextReplies}
                variant="secondary"
                className="w-full"
              >
                {isFetchingNextReplies ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
                    Loading
                  </>
                ) : (
                  "Show more replies"
                )}
              </Button>
            </div>
          ) : (
            <p className="py-6 text-center text-[13px] text-[var(--cz-text-secondary)]">
              {replies.length} {replies.length === 1 ? "reply" : "replies"}
            </p>
          )}
        </div>
      )}
    </div>
  );
}
