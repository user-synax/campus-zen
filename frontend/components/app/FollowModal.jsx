"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { createPortal } from "react-dom";
import Link from "next/link";
import { X, Users, Loader2 } from "lucide-react";
import { api } from "@/lib/api";
import { Button } from "@/components/ui/button";

function UserRow({ user, viewerId, onToggle }) {
  const isOwn = viewerId && String(viewerId) === String(user._id);
  const [following, setFollowing] = useState(Boolean(user.isFollowing));
  const [loading, setLoading] = useState(false);

  const handle = async () => {
    if (isOwn) return;
    setLoading(true);
    try {
      if (following) {
        await api.unfollowUser(user._id);
        setFollowing(false);
      } else {
        await api.followUser(user._id);
        setFollowing(true);
      }
      onToggle?.(user._id, !following);
    } catch {
      // silent
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex items-center gap-3 py-2.5 px-1">
      <Link href={`/u/${user.username}`} className="flex items-center gap-3 min-w-0 flex-1">
        <span className="grid place-items-center h-9 w-9 rounded-full bg-[var(--cz-muted)] text-white text-[12px] font-semibold shrink-0 overflow-hidden">
          {user.avatarUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={user.avatarUrl} alt={user.username} className="h-full w-full object-cover" />
          ) : (
            (user.fullName || user.username || "U").slice(0, 1).toUpperCase()
          )}
        </span>
        <span className="min-w-0 flex-1 text-left">
          <span className="block text-[13px] font-medium leading-none truncate text-[var(--cz-text-primary)]">{user.fullName || user.username}</span>
          <span className="block text-[12px] leading-none text-[var(--cz-text-secondary)] truncate mt-0.5">@{user.username}</span>
          {user.bio ? <span className="block text-[11px] leading-[14px] text-[var(--cz-text-secondary)]/70 truncate mt-1">{user.bio}</span> : null}
        </span>
      </Link>
      {isOwn ? (
        <span className="text-[11px] tracking-[0.04em] uppercase text-[var(--cz-text-secondary)]/60 px-2">You</span>
      ) : (
        <Button
          variant={following ? "secondary" : "primary"}
          size="sm"
          onClick={handle}
          disabled={loading}
          className="h-[32px] px-3 text-[12px] shrink-0 min-w-[84px]"
        >
          {loading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : following ? "Following" : "Follow"}
        </Button>
      )}
    </div>
  );
}

export function FollowModal({ open, onClose, userId, type = "followers", title, viewerId }) {
  const [users, setUsers] = useState([]);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [loading, setLoading] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [show, setShow] = useState(false);
  const modalRef = useRef(null);
  const scrollRef = useRef(null);
  const sentinelRef = useRef(null);

  const fetchPage = useCallback(
    async (p, reset = false) => {
      if (reset) setLoading(true);
      else setLoadingMore(true);
      try {
        const fn = type === "followers" ? api.getFollowers : api.getFollowing;
        const res = await fn(userId, { page: p, limit: 20 });
        const data = res.data;
        setUsers((prev) => (reset ? data.users : [...prev, ...data.users]));
        setHasMore(Boolean(data.hasMore));
        setPage(p);
      } catch {
        setHasMore(false);
      } finally {
        setLoading(false);
        setLoadingMore(false);
      }
    },
    [userId, type]
  );

  // open animation + fetch
  useEffect(() => {
    if (open) {
      setShow(true);
      document.body.style.overflow = "hidden";
      setUsers([]);
      setPage(1);
      setHasMore(true);
      fetchPage(1, true);
      const t = setTimeout(() => modalRef.current?.classList.add("is-open"), 10);
      return () => clearTimeout(t);
    } else if (show) {
      modalRef.current?.classList.remove("is-open");
      modalRef.current?.classList.add("is-closing");
      const t = setTimeout(() => {
        setShow(false);
        document.body.style.overflow = "";
      }, 160);
      return () => clearTimeout(t);
    }
  }, [open, show, fetchPage]);

  // infinite scroll inside modal
  useEffect(() => {
    if (!open || !hasMore || loading || loadingMore) return;
    const el = sentinelRef.current;
    const root = scrollRef.current;
    if (!el || !root) return;
    const obs = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && hasMore && !loading && !loadingMore) fetchPage(page + 1);
      },
      { root, rootMargin: "200px" }
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, [open, hasMore, loading, loadingMore, page, fetchPage]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e) => e.key === "Escape" && onClose?.();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  if (!show && !open) return null;

  const content = (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4">
      <button aria-label="Close" onClick={onClose} className="absolute inset-0 bg-black/60 backdrop-blur-[2px] border-0 p-0 m-0" tabIndex={-1} />
      <div
        ref={modalRef}
        role="dialog"
        aria-modal="true"
        aria-label={title || (type === "followers" ? "Followers" : "Following")}
        className="t-modal relative w-full sm:max-w-[480px] max-h-[86dvh] sm:max-h-[76dvh] overflow-hidden rounded-t-[20px] sm:rounded-[20px] border border-[var(--cz-border)] bg-[var(--cz-surface)] shadow-[0_16px_48px_rgba(0,0,0,0.5)] flex flex-col"
      >
        <div className="sticky top-0 z-10 flex items-center justify-between border-b border-[var(--cz-border)] bg-[var(--cz-surface)] px-4 h-[56px] shrink-0">
          <h2 className="text-[15px] font-semibold tracking-[-0.02em]">{title || (type === "followers" ? "Followers" : "Following")}</h2>
          <button onClick={onClose} className="grid place-items-center h-8 w-8 rounded-[10px] hover:bg-[rgba(255,206,173,0.08)] text-[var(--cz-text-secondary)] hover:text-[var(--cz-text-primary)]" aria-label="Close">
            <X className="h-4 w-4" />
          </button>
        </div>

        <div ref={scrollRef} className="flex-1 overflow-y-auto px-4 py-2 divide-y divide-[var(--cz-border)]/50">
          {loading ? (
            <div className="py-12 grid place-items-center">
              <Loader2 className="h-6 w-6 animate-spin text-[var(--cz-text-secondary)]" />
            </div>
          ) : users.length === 0 ? (
            <div className="py-12 flex flex-col items-center text-center">
              <span className="grid place-items-center h-12 w-12 rounded-[14px] bg-[var(--cz-surface-strong)] border border-[var(--cz-border)] text-[var(--cz-text-secondary)] mb-3">
                <Users className="h-6 w-6" />
              </span>
              <p className="text-[13px] font-medium">No {type} yet</p>
              <p className="text-[12px] leading-[16px] text-[var(--cz-text-secondary)] mt-1">When students follow, they’ll appear here.</p>
            </div>
          ) : (
            users.map((u) => <UserRow key={u._id} user={u} viewerId={viewerId} />)
          )}
          <div ref={sentinelRef} className="h-1" aria-hidden />
          {loadingMore ? (
            <div className="flex items-center justify-center gap-2 py-4 text-[13px] text-[var(--cz-text-secondary)]">
              <Loader2 className="h-4 w-4 animate-spin" /> Loading…
            </div>
          ) : null}
          {!hasMore && users.length > 0 ? <p className="text-center text-[11px] text-[var(--cz-text-secondary)]/60 py-3">End • {users.length} {type}</p> : null}
        </div>
      </div>
    </div>
  );

  if (typeof document === "undefined") return null;
  return createPortal(content, document.body);
}
