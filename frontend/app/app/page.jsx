"use client";

import { useEffect, useState, useRef, useCallback, useMemo } from "react";
import { ArrowUp, Check, ChevronDown, Compass, FileText, Users } from "lucide-react";
import { useQueryClient } from "@tanstack/react-query";
import {
  EmptyState,
  FeedFooter,
  PostSkeleton,
} from "@/components/app/EmptyState";
import { INTEREST_TAGS } from "@/lib/interestTags";
import { HubTagStrip } from "@/components/app/InterestTagChips";
import { PostComposer } from "@/components/app/PostComposer";
import { ArticleComposer } from "@/components/app/ArticleComposer";
import { AnonymousComposer } from "@/components/app/AnonymousComposer";
import { PostCard } from "@/components/app/PostCard";
import { api } from "@/lib/api";
import { interestTag } from "@/lib/interestTags";
import {
  useArticlesInfinite,
  useMe,
  useFeed,
  useHubFeed,
  useAnonymousFeed,
} from "@/lib/hooks/queries";

export default function AppHome() {
  const [tab, setTab] = useState("discovery");
  const isArticlesTab = tab === "articles";
  const isAnonTab = tab === "anonymous";
  const isHubTab = tab === "hub";
  const [hubTag, setHubTag] = useState(INTEREST_TAGS[0].id);
  const [moreOpen, setMoreOpen] = useState(false);
  const moreWrapRef = useRef(null);
  const MAIN_TABS = [
    { id: "following", label: "Following" },
    { id: "discovery", label: "For you" },
  ];
  const MORE_TABS = [
    { id: "articles", label: "Articles", hint: "Long-form" },
    { id: "anonymous", label: "Anonymous", hint: "Hub" },
    { id: "hub", label: "Hub", hint: "Pick a topic" },
  ];
  const activeMore = MORE_TABS.find((t) => t.id === tab) || null;

  // Dismiss the More menu on outside tap or Escape.
  useEffect(() => {
    if (!moreOpen) return;
    const onDown = (e) => {
      if (moreWrapRef.current && !moreWrapRef.current.contains(e.target)) setMoreOpen(false);
    };
    const onKey = (e) => {
      if (e.key === "Escape") setMoreOpen(false);
    };
    document.addEventListener("mousedown", onDown);
    document.addEventListener("touchstart", onDown);
    window.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("touchstart", onDown);
      window.removeEventListener("keydown", onKey);
    };
  }, [moreOpen]);
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

  const feedQuery = useFeed(isArticlesTab || isAnonTab || isHubTab ? "discovery" : tab);
  const articlesQuery = useArticlesInfinite();
  const anonQuery = useAnonymousFeed();
  const hubQuery = useHubFeed(hubTag);
  const {
    data,
    fetchNextPage,
    hasNextPage,
    isPending,
    isFetchingNextPage,
    isError,
    error,
    refetch,
  } = isArticlesTab
    ? articlesQuery
    : isAnonTab
      ? anonQuery
      : isHubTab
        ? hubQuery
        : feedQuery;

  // The one cache key the active tab reads+writes (created/deleted/updated
  // posts, pending merge). The hub key includes its topic.
  const activeKey = isArticlesTab
    ? ["articles-feed"]
    : isAnonTab
      ? ["anon-feed"]
      : isHubTab
        ? ["hub", hubTag]
        : ["feed", tab];

  // Dedupe by _id — cursor sessions can interleave after pull-to-refresh
  // (fresh random top + older session pages) or an order-cache rebuild, so
  // pages can share posts. First occurrence wins (newest).
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
    const key = activeKey;
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
    if (tab === "anonymous") return;
    // The hub is browse-only (no composer, no banner) — nothing to peek for.
    if (tab === "hub") return;
    checkingRef.current = true;
    try {
      const fn = tab === "following" ? api.getFeed : api.getPublicFeed;
      // latest=1 → cheap chronological peek (shared 20s server cache) for
      // "any new posts?" detection. Never touches the viewer's randomized
      // session order used by the real feed.
      const res = await fn({ latest: 1, limit: 5 });
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
    const key = activeKey;
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
    const key = activeKey;
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
    const key = activeKey;
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
      {/* Feed tabs: Following + For you visible, rest under More — no horizontal scroll. */}
      <div className="sticky top-[53px] z-10 border-b border-[var(--cz-border)] bg-[var(--cz-bg)]/90 backdrop-blur md:top-0">
        <div role="tablist" aria-label="Feed" className="flex min-w-0 flex-1">
          {MAIN_TABS.map((t) => (
            <button
              key={t.id}
              type="button"
              role="tab"
              onClick={() => {
                setTab(t.id);
                setMoreOpen(false);
              }}
              aria-selected={tab === t.id}
              className={`relative h-[53px] min-w-0 flex-1 cursor-pointer whitespace-nowrap px-4 text-center text-[16px] transition-colors md:text-[17px] ${
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
          <div ref={moreWrapRef} className="relative min-w-0 flex-1">
            <button
              type="button"
              role="tab"
              onClick={() => setMoreOpen((v) => !v)}
              aria-selected={Boolean(activeMore)}
              aria-expanded={moreOpen}
              aria-haspopup="menu"
              className={`relative flex h-[53px] w-full cursor-pointer items-center justify-center gap-1 whitespace-nowrap px-4 text-center text-[16px] transition-colors md:text-[17px] ${
                activeMore
                  ? "font-bold text-[var(--cz-text-primary)]"
                  : "font-medium text-[var(--cz-text-secondary)] hover:bg-[var(--cz-surface-strong)] hover:text-[var(--cz-text-primary)]"
              }`}
            >
              {activeMore ? activeMore.label : "More"}
              <ChevronDown
                className={`h-4 w-4 transition-transform ${moreOpen ? "rotate-180" : ""}`}
                aria-hidden
              />
              {activeMore ? (
                <span
                  aria-hidden
                  className="absolute inset-x-0 bottom-0 h-[4px] rounded-t-full bg-[var(--cz-accent)]"
                />
              ) : null}
            </button>
            {moreOpen ? (
              <div
                role="menu"
                aria-label="More feeds"
                className="absolute right-0 top-[53px] z-20 w-[232px] overflow-hidden rounded-[16px] border border-[var(--cz-border)] bg-[var(--cz-elevated)] py-1 shadow-[var(--shadow-sm)]"
              >
                {MORE_TABS.map((t) => (
                  <button
                    key={t.id}
                    type="button"
                    role="menuitemradio"
                    aria-checked={tab === t.id}
                    onClick={() => {
                      setTab(t.id);
                      setMoreOpen(false);
                    }}
                    className="flex w-full items-center gap-3 px-4 py-2.5 text-left transition-colors hover:bg-[var(--cz-surface-strong)]"
                  >
                    <span className="min-w-0 flex-1">
                      <span className="block text-[15px] font-bold leading-[20px] text-[var(--cz-text-primary)]">
                        {t.label}
                      </span>
                      <span className="block text-[13px] leading-[18px] text-[var(--cz-text-secondary)]">
                        {t.hint}
                      </span>
                    </span>
                    {tab === t.id ? (
                      <Check className="h-[18px] w-[18px] shrink-0 text-[var(--cz-accent)]" aria-hidden />
                    ) : null}
                  </button>
                ))}
              </div>
            ) : null}
          </div>
        </div>
        {/* Hub topic strip lives inside the sticky tab bar so it stays
            reachable while scrolling the topic feed. */}
        {isHubTab ? (
          <div className="border-t border-[var(--cz-border)] px-4 py-2">
            <HubTagStrip
              activeTag={hubTag}
              onTag={(id) => {
                setHubTag(id);
                window.scrollTo({ top: 0 });
              }}
            />
          </div>
        ) : null}
      </div>

      {isArticlesTab ? (
        <ArticleComposer user={user} onCreated={handleCreated} />
      ) : isAnonTab ? (
        <AnonymousComposer user={user} onCreated={handleCreated} />
      ) : isHubTab ? null : (
        <PostComposer user={user} onCreated={handleCreated} />
      )}

      {pending.length > 0 && !isPending && !isHubTab ? (
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
        ) : isHubTab ? (
          <EmptyState
            icon={Compass}
            title={`Nothing in ${
              interestTag(hubTag)?.fullLabel || interestTag(hubTag)?.label || "this topic"
            } yet`}
            description={`No posts tagged here yet. New posts with this topic appear first — tag yours with it in the composer.`}
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
