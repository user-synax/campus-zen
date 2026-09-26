"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Users, Search, Plus, ArrowRight } from "lucide-react";
import { api } from "@/lib/api";

function initialsFor(u) {
  return (u.fullName || u.username || "U").trim().slice(0, 1).toUpperCase();
}

function SuggestRow({ user, onFollowed }) {
  const [following, setFollowing] = useState(Boolean(user.isFollowing));
  const [busy, setBusy] = useState(false);

  const toggle = async () => {
    if (busy) return;
    setBusy(true);
    try {
      if (following) {
        await api.unfollowUser(user._id);
        setFollowing(false);
      } else {
        await api.followUser(user._id);
        setFollowing(true);
      }
      onFollowed?.(user._id, !following);
    } catch {
      // silent — button stays in prior state
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="flex items-center gap-2.5 py-2">
      <Link href={`/u/${user.username}`} className="grid place-items-center h-9 w-9 rounded-full bg-[var(--cz-muted)] text-white text-[12px] font-semibold shrink-0 overflow-hidden">
        {user.avatarUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={user.avatarUrl} alt={user.username} className="h-full w-full object-cover" />
        ) : (
          initialsFor(user)
        )}
      </Link>
      <Link href={`/u/${user.username}`} className="min-w-0 flex-1">
        <span className="block text-[13px] font-medium leading-none truncate text-[var(--cz-text-primary)] hover:text-white transition-colors">
          {user.fullName || user.username}
        </span>
        <span className="block text-[12px] leading-none text-[var(--cz-text-secondary)] truncate mt-1">
          @{user.username}
          {user.college ? ` • ${user.college}` : ""}
        </span>
      </Link>
      <button
        onClick={toggle}
        disabled={busy}
        className={`shrink-0 inline-flex items-center justify-center rounded-full px-3 h-[28px] text-[12px] font-medium transition-colors disabled:opacity-50 ${
          following
            ? "border border-[var(--cz-border)] text-[var(--cz-text-secondary)] hover:text-[var(--cz-text-primary)] hover:border-[var(--cz-border-strong)]"
            : "bg-[var(--cz-text-primary)] text-[var(--cz-text-inverse)] hover:bg-[#ffd9c0]"
        }`}
      >
        {busy ? <span className="h-3.5 w-3.5 rounded-full border-2 border-current border-t-transparent animate-spin" /> : following ? "Following" : "Follow"}
      </button>
    </div>
  );
}

export function RightMinimal({ currentUser }) {
  const [suggested, setSuggested] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await api.listUsers({ limit: 6 });
        if (cancelled) return;
        const users = res.data?.users || [];
        const me = currentUser?.username?.toLowerCase();
        const filtered = users.filter((u) => u.username?.toLowerCase() !== me && !u.isFollowing).slice(0, 4);
        setSuggested(filtered);
      } catch {
        if (!cancelled) setSuggested([]);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [currentUser?.username]);

  const handleFollowed = (id, isNowFollowing) => {
    // remove from suggestions once followed to keep rail fresh
    if (isNowFollowing) setSuggested((prev) => prev.filter((u) => u._id !== id));
  };

  return (
    <div className="flex flex-col gap-4">
      {/* Suggested students — live */}
      <div className="rounded-[16px] border border-[var(--cz-border)] bg-[var(--cz-surface)] overflow-hidden">
        <div className="h-px w-full bg-gradient-to-r from-transparent via-[rgba(255,206,173,0.12)] to-transparent" />
        <div className="p-4">
          <h3 className="text-[11px] font-semibold tracking-[0.08em] uppercase text-[var(--cz-text-secondary)] flex items-center gap-1.5">
            <Users className="h-3.5 w-3.5" /> Suggested students
          </h3>

          <div className="mt-1 divide-y divide-[var(--cz-border)]/50">
            {loading ? (
              Array.from({ length: 3 }).map((_, i) => (
                <div key={i} className="flex items-center gap-2.5 py-2 animate-pulse">
                  <div className="h-9 w-9 rounded-full bg-[var(--cz-border)]" />
                  <div className="flex-1 space-y-1.5">
                    <div className="h-3 w-24 rounded bg-[var(--cz-border)]" />
                    <div className="h-2 w-16 rounded bg-[var(--cz-border)]/60" />
                  </div>
                  <div className="h-[28px] w-[64px] rounded-full bg-[var(--cz-border)]/60" />
                </div>
              ))
            ) : suggested.length === 0 ? (
              <div className="py-3 text-center">
                <p className="text-[13px] font-medium text-[var(--cz-text-primary)]">You&apos;re all caught up</p>
                <p className="mt-1 text-[12px] leading-[16px] text-[var(--cz-text-secondary)]">
                  No new students to suggest. Search by college or course to find more.
                </p>
                <Link
                  href="/app/search"
                  className="mt-3 inline-flex items-center justify-center gap-1 rounded-[10px] border border-[var(--cz-border)] px-3 h-[32px] text-[12px] font-medium text-[var(--cz-text-primary)] hover:bg-[rgba(255,206,173,0.06)] transition-colors"
                >
                  <Search className="h-3.5 w-3.5" /> Search students
                </Link>
              </div>
            ) : (
              suggested.map((u) => <SuggestRow key={u._id} user={u} onFollowed={handleFollowed} />)
            )}
          </div>

          {suggested.length > 0 ? (
            <Link
              href="/u"
              className="mt-2 inline-flex items-center gap-1 text-[12px] font-medium text-[var(--cz-text-secondary)] hover:text-[var(--cz-text-primary)] transition-colors"
            >
              View all students <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          ) : null}
        </div>
      </div>

      {/* Quick actions — real routes */}
      <div className="rounded-[16px] border border-[var(--cz-border)] bg-[rgba(255,255,255,0.02)] p-4">
        <h3 className="text-[11px] font-semibold tracking-[0.08em] uppercase text-[var(--cz-text-secondary)]">Explore</h3>
        <div className="mt-3 grid gap-2">
          <Link
            href="/app/search"
            className="flex items-center gap-2.5 rounded-[10px] border border-[var(--cz-border)] bg-transparent px-3 h-[36px] text-[13px] font-medium text-[var(--cz-text-primary)] hover:bg-[rgba(255,206,173,0.06)] transition-colors"
          >
            <Search className="h-4 w-4 text-[var(--cz-text-secondary)]" /> Search posts & students
          </Link>
          <Link
            href="/app/create"
            className="flex items-center gap-2.5 rounded-[10px] bg-[var(--cz-text-primary)] px-3 h-[36px] text-[13px] font-medium text-[var(--cz-text-inverse)] hover:bg-[#ffd9c0] transition-colors"
          >
            <Plus className="h-4 w-4" /> Share an update
          </Link>
        </div>
        <div className="mt-3 flex flex-wrap gap-x-3 gap-y-1 text-[11px] text-[var(--cz-text-secondary)]/70">
          <Link href="/terms" className="hover:text-[var(--cz-text-primary)]">Terms</Link>
          <Link href="/privacy" className="hover:text-[var(--cz-text-primary)]">Privacy</Link>
          <span>© 2026 CampusZen</span>
        </div>
      </div>
    </div>
  );
}
