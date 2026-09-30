"use client";

import { useRef, useEffect } from "react";
import { Bookmark } from "lucide-react";
import { useQueryClient } from "@tanstack/react-query";
import {
  EmptyState,
  FeedFooter,
  PostSkeleton,
} from "@/components/app/EmptyState";
import { PageHeader } from "@/components/app/PageHeader";
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
    <div>
      <PageHeader title="Bookmarks" subtitle="Only you can see your bookmarks" />

      {isPending ? (
        <PostSkeleton rows={4} />
      ) : posts.length === 0 ? (
        <EmptyState
          icon={Bookmark}
          title="No bookmarks yet"
          description="Tap the bookmark icon on any post to save it here. Only you can see your bookmarks."
          actionLabel="Back to feed"
          actionHref="/app"
        />
      ) : (
        <div>
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
          <FeedFooter
            loading={isFetchingNextPage}
            hasMore={hasNextPage}
            emptyLabel={`${posts.length} saved ${posts.length === 1 ? "post" : "posts"}`}
          />
        </div>
      )}
    </div>
  );
}
