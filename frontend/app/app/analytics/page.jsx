"use client";

import {
  BarChart3,
  Bookmark,
  Eye,
  Heart,
  MessageCircle,
  Repeat2,
} from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { EmptyState } from "@/components/app/EmptyState";
import { PageHeader } from "@/components/app/PageHeader";
import { articleUrl } from "@/lib/articles";
import { useAnalyticsOverview, useMe } from "@/lib/hooks/queries";
import { cn } from "@/lib/utils";

function fmt(n) {
  return Number(n || 0).toLocaleString("en-IN");
}

function timeAgo(date) {
  const diff = Date.now() - new Date(date).getTime();
  const s = Math.floor(diff / 1000);
  if (s < 60) return "now";
  const m = Math.floor(s / 60);
  if (m < 60) return `${m}m`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h`;
  const d = Math.floor(h / 24);
  if (d < 7) return `${d}d`;
  return new Date(date).toLocaleDateString("en-IN", {
    month: "short",
    day: "numeric",
  });
}

const CARDS = [
  {
    key: "impressions",
    label: "Impressions",
    Icon: Eye,
    hint: "Deduped views",
  },
  { key: "likes", label: "Likes", Icon: Heart, hint: "In range" },
  { key: "replies", label: "Replies", Icon: MessageCircle, hint: "In range" },
  { key: "reposts", label: "Reposts", Icon: Repeat2, hint: "In range" },
  { key: "bookmarks", label: "Bookmarks", Icon: Bookmark, hint: "Author only" },
];

export default function AnalyticsPage() {
  const [range, setRange] = useState("24h");
  const { data: meData } = useMe();
  const me = meData?.data?.user || null;
  const { data, isPending, error } = useAnalyticsOverview(range);
  const overview = data?.data || null;
  const totals = overview?.totals || {};
  const topPosts = overview?.topPosts || [];

  return (
    <div>
      <PageHeader
        title="Analytics"
        subtitle={
          me ? `Insights for @${me.username} · author only` : "Author only"
        }
      />

      <div className="border-b border-[var(--cz-border)] px-4 py-3">
        <div
          role="tablist"
          aria-label="Time range"
          className="inline-flex rounded-full bg-[var(--cz-surface-strong)] p-1"
        >
          {["24h", "7d"].map((r) => (
            <button
              key={r}
              type="button"
              role="tab"
              aria-selected={range === r}
              onClick={() => setRange(r)}
              className={cn(
                "cursor-pointer rounded-full px-4 py-1.5 text-[14px] font-bold transition-colors",
                range === r
                  ? "bg-[var(--cz-text-primary)] text-[var(--cz-brand-contrast)]"
                  : "text-[var(--cz-text-secondary)] hover:text-[var(--cz-text-primary)]",
              )}
            >
              {r === "24h" ? "Last 24 hours" : "Last 7 days"}
            </button>
          ))}
        </div>
        {overview?.allTime ? (
          <p className="mt-2 text-[13px] text-[var(--cz-text-secondary)]">
            {fmt(overview.allTime.impressions)} all-time impressions ·{" "}
            {fmt(overview.allTime.posts)} posts total
          </p>
        ) : null}
      </div>

      {isPending ? (
        <div
          className="grid grid-cols-2 gap-3 p-4 sm:grid-cols-3"
          role="status"
          aria-label="Loading analytics"
        >
          {Array.from({ length: 5 }).map((_, i) => (
            <div
              key={`analytics-skeleton-${i}`}
              className="rounded-[16px] border border-[var(--cz-border)] p-4"
            >
              <div className="t-shimmer h-4 w-20 rounded-full" />
              <div className="t-shimmer mt-2 h-7 w-14 rounded-full" />
            </div>
          ))}
        </div>
      ) : error ? (
        <EmptyState
          icon={BarChart3}
          title="Couldn't load insights"
          description={
            error?.data?.message || error?.message || "Try again in a moment."
          }
          actionLabel="Back to feed"
          actionHref="/app"
        />
      ) : (totals.posts || 0) === 0 ? (
        <EmptyState
          icon={BarChart3}
          title="No posts yet"
          description="Publish your first post and check back here — impressions, likes, replies, reposts and bookmarks will show up over 24h / 7d."
          actionLabel="Create a post"
          actionHref="/app/create"
        />
      ) : (
        <>
          <div className="grid grid-cols-2 gap-3 p-4 sm:grid-cols-3">
            {CARDS.map(({ key, label, Icon, hint }) => (
              <div
                key={key}
                className="rounded-[16px] border border-[var(--cz-border)] bg-[var(--cz-surface)] p-4"
              >
                <p className="flex items-center gap-1.5 text-[13px] font-bold text-[var(--cz-text-secondary)]">
                  <Icon className="h-4 w-4" aria-hidden />
                  {label}
                </p>
                <p className="mt-1 text-[26px] font-extrabold leading-8 text-[var(--cz-text-primary)]">
                  {fmt(totals[key])}
                </p>
                <p className="text-[12px] text-[var(--cz-text-tertiary)]">
                  {hint}
                </p>
              </div>
            ))}
            <div className="rounded-[16px] border border-[var(--cz-border)] bg-[var(--cz-surface)] p-4">
              <p className="flex items-center gap-1.5 text-[13px] font-bold text-[var(--cz-text-secondary)]">
                <BarChart3 className="h-4 w-4" aria-hidden />
                Posts
              </p>
              <p className="mt-1 text-[26px] font-extrabold leading-8 text-[var(--cz-text-primary)]">
                {fmt(totals.posts)}
              </p>
              <p className="text-[12px] text-[var(--cz-text-tertiary)]">
                Published
              </p>
            </div>
          </div>

          <div className="px-4 pb-6">
            <h2 className="text-[20px] font-extrabold leading-6 text-[var(--cz-text-primary)]">
              Top posts
            </h2>
            <p className="mt-0.5 text-[13px] text-[var(--cz-text-secondary)]">
              Sorted by {range === "24h" ? "last-24h" : "last-7-day"}{" "}
              impressions · top 5
            </p>
            {topPosts.length === 0 ? (
              <p className="mt-3 rounded-[16px] border border-[var(--cz-border)] p-4 text-[14px] text-[var(--cz-text-secondary)]">
                No impressions in this window yet — your posts will appear here
                once people start viewing them.
              </p>
            ) : (
              <ul className="mt-3 divide-y divide-[var(--cz-border)] overflow-hidden rounded-[16px] border border-[var(--cz-border)]">
                {topPosts.map((p) => {
                  const href =
                    p.kind === "article" && me?.username && p.slug
                      ? articleUrl(me.username, p.slug)
                      : `/app/p/${p._id}`;
                  return (
                    <li key={p._id}>
                      <Link
                        href={href}
                        className="block px-4 py-3 transition-colors hover:bg-[var(--cz-surface-strong)]"
                      >
                        <p className="line-clamp-2 text-[15px] leading-[20px] text-[var(--cz-text-primary)]">
                          {p.kind === "article"
                            ? p.title || "Untitled article"
                            : p.text || "(media post)"}
                        </p>
                        <p className="mt-0.5 text-[13px] text-[var(--cz-text-secondary)]">
                          {timeAgo(p.createdAt)} ·{" "}
                          {p.kind === "article" ? "Article" : "Post"}
                        </p>
                        <p className="mt-1.5 flex flex-wrap gap-x-3 gap-y-1 text-[13px] font-medium text-[var(--cz-text-secondary)]">
                          <span className="inline-flex items-center gap-1">
                            <Eye className="h-3.5 w-3.5" aria-hidden />{" "}
                            {fmt(p.viewsInRange ?? p.viewCount)} views
                          </span>
                          <span className="inline-flex items-center gap-1">
                            <Heart className="h-3.5 w-3.5" aria-hidden />{" "}
                            {fmt(p.likeCount)}
                          </span>
                          <span className="inline-flex items-center gap-1">
                            <MessageCircle
                              className="h-3.5 w-3.5"
                              aria-hidden
                            />{" "}
                            {fmt(p.replyCount)}
                          </span>
                          <span className="inline-flex items-center gap-1">
                            <Repeat2 className="h-3.5 w-3.5" aria-hidden />{" "}
                            {fmt(p.repostCount)}
                          </span>
                          <span className="inline-flex items-center gap-1">
                            <Bookmark className="h-3.5 w-3.5" aria-hidden />{" "}
                            {fmt(p.bookmarkCount)}
                          </span>
                        </p>
                      </Link>
                    </li>
                  );
                })}
              </ul>
            )}
            <p className="mt-3 text-[12px] leading-5 text-[var(--cz-text-tertiary)]">
              Views are deduped — one per person per day, refreshes don&apos;t
              inflate numbers. Only you can see this page.
            </p>
          </div>
        </>
      )}
    </div>
  );
}
