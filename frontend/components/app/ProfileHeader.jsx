"use client";

import {
  Ban,
  Calendar,
  Flag,
  GraduationCap,
  MapPin,
  MoreHorizontal,
} from "lucide-react";
import Link from "next/link";
import { memo, useMemo, useState } from "react";
import { AnimatedNumber } from "@/components/app/AnimatedNumber";
import { CzImage } from "@/components/app/CzImage";
import { Button } from "@/components/ui/button";
import { UserBadge } from "@/components/ui/verified-badge";
import { collegeHrefFor } from "@/lib/college";
import { cn } from "@/lib/utils";

// Simple single-color brand glyphs (Simple Icons style, currentColor).
// Lucide's brand icons are deprecated, so the social chips carry their own
// minimal marks — no extra dependency, no icon-font flash.
// Width/height are set as attributes (not just Tailwind classes) so the
// glyphs can never blow up to their intrinsic SVG size.
function GithubIcon({ className }) {
  return (
    <svg
      width="18"
      height="18"
      viewBox="0 0 24 24"
      fill="currentColor"
      className={className}
      aria-hidden
    >
      <path d="M12 .297c-6.63 0-12 5.373-12 12 0 5.303 3.438 9.8 8.205 11.385.6.113.82-.258.82-.577 0-.285-.01-1.04-.015-2.04-3.338.724-4.042-1.61-4.042-1.61C4.422 18.07 3.633 17.7 3.633 17.7c-1.087-.744.084-.729.084-.729 1.205.084 1.838 1.236 1.838 1.236 1.07 1.835 2.809 1.305 3.495.998.108-.776.417-1.305.76-1.605-2.665-.3-5.466-1.332-5.466-5.93 0-1.31.465-2.38 1.235-3.22-.135-.303-.54-1.523.105-3.176 0 0 1.005-.322 3.3 1.23.96-.267 1.98-.399 3-.405 1.02.006 2.04.138 3 .405 2.28-1.552 3.285-1.23 3.285-1.23.645 1.653.24 2.873.12 3.176.765.84 1.23 1.91 1.23 3.22 0 4.61-2.805 5.625-5.475 5.92.42.36.81 1.096.81 2.22 0 1.606-.015 2.896-.015 3.286 0 .315.21.69.825.57C20.565 22.092 24 17.592 24 12.297c0-6.627-5.373-12-12-12" />
    </svg>
  );
}

function XIcon({ className }) {
  return (
    <svg
      width="18"
      height="18"
      viewBox="0 0 24 24"
      fill="currentColor"
      className={className}
      aria-hidden
    >
      <path d="M18.901 1.153h3.68l-8.04 9.19L24 22.846h-7.406l-5.8-7.584-6.638 7.584H.474l8.6-9.83L0 1.154h7.594l5.243 6.932ZM17.61 20.644h2.039L6.486 3.24H4.298Z" />
    </svg>
  );
}

function LinkedinIcon({ className }) {
  return (
    <svg
      width="18"
      height="18"
      viewBox="0 0 24 24"
      fill="currentColor"
      className={className}
      aria-hidden
    >
      <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.225 0z" />
    </svg>
  );
}

function InstagramIcon({ className }) {
  return (
    <svg
      width="18"
      height="18"
      viewBox="0 0 24 24"
      fill="currentColor"
      className={className}
      aria-hidden
    >
      <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z" />
    </svg>
  );
}

const menuItemClass =
  "flex w-full items-center gap-3 px-4 py-2 text-left text-[15px] leading-[20px] text-[var(--cz-text-primary)] transition-colors hover:bg-[var(--cz-surface-strong)] disabled:opacity-50";

export function ProfileHeader({
  user,
  isOwn,
  onEdit,
  onFollow,
  isFollowing,
  followLoading,
  onFollowersClick,
  onFollowingClick,
  onReportUser,
  onBlockToggle,
  isBlocked,
  blockLoading,
}) {
  const [menuOpen, setMenuOpen] = useState(false);
  const initials = (user.fullName || user.username || "U")
    .trim()
    .slice(0, 2)
    .toUpperCase();
  const displayName = user.fullName || user.username;
  const bio = user.bio;
  const collegeLine = [
    user.college,
    user.course
      ? `${user.course}${user.academicYear ? `, ${user.academicYear}` : ""}`
      : user.academicYear,
  ]
    .filter(Boolean)
    .join(" · ");

  const socialEntries = useMemo(() => {
    // Treat null/empty/"null"/"undefined" (legacy rows saved as the string
    // "null" by String(null)) as missing — never render a /null link.
    const clean = (v) => {
      if (v == null) return "";
      const s = String(v).trim();
      if (!s) return "";
      const low = s.toLowerCase();
      if (low === "null" || low === "undefined" || low === "none") return "";
      return s;
    };

    const github = clean(user.socialLinks?.github);
    const twitter = clean(user.socialLinks?.twitter).replace(/^@/, "").trim();
    const linkedinRaw = clean(user.socialLinks?.linkedin);
    const instagram = clean(user.socialLinks?.instagram)
      .replace(/^@/, "")
      .trim();
    // linkedin may be a full URL or a bare handle
    const linkedin = linkedinRaw
      .replace(/^https?:\/\/(www\.)?linkedin\.com\/in\//i, "")
      .replace(/\/$/, "")
      .trim();

    const isValid = (s) => {
      if (!s) return false;
      const low = s.toLowerCase();
      return low !== "null" && low !== "undefined" && s !== "@";
    };

    return [
      isValid(github) && {
        key: "github",
        href: `https://github.com/${github}`,
        label: github,
        Icon: GithubIcon,
      },
      isValid(twitter) && {
        key: "twitter",
        href: `https://x.com/${twitter}`,
        label: `@${twitter}`,
        Icon: XIcon,
      },
      isValid(linkedin) && {
        key: "linkedin",
        href: linkedinRaw.toLowerCase().startsWith("http")
          ? linkedinRaw
          : `https://linkedin.com/in/${linkedin}`,
        label: "LinkedIn",
        Icon: LinkedinIcon,
      },
      isValid(instagram) && {
        key: "instagram",
        href: `https://instagram.com/${instagram}`,
        label: `@${instagram}`,
        Icon: InstagramIcon,
      },
    ].filter(Boolean);
  }, [
    user.socialLinks?.github,
    user.socialLinks?.twitter,
    user.socialLinks?.linkedin,
    user.socialLinks?.instagram,
  ]);

  return (
    <div>
      {/*
        Banner. It is its own stacking context at z-0 so the avatar
        wrapper (z-10) always paints on top of it — without this the
        banner covers the avatar on the profile pages.
      */}
      <div className="relative z-0 h-[132px] w-full overflow-hidden bg-[var(--cz-surface-strong)] sm:h-[190px]">
        {user.coverUrl ? (
          <CzImage
            src={user.coverUrl}
            alt=""
            className="absolute inset-0 h-full w-full"
            imgClassName="absolute inset-0 h-full w-full"
          />
        ) : null}
      </div>

      <div className="px-4 pb-3">
        {/* 133px avatar overlapping the banner by ~33px */}
        <div className="relative z-10 flex items-start justify-between">
          <span className="-mt-[33px] block h-[100px] w-[100px] overflow-hidden rounded-full border-4 border-[var(--cz-bg)] bg-[var(--cz-border-strong)] text-[26px] font-bold text-[var(--cz-text-primary)] transition-transform duration-200 ease-out hover:scale-[1.02] sm:h-[133px] sm:w-[133px]">
            {user.avatarUrl ? (
              <CzImage
                src={user.avatarUrl}
                alt={displayName}
                className="h-full w-full rounded-full"
                imgClassName="h-full w-full"
              />
            ) : (
              <span className="grid h-full w-full place-items-center">
                {initials.slice(0, 1)}
              </span>
            )}
          </span>

          <div className="flex items-center gap-2 pt-3">
            {isOwn ? (
              <Button variant="secondary" onClick={onEdit}>
                Edit profile
              </Button>
            ) : onFollow ? (
              <Button
                variant={isFollowing ? "secondary" : "primary"}
                onClick={onFollow}
                disabled={!!followLoading}
                className="group min-w-[120px]"
              >
                {followLoading ? (
                  <span className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
                ) : isFollowing ? (
                  <>
                    <span className="group-hover:hidden">Following</span>
                    <span className="hidden group-hover:inline">Unfollow</span>
                  </>
                ) : (
                  "Follow"
                )}
              </Button>
            ) : null}
            {!isOwn && onReportUser ? (
              <div className="relative">
                <button
                  aria-label="More profile actions"
                  aria-expanded={menuOpen}
                  onClick={() => setMenuOpen((v) => !v)}
                  className="grid h-[36px] w-[36px] place-items-center rounded-full border border-[var(--cz-border-strong)] text-[var(--cz-text-secondary)] transition-colors hover:bg-[var(--cz-surface-strong)] hover:text-[var(--cz-text-primary)]"
                >
                  <MoreHorizontal className="h-[18px] w-[18px]" aria-hidden />
                </button>
                {menuOpen ? (
                  <div
                    role="menu"
                    className="absolute right-0 top-10 z-20 w-[220px] overflow-hidden rounded-[16px] border border-[var(--cz-border)] bg-[var(--cz-elevated)] py-1 shadow-[var(--shadow-sm)]"
                  >
                    <button
                      role="menuitem"
                      onClick={() => {
                        onReportUser?.();
                        setMenuOpen(false);
                      }}
                      className={cn(
                        menuItemClass,
                        "text-[var(--cz-error)] hover:bg-[color-mix(in_srgb,var(--cz-error)_10%,transparent)]",
                      )}
                    >
                      <Flag
                        className="h-[18px] w-[18px] shrink-0"
                        aria-hidden
                      />
                      Report @{user.username}
                    </button>
                    <button
                      role="menuitem"
                      onClick={() => {
                        onBlockToggle?.();
                        setMenuOpen(false);
                      }}
                      disabled={!!blockLoading}
                      className={cn(
                        menuItemClass,
                        "text-[var(--cz-error)] hover:bg-[color-mix(in_srgb,var(--cz-error)_10%,transparent)]",
                      )}
                    >
                      <Ban className="h-[18px] w-[18px] shrink-0" aria-hidden />
                      {isBlocked
                        ? `Unblock @${user.username}`
                        : `Block @${user.username}`}
                    </button>
                  </div>
                ) : null}
              </div>
            ) : null}
          </div>
        </div>

        <div className="mt-3">
          <h1 className="flex items-center gap-1.5 text-[20px] leading-6 font-extrabold text-[var(--cz-text-primary)]">
            <span className="truncate">{displayName}</span>
            <UserBadge user={user} size="md" />
          </h1>
          <p className="mt-0.5 text-[15px] leading-[20px] text-[var(--cz-text-secondary)]">
            {user.followersCount != null || user.followingCount != null ? (
              <span className="font-bold text-[var(--cz-text-primary)]">
                <AnimatedNumber value={user.followersCount ?? 0} /> Followers
              </span>
            ) : null}
            {user.followersCount != null || user.followingCount != null ? (
              <span className="mx-1 text-[var(--cz-text-secondary)]">·</span>
            ) : null}
            <span className="font-bold text-[var(--cz-text-primary)]">
              <AnimatedNumber value={user.followingCount ?? 0} /> Following
            </span>
          </p>
        </div>

        {bio ? (
          <p className="mt-3 max-w-[60ch] text-[15px] leading-[20px] text-[var(--cz-text-primary)]">
            {bio}
          </p>
        ) : null}

        {/* metadata row — Graphite, 15px */}
        <div className="mt-3 flex flex-col gap-1 text-[15px] leading-[20px] text-[var(--cz-text-secondary)]">
          {user.college ? (
            <span className="flex items-center gap-1.5">
              <MapPin className="h-[17px] w-[17px] shrink-0" aria-hidden />
              {collegeHrefFor(user) ? (
                <Link
                  href={collegeHrefFor(user)}
                  className="text-[var(--cz-accent)] hover:underline"
                >
                  {user.college}
                </Link>
              ) : (
                user.college
              )}
            </span>
          ) : null}
          {collegeLine && user.college !== collegeLine ? (
            <span className="flex items-center gap-1.5">
              <GraduationCap
                className="h-[17px] w-[17px] shrink-0"
                aria-hidden
              />
              {collegeLine}
            </span>
          ) : null}
          <span className="flex items-center gap-1.5">
            <Calendar className="h-[17px] w-[17px] shrink-0" aria-hidden />
            Joined{" "}
            {new Date(user.createdAt).toLocaleDateString("en-IN", {
              month: "long",
              year: "numeric",
            })}
          </span>
        </div>

        {/* links — bare brand icons (no circle). Rendered only when a real
            handle exists; external domains are preconnected so the first
            tap isn't a cold TLS. */}
        <SocialLinks entries={socialEntries} />

        <div className="mt-4 flex items-center gap-6 text-[15px] leading-[20px]">
          <button
            type="button"
            onClick={onFollowersClick}
            className="hover:underline"
          >
            <span className="font-bold text-[var(--cz-text-primary)]">
              <AnimatedNumber value={user.followersCount ?? 0} />
            </span>{" "}
            <span className="text-[var(--cz-text-secondary)]">Followers</span>
          </button>
          <button
            type="button"
            onClick={onFollowingClick}
            className="hover:underline"
          >
            <span className="font-bold text-[var(--cz-text-primary)]">
              <AnimatedNumber value={user.followingCount ?? 0} />
            </span>{" "}
            <span className="text-[var(--cz-text-secondary)]">Following</span>
          </button>
          <span>
            <span className="font-bold text-[var(--cz-text-primary)]">
              <AnimatedNumber value={user.postCount ?? 0} />
            </span>{" "}
            <span className="text-[var(--cz-text-secondary)]">Posts</span>
          </span>
        </div>
      </div>
    </div>
  );
}

/**
 * Social link icons — bare brand marks, no circle / border / background.
 * Memoized so typing in the edit modal or paginating tabs never re-renders
 * the row, and external origins are preconnected once so the first outbound
 * tap skips DNS+TLS setup. `items-center justify-center` (not
 * `place-items-center`, which is grid-only) keeps the glyph optically
 * centered inside its touch target on all viewports.
 */
const SocialLinks = memo(function SocialLinks({ entries }) {
  if (!entries?.length) return null;
  return (
    <>
      <link rel="preconnect" href="https://github.com" />
      <link rel="preconnect" href="https://x.com" />
      <link rel="preconnect" href="https://linkedin.com" />
      <link rel="preconnect" href="https://instagram.com" />
      <div
        className="-ml-2 mt-2 flex flex-wrap items-center gap-0.5 sm:-ml-1.5 sm:gap-1"
        aria-label="Links"
      >
        {entries.map(({ key, href, label, Icon }) => (
          <a
            key={key}
            href={href}
            target="_blank"
            rel="noopener noreferrer"
            aria-label={`${key}: ${label} (opens in new tab)`}
            title={`${key}: ${label}`}
            className="inline-flex h-10 w-10 shrink-0 cursor-pointer touch-manipulation items-center justify-center text-[var(--cz-text-primary)] transition-colors duration-150 select-none hover:text-[var(--cz-accent)] active:scale-90 sm:h-9 sm:w-9"
          >
            <Icon className="block h-5 w-5 shrink-0" aria-hidden />
          </a>
        ))}
      </div>
    </>
  );
});

/**
 * DESIGN.md — Tab Bar: 1px bottom border #cfd9de spanning full width,
 * 15px weight 500, Graphite inactive / Ink active, active tab has a
 * 2px #1d9bf0 underline at the bottom edge.
 */
export function ProfileTabs({ active = "posts", onChange }) {
  const tabs = [
    { id: "posts", label: "Posts" },
    { id: "replies", label: "Replies" },
    { id: "media", label: "Media" },
    { id: "likes", label: "Likes" },
    { id: "reposts", label: "Reposts" },
    { id: "github", label: "GitHub" },
  ];
  return (
    <div className="flex items-center overflow-x-auto border-b border-[var(--cz-border-strong)] scrollbar-none">
      {tabs.map((t) => {
        const on = active === t.id;
        return (
          <button
            key={t.id}
            onClick={() => onChange?.(t.id)}
            role="tab"
            aria-selected={on}
            className={cn(
              "relative h-[52px] shrink-0 cursor-pointer px-4 text-[15px] font-medium transition-colors",
              on
                ? "font-bold text-[var(--cz-text-primary)]"
                : "text-[var(--cz-text-secondary)] hover:bg-[var(--cz-surface-strong)] hover:text-[var(--cz-text-primary)]",
            )}
          >
            {t.label}
            {on ? (
              <span
                aria-hidden
                className="absolute inset-x-0 bottom-0 h-[2px] bg-[var(--cz-accent)]"
              />
            ) : null}
          </button>
        );
      })}
    </div>
  );
}
