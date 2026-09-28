"use client";

import { useEffect, useState, useRef, useCallback } from "react";
import { ArrowUp, FileText, Users, Loader2 } from "lucide-react";
import { useQueryClient } from "@tanstack/react-query";
import { EmptyState } from "@/components/app/EmptyState";
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
  } = useFeed(tab);

  const posts = data?.pages?.flatMap((p) => p.data?.posts || []) || [];
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

  // Background freshness check
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

      {pending.length > 0 && !isPending ? (
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

      {isPending ? (
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
            <EmptyState icon={Users} title="No following yet" description="You're not following anyone. Find classmates by college and course." actionLabel="Explore" actionHref="/u" />
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
          {isFetchingNextPage ? (
            <div className="flex items-center justify-center gap-2 py-4 text-[13px] text-[var(--cz-text-secondary)]">
              <Loader2 className="h-4 w-4 animate-spin" /> Loading more...
            </div>
          ) : !hasNextPage ? (
            <p className="text-center text-[11px] text-[var(--cz-text-secondary)]/60 py-4">End • {posts.length} posts</p>
          ) : null}
        </div>
      )}
    </div>
  );
}
