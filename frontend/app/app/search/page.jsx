"use client";

import { useEffect, useState, useRef, useCallback } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { Search as SearchIcon, Users, FileText, Loader2, X } from "lucide-react";
import { EmptyState } from "@/components/app/EmptyState";
import { UserCard } from "@/components/app/UserCard";
import { PostCard } from "@/components/app/PostCard";
import { api } from "@/lib/api";

export default function SearchPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const initialQ = searchParams.get("q") || "";
  const [q, setQ] = useState(initialQ);
  const [debouncedQ, setDebouncedQ] = useState(initialQ);
  const [type, setType] = useState("all"); // all | users | posts
  const [users, setUsers] = useState([]);
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(false);
  const [hasMore, setHasMore] = useState(false);
  const [page, setPage] = useState(1);
  const [me, setMe] = useState(null);
  const abortRef = useRef(null);

  useEffect(() => {
    api.me().then((r) => setMe(r.data?.user)).catch(() => {});
  }, []);

  // sync URL q
  useEffect(() => {
    const t = setTimeout(() => setDebouncedQ(q), 300);
    return () => clearTimeout(t);
  }, [q]);

  useEffect(() => {
    const params = new URLSearchParams();
    if (debouncedQ) params.set("q", debouncedQ);
    if (type !== "all") params.set("type", type);
    const qs = params.toString();
    router.replace(`/app/search${qs ? `?${qs}` : ""}`, { scroll: false });
  }, [debouncedQ, type, router]);

  const fetchSearch = useCallback(
    async (query, tab, p = 1, append = false) => {
      if (!query || query.trim().length < 1) {
        setUsers([]);
        setPosts([]);
        setHasMore(false);
        return;
      }
      // abort previous
      if (abortRef.current) abortRef.current.abort();
      const controller = new AbortController();
      abortRef.current = controller;
      if (!append) setLoading(true);
      try {
        const res = await api.search({ q: query, page: p, limit: 20, type: tab });
        if (controller.signal.aborted) return;
        const d = res.data;
        if (append) {
          if (tab === "all" || tab === "users") setUsers((prev) => [...prev, ...(d.users || [])]);
          if (tab === "all" || tab === "posts") setPosts((prev) => [...prev, ...(d.posts || [])]);
        } else {
          setUsers(d.users || []);
          setPosts(d.posts || []);
        }
        setHasMore(Boolean(d.hasMoreUsers || d.hasMorePosts));
        setPage(p);
      } catch (e) {
        if (e.name === "AbortError") return;
        // silent
      } finally {
        if (!append) setLoading(false);
      }
    },
    []
  );

  useEffect(() => {
    fetchSearch(debouncedQ, type, 1, false);
  }, [debouncedQ, type, fetchSearch]);

  const handleLoadMore = () => {
    if (!hasMore || loading) return;
    fetchSearch(debouncedQ, type, page + 1, true);
  };

  const showTabs = debouncedQ.trim().length > 0;
  const isEmpty = !loading && debouncedQ && users.length === 0 && posts.length === 0;
  const showUsers = (type === "all" || type === "users") && users.length > 0;
  const showPosts = (type === "all" || type === "posts") && posts.length > 0;

  return (
    <div className="mx-auto w-full max-w-[640px] space-y-4">
      <h1 className="text-[18px] font-semibold tracking-[-0.02em]">Search</h1>

      <div className="flex items-center gap-2 rounded-[12px] border border-[var(--cz-border)] bg-[var(--cz-surface)] px-3 h-[42px] focus-within:border-[var(--cz-muted)] focus-within:shadow-[0_0_0_3px_rgba(125,130,217,0.15)] transition-colors">
        <SearchIcon className="h-4 w-4 text-[var(--cz-text-secondary)] shrink-0" />
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Search students or posts…"
          autoFocus
          className="flex-1 bg-transparent outline-none text-[14px] placeholder:text-[var(--cz-text-secondary)]/50 text-[var(--cz-text-primary)] h-full"
        />
        {loading ? <Loader2 className="h-4 w-4 animate-spin text-[var(--cz-text-secondary)] shrink-0" /> : null}
        {q ? (
          <button onClick={() => setQ("")} className="grid place-items-center h-7 w-7 rounded-[8px] hover:bg-[rgba(255,206,173,0.08)] text-[var(--cz-text-secondary)] hover:text-[var(--cz-text-primary)] shrink-0" aria-label="Clear">
            <X className="h-3.5 w-3.5" />
          </button>
        ) : (
          <span className="hidden sm:inline text-[11px] tracking-[0.04em] uppercase text-[var(--cz-text-secondary)]/60 shrink-0">Fast • Indexed</span>
        )}
      </div>

      {showTabs ? (
        <div className="flex items-center gap-1 border-b border-[var(--cz-border)] overflow-x-auto scrollbar-none">
          {[
            { id: "all", label: "All" },
            { id: "users", label: "Students" },
            { id: "posts", label: "Posts" },
          ].map((t) => (
            <button
              key={t.id}
              onClick={() => setType(t.id)}
              aria-selected={type === t.id}
              className={`relative whitespace-nowrap px-3 sm:px-4 h-[36px] text-[13px] font-medium tracking-[-0.01em] transition-colors shrink-0 ${type === t.id ? "text-[var(--cz-text-primary)]" : "text-[var(--cz-text-secondary)] hover:text-[var(--cz-text-primary)]"}`}
            >
              {t.label}
              {type === t.id ? <span className="absolute bottom-0 left-2 right-2 h-[2px] rounded-full bg-[var(--cz-text-primary)]" /> : null}
            </button>
          ))}
        </div>
      ) : null}

      {!debouncedQ ? (
        <>
          <EmptyState icon={Users} title="Search CampusZen" description="Find students by name, username, college or course, and posts by text (up to 500 chars). Results are optimized with lean queries + indexes." />
          <div className="grid sm:grid-cols-2 gap-3">
            <div className="rounded-[12px] border border-[var(--cz-border)] bg-[rgba(255,255,255,0.02)] p-4">
              <h3 className="text-[13px] font-medium">Students</h3>
              <p className="mt-1 text-[12px] leading-[16px] text-[var(--cz-text-secondary)]">Weighted text index: username 10, fullName 5, bio/college 2.</p>
            </div>
            <div className="rounded-[12px] border border-[var(--cz-border)] bg-[rgba(255,255,255,0.02)] p-4">
              <h3 className="text-[13px] font-medium">Posts</h3>
              <p className="mt-1 text-[12px] leading-[16px] text-[var(--cz-text-secondary)]">Regex on text with author populate, isLiked flags for you.</p>
            </div>
          </div>
        </>
      ) : loading ? (
        <div className="space-y-3">
          <div className="grid sm:grid-cols-2 gap-3">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="rounded-[16px] border border-[var(--cz-border)] bg-[var(--cz-surface)] p-4 animate-pulse">
                <div className="flex gap-3">
                  <div className="h-9 w-9 rounded-full bg-[var(--cz-border)]" />
                  <div className="flex-1 space-y-2">
                    <div className="h-3 w-24 rounded bg-[var(--cz-border)]" />
                    <div className="h-2 w-16 rounded bg-[var(--cz-border)]/60" />
                  </div>
                </div>
              </div>
            ))}
          </div>
          <div className="space-y-3">
            {Array.from({ length: 2 }).map((_, i) => (
              <div key={i} className="rounded-[16px] border border-[var(--cz-border)] bg-[var(--cz-surface)] p-4 animate-pulse">
                <div className="h-4 w-3/4 rounded bg-[var(--cz-border)]" />
                <div className="h-3 w-full rounded bg-[var(--cz-border)]/60 mt-3" />
              </div>
            ))}
          </div>
        </div>
      ) : isEmpty ? (
        <EmptyState icon={SearchIcon} title={`No results for "${debouncedQ}"`} description="Try a different term or check spelling. Search is case-insensitive and matches username, name, bio, college, course and post text." />
      ) : (
        <div className="space-y-6">
          {showUsers ? (
            <div className="space-y-3">
              <h2 className="text-[12px] font-semibold tracking-[0.06em] uppercase text-[var(--cz-text-secondary)]">Students • {users.length}</h2>
              <div className="grid sm:grid-cols-2 gap-3">
                {users.map((u) => (
                  <UserCard key={u._id} user={u} isOwn={me?.username === u.username} isGuest={false} />
                ))}
              </div>
            </div>
          ) : null}

          {showPosts ? (
            <div className="space-y-3">
              <h2 className="text-[12px] font-semibold tracking-[0.06em] uppercase text-[var(--cz-text-secondary)]">Posts • {posts.length}</h2>
              <div className="space-y-3">
                {posts.map((p) => (
                  <PostCard key={p._id} post={p} currentUser={me} />
                ))}
              </div>
            </div>
          ) : null}

          {hasMore ? (
            <button onClick={handleLoadMore} className="w-full rounded-[12px] border border-[var(--cz-border)] bg-transparent h-[40px] text-[13px] font-medium hover:bg-[var(--cz-surface)] transition-colors">
              Load more
            </button>
          ) : (
            <p className="text-center text-[11px] text-[var(--cz-text-secondary)]/60 py-2">End • {users.length + posts.length} results</p>
          )}
        </div>
      )}
    </div>
  );
}
