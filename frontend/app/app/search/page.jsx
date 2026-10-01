"use client";

import { Loader2, Search as SearchIcon, Users, X } from "lucide-react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useEffect, useState } from "react";
import { EmptyState } from "@/components/app/EmptyState";
import { PageHeader } from "@/components/app/PageHeader";
import { PostCard } from "@/components/app/PostCard";
import { UserCard } from "@/components/app/UserCard";
import { useMe, useSearch } from "@/lib/hooks/queries";

export default function SearchPage() {
  return (
    <Suspense
      fallback={
        <div>
          <PageHeader title="Search" />
          <div className="border-b border-[var(--cz-border)] px-4 py-3">
            <div className="h-[44px] animate-pulse rounded-full bg-[var(--cz-surface-strong)]" />
          </div>
        </div>
      }
    >
      <SearchInner />
    </Suspense>
  );
}

function SearchInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const initialQ = searchParams.get("q") || "";
  const [q, setQ] = useState(initialQ);
  const [debouncedQ, setDebouncedQ] = useState(initialQ);
  const [type, setType] = useState("all"); // all | users | posts

  const { data: meData } = useMe();
  const me = meData?.data?.user || null;

  // Single-shot query (backend returns one page). placeholderData keeps the
  // previous results on screen while the new query loads — no skeleton flash.
  const { data, isPending, isFetching } = useSearch(debouncedQ, type);

  const users = data?.data?.users || [];
  const posts = data?.data?.posts || [];
  const colleges = data?.data?.colleges || [];

  // Debounce search input
  useEffect(() => {
    const t = setTimeout(() => setDebouncedQ(q), 300);
    return () => clearTimeout(t);
  }, [q]);

  // Sync URL
  useEffect(() => {
    const params = new URLSearchParams();
    if (debouncedQ) params.set("q", debouncedQ);
    if (type !== "all") params.set("type", type);
    const qs = params.toString();
    router.replace(`/app/search${qs ? `?${qs}` : ""}`, { scroll: false });
  }, [debouncedQ, type, router]);

  const showTabs = debouncedQ.trim().length > 0;
  const isHashtagSearch = debouncedQ.trim().startsWith("#");
  const hashtagTag = isHashtagSearch
    ? debouncedQ.trim().replace(/^#+/, "").toLowerCase()
    : "";
  const isEmpty =
    !isPending &&
    debouncedQ &&
    users.length === 0 &&
    posts.length === 0 &&
    colleges.length === 0;
  const showColleges =
    (type === "all" || type === "colleges") && colleges.length > 0;
  const showUsers = (type === "all" || type === "users") && users.length > 0;
  const showPosts = (type === "all" || type === "posts") && posts.length > 0;

  return (
    <div>
      <PageHeader title="Search" />

      {/* DESIGN.md — Search Input: mist fill, no visible border, 15px placeholder */}
      <div className="border-b border-[var(--cz-border)] px-4 py-3">
        <div className="flex h-[44px] items-center gap-3 rounded-full bg-[var(--cz-surface-strong)] px-4 transition-colors focus-within:ring-1 focus-within:ring-[var(--cz-accent)]">
          <SearchIcon
            className="h-[18px] w-[18px] shrink-0 text-[var(--cz-text-secondary)]"
            aria-hidden
          />
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search students and posts"
            aria-label="Search CampusZen"
            className="h-full min-w-0 flex-1 bg-transparent text-[15px] text-[var(--cz-text-primary)] outline-none placeholder:text-[var(--cz-text-secondary)]"
          />
          {isPending ? (
            <Loader2
              className="h-4 w-4 shrink-0 animate-spin text-[var(--cz-text-secondary)]"
              aria-hidden
            />
          ) : isFetching && debouncedQ ? (
            <span
              className="h-2 w-2 shrink-0 animate-pulse rounded-full bg-[var(--cz-accent)]"
              aria-hidden
            />
          ) : null}
          {q ? (
            <button
              onClick={() => setQ("")}
              className="-mr-1 grid h-[28px] w-[28px] shrink-0 place-items-center rounded-full text-[var(--cz-text-secondary)] transition-colors hover:bg-[var(--cz-border)] hover:text-[var(--cz-text-primary)]"
              aria-label="Clear search"
            >
              <X className="h-4 w-4" />
            </button>
          ) : null}
        </div>
      </div>

      {showTabs ? (
        <div className="flex overflow-x-auto border-b border-[var(--cz-border)] scrollbar-none">
          {[
            { id: "all", label: "All" },
            { id: "users", label: "Students" },
            { id: "posts", label: "Posts" },
            { id: "colleges", label: "Colleges" },
          ].map((t) => (
            <button
              key={t.id}
              role="tab"
              onClick={() => setType(t.id)}
              aria-selected={type === t.id}
              className={`relative h-[52px] min-w-[72px] flex-1 shrink-0 cursor-pointer whitespace-nowrap px-4 text-[15px] font-medium transition-colors ${
                type === t.id
                  ? "font-bold text-[var(--cz-text-primary)]"
                  : "text-[var(--cz-text-secondary)] hover:bg-[var(--cz-surface-strong)] hover:text-[var(--cz-text-primary)]"
              }`}
            >
              {t.label}
              {type === t.id ? (
                <span
                  aria-hidden
                  className="absolute inset-x-0 bottom-0 h-[2px] bg-[var(--cz-accent)]"
                />
              ) : null}
            </button>
          ))}
        </div>
      ) : null}

      {isHashtagSearch && hashtagTag ? (
        <Link
          href={`/app/tag/${encodeURIComponent(hashtagTag)}`}
          className="flex items-center justify-between gap-3 border-b border-[var(--cz-border)] px-4 py-3 text-[15px] transition-colors hover:bg-[var(--cz-surface-strong)]"
        >
          <span className="truncate text-[var(--cz-text-secondary)]">
            View all posts tagged{" "}
            <span className="font-bold text-[var(--cz-accent)]">
              #{hashtagTag}
            </span>
          </span>
          <span className="shrink-0 text-[15px] font-bold text-[var(--cz-accent)]">
            Open
          </span>
        </Link>
      ) : null}

      {!debouncedQ ? (
        <EmptyState
          icon={Users}
          title="Search CampusZen"
          description="Find students by name, username, college or course, and posts by text."
        />
      ) : isPending &&
        users.length === 0 &&
        posts.length === 0 &&
        colleges.length === 0 ? (
        <div>
          <div className="border-b border-[var(--cz-border)] px-4 py-2 text-[15px] font-bold text-[var(--cz-text-primary)]">
            Students
          </div>
          {Array.from({ length: 4 }).map((_, i) => (
            <div
              key={i}
              style={{ "--skel-idx": i }}
              className="t-skel-item cz-row px-4 py-3"
            >
              <div className="flex gap-3">
                <div className="t-shimmer h-10 w-10 shrink-0 rounded-full" />
                <div className="flex-1 space-y-2">
                  <div className="t-shimmer h-3 w-32 rounded" />
                  <div className="t-shimmer h-3 w-20 rounded" />
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : isEmpty ? (
        <EmptyState
          icon={SearchIcon}
          title={`No results for "${debouncedQ}"`}
          description="Try a different term or check the spelling. Search matches username, name, bio, college, course and post text."
        />
      ) : (
        <div>
          {showColleges ? (
            <div>
              <h2 className="border-b border-[var(--cz-border)] px-4 py-2 text-[15px] font-bold text-[var(--cz-text-primary)]">
                Colleges
              </h2>
              {colleges.map((c) => (
                <Link
                  key={c._id || c.slug}
                  href={`/c/${encodeURIComponent(c.slug)}`}
                  className="cz-row flex items-center gap-3 px-4 py-3 transition-colors hover:bg-[var(--cz-surface-strong)]"
                >
                  <span className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-[var(--cz-surface-strong)] text-[15px] font-bold text-[var(--cz-text-primary)]">
                    {(c.name || c.slug || "C").trim().slice(0, 1).toUpperCase()}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-[15px] font-bold leading-[20px] text-[var(--cz-text-primary)]">
                      {c.name}
                    </span>
                    <span className="block truncate text-[15px] leading-[20px] text-[var(--cz-text-secondary)]">
                      {c.memberCount ?? 0} student
                      {c.memberCount === 1 ? "" : "s"}
                    </span>
                  </span>
                </Link>
              ))}
            </div>
          ) : null}

          {showUsers ? (
            <div>
              <h2 className="border-y border-[var(--cz-border)] px-4 py-2 text-[15px] font-bold text-[var(--cz-text-primary)]">
                Students
              </h2>
              <div className="grid gap-3 p-4 sm:grid-cols-2">
                {users.map((u) => (
                  <UserCard
                    key={u._id}
                    user={u}
                    isOwn={me?.username === u.username}
                    isGuest={false}
                  />
                ))}
              </div>
            </div>
          ) : null}

          {showPosts ? (
            <div>
              <h2 className="border-y border-[var(--cz-border)] px-4 py-2 text-[15px] font-bold text-[var(--cz-text-primary)]">
                Posts
              </h2>
              {posts.map((p) => (
                <PostCard key={p._id} post={p} currentUser={me} />
              ))}
            </div>
          ) : null}

          <p className="py-6 text-center text-[13px] text-[var(--cz-text-secondary)]">
            {users.length + posts.length + colleges.length} result
            {users.length + posts.length + colleges.length === 1 ? "" : "s"}
            {isFetching ? " · updating…" : ""}
          </p>
        </div>
      )}
    </div>
  );
}
