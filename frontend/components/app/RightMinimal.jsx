"use client";

import { ArrowRight, Search } from "lucide-react";
import Link from "next/link";
import { useEffect, useState } from "react";
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
      <Link
        href={`/u/${user.username}`}
        className="grid h-8 w-8 shrink-0 place-items-center overflow-hidden rounded-full bg-[var(--cz-muted)] text-[12px] font-semibold text-white"
      >
        {user.avatarUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={user.avatarUrl}
            alt={user.username}
            className="h-full w-full object-cover"
          />
        ) : (
          initialsFor(user)
        )}
      </Link>
      <Link href={`/u/${user.username}`} className="min-w-0 flex-1">
        <span className="block truncate text-[13px] font-medium leading-tight text-[var(--cz-text-primary)]">
          {user.fullName || user.username}
        </span>
        <span className="block truncate text-[12px] leading-tight text-[var(--cz-text-secondary)]">
          @{user.username}
          {user.college ? ` • ${user.college}` : ""}
        </span>
      </Link>
      <button
        type="button"
        onClick={toggle}
        disabled={busy}
        className={`inline-flex h-7 shrink-0 items-center justify-center rounded-full px-3 text-[12px] font-medium transition-colors disabled:opacity-50 ${
          following
            ? "text-[var(--cz-text-secondary)] hover:text-[var(--cz-text-primary)]"
            : "bg-[rgba(255,206,173,0.1)] text-[var(--cz-text-primary)] hover:bg-[rgba(255,206,173,0.16)]"
        }`}
      >
        {busy ? (
          <span className="h-3.5 w-3.5 rounded-full border-2 border-current border-t-transparent animate-spin" />
        ) : following ? (
          "Following"
        ) : (
          "Follow"
        )}
      </button>
    </div>
  );
}

function Skeleton() {
  return (
    <div className="flex flex-col">
      {Array.from({ length: 3 }).map((_, i) => (
        <div key={i} className="flex animate-pulse items-center gap-2.5 py-2">
          <div className="h-8 w-8 rounded-full bg-[var(--cz-border)]" />
          <div className="flex-1 space-y-1.5">
            <div className="h-3 w-24 rounded bg-[var(--cz-border)]" />
            <div className="h-2 w-16 rounded bg-[var(--cz-border)]/60" />
          </div>
          <div className="h-7 w-14 rounded-full bg-[var(--cz-border)]/60" />
        </div>
      ))}
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
        const filtered = users
          .filter((u) => u.username?.toLowerCase() !== me && !u.isFollowing)
          .slice(0, 4);
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
    if (isNowFollowing)
      setSuggested((prev) => prev.filter((u) => u._id !== id));
  };

  return (
    <div className="flex flex-col gap-7">
      <section>
        <h3 className="text-[11px] font-medium uppercase tracking-[0.12em] text-[var(--cz-text-secondary)]/70">
          Suggested
        </h3>
        <div className="mt-1">
          {loading ? (
            <Skeleton />
          ) : suggested.length === 0 ? (
            <p className="py-2 text-[13px] leading-[19px] text-[var(--cz-text-secondary)]">
              You&apos;re all caught up.{" "}
              <Link
                href="/app/search"
                className="text-[var(--cz-text-primary)] underline-offset-4 hover:underline"
              >
                Search
              </Link>{" "}
              to find more students.
            </p>
          ) : (
            suggested.map((u) => (
              <SuggestRow key={u._id} user={u} onFollowed={handleFollowed} />
            ))
          )}
        </div>
        {suggested.length > 0 ? (
          <Link
            href="/u"
            className="mt-1 inline-flex items-center gap-1 text-[12px] font-medium text-[var(--cz-text-secondary)] transition-colors hover:text-[var(--cz-text-primary)]"
          >
            View all <ArrowRight className="h-3 w-3" />
          </Link>
        ) : null}
      </section>

      <section className="border-t border-[var(--cz-border)] pt-5">
        <Link
          href="/app/search"
          className="flex items-center gap-2 text-[13px] text-[var(--cz-text-secondary)] transition-colors hover:text-[var(--cz-text-primary)]"
        >
          <Search className="h-4 w-4" /> Search posts & students
        </Link>
        <div className="mt-4 flex flex-wrap gap-x-3 gap-y-1 text-[11px] text-[var(--cz-text-secondary)]/60">
          <Link href="/terms" className="hover:text-[var(--cz-text-primary)]">
            Terms
          </Link>
          <Link href="/privacy" className="hover:text-[var(--cz-text-primary)]">
            Privacy
          </Link>
          <span>© 2026 CampusZen</span>
        </div>
      </section>
    </div>
  );
}
