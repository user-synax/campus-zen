"use client";

import { useRef, useEffect } from "react";
import { Bookmark, Loader2 } from "lucide-react";
import { useQueryClient } from "@tanstack/react-query";
import { EmptyState } from "@/components/app/EmptyState";
import { PostCard } from "@/components/app/PostCard";
import { useMe, useBookmarks } from "@/lib/hooks/queries";

export default function BookmarksPage() {
  const sentinelRef = useRef(null);
  const observerRef = useRef(null);
  const queryClient = useQueryClient();

  const { data: meData } = useMe();
  const user = meData?.data?.user || null;

  const {
    data,
    fetchNextPage,
    hasNextPage,
    isPending,
    isFetchingNextPage,
  } = useBookmarks();

  const posts = data?.pages?.flatMap((p) => p.data?.posts || []) || [];

  // Infinite scroll
  useEffect(() => {
    if (!hasNextPage || isPending || isFetchingNextPage) return;
    const el = sentinelRef.current;
    if (!el) return;
    observerRef.current?.disconnect();
    observerRef.current = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && hasNextPage && !isPending && !isFetchingNextPage) {
          fetchNextPage();
        }
      },
      { rootMargin: "600px" }
    );
    observerRef.current.observe(el);
    return () => observerRef.current?.disconnect();
  }, [hasNextPage, isPending, isFetchingNextPage, fetchNextPage]);

  const handleDelete = (id) => {
    queryClient.setQueryData(["bookmarks"], (old) => {
      if (!old) return old;
      return {
        ...old,
        pages: old.pages.map((page) => ({
          ...page,
          data: {
            ...page.data,
            posts: (page.data?.posts || []).filter((p) => p._id !== id),
          },
        })),
      };
    });
  };

  const handleUpdate = (updated) => {
    queryClient.setQueryData(["bookmarks"], (old) => {
      if (!old) return old;
      return {
        ...old,
        pages: old.pages.map((page) => ({
          ...page,
          data: {
            ...page.data,
            posts: (page.data?.posts || []).map((p) =>
              p._id === updated._id ? updated : p
            ),
          },
        })),
      };
    });
  };

  return (
    <div className="mx-auto w-full max-w-[640px] space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-[18px] font-semibold tracking-[-0.02em]">
          Bookmarks
        </h1>
        <span className="inline-flex items-center gap-1.5 text-[12px] text-[var(--cz-text-secondary)]">
          <Bookmark className="h-3.5 w-3.5" /> Private to you
        </span>
      </div>

      {isPending ? (
        <div className="space-y-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <div
              key={i}
              className="rounded-[16px] border border-[var(--cz-border)] bg-[var(--cz-surface)] p-4 animate-pulse"
            >
              <div className="flex gap-3">
                <div className="h-9 w-9 rounded-full bg-[var(--cz-border)]" />
                <div className="flex-1 space-y-2">
                  <div className="h-3 w-32 rounded bg-[var(--cz-border)]" />
                  <div className="h-4 w-full rounded bg-[var(--cz-border)]/60" />
                  <div className="h-4 w-3/4 rounded bg-[var(--cz-border)]/40" />
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : posts.length === 0 ? (
        <EmptyState
          icon={Bookmark}
          title="No bookmarks yet"
          description="Tap the bookmark icon on any post to save it here. Only you can see your bookmarks."
          actionLabel="Discover posts"
          actionHref="/app"
        />
      ) : (
        <div className="space-y-3">
          {posts.map((p) => (
            <PostCard
              key={p._id}
              post={p}
              currentUser={user}
              onDelete={handleDelete}
              onUpdate={handleUpdate}
            />
          ))}
          <div ref={sentinelRef} className="h-1" aria-hidden />
          {isFetchingNextPage ? (
            <div className="flex items-center justify-center gap-2 py-4 text-[13px] text-[var(--cz-text-secondary)]">
              <Loader2 className="h-4 w-4 animate-spin" /> Loading more...
            </div>
          ) : !hasNextPage ? (
            <p className="text-center text-[11px] text-[var(--cz-text-secondary)]/60 py-4">
              End • {posts.length} saved
            </p>
          ) : null}
        </div>
      )}
    </div>
  );
}
