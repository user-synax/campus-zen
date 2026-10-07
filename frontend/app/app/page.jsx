"use client";

import { useEffect, useState, useRef, useCallback, useMemo } from "react";
import { ArrowUp, FileText, Users } from "lucide-react";
import { useQueryClient } from "@tanstack/react-query";
import {
  EmptyState,
  FeedFooter,
  PostSkeleton,
} from "@/components/app/EmptyState";
import { PostComposer } from "@/components/app/PostComposer";
import { ArticleComposer } from "@/components/app/ArticleComposer";
import { PostCard } from "@/components/app/PostCard";
import { api } from "@/lib/api";
import { useArticlesInfinite, useMe, useFeed } from "@/lib/hooks/queries";

export default function AppHome() {
  const [tab, setTab] = useState("discovery");
  const isArticlesTab = tab === "articles";
  const [pending, setPending] = useState([]);
  const [pullDy, setPullDy] = useState(0);
  const [pulling, setPulling] = useState(false);
  const sentinelRef = useRef(null);
  const observerRef = useRef(null);
  const checkingRef = useRef(false);
  const postsRef = useRef([]);
  const pendingRef = useRef([]);
  const pullStartRef = useRef(null);
  const bannerRef = useRef(null);
  postsRef.current = [];
  pendingRef.current = pending;

  const { data: meData } = useMe();
  const user = meData?.data?.user || null;

  const feedQuery = useFeed(isArticlesTab ? "discovery" : tab);
  const articlesQuery = useArticlesInfinite();
  const {
    data,
    fetchNextPage,
    hasNextPage,
    isPending,
    isFetchingNextPage,
    isError,
    error,
    refetch,
  } = isArticlesTab ? articlesQuery : feedQuery;

  // Dedupe by _id — offset pages shift when new posts land mid-scroll, so
  // page N+1 can repeat page N's tail. First occurrence wins (newest).
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
  postsRef.current = posts;

  const queryClient = useQueryClient();

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

  const handleCreated = (newPost) => {
    // Optimistically prepend to feed cache
    const key = isArticlesTab ? ["articles-feed"] : ["feed", tab];
    queryClient.setQueryData(key, (old) => {
      if (!old) return old;
      const newPages = [...old.pages];
      if (newPages.length > 0) {
        const firstPage = newPages[0];
        newPages[0] = {
          ...firstPage,
          data: {
            ...firstPage.data,
            posts: [newPost, ...(firstPage.data?.posts || [])],
          },
        };
      }
      return { ...old, pages: newPages };
    });
  };

  // Background freshness check — limit 5 is enough to spot new posts,
  // full pages would just burn free-tier Mongo on every focus.
  // Skips when offline (navigator.onLine) — OfflineBanner owns that state.
  const checkForNew = useCallback(async () => {
    if (checkingRef.current || document.hidden) return;
    if (typeof navigator !== "undefined" && !navigator.onLine) return;
    if (tab === "articles") return;
    checkingRef.current = true;
    try {
      const fn = tab === "following" ? api.getFeed : api.getPublicFeed;
      const res = await fn({ page: 1, limit: 5 });
      const fresh = res.data?.posts || [];
      const known = new Set([
        ...postsRef.current.map((p) => p._id),
        ...pendingRef.current.map((p) => p._id),
      ]);
      const unseen = fresh.filter((p) => !known.has(p._id));
      if (unseen.length > 0) {
        setPending((prev) => {
          const prevIds = new Set(prev.map((p) => p._id));
          const merged = [...unseen.filter((p) => !prevIds.has(p._id)), ...prev];
          // Cap to 50 — label caps at 20+, array must not grow unbounded.
          return merged.slice(0, 50);
        });
      }
    } catch {
      // silent
    } finally {
      checkingRef.current = false;
    }
  }, [tab]);

  // Poll every 30s + on focus/visible
  useEffect(() => {
    if (isPending) return;
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
  }, [checkForNew, isPending]);

  const showNewPosts = () => {
    // Prepend pending posts to cache
    const key = isArticlesTab ? ["articles-feed"] : ["feed", tab];
    queryClient.setQueryData(key, (old) => {
      if (!old) return old;
      const newPages = [...old.pages];
      if (newPages.length > 0) {
        const firstPage = newPages[0];
        const existingIds = new Set(
          (firstPage.data?.posts || []).map((p) => p._id)
        );
        const fresh = pending.filter((p) => !existingIds.has(p._id));
        if (fresh.length > 0) {
          newPages[0] = {
            ...firstPage,
            data: {
              ...firstPage.data,
              posts: [...fresh, ...(firstPage.data?.posts || [])],
            },
          };
        }
      }
      return { ...old, pages: newPages };
    });
    setPending([]);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  // Custom pull-to-refresh (mobile): drag from top >80px triggers refetch.
  const onTouchStart = (e) => {
    if (window.scrollY !== 0 || pulling) return;
    pullStartRef.current = e.touches[0].clientY;
  };
  const onTouchMove = (e) => {
    if (pullStartRef.current == null || pulling) return;
    if (window.scrollY !== 0) {
      pullStartRef.current = null;
      setPullDy(0);
      return;
    }
    const dy = e.touches[0].clientY - pullStartRef.current;
    if (dy > 0) setPullDy(Math.min(dy, 120));
  };
  const onTouchEnd = async () => {
    if (pullStartRef.current == null) return;
    const dy = pullDy;
    pullStartRef.current = null;
    setPullDy(0);
    if (dy > 80 && !pulling) {
      setPulling(true);
      try {
        await refetch();
        await checkForNew();
      } catch {
      } finally {
        setPulling(false);
      }
    }
  };

  const handleDelete = (id) => {
    const key = isArticlesTab ? ["articles-feed"] : ["feed", tab];
    queryClient.setQueryData(key, (old) => {
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
    const key = isArticlesTab ? ["articles-feed"] : ["feed", tab];
    queryClient.setQueryData(key, (old) => {
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
    <div onTouchStart={onTouchStart} onTouchMove={onTouchMove} onTouchEnd={onTouchEnd}>
      {/* Pull indicator */}
      {(pullDy > 0 || pulling) && (
        <div
          role="status"
          aria-label={pulling ? "Refreshing feed" : "Pull to refresh"}
          className="flex justify-center overflow-hidden transition-[height]"
          style={{ height: pulling ? 48 : pullDy }}
        >
          <span className="inline-flex items-center gap-2 py-3 text-[13px] font-semibold text-[var(--cz-text-secondary)]">
            <span
              className={`h-4 w-4 rounded-full border-2 border-[var(--cz-accent)] border-t-transparent ${pulling ? "animate-spin" : ""}`}
              aria-hidden
            />
            {pulling ? "Refreshing…" : pullDy > 80 ? "Release to refresh" : "Pull to refresh"}
          </span>
        </div>
      )}
      {/* Feed tabs only — Search and Post live in the bottom tab bar. */}
      <div className="sticky top-[53px] z-10 border-b border-[var(--cz-border)] bg-[var(--cz-bg)]/90 backdrop-blur md:top-0">
        <div role="tablist" aria-label="Feed" className="flex min-w-0 flex-1">
          {[
            { id: "following", label: "Following" },
            { id: "discovery", label: "For you" },
            { id: "articles", label: "Articles" },
          ].map((t) => (
            <button
              key={t.id}
              role="tab"
              onClick={() => setTab(t.id)}
              aria-selected={tab === t.id}
              className={`relative h-[53px] flex-1 cursor-pointer px-4 text-center text-[17px] transition-colors ${
                tab === t.id
                  ? "font-bold text-[var(--cz-text-primary)]"
                  : "font-medium text-[var(--cz-text-secondary)] hover:bg-[var(--cz-surface-strong)] hover:text-[var(--cz-text-primary)]"
              }`}
            >
              {t.label}
              {tab === t.id ? (
                <span
                  aria-hidden
                  className="absolute inset-x-0 bottom-0 h-[4px] rounded-t-full bg-[var(--cz-accent)]"
                />
              ) : null}
            </button>
          ))}
        </div>
      </div>

      {isArticlesTab ? (
        <ArticleComposer user={user} onCreated={handleCreated} />
      ) : (
        <PostComposer user={user} onCreated={handleCreated} />
      )}

      {pending.length > 0 && !isPending ? (
        <div role="status" aria-live="polite" className="sticky top-[117px] z-10 flex justify-center pt-3 md:top-[105px]">
          <button
            ref={bannerRef}
            onClick={showNewPosts}
            className="inline-flex h-[32px] items-center gap-1.5 rounded-full bg-[var(--cz-accent)] px-4 text-[15px] font-bold text-[var(--cz-text-inverse)] transition-colors hover:bg-[var(--cz-accent-hover)]"
          >
            <ArrowUp className="h-4 w-4" aria-hidden />
            {pending.length > 20
              ? "20+ new posts"
              : pending.length === 1
                ? "1 new post"
                : `${pending.length} new posts`}
          </button>
        </div>
      ) : null}

      {isPending ? (
        <PostSkeleton rows={4} />
      ) : isError && posts.length === 0 ? (
        <EmptyState
          icon={FileText}
          title="Couldn't load posts"
          description={error?.data?.message || error?.message || "Check your connection and try again."}
          actionLabel="Try again"
          onAction={() => refetch()}
        />
      ) : posts.length === 0 ? (
        tab === "following" ? (
          <EmptyState
            icon={Users}
            title="You're not following anyone yet"
            description="Follow students and their posts will show up here, newest first. Find classmates by college and course."
            actionLabel="Discover students"
            actionHref="/u"
          />
        ) : (
          <EmptyState
            icon={FileText}
            title="Nothing here yet"
            description="This is where campus conversations show up. Post the first one."
            actionLabel="Write a post"
            actionHref="/app/create"
          />
        )
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
            emptyLabel="No more posts"
            error={isError ? "Couldn't load more posts." : null}
            onRetry={() => refetch()}
            onLoadMore={() => fetchNextPage()}
          />
        </div>
      )}
    </div>
  );
}
