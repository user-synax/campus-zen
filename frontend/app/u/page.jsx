"use client";

import { useEffect, useState, useRef, useCallback } from "react";
import Link from "next/link";
import { Search, Users, Loader2 } from "lucide-react";
import { UserCard } from "@/components/app/UserCard";
import { EmptyState } from "@/components/app/EmptyState";
import { api } from "@/lib/api";

export default function UsersDirectoryPage() {
  const [users, setUsers] = useState([]);
  const [q, setQ] = useState("");
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [isGuest, setIsGuest] = useState(true);
  const [me, setMe] = useState(null);
  const observerRef = useRef(null);
  const sentinelRef = useRef(null);

  // detect auth once
  useEffect(() => {
    api
      .me()
      .then((r) => {
        setMe(r.data?.user || null);
        setIsGuest(false);
      })
      .catch(() => {
        setIsGuest(true);
        setMe(null);
      });
  }, []);

  const fetchPage = useCallback(
    async (p, query, reset = false) => {
      if (reset) setLoading(true);
      else setLoadingMore(true);
      try {
        const res = await api.listUsers({ q: query || undefined, page: p, limit: 20 });
        const data = res.data;
        setIsGuest(Boolean(data.isGuest));
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
    // guest blur: after 20, don't auto-load more
    if (isGuest && users.length >= 20) return;

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
  }, [hasMore, loading, loadingMore, page, q, fetchPage, users.length, isGuest]);

  const showBlur = isGuest && users.length >= 20;

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-[20px] font-semibold tracking-[-0.03em]">Students</h1>
          <p className="text-[13px] leading-[18px] text-[var(--cz-text-secondary)]">Discover students by college, course and year • {isGuest ? "Guest view — 20 + blur" : "Full directory"}</p>
        </div>
        <Link href="/signup" className={`${isGuest ? "inline-flex" : "hidden"} items-center justify-center rounded-full bg-[var(--cz-text-primary)] text-[var(--cz-text-inverse)] px-4 h-[36px] text-[13px] font-medium hover:bg-[#ffd9c0] transition-colors shrink-0`}>
          Join CampusZen
        </Link>
      </div>

      <div className="flex items-center gap-2 rounded-[12px] border border-[var(--cz-border)] bg-[var(--cz-surface)] px-3 h-[42px]">
        <Search className="h-4 w-4 text-[var(--cz-text-secondary)] shrink-0" />
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Search by name, username, or bio…"
          className="flex-1 bg-transparent outline-none text-[14px] placeholder:text-[var(--cz-text-secondary)]/50 h-full"
        />
        {q ? (
          <button onClick={() => setQ("")} className="text-[12px] font-medium text-[var(--cz-text-secondary)] hover:text-[var(--cz-text-primary)]">
            Clear
          </button>
        ) : null}
      </div>

      {loading ? (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="rounded-[16px] border border-[var(--cz-border)] bg-[var(--cz-surface)] p-4 animate-pulse">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-full bg-[var(--cz-border)]" />
                <div className="flex-1 space-y-2">
                  <div className="h-3 w-24 rounded bg-[var(--cz-border)]" />
                  <div className="h-2 w-16 rounded bg-[var(--cz-border)]/60" />
                </div>
              </div>
              <div className="mt-4 space-y-2">
                <div className="h-2 w-full rounded bg-[var(--cz-border)]/60" />
                <div className="h-2 w-3/4 rounded bg-[var(--cz-border)]/40" />
              </div>
            </div>
          ))}
        </div>
      ) : users.length === 0 ? (
        <EmptyState icon={Users} title={q ? `No results for "${q}"` : "No students yet"} description={q ? "Try a different search term." : "Be the first to join CampusZen — create an account and you’ll appear here."} actionLabel={!q ? "Join" : undefined} actionHref={!q ? "/signup" : undefined} />
      ) : (
        <div className="relative">
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {users.map((u) => (
              <UserCard key={u._id} user={u} isOwn={me?.username === u.username} isGuest={isGuest} onFollow={() => {}} />
            ))}
          </div>

          {/* guest blur after 20 */}
          {showBlur ? (
            <div className="pointer-events-none absolute inset-x-0 bottom-0 h-[280px] bg-gradient-to-t from-[var(--cz-bg)] via-[var(--cz-bg)]/80 to-transparent grid place-items-center p-6">
              <div className="pointer-events-auto rounded-[16px] border border-[var(--cz-border)] bg-[var(--cz-surface)]/90 backdrop-blur p-5 text-center max-w-[420px] shadow-[0_16px_40px_rgba(0,0,0,0.4)]">
                <h3 className="text-[15px] font-semibold">Join CampusZen to connect</h3>
                <p className="mt-1.5 text-[13px] leading-[18px] text-[var(--cz-text-secondary)]">You’ve seen 20 students. Log in to see everyone, follow classmates, and get discovered.</p>
                <div className="mt-4 flex items-center justify-center gap-2">
                  <Link href="/signup" className="inline-flex items-center justify-center rounded-full bg-[var(--cz-text-primary)] text-[var(--cz-text-inverse)] px-5 h-[36px] text-[13px] font-medium hover:bg-[#ffd9c0] transition-colors">
                    Join CampusZen
                  </Link>
                  <Link href="/login" className="inline-flex items-center justify-center rounded-full border border-[var(--cz-border)] px-5 h-[36px] text-[13px] font-medium hover:bg-[var(--cz-surface)] transition-colors">
                    Log in
                  </Link>
                </div>
              </div>
            </div>
          ) : null}
        </div>
      )}

      {/* sentinel for infinite scroll — hidden when guest blur */}
      <div ref={sentinelRef} className="h-1" aria-hidden />

      {loadingMore ? (
        <div className="flex items-center justify-center gap-2 py-4 text-[13px] text-[var(--cz-text-secondary)]">
          <Loader2 className="h-4 w-4 animate-spin" /> Loading more…
        </div>
      ) : !showBlur && !hasMore && users.length > 0 ? (
        <p className="text-center text-[12px] text-[var(--cz-text-secondary)]/60 py-4">You’ve reached the end • {users.length} students</p>
      ) : null}

      {!isGuest && hasMore && !showBlur ? <p className="text-center text-[11px] tracking-[0.04em] uppercase text-[var(--cz-text-secondary)]/50">Infinite scroll • optimized 20 / page</p> : null}
    </div>
  );
}
