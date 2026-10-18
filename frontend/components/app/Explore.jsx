"use client";

import { useQueryClient } from "@tanstack/react-query";
import { Hash, TrendingUp, UserPlus } from "lucide-react";
import Link from "next/link";
import { EmptyState, PostSkeleton } from "@/components/app/EmptyState";
import { PostCard } from "@/components/app/PostCard";
import { SuggestRow } from "@/components/app/RightMinimal";
import {
  queryKeys,
  useFeed,
  useSuggestions,
  useTrendingHashtags,
} from "@/lib/hooks/queries";

/**
 * Explore — what /app/search shows while there's no query: a follow starter,
 * the topics campus is posting about right now, and a live peek at the
 * For you feed. Every block rides an endpoint that already exists (and for
 * posts, the shared ["feed","discovery"] cache), so this adds zero backend
 * surface.
 */

function SectionHeader({ title, href, linkLabel }) {
  return (
    <div className="flex items-center justify-between border-b border-[var(--cz-border)] px-4 py-2">
      <h2 className="text-[15px] font-bold text-[var(--cz-text-primary)]">
        {title}
      </h2>
      {href ? (
        <Link
          href={href}
          className="text-[13px] font-bold text-[var(--cz-accent)] transition-opacity hover:opacity-80"
        >
          {linkLabel}
        </Link>
      ) : null}
    </div>
  );
}

/** Single shimmer line for the people list while it loads. */
function PersonSkeleton({ idx }) {
  return (
    <div
      style={{ "--skel-idx": idx }}
      className="t-skel-item flex items-center gap-3 py-3"
    >
      <div className="t-shimmer h-10 w-10 shrink-0 rounded-full" />
      <div className="min-w-0 flex-1 space-y-2">
        <div className="t-shimmer h-3 w-32 rounded" />
        <div className="t-shimmer h-3 w-20 rounded" />
      </div>
      <div className="t-shimmer h-8 w-20 shrink-0 rounded-full" />
    </div>
  );
}

function WhoToFollow({ users, loading, onFollowed }) {
  if (loading) {
    return (
      <section className="border-b border-[var(--cz-border)]">
        <SectionHeader title="Who to follow" href="/u" linkLabel="See all" />
        <div className="px-4">
          <PersonSkeleton idx={0} />
          <PersonSkeleton idx={1} />
          <PersonSkeleton idx={2} />
        </div>
      </section>
    );
  }
  if (!users.length) return null;
  return (
    <section className="border-b border-[var(--cz-border)]">
      <SectionHeader title="Who to follow" href="/u" linkLabel="See all" />
      <div className="divide-y divide-[var(--cz-border)]">
        {users.map((u) => (
          <div key={u._id} className="px-4">
            <SuggestRow user={u} onFollowed={onFollowed} />
          </div>
        ))}
      </div>
    </section>
  );
}

function TrendingTopics({ tags, loading }) {
  if (loading)
    return (
      <section className="border-b border-[var(--cz-border)]">
        <SectionHeader title="Trending topics" />
        <div className="flex flex-wrap gap-1.5 px-4 py-3">
          <span className="h-[34px] w-[110px] rounded-full bg-[var(--cz-surface-strong)]" />
          <span className="h-[34px] w-[92px] rounded-full bg-[var(--cz-surface-strong)]" />
          <span className="h-[34px] w-[126px] rounded-full bg-[var(--cz-surface-strong)]" />
          <span className="h-[34px] w-[104px] rounded-full bg-[var(--cz-surface-strong)]" />
        </div>
      </section>
    );
  if (!tags.length) return null;
  return (
    <section className="border-b border-[var(--cz-border)]">
      <SectionHeader title="Trending topics" />
      <div className="px-4 py-3">
        <div className="flex flex-wrap gap-1.5">
          {tags.map((t) => (
            <Link
              key={t.tag}
              title={`${t.count} ${t.count === 1 ? "post" : "posts"} · 24h`}
              href={`/app/tag/${encodeURIComponent(t.tag)}`}
              prefetch={false}
              className="inline-flex h-[34px] shrink-0 items-center gap-1.5 rounded-full border border-[var(--cz-border)] bg-[var(--cz-surface)] px-3 text-[13px] font-bold text-[var(--cz-text-primary)] transition-colors hover:bg-[var(--cz-surface-strong)]"
            >
              <Hash
                className="h-3.5 w-3.5 shrink-0 text-[var(--cz-accent)]"
                aria-hidden
              />
              {t.tag}
              <span className="text-[11.5px] font-medium tabular-nums text-[var(--cz-text-secondary)]">
                {t.count}
              </span>
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
}

function ExplorePosts({ posts, loading, user }) {
  if (loading) {
    return (
      <section className="border-b border-[var(--cz-border)]">
        <SectionHeader
          title="Explore posts"
          href="/app"
          linkLabel="Open feed"
        />
        <PostSkeleton rows={2} />
      </section>
    );
  }
  if (!posts.length) return null;
  return (
    <section>
      <SectionHeader title="Explore posts" href="/app" linkLabel="Open feed" />
      {posts.map((p) => (
        <PostCard key={p._id} post={p} currentUser={user} />
      ))}
      <Link
        href="/app"
        className="flex items-center justify-center gap-1 border-t border-[var(--cz-border)] px-4 py-3 text-[14px] font-bold text-[var(--cz-accent)] transition-colors hover:bg-[var(--cz-surface-strong)]"
      >
        <TrendingUp className="h-4 w-4" aria-hidden />
        More on For you
      </Link>
    </section>
  );
}

export function Explore({ me }) {
  const qc = useQueryClient();
  // Shares the ["feed", "discovery"] cache with the home For-you tab and the
  // BottomNav idle prefetch — the first page is very often already cached,
  // so this paints instantly and costs no extra request.
  const feedQuery = useFeed("discovery");
  const suggestions = useSuggestions();
  const trending = useTrendingHashtags();

  const followables = (suggestions.data?.data?.users || [])
    .filter((u) => !u.isFollowing)
    .slice(0, 4);
  const trends = trending.data?.data?.tags || [];
  const explorePosts = (feedQuery.data?.pages?.[0]?.data?.posts || []).slice(
    0,
    3,
  );

  const contentLoading =
    suggestions.isPending || trending.isPending || feedQuery.isPending;
  const hasAnything =
    followables.length > 0 || trends.length > 0 || explorePosts.length > 0;

  // Following someone: drop the row locally and patch the shared cache so
  // the followed user doesn't reappear while the entry is fresh.
  const handleFollowed = (id) => {
    qc.setQueryData(queryKeys.suggestions, (old) => {
      if (!old) return old;
      return {
        ...old,
        data: {
          ...old.data,
          users: (old.data?.users || []).filter(
            (u) => String(u._id) !== String(id),
          ),
        },
      };
    });
  };

  if (!contentLoading && !hasAnything) {
    return (
      <EmptyState
        icon={UserPlus}
        title="Nothing to explore yet"
        description="Post something or browse students to get things going."
        actionHref="/u"
        actionLabel="Browse students"
      />
    );
  }

  return (
    <div>
      <WhoToFollow
        users={followables}
        loading={suggestions.isPending}
        onFollowed={handleFollowed}
      />
      <TrendingTopics tags={trends} loading={trending.isPending} />
      <ExplorePosts
        posts={explorePosts}
        loading={feedQuery.isPending}
        user={me}
      />
    </div>
  );
}
