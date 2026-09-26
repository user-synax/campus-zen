"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Bookmark, Loader2 } from "lucide-react";
import { EmptyState } from "@/components/app/EmptyState";
import { PostCard } from "@/components/app/PostCard";
import { api } from "@/lib/api";

export default function BookmarksPage() {
  const [user, setUser] = useState(null);
  const [posts, setPosts] = useState([]);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const sentinelRef = useRef(null);
  const observerRef = useRef(null);

  useEffect(() => {
    api
      .me()
      .then((r) => setUser(r.data?.user))
      .catch(() => {});
  }, []);

  const fetchPage = useCallback(async (p, reset = false) => {
    if (reset) setLoading(true);
    else setLoadingMore(true);
    try {
      const res = await api.getBookmarks({ page: p, limit: 20 });
      const data = res.data;
      setPosts((prev) =>
        reset ? data.posts || [] : [...prev, ...(data.posts || [])],
      );
      setHasMore(Boolean(data.hasMore));
      setPage(p);
    } catch {
      if (reset) setPosts([]);
      setHasMore(false);
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  }, []);

  useEffect(() => {
    fetchPage(1, true);
  }, [fetchPage]);

  useEffect(() => {
    if (!hasMore || loading || loadingMore) return;
    const el = sentinelRef.current;
    if (!el) return;
    observerRef.current?.disconnect();
    observerRef.current = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && hasMore && !loading && !loadingMore)
          fetchPage(page + 1);
      },
      { rootMargin: "600px" },
    );
    observerRef.current.observe(el);
    return () => observerRef.current?.disconnect();
  }, [hasMore, loading, loadingMore, page, fetchPage]);

  const handleDelete = (id) =>
    setPosts((prev) => prev.filter((p) => p._id !== id));
  const handleUpdate = (updated) =>
    setPosts((prev) => prev.map((p) => (p._id === updated._id ? updated : p)));

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

      {loading ? (
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
          {loadingMore ? (
            <div className="flex items-center justify-center gap-2 py-4 text-[13px] text-[var(--cz-text-secondary)]">
              <Loader2 className="h-4 w-4 animate-spin" /> Loading more…
            </div>
          ) : !hasMore ? (
            <p className="text-center text-[11px] text-[var(--cz-text-secondary)]/60 py-4">
              End • {posts.length} saved
            </p>
          ) : null}
        </div>
      )}
    </div>
  );
}
