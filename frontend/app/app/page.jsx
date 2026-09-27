"use client";

import { useEffect, useState, useRef, useCallback } from "react";
import { ArrowUp, FileText, Users, Loader2 } from "lucide-react";
import { EmptyState } from "@/components/app/EmptyState";
import { PostComposer } from "@/components/app/PostComposer";
import { PostCard } from "@/components/app/PostCard";
import { api } from "@/lib/api";

export default function AppHome() {
  const [tab, setTab] = useState("discovery"); // following | discovery
  const [user, setUser] = useState(null);
  const [posts, setPosts] = useState([]);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [pending, setPending] = useState([]);
  const sentinelRef = useRef(null);
  const observerRef = useRef(null);
  const checkingRef = useRef(false);
  // mirrors for the poller (avoids stale closures without re-creating the timer)
  const postsRef = useRef([]);
  postsRef.current = posts;
  const pendingRef = useRef([]);
  pendingRef.current = pending;

  // fetch user for composer
  useEffect(() => {
    api.me().then((r) => setUser(r.data?.user)).catch(() => {});
  }, []);

  const fetchPage = useCallback(
    async (p, reset = false) => {
      const isFollowing = tab === "following";
      if (reset) setLoading(true);
      else setLoadingMore(true);
      try {
        const fn = isFollowing ? api.getFeed : api.getPublicFeed;
        const res = await fn({ page: p, limit: 20 });
        const data = res.data;
        setPosts((prev) => (reset ? data.posts : [...prev, ...data.posts]));
        setHasMore(Boolean(data.hasMore));
        setPage(p);
      } catch {
        if (reset) setPosts([]);
        setHasMore(false);
      } finally {
        setLoading(false);
        setLoadingMore(false);
      }
    },
    [tab]
  );

  // reset when tab changes
  useEffect(() => {
    setPending([]);
    fetchPage(1, true);
  }, [fetchPage]);

  // infinite scroll
  useEffect(() => {
    if (!hasMore || loading || loadingMore) return;
    const el = sentinelRef.current;
    if (!el) return;
    observerRef.current?.disconnect();
    observerRef.current = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && hasMore && !loading && !loadingMore) fetchPage(page + 1);
      },
      { rootMargin: "600px" }
    );
    observerRef.current.observe(el);
    return () => observerRef.current?.disconnect();
  }, [hasMore, loading, loadingMore, page, fetchPage]);

  const handleCreated = (newPost) => {
    // optimistic top insertion with card-resize feel
    setPosts((prev) => [newPost, ...prev]);
  };

  // background freshness check — fetch latest page-1, stash unseen posts
  const checkForNew = useCallback(async () => {
    if (checkingRef.current || document.hidden) return;
    checkingRef.current = true;
    try {
      const fn = tab === "following" ? api.getFeed : api.getPublicFeed;
      const res = await fn({ page: 1, limit: 20 });
      const fresh = res.data?.posts || [];
      const known = new Set([
        ...postsRef.current.map((p) => p._id),
        ...pendingRef.current.map((p) => p._id),
      ]);
      const unseen = fresh.filter((p) => !known.has(p._id));
      if (unseen.length > 0) {
        setPending((prev) => {
          const prevIds = new Set(prev.map((p) => p._id));
          return [...unseen.filter((p) => !prevIds.has(p._id)), ...prev];
        });
      }
    } catch {
      // silent — next poll retries
    } finally {
      checkingRef.current = false;
    }
  }, [tab]);

  // poll every 30s (same cadence as unread-count) + on focus/visible
  useEffect(() => {
    if (loading) return;
    const id = setInterval(checkForNew, 30000);
    const onFocus = () => checkForNew();
    const onVisible = () => {
      if (!document.hidden) checkForNew();
    };
    window.addEventListener("focus", onFocus);
    document.addEventListener("visibilitychange", onVisible);
    return () => {
      clearInterval(id);
      window.removeEventListener("focus", onFocus);
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, [checkForNew, loading]);

  const showNewPosts = () => {
    setPosts((prev) => {
      const ids = new Set(prev.map((p) => p._id));
      const fresh = pending.filter((p) => !ids.has(p._id));
      return fresh.length > 0 ? [...fresh, ...prev] : prev;
    });
    setPending([]);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const handleDelete = (id) => setPosts((prev) => prev.filter((p) => p._id !== id));
  const handleUpdate = (updated) => setPosts((prev) => prev.map((p) => (p._id === updated._id ? updated : p)));

  return (
    <div className="mx-auto w-full max-w-[640px] space-y-4">
      {/* tabs */}
      <div className="flex items-center justify-between">
        <h1 className="text-[18px] font-semibold tracking-[-0.02em]">Home</h1>
        <div className="inline-flex items-center gap-1 rounded-full border border-[var(--cz-border)] bg-[var(--cz-surface)] p-1">
          {[
            { id: "discovery", label: "Discovery" },
            { id: "following", label: "Following" },
          ].map((t) => (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              aria-selected={tab === t.id}
              className={`px-3 h-[28px] hover:cursor-pointer rounded-full text-[12px] font-medium transition-colors ${
                tab === t.id ? "bg-[var(--cz-text-primary)] text-[var(--cz-text-inverse)] shadow-sm" : "text-[var(--cz-text-secondary)] hover:text-[var(--cz-text-primary)]"
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>
      </div>

      <PostComposer user={user} onCreated={handleCreated} />

      {pending.length > 0 && !loading ? (
        <div className="sticky top-[64px] lg:top-4 z-10 flex justify-center pointer-events-none">
          <button
            onClick={showNewPosts}
            aria-live="polite"
            className="pointer-events-auto inline-flex items-center gap-1.5 rounded-full bg-[var(--cz-text-primary)] text-[var(--cz-text-inverse)] pl-3 pr-4 h-[36px] text-[13px] font-medium shadow-[0_8px_24px_rgba(0,0,0,0.45)] hover:brightness-110 active:scale-[0.97] transition"
          >
            <ArrowUp className="h-4 w-4" />
            {pending.length > 20
              ? "20+ new posts"
              : pending.length === 1
                ? "1 new post"
                : `${pending.length} new posts`}
          </button>
        </div>
      ) : null}

      {loading ? (
        <div className="space-y-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="rounded-[16px] border border-[var(--cz-border)] bg-[var(--cz-surface)] p-4 animate-pulse">
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
        tab === "following" ? (
          <>
            <EmptyState icon={FileText} title="No posts yet" description="Your Following feed is empty. Follow students and their posts will show here newest first." actionLabel="Discover students" actionHref="/u" />
            <EmptyState icon={Users} title="No following yet" description="You’re not following anyone. Find classmates by college and course." actionLabel="Explore" actionHref="/u" />
          </>
        ) : (
          <EmptyState icon={FileText} title="No posts yet" description="Discovery is empty. Be the first to post!" actionLabel="Create post" actionHref="/app/create" />
        )
      ) : (
        <div className="space-y-3">
          {posts.map((p) => (
            <PostCard key={p._id} post={p} currentUser={user} onDelete={handleDelete} onUpdate={handleUpdate} />
          ))}
          <div ref={sentinelRef} className="h-1" aria-hidden />
          {loadingMore ? (
            <div className="flex items-center justify-center gap-2 py-4 text-[13px] text-[var(--cz-text-secondary)]">
              <Loader2 className="h-4 w-4 animate-spin" /> Loading more…
            </div>
          ) : !hasMore ? (
            <p className="text-center text-[11px] text-[var(--cz-text-secondary)]/60 py-4">End • {posts.length} posts</p>
          ) : null}
        </div>
      )}
    </div>
  );
}
