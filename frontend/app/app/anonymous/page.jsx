"use client";

import { useEffect, useMemo, useRef } from "react";
import { FileText, Ghost } from "lucide-react";
import { useQueryClient } from "@tanstack/react-query";
import { EmptyState, FeedFooter, PostSkeleton } from "@/components/app/EmptyState";
import { AnonymousComposer } from "@/components/app/AnonymousComposer";
import { PostCard } from "@/components/app/PostCard";
import { PageHeader } from "@/components/app/PageHeader";
import { useAnonymousFeed, useMe } from "@/lib/hooks/queries";

export default function AnonymousHubPage() {
  const { data: meData } = useMe();
  const user = meData?.data?.user || null;
  const { data, fetchNextPage, hasNextPage, isPending, isFetchingNextPage, isError, error, refetch } =
    useAnonymousFeed();
  const sentinelRef = useRef(null);
  const queryClient = useQueryClient();

  const posts = useMemo(() => {
    const seen = new Set();
    const out = [];
    for (const p of data?.pages?.flatMap((pg) => pg.data?.posts || []) || []) {
      if (!p || seen.has(p._id)) continue;
      seen.add(p._id);
      out.push(p);
    }
    return out;
  }, [data]);

  useEffect(() => {
    if (!hasNextPage || isPending || isFetchingNextPage) return;
    const el = sentinelRef.current;
    if (!el) return;
    const ob = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting) fetchNextPage();
      },
      { rootMargin: "600px" },
    );
    ob.observe(el);
    return () => ob.disconnect();
  }, [hasNextPage, isPending, isFetchingNextPage, fetchNextPage]);

  const handleCreated = (newPost) => {
    queryClient.setQueryData(["anon-feed"], (old) => {
      if (!old) return old;
      const pages = [...old.pages];
      if (pages.length > 0) {
        pages[0] = { ...pages[0], data: { ...pages[0].data, posts: [newPost, ...(pages[0].data?.posts || [])] } };
      }
      return { ...old, pages };
    });
  };

  const handleDelete = (id) => {
    queryClient.setQueryData(["anon-feed"], (old) => {
      if (!old) return old;
      return { ...old, pages: old.pages.map((pg) => ({ ...pg, data: { ...pg.data, posts: (pg.data?.posts || []).filter((p) => p._id !== id) } })) };
    });
  };

  const handleUpdate = (updated) => {
    queryClient.setQueryData(["anon-feed"], (old) => {
      if (!old) return old;
      return {
        ...old,
        pages: old.pages.map((pg) => ({
          ...pg,
          data: { ...pg.data, posts: (pg.data?.posts || []).map((p) => (p._id === updated._id ? updated : p)) },
        })),
      };
    });
  };

  return (
    <div>
      <PageHeader
        href="/app"
        title="Anonymous Hub"
        subtitle="Login-only · text + images · like + reply only"
      />
      <div className="flex items-center gap-2 border-b border-[var(--cz-border)] bg-[var(--cz-surface)] px-4 py-2 text-[13px] text-[var(--cz-text-secondary)]">
        <Ghost className="h-4 w-4" aria-hidden />
        Everyone shows as a random alias. No profiles, no reposts, no bookmarks. Admins can still see authors for safety.
      </div>
      <AnonymousComposer user={user} onCreated={handleCreated} />
      {isPending ? (
        <PostSkeleton rows={4} />
      ) : isError && posts.length === 0 ? (
        <EmptyState
          icon={FileText}
          title="Couldn't load anonymous posts"
          description={error?.data?.message || error?.message || "Check your connection and try again."}
          actionLabel="Try again"
          onAction={() => refetch()}
        />
      ) : posts.length === 0 ? (
        <EmptyState
          icon={Ghost}
          title="Nothing anonymous yet"
          description="Be the first to post anonymously — ask, vent, or share campus tea."
        />
      ) : (
        <div>
          {posts.map((p) => (
            <PostCard key={p._id} post={p} currentUser={user} onDelete={handleDelete} onUpdate={handleUpdate} />
          ))}
          <div ref={sentinelRef} className="h-1" aria-hidden />
          <FeedFooter loading={isFetchingNextPage} hasMore={hasNextPage} emptyLabel="No more anonymous posts" onLoadMore={() => fetchNextPage()} />
        </div>
      )}
    </div>
  );
}
