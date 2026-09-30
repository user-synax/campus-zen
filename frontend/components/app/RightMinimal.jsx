"use client";

import { Hash, Search } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { VerifiedBadge } from "@/components/ui/verified-badge";
import { api } from "@/lib/api";

function initialsFor(u) {
  return (u.fullName || u.username || "U").trim().slice(0, 1).toUpperCase();
}

function Avatar({ user, size = 40 }) {
  return (
    <span
      className="grid shrink-0 place-items-center overflow-hidden rounded-full bg-[var(--cz-border-strong)] font-bold text-[var(--cz-text-primary)]"
      style={{ height: size, width: size, fontSize: size * 0.36 }}
    >
      {user.avatarUrl ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={user.avatarUrl}
          alt=""
          loading="lazy"
          decoding="async"
          className="h-full w-full object-cover"
        />
      ) : (
        initialsFor(user)
      )}
    </span>
  );
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
      // silent — button stays in its prior state
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="flex items-center gap-3 py-3">
      <Link href={`/u/${user.username}`} className="shrink-0">
        <Avatar user={user} />
      </Link>
      <Link href={`/u/${user.username}`} className="min-w-0 flex-1">
        <span className="flex items-center gap-1">
          <span className="truncate text-[15px] font-bold text-[var(--cz-text-primary)]">
            {user.fullName || user.username}
          </span>
          {user.isEmailVerified ? (
            <VerifiedBadge size="sm" aria-label="Verified" />
          ) : null}
        </span>
        <span className="block truncate text-[15px] leading-[20px] text-[var(--cz-text-secondary)]">
          {user.suggestReason ||
            user.college ||
            (user.course ? user.course : `@${user.username}`)}
        </span>
      </Link>
      {/* Followed state inverts to outlined — DESIGN.md */}
      <Button
        type="button"
        onClick={toggle}
        disabled={busy}
        size="sm"
        variant={following ? "secondary" : "primary"}
        className="shrink-0"
      >
        {busy ? (
          <span className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
        ) : following ? (
          "Following"
        ) : (
          "Follow"
        )}
      </Button>
    </div>
  );
}

function Skeleton() {
  return (
    <div className="flex flex-col divide-y divide-[var(--cz-border)]">
      {Array.from({ length: 3 }).map((_, i) => (
        <div key={i} className="flex animate-pulse items-center gap-3 py-3">
          <div className="h-10 w-10 rounded-full bg-[var(--cz-skeleton)]" />
          <div className="flex-1 space-y-2">
            <div className="h-3 w-28 rounded bg-[var(--cz-skeleton)]" />
            <div className="h-3 w-20 rounded bg-[var(--cz-skeleton)]" />
          </div>
          <div className="h-8 w-20 rounded-full bg-[var(--cz-skeleton)]" />
        </div>
      ))}
    </div>
  );
}

export function RightMinimal({ currentUser }) {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [suggested, setSuggested] = useState([]);
  const [loading, setLoading] = useState(true);
  const [trending, setTrending] = useState([]);
  const [trendingLoading, setTrendingLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await api.getSuggestions({ limit: 6 });
        if (cancelled) return;
        const users = res.data?.users || [];
        const me = currentUser?.username?.toLowerCase();
        setSuggested(
          users
            .filter((u) => u.username?.toLowerCase() !== me && !u.isFollowing)
            .slice(0, 3),
        );
      } catch {
        if (!cancelled) {
          // ranked endpoint unavailable — fall back to recent users
          try {
            const res = await api.listUsers({ limit: 6 });
            if (cancelled) return;
            const users = res.data?.users || [];
            const me = currentUser?.username?.toLowerCase();
            setSuggested(
              users
                .filter((u) => u.username?.toLowerCase() !== me && !u.isFollowing)
                .slice(0, 3),
            );
          } catch {
            if (!cancelled) setSuggested([]);
          }
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [currentUser?.username]);

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      try {
        const res = await api.getTrendingHashtags({ limit: 6 });
        if (!cancelled) setTrending(res.data?.tags || []);
      } catch {
        if (!cancelled) setTrending([]);
      } finally {
        if (!cancelled) setTrendingLoading(false);
      }
    };
    load();
    const refresh = () => {
      setTrendingLoading(true);
      load();
    };
    window.addEventListener("cz:hashtag-trending", refresh);
    return () => {
      cancelled = true;
      window.removeEventListener("cz:hashtag-trending", refresh);
    };
  }, []);

  const handleFollowed = (id, isNowFollowing) => {
    if (isNowFollowing) setSuggested((prev) => prev.filter((u) => u._id !== id));
  };

  const submitSearch = (e) => {
    e.preventDefault();
    const q = query.trim();
    if (q) router.push(`/app/search?q=${encodeURIComponent(q)}`);
  };

  return (
    <div className="sticky top-0 flex flex-col gap-4 px-2 py-3">
      {/* DESIGN.md — Search Input: mist fill, no visible border */}
      <form onSubmit={submitSearch} role="search">
        <div className="flex h-[44px] items-center gap-3 rounded-full bg-[var(--cz-surface-strong)] px-4 transition-colors focus-within:ring-1 focus-within:ring-[var(--cz-accent)]">
          <Search
            className="h-[18px] w-[18px] shrink-0 text-[var(--cz-text-secondary)]"
            aria-hidden
          />
          <input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search"
            aria-label="Search CampusZen"
            className="h-full min-w-0 flex-1 bg-transparent text-[15px] text-[var(--cz-text-primary)] outline-none placeholder:text-[var(--cz-text-secondary)]"
          />
        </div>
      </form>

      <section className="overflow-hidden rounded-[16px] border border-[var(--cz-border)]">
        <h2 className="px-4 pt-3 pb-1 text-[20px] leading-6 font-extrabold text-[var(--cz-text-primary)]">
          What&apos;s happening
        </h2>
        {trendingLoading ? (
          <div className="flex flex-col gap-2 p-4">
            {Array.from({ length: 3 }).map((_, i) => (
              <div
                key={i}
                className="h-9 animate-pulse rounded bg-[var(--cz-skeleton)]"
              />
            ))}
          </div>
        ) : trending.length === 0 ? (
          <p className="px-4 pt-1 pb-4 text-[15px] leading-[20px] text-[var(--cz-text-secondary)]">
            No trends yet. Be the first to post with a #hashtag.
          </p>
        ) : (
          <ul>
            {trending.map((t) => (
              <li key={t.tag}>
                <Link
                  href={`/app/tag/${encodeURIComponent(t.tag)}`}
                  className="block px-4 py-2 transition-colors hover:bg-[var(--cz-surface-strong)]"
                >
                  <span className="block text-[13px] leading-[16px] text-[var(--cz-text-secondary)]">
                    {t.count} {t.count === 1 ? "post" : "posts"}
                  </span>
                  <span className="mt-0.5 flex items-center gap-1 text-[15px] font-bold leading-[20px] text-[var(--cz-text-primary)]">
                    <Hash className="h-[15px] w-[15px] shrink-0" aria-hidden />
                    {t.tag}
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        )}
        <Link
          href="/app/search"
          className="block px-4 py-3 text-[15px] text-[var(--cz-accent)] transition-colors hover:bg-[var(--cz-surface-strong)]"
        >
          Show more
        </Link>
      </section>

      <section className="overflow-hidden rounded-[16px] border border-[var(--cz-border)]">
        <h2 className="px-4 pt-3 pb-1 text-[20px] leading-6 font-extrabold text-[var(--cz-text-primary)]">
          Who to follow
        </h2>
        {loading ? (
          <Skeleton />
        ) : suggested.length === 0 ? (
          <p className="px-4 pt-1 pb-4 text-[15px] leading-[20px] text-[var(--cz-text-secondary)]">
            You&apos;re all caught up.{" "}
            <Link href="/u" className="text-[var(--cz-accent)] hover:underline">
              Browse students
            </Link>{" "}
            to find more.
          </p>
        ) : (
          <div className="divide-y divide-[var(--cz-border)]">
            {suggested.map((u) => (
              <div key={u._id} className="px-4">
                <SuggestRow user={u} onFollowed={handleFollowed} />
              </div>
            ))}
          </div>
        )}
        {suggested.length > 0 ? (
          <Link
            href="/u"
            className="block px-4 py-3 text-[15px] text-[var(--cz-accent)] transition-colors hover:bg-[var(--cz-surface-strong)]"
          >
            Show more
          </Link>
        ) : null}
      </section>

      <footer className="px-1 py-2">
        <nav aria-label="Footer" className="flex flex-wrap gap-x-3 gap-y-1">
          {[
            { href: "/terms", label: "Terms of Service" },
            { href: "/privacy", label: "Privacy Policy" },
            { href: "/c", label: "Colleges" },
            { href: "/u", label: "Students" },
            { href: "/app/menu", label: "Settings" },
          ].map((l) => (
            <Link
              key={l.href}
              href={l.href}
              className="text-[13px] text-[var(--cz-text-secondary)] hover:underline"
            >
              {l.label}
            </Link>
          ))}
        </nav>
        <p className="mt-2 text-[13px] text-[var(--cz-text-secondary)]">
          © {new Date().getFullYear()} CampusZen
        </p>
      </footer>
    </div>
  );
}
