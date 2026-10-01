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
import { PostCard } from "@/components/app/PostCard";
import { api } from "@/lib/api";
import { useMe, useFeed } from "@/lib/hooks/queries";

export default function AppHome() {
  const [tab, setTab] = useState("discovery");
  const [pending, setPending] = useState([]);
  const sentinelRef = useRef(null);
  const observerRef = useRef(null);
  const checkingRef = useRef(false);
  const postsRef = useRef([]);
  const pendingRef = useRef([]);
  postsRef.current = [];
  pendingRef.current = pending;

  const { data: meData } = useMe();
  const user = meData?.data?.user || null;

  const {
    data,
    fetchNextPage,
    hasNextPage,
    isPending,
    isFetchingNextPage,
    isError,
    refetch,
  } = useFeed(tab);

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
    queryClient.setQueryData(["feed", tab], (old) => {
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
  const checkForNew = useCallback(async () => {
    if (checkingRef.current || document.hidden) return;
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
          return [...unseen.filter((p) => !prevIds.has(p._id)), ...prev];
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
    queryClient.setQueryData(["feed", tab], (old) => {
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

  const handleDelete = (id) => {
    queryClient.setQueryData(["feed", tab], (old) => {
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
    queryClient.setQueryData(["feed", tab], (old) => {
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
      {/* Feed tabs only — Search and Post live in the bottom tab bar. */}
      <div className="sticky top-[53px] z-10 border-b border-[var(--cz-border)] bg-[var(--cz-bg)]/90 backdrop-blur md:top-0">
        <div role="tablist" aria-label="Feed" className="flex min-w-0 flex-1">
          {[
            { id: "following", label: "Following" },
            { id: "discovery", label: "For you" },
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

      <PostComposer user={user} onCreated={handleCreated} />

      {pending.length > 0 && !isPending ? (
        <div className="sticky top-[117px] z-10 flex justify-center pt-3 md:top-[105px]">
          <button
            onClick={showNewPosts}
            aria-live="polite"
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
            error={isError ? "Couldn't load more posts." : null}
            onRetry={() => refetch()}
          />
        </div>
      )}
    </div>
  );
}
