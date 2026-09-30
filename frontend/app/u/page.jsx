"use client";

import { useEffect, useState, useRef, useCallback } from "react";
import { Search, Users, Loader2 } from "lucide-react";
import { UserCard } from "@/components/app/UserCard";
import { EmptyState } from "@/components/app/EmptyState";
import { api } from "@/lib/api";
import { useRequireSession } from "@/lib/hooks/useRequireSession";

export default function UsersDirectoryPage() {
  const [users, setUsers] = useState([]);
  const [q, setQ] = useState("");
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const observerRef = useRef(null);
  const sentinelRef = useRef(null);

  const { user: me, checking } = useRequireSession();

  const fetchPage = useCallback(
    async (p, query, reset = false) => {
      if (reset) setLoading(true);
      else setLoadingMore(true);
      try {
        const res = await api.listUsers({ q: query || undefined, page: p, limit: 20 });
        const data = res.data;
        setHasMore(Boolean(data.hasMore));
        setUsers((prev) => (reset ? data.users : [...prev, ...data.users]));
        setPage(p);
      } catch {
        // keep hasMore false on error
        if (reset) setUsers([]);
        setHasMore(false);
      } finally {
        setLoading(false);
        setLoadingMore(false);
      }
    },
    []
  );

  // initial + search debounce
  useEffect(() => {
    const t = setTimeout(() => fetchPage(1, q, true), q ? 350 : 0);
    return () => clearTimeout(t);
  }, [q, fetchPage]);

  // infinite scroll observer
  useEffect(() => {
    if (!hasMore || loading || loadingMore) return;

    const el = sentinelRef.current;
    if (!el) return;
    observerRef.current?.disconnect();
    observerRef.current = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && hasMore && !loading && !loadingMore) {
          fetchPage(page + 1, q);
        }
      },
      { rootMargin: "400px" }
    );
    observerRef.current.observe(el);
    return () => observerRef.current?.disconnect();
  }, [hasMore, loading, loadingMore, page, q, fetchPage]);

  // Signed out: useRequireSession is already redirecting to /login.
  if (checking || !me) {
    return (
      <div className="flex items-center gap-2 px-4 py-10 text-[15px] text-[var(--cz-text-secondary)]">
        <Loader2 className="h-[18px] w-[18px] animate-spin" aria-hidden />
        Redirecting to sign in…
      </div>
    );
  }

  return (
    <div>
      {/* Just a label — same as any other tab. No sticky header. */}
      <div className="px-4 pt-4 pb-3">
        <h1 className="text-[20px] leading-6 font-extrabold text-[var(--cz-text-primary)]">
          Students
        </h1>
        <p className="text-[13px] leading-[16px] text-[var(--cz-text-secondary)]">
          {users.length}
          {hasMore ? "+" : ""} on CampusZen
        </p>
      </div>

      <div className="border-b border-[var(--cz-border)] px-4 pb-3">
        <div className="flex h-[44px] items-center gap-3 rounded-full bg-[var(--cz-surface-strong)] px-4 transition-colors focus-within:ring-1 focus-within:ring-[var(--cz-accent)]">
          <Search
            className="h-[18px] w-[18px] shrink-0 text-[var(--cz-text-secondary)]"
            aria-hidden
          />
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search by name, username or bio"
            aria-label="Search students"
            className="h-full min-w-0 flex-1 bg-transparent text-[15px] text-[var(--cz-text-primary)] outline-none placeholder:text-[var(--cz-text-secondary)]"
          />
          {q ? (
            <button
              onClick={() => setQ("")}
              className="-mr-1 shrink-0 text-[15px] font-bold text-[var(--cz-accent)] hover:underline"
            >
              Clear
            </button>
          ) : null}
        </div>
      </div>

      {loading ? (
        <div className="grid gap-3 p-4 sm:grid-cols-2">
          {Array.from({ length: 6 }).map((_, i) => (
            <div
              key={i}
              className="rounded-[16px] border border-[var(--cz-border)] p-4 animate-pulse"
            >
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-full bg-[var(--cz-skeleton)]" />
                <div className="flex-1 space-y-2">
                  <div className="h-3 w-24 rounded bg-[var(--cz-skeleton)]" />
                  <div className="h-3 w-16 rounded bg-[var(--cz-skeleton)]" />
                </div>
              </div>
              <div className="mt-4 space-y-2">
                <div className="h-3 w-full rounded bg-[var(--cz-skeleton)]" />
                <div className="h-3 w-3/4 rounded bg-[var(--cz-skeleton)]" />
              </div>
            </div>
          ))}
        </div>
      ) : users.length === 0 ? (
        <EmptyState
          icon={Users}
          title={q ? `No results for "${q}"` : "No students yet"}
          description={
            q ? "Try a different search term." : "Nobody has signed up yet."
          }
        />
      ) : (
        <div className="grid gap-3 p-4 sm:grid-cols-2">
          {users.map((u) => (
            <UserCard
              key={u._id}
              user={u}
              isOwn={me.username === u.username}
              isGuest={false}
            />
          ))}
        </div>
      )}

      {/* sentinel for infinite scroll */}
      <div ref={sentinelRef} className="h-1" aria-hidden />

      {loadingMore ? (
        <div className="flex items-center justify-center gap-2 py-6 text-[15px] text-[var(--cz-text-secondary)]">
          <Loader2 className="h-4 w-4 animate-spin" aria-hidden /> Loading more
        </div>
      ) : !hasMore && users.length > 0 ? (
        <p className="py-6 text-center text-[13px] text-[var(--cz-text-secondary)]">
          {users.length} students
        </p>
      ) : null}
    </div>
  );
}
