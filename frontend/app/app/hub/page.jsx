"use client";

import { useQueryClient } from "@tanstack/react-query";
import { Compass, FileText } from "lucide-react";
import { use, useEffect, useMemo, useRef } from "react";
import {
  EmptyState,
  FeedFooter,
  PostSkeleton,
} from "@/components/app/EmptyState";
import { HubTagStrip } from "@/components/app/InterestTagChips";
import { PageHeader } from "@/components/app/PageHeader";
import { PostCard } from "@/components/app/PostCard";
import { useHubFeed, useMe } from "@/lib/hooks/queries";
import {
  INTEREST_TAG_IDS,
  INTEREST_TAGS,
  interestTag,
} from "@/lib/interestTags";

export default function HubPage({ searchParams }) {
  // The strip swaps ?tag= and the page follows the URL — deep links stay
  // copyable. Unknown/missing tags fall back to the default topic.
  const sp = use(searchParams) || {};
  const urlTag = INTEREST_TAG_IDS.includes(sp.tag) ? sp.tag : null;
  const hubTag = urlTag || INTEREST_TAGS[0].id;

  const { data: meData } = useMe();
  const user = meData?.data?.user || null;
  const {
    data,
    fetchNextPage,
    hasNextPage,
    isPending,
    isFetchingNextPage,
    isError,
    error,
    refetch,
  } = useHubFeed(hubTag);
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

  const handleDelete = (id) => {
    queryClient.setQueryData(["hub", hubTag], (old) => {
      if (!old) return old;
      return {
        ...old,
        pages: old.pages.map((pg) => ({
          ...pg,
          data: {
            ...pg.data,
            posts: (pg.data?.posts || []).filter((p) => p._id !== id),
          },
        })),
      };
    });
  };

  const handleUpdate = (updated) => {
    queryClient.setQueryData(["hub", hubTag], (old) => {
      if (!old) return old;
      return {
        ...old,
        pages: old.pages.map((pg) => ({
          ...pg,
          data: {
            ...pg.data,
            posts: (pg.data?.posts || []).map((p) =>
              p._id === updated._id ? updated : p,
            ),
          },
        })),
      };
    });
  };

  const current = interestTag(hubTag) || INTEREST_TAGS[0];

  return (
    <div>
      <PageHeader
        href="/app"
        title="Interest Hub"
        subtitle="Campus posts, sorted by topic"
      />
      <div className="sticky top-[53px] z-10 border-b border-[var(--cz-border)] bg-[var(--cz-surface)] px-4 py-2 md:top-0">
        <HubTagStrip activeTag={hubTag} />
      </div>
      {isPending ? (
        <PostSkeleton rows={4} />
      ) : isError && posts.length === 0 ? (
        <EmptyState
          icon={FileText}
          title="Couldn't load this topic"
          description={
            error?.data?.message ||
            error?.message ||
            "Check your connection and try again."
          }
          actionLabel="Try again"
          onAction={() => refetch()}
        />
      ) : posts.length === 0 ? (
        <EmptyState
          icon={Compass}
          title={`Nothing in ${current.fullLabel || current.label} yet`}
          description={`Tag your next post with "${current.label}" in the composer and it lands right here.`}
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
            emptyLabel={`No more ${current.label.toLowerCase()} posts`}
            onLoadMore={() => fetchNextPage()}
          />
        </div>
      )}
    </div>
  );
}
