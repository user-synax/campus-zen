"use client";

import { useState } from "react";
import Link from "next/link";
import { MapPin, GraduationCap } from "lucide-react";
import { Button } from "@/components/ui/button";
import { AnimatedNumber } from "@/components/app/AnimatedNumber";
import { api } from "@/lib/api";

export function UserCard({ user: initialUser, isOwn, isGuest }) {
  const [user, setUser] = useState(initialUser);
  const [following, setFollowing] = useState(Boolean(initialUser.isFollowing));
  const [loading, setLoading] = useState(false);
  const initials = (user.fullName || user.username || "U").trim().slice(0, 1).toUpperCase();
  return (
    <div className="group relative overflow-hidden rounded-[16px] border border-[var(--cz-border)] bg-[var(--cz-surface)] p-4 flex flex-col gap-3 hover:border-[var(--cz-border-strong)] hover:bg-[var(--cz-surface-strong)] transition-colors">
      <Link href={`/u/${user.username}`} className="flex items-center gap-3 min-w-0">
        <span className="grid place-items-center h-10 w-10 rounded-full bg-[var(--cz-muted)] text-white text-[13px] font-semibold shrink-0 overflow-hidden">
          {user.avatarUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={user.avatarUrl} alt={user.username} className="h-full w-full object-cover" />
          ) : (
            initials
          )}
        </span>
        <span className="min-w-0 flex-1">
          <span className="block text-[13px] font-semibold leading-none truncate text-[var(--cz-text-primary)] group-hover:text-white transition-colors">{user.fullName || user.username}</span>
          <span className="block text-[12px] leading-none text-[var(--cz-text-secondary)] truncate mt-1">@{user.username}</span>
        </span>
      </Link>

      {user.bio ? <p className="text-[12px] leading-[16px] text-[var(--cz-text-secondary)] line-clamp-2">{user.bio}</p> : <p className="text-[11px] leading-[14px] text-[var(--cz-text-secondary)]/60">Student at CampusZen</p>}

      {(user.college || user.course || user.academicYear) && (
        <div className="flex flex-wrap gap-1.5">
          {user.college ? (
            <span className="inline-flex items-center gap-1 rounded-full bg-[var(--cz-bg)] border border-[var(--cz-border)] px-2 py-1 text-[11px] leading-none text-[var(--cz-text-secondary)]">
              <MapPin className="h-3 w-3 text-[var(--cz-text-primary)]" /> {user.college}
            </span>
          ) : null}
          {user.course ? (
            <span className="inline-flex items-center gap-1 rounded-full bg-[var(--cz-bg)] border border-[var(--cz-border)] px-2 py-1 text-[11px] leading-none text-[var(--cz-text-secondary)]">
              <GraduationCap className="h-3 w-3 text-[var(--cz-text-primary)]" /> {user.course}
              {user.academicYear ? ` • ${user.academicYear}` : ""}
            </span>
          ) : user.academicYear ? (
            <span className="inline-flex items-center gap-1 rounded-full bg-[var(--cz-bg)] border border-[var(--cz-border)] px-2 py-1 text-[11px] leading-none text-[var(--cz-text-secondary)]">
              <GraduationCap className="h-3 w-3 text-[var(--cz-text-primary)]" /> {user.academicYear}
            </span>
          ) : null}
        </div>
      )}

      <div className="flex items-center gap-3 text-[11px] leading-none">
        <span>
          <b className="font-semibold text-[var(--cz-text-primary)]">
            <AnimatedNumber value={user.followersCount ?? 0} />
          </b>{" "}
          <span className="text-[var(--cz-text-secondary)]">Followers</span>
        </span>
        <span>
          <b className="font-semibold text-[var(--cz-text-primary)]">
            <AnimatedNumber value={user.postCount ?? 0} />
          </b>{" "}
          <span className="text-[var(--cz-text-secondary)]">Posts</span>
        </span>
      </div>

      <div className="mt-auto pt-1">
        {isGuest ? (
          <Link href="/signup" className="inline-flex w-full items-center justify-center rounded-[10px] bg-[var(--cz-text-primary)] text-[var(--cz-text-inverse)] h-[36px] text-[13px] font-medium hover:bg-[#ffd9c0] transition-colors">
            Join to connect
          </Link>
        ) : isOwn ? (
          <Link href="/app/profile" className="inline-flex w-full items-center justify-center rounded-[10px] border border-[var(--cz-border)] bg-transparent h-[36px] text-[13px] font-medium text-[var(--cz-text-primary)] hover:bg-[rgba(255,206,173,0.06)] transition-colors">
            View profile
          </Link>
        ) : (
          <Button
            size="sm"
            variant={following ? "secondary" : "primary"}
            disabled={loading}
            onClick={async () => {
              setLoading(true);
              try {
                if (following) {
                  await api.unfollowUser(user._id);
                  setFollowing(false);
                  setUser((u) => ({ ...u, followersCount: Math.max(0, (u.followersCount ?? 1) - 1) }));
                } else {
                  await api.followUser(user._id);
                  setFollowing(true);
                  setUser((u) => ({ ...u, followersCount: (u.followersCount ?? 0) + 1 }));
                }
              } catch {}
              setLoading(false);
            }}
            className="w-full h-[36px] min-w-[84px] group"
          >
            {loading ? (
              <span className="h-4 w-4 rounded-full border-2 border-current border-t-transparent animate-spin" />
            ) : following ? (
              <>
                <span className="group-hover:hidden">Following</span>
                <span className="hidden group-hover:inline text-[var(--cz-error)]">Unfollow</span>
              </>
            ) : (
              "Follow"
            )}
          </Button>
        )}
      </div>
    </div>
  );
}
