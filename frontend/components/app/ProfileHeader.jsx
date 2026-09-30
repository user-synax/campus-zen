"use client";

import {
  Ban,
  Calendar,
  Flag,
  Github,
  GraduationCap,
  Instagram,
  Linkedin,
  MapPin,
  MoreHorizontal,
  Twitter,
} from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { AnimatedNumber } from "@/components/app/AnimatedNumber";
import { Button } from "@/components/ui/button";
import { VerifiedBadge } from "@/components/ui/verified-badge";
import { collegeHrefFor } from "@/lib/college";
import { cn } from "@/lib/utils";

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

  const socialEntries = [
    user.socialLinks?.github && {
      key: "github",
      href: `https://github.com/${user.socialLinks.github}`,
      label: user.socialLinks.github,
      Icon: Github,
    },
    user.socialLinks?.twitter && {
      key: "twitter",
      href: `https://x.com/${user.socialLinks.twitter.replace(/^@/, "")}`,
      label: `@${user.socialLinks.twitter.replace(/^@/, "")}`,
      Icon: Twitter,
    },
    user.socialLinks?.linkedin && {
      key: "linkedin",
      href: user.socialLinks.linkedin.startsWith("http")
        ? user.socialLinks.linkedin
        : `https://linkedin.com/in/${user.socialLinks.linkedin}`,
      label: "LinkedIn",
      Icon: Linkedin,
    },
    user.socialLinks?.instagram && {
      key: "instagram",
      href: `https://instagram.com/${user.socialLinks.instagram.replace(/^@/, "")}`,
      label: `@${user.socialLinks.instagram.replace(/^@/, "")}`,
      Icon: Instagram,
    },
  ].filter(Boolean);

  return (
    <div>
      {/*
        Banner. It is its own stacking context at z-0 so the avatar
        wrapper (z-10) always paints on top of it — without this the
        banner covers the avatar on the profile pages.
      */}
      <div className="relative z-0 h-[132px] w-full overflow-hidden bg-[var(--cz-surface-strong)] sm:h-[190px]">
        {user.coverUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={user.coverUrl}
            alt=""
            decoding="async"
            className="absolute inset-0 h-full w-full object-cover"
          />
        ) : null}
      </div>

      <div className="px-4 pb-3">
        {/* 133px avatar overlapping the banner by ~33px */}
        <div className="relative z-10 flex items-start justify-between">
          <span className="-mt-[33px] block h-[100px] w-[100px] overflow-hidden rounded-full border-4 border-[var(--cz-bg)] bg-[var(--cz-border-strong)] text-[26px] font-bold text-[var(--cz-text-primary)] transition-transform duration-200 ease-out hover:scale-[1.02] sm:h-[133px] sm:w-[133px]">
            {user.avatarUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={user.avatarUrl}
                alt={displayName}
                decoding="async"
                className="h-full w-full object-cover"
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
                      <Flag className="h-[18px] w-[18px] shrink-0" aria-hidden />
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
            {user.isEmailVerified ? (
              <VerifiedBadge size="md" aria-label="Verified account" />
            ) : null}
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
          {socialEntries.map(({ key, href, label, Icon }) => (
            <a
              key={key}
              href={href}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1.5 text-[var(--cz-accent)] hover:underline"
            >
              <Icon className="h-[17px] w-[17px] shrink-0" aria-hidden />
              {label}
            </a>
          ))}
        </div>

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
