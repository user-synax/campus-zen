"use client";

import { GraduationCap, MapPin } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { AnimatedNumber } from "@/components/app/AnimatedNumber";
import { Button } from "@/components/ui/button";
import { VerifiedBadge } from "@/components/ui/verified-badge";
import { api } from "@/lib/api";
import { collegeHrefFor } from "@/lib/college";

/**
 * DESIGN.md uses single-column lists for people, not card grids — but this
 * card is also used inside the /u directory, where a grid is the right
 * density. The surface stays flat: white on white, defined by a hairline.
 */
export function UserCard({ user: initialUser, isOwn, isGuest }) {
  const [user, setUser] = useState(initialUser);
  const [following, setFollowing] = useState(Boolean(initialUser.isFollowing));
  const [loading, setLoading] = useState(false);
  const initials = (user.fullName || user.username || "U")
    .trim()
    .slice(0, 1)
    .toUpperCase();

  return (
    <div className="flex flex-col gap-3 rounded-[16px] border border-[var(--cz-border)] p-4 transition-colors hover:bg-[color-mix(in_srgb,var(--cz-surface-strong)_50%,transparent)]">
      <Link
        href={`/u/${user.username}`}
        className="flex min-w-0 items-center gap-3"
      >
        <span className="grid h-10 w-10 shrink-0 place-items-center overflow-hidden rounded-full bg-[var(--cz-border-strong)] text-[13px] font-bold text-[var(--cz-text-primary)]">
          {user.avatarUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={user.avatarUrl}
              alt={user.username}
              className="h-full w-full object-cover"
            />
          ) : (
            initials
          )}
        </span>
        <span className="min-w-0 flex-1">
          <span className="flex items-center gap-1">
            <span className="truncate text-[15px] font-bold leading-[20px] text-[var(--cz-text-primary)]">
              {user.fullName || user.username}
            </span>
            {user.isEmailVerified ? (
              <VerifiedBadge size="sm" aria-label="Verified account" />
            ) : null}
          </span>
          <span className="block truncate text-[15px] leading-[20px] text-[var(--cz-text-secondary)]">
            @{user.username}
          </span>
        </span>
      </Link>

      {user.bio ? (
        <p className="line-clamp-2 text-[15px] leading-[20px] text-[var(--cz-text-secondary)]">
          {user.bio}
        </p>
      ) : null}

      {(user.college || user.course || user.academicYear) && (
        <div className="flex flex-col gap-1 text-[13px] leading-[16px] text-[var(--cz-text-secondary)]">
          {user.college ? (
            <span className="flex items-center gap-1.5">
              <MapPin className="h-[14px] w-[14px] shrink-0" aria-hidden />
              {collegeHrefFor(user) ? (
                <Link
                  href={collegeHrefFor(user)}
                  className="truncate text-[var(--cz-accent)] hover:underline"
                >
                  {user.college}
                </Link>
              ) : (
                <span className="truncate">{user.college}</span>
              )}
            </span>
          ) : null}
          {user.course || user.academicYear ? (
            <span className="flex items-center gap-1.5">
              <GraduationCap className="h-[14px] w-[14px] shrink-0" aria-hidden />
              <span className="truncate">
                {user.course || "—"}
                {user.academicYear ? ` · ${user.academicYear}` : ""}
              </span>
            </span>
          ) : null}
        </div>
      )}

      <div className="flex items-center gap-4 text-[13px] leading-[16px]">
        <span>
          <b className="font-bold text-[var(--cz-text-primary)]">
            <AnimatedNumber value={user.followersCount ?? 0} />
          </b>{" "}
          <span className="text-[var(--cz-text-secondary)]">Followers</span>
        </span>
        <span>
          <b className="font-bold text-[var(--cz-text-primary)]">
            <AnimatedNumber value={user.postCount ?? 0} />
          </b>{" "}
          <span className="text-[var(--cz-text-secondary)]">Posts</span>
        </span>
      </div>

      <div className="mt-auto">
        {isGuest ? (
          <Link href="/signup" className="inline-flex w-full">
            <Button className="w-full">Join to connect</Button>
          </Link>
        ) : isOwn ? (
          <Link href="/app/profile" className="inline-flex w-full">
            <Button variant="secondary" className="w-full">
              View profile
            </Button>
          </Link>
        ) : (
          <Button
            variant={following ? "secondary" : "primary"}
            disabled={loading}
            onClick={async () => {
              setLoading(true);
              try {
                if (following) {
                  await api.unfollowUser(user._id);
                  setFollowing(false);
                  setUser((u) => ({
                    ...u,
                    followersCount: Math.max(0, (u.followersCount ?? 1) - 1),
                  }));
                } else {
                  await api.followUser(user._id);
                  setFollowing(true);
                  setUser((u) => ({
                    ...u,
                    followersCount: (u.followersCount ?? 0) + 1,
                  }));
                }
              } catch {}
              setLoading(false);
            }}
            className="group w-full"
          >
            {loading ? (
              <span className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
            ) : following ? (
              <>
                <span className="group-hover:hidden">Following</span>
                <span className="hidden group-hover:inline text-[var(--cz-error)]">
                  Unfollow
                </span>
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
