"use client";

import { Loader2, Users, X } from "lucide-react";
import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { CzImage } from "@/components/app/CzImage";
import { Button } from "@/components/ui/button";
import { api } from "@/lib/api";

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
    <div className="flex items-center gap-3 px-1 py-2.5">
      <Link
        href={`/u/${user.username}`}
        className="flex min-w-0 flex-1 items-center gap-3"
      >
        <span className="grid h-10 w-10 shrink-0 place-items-center overflow-hidden rounded-full bg-[var(--cz-border-strong)] text-[13px] font-bold text-[var(--cz-text-primary)]">
          {user.avatarUrl ? (
            <CzImage
              src={user.avatarUrl}
              alt={user.username}
              className="h-full w-full rounded-full"
              imgClassName="h-full w-full"
            />
          ) : (
            (user.fullName || user.username || "U").slice(0, 1).toUpperCase()
          )}
        </span>
        <span className="min-w-0 flex-1 text-left">
          <span className="block truncate text-[15px] font-bold leading-[20px] text-[var(--cz-text-primary)]">
            {user.fullName || user.username}
          </span>
          <span className="block truncate text-[15px] leading-[20px] text-[var(--cz-text-secondary)]">
            @{user.username}
          </span>
          {user.bio ? (
            <span className="mt-0.5 block truncate text-[13px] leading-[16px] text-[var(--cz-text-secondary)]">
              {user.bio}
            </span>
          ) : null}
        </span>
      </Link>
      {isOwn ? (
        <span className="shrink-0 px-2 text-[13px] text-[var(--cz-text-secondary)]">
          You
        </span>
      ) : (
        <Button
          variant={following ? "secondary" : "primary"}
          size="sm"
          onClick={handle}
          disabled={loading}
          className="min-w-[92px] shrink-0"
        >
          {loading ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : following ? (
            "Following"
          ) : (
            "Follow"
          )}
        </Button>
      )}
    </div>
  );
}

export function FollowModal({
  open,
  onClose,
  userId,
  type = "followers",
  title,
  viewerId,
}) {
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
    [userId, type],
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
      const t = setTimeout(
        () => modalRef.current?.classList.add("is-open"),
        10,
      );
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
        if (entries[0].isIntersecting && hasMore && !loading && !loadingMore)
          fetchPage(page + 1);
      },
      { root, rootMargin: "200px" },
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
      <button
        type="button"
        aria-label="Close"
        onClick={onClose}
        className={`t-backdrop ${open ? "is-open" : "is-closing"} absolute inset-0 cursor-default border-0 bg-[var(--cz-overlay)] p-0 backdrop-blur-[2px] m-0`}
        tabIndex={-1}
      />
      <div
        ref={modalRef}
        role="dialog"
        aria-modal="true"
        aria-label={title || (type === "followers" ? "Followers" : "Following")}
        className="t-modal relative flex w-full max-h-[86dvh] flex-col overflow-hidden rounded-t-[16px] border border-[var(--cz-border)] bg-[var(--cz-elevated)] shadow-[var(--shadow-sm)] sm:max-h-[76dvh] sm:max-w-[480px] sm:rounded-[16px]"
      >
        <div className="sticky top-0 z-10 flex h-[53px] shrink-0 items-center justify-between border-b border-[var(--cz-border)] bg-[var(--cz-elevated)] px-4">
          <h2 className="text-[20px] leading-6 font-extrabold text-[var(--cz-text-primary)]">
            {title || (type === "followers" ? "Followers" : "Following")}
          </h2>
          <button
            onClick={onClose}
            className="-mr-1 grid h-[34px] w-[34px] place-items-center rounded-full text-[var(--cz-text-secondary)] transition-colors hover:bg-[var(--cz-surface-strong)] hover:text-[var(--cz-text-primary)]"
            aria-label="Close"
          >
            <X className="h-[18px] w-[18px]" />
          </button>
        </div>

        <div
          ref={scrollRef}
          className="flex-1 divide-y divide-[var(--cz-border)] overflow-y-auto px-4 py-1"
        >
          {loading ? (
            <div className="grid place-items-center py-12">
              <Loader2 className="h-6 w-6 animate-spin text-[var(--cz-text-secondary)]" />
            </div>
          ) : users.length === 0 ? (
            <div className="flex flex-col items-center py-12 text-center">
              <span className="mb-3 grid h-12 w-12 place-items-center rounded-full text-[var(--cz-text-secondary)]">
                <Users className="h-6 w-6" strokeWidth={1.6} />
              </span>
              <p className="text-[20px] font-extrabold leading-6">
                No {type} yet
              </p>
              <p className="mt-2 text-[15px] leading-[20px] text-[var(--cz-text-secondary)]">
                When students follow, they&apos;ll appear here.
              </p>
            </div>
          ) : (
            users.map((u) => (
              <UserRow key={u._id} user={u} viewerId={viewerId} />
            ))
          )}
          <div ref={sentinelRef} className="h-1" aria-hidden />
          {loadingMore ? (
            <div className="flex items-center justify-center gap-2 py-4 text-[15px] text-[var(--cz-text-secondary)]">
              <Loader2 className="h-4 w-4 animate-spin" /> Loading…
            </div>
          ) : null}
          {!hasMore && users.length > 0 ? (
            <p className="py-4 text-center text-[13px] text-[var(--cz-text-secondary)]">
              {users.length} {type}
            </p>
          ) : null}
        </div>
      </div>
    </div>
  );

  if (typeof document === "undefined") return null;
  return createPortal(content, document.body);
}
