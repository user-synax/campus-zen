"use client";

import { use, useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { Hash } from "lucide-react";
import {
  EmptyState,
  FeedFooter,
  PostSkeleton,
} from "@/components/app/EmptyState";
import { PageHeader } from "@/components/app/PageHeader";
import { PostCard } from "@/components/app/PostCard";
import { api } from "@/lib/api";

export default function TagPage({ params }) {
  const { tag: rawParam } = use(params);
  const tag = decodeURIComponent(rawParam || "")
    .replace(/^#+/, "")
    .toLowerCase();

  const [user, setUser] = useState(null);
  const [posts, setPosts] = useState([]);
  const [total, setTotal] = useState(0);
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

  const fetchPage = useCallback(
    async (p, reset = false) => {
      if (!tag) return;
      if (reset) setLoading(true);
      else setLoadingMore(true);
      try {
        const res = await api.getPostsByHashtag(tag, { page: p, limit: 20 });
        const data = res.data;
        setPosts((prev) =>
          reset ? data.posts || [] : [...prev, ...(data.posts || [])],
        );
        setTotal(data.total || 0);
        setHasMore(Boolean(data.hasMore));
        setPage(p);
      } catch {
        if (reset) {
          setPosts([]);
          setTotal(0);
        }
        setHasMore(false);
      } finally {
        setLoading(false);
        setLoadingMore(false);
      }
    },
    [tag],
  );

  useEffect(() => {
    setPosts([]);
    setPage(1);
    setHasMore(true);
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

  const handleDelete = (id) => {
    setPosts((prev) => prev.filter((p) => p._id !== id));
    setTotal((t) => Math.max(0, t - 1));
  };
  const handleUpdate = (updated) =>
    setPosts((prev) => prev.map((p) => (p._id === updated._id ? updated : p)));

  return (
    <div>
      <PageHeader
        href="/app"
        title={tag}
        subtitle={loading ? "Loading…" : `${total} post${total === 1 ? "" : "s"}`}
        right={
          <Link
            href={`/app/search?q=${encodeURIComponent(`#${tag}`)}`}
            className="text-[15px] font-bold text-[var(--cz-accent)] hover:underline"
          >
            Search
          </Link>
        }
      />

      {loading ? (
        <PostSkeleton rows={4} />
      ) : posts.length === 0 ? (
        <EmptyState
          icon={Hash}
          title={`No posts with #${tag} yet`}
          description="Be the first to post with this hashtag. It will show up here instantly."
          actionLabel="Write a post"
          actionHref="/app/create"
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
          <FeedFooter loading={loadingMore} hasMore={hasMore} />
        </div>
      )}
    </div>
  );
}
