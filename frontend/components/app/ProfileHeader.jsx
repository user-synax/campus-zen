"use client";

import Link from "next/link";
import { MapPin, GraduationCap, Calendar, MoreHorizontal, Github, Linkedin, Twitter, Instagram, Link2 } from "lucide-react";
import { Button } from "@/components/ui/button";

export function ProfileHeader({ user, isOwn, onEdit, onFollow }) {
  const initials = (user.fullName || user.username || "U").trim().slice(0, 2).toUpperCase();
  const displayName = user.fullName || user.username;
  const subtitle = user.bio || "Student at CampusZen • Building in public.";
  const collegeLine = [user.college, user.course ? `${user.course} • ${user.academicYear || ""}`.trim() : user.academicYear].filter(Boolean).join(" • ");

  return (
    <div className="relative isolate overflow-hidden rounded-[16px] border border-[var(--cz-border)] bg-[var(--cz-surface)]">
      {/* cover */}
      <div className="h-[88px] sm:h-[112px] w-full bg-gradient-to-br from-[var(--cz-muted)]/30 via-[var(--cz-surface-strong)] to-[var(--cz-bg)] relative z-0">
        <div aria-hidden className="absolute inset-0 opacity-40" style={{ background: "radial-gradient(600px 200px at 20% 0%, rgba(125,130,217,0.35), transparent 60%), radial-gradient(400px 160px at 80% 100%, rgba(255,206,173,0.18), transparent 60%)" }} />
      </div>

      <div className="px-4 sm:px-5 pb-4 relative z-10">
        <div className="flex items-start justify-between gap-3 -mt-8 sm:-mt-10 relative z-10">
          <span className="relative z-10 grid place-items-center h-[72px] w-[72px] sm:h-[84px] sm:w-[84px] rounded-full border-[3px] border-[var(--cz-surface)] bg-[var(--cz-bg)] text-[18px] font-semibold text-[var(--cz-text-primary)] shadow-[0_8px_24px_rgba(0,0,0,0.35)] overflow-hidden">
            {user.avatarUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={user.avatarUrl} alt={displayName} className="h-full w-full object-cover" />
            ) : (
              <span className="grid place-items-center h-full w-full bg-[var(--cz-muted)] text-white text-[20px]">{initials.slice(0, 1)}</span>
            )}
          </span>

          <div className="flex items-center gap-2 mt-10 sm:mt-12">
            {isOwn ? (
              <Button variant="secondary" size="sm" onClick={onEdit} className="h-[34px] px-4">
                Edit profile
              </Button>
            ) : (
              <Button variant="primary" size="sm" onClick={onFollow} className="h-[34px] px-5">
                Follow
              </Button>
            )}
            <button
              aria-label="More"
              className="grid place-items-center h-[34px] w-[34px] rounded-[10px] border border-[var(--cz-border)] bg-[rgba(255,255,255,0.03)] hover:bg-[rgba(255,206,173,0.06)] text-[var(--cz-text-secondary)]"
            >
              <MoreHorizontal className="h-4 w-4" />
            </button>
          </div>
        </div>

        <div className="mt-3">
          <h1 className="text-[18px] font-semibold tracking-[-0.02em] leading-none text-[var(--cz-text-primary)] flex items-center gap-2">
            {displayName}
            {user.isEmailVerified ? <span className="inline-flex items-center rounded-full bg-emerald-500/15 border border-emerald-500/20 px-1.5 py-0.5 text-[10px] font-medium tracking-[0.04em] uppercase text-emerald-300">Verified</span> : null}
          </h1>
          <p className="mt-1 text-[13px] leading-[18px] text-[var(--cz-text-secondary)]">@{user.username}</p>
          <p className="mt-2 text-[13px] leading-[19px] text-[var(--cz-text-secondary)] max-w-[60ch]">{subtitle}</p>

          {collegeLine ? (
            <div className="mt-3 flex flex-wrap items-center gap-2">
              {user.college ? (
                <span className="inline-flex items-center gap-1.5 rounded-full bg-[var(--cz-surface-strong)] border border-[var(--cz-border)] px-2.5 py-1 text-[12px] leading-none text-[var(--cz-text-secondary)]">
                  <MapPin className="h-3.5 w-3.5 text-[var(--cz-text-primary)] shrink-0" /> {user.college}
                </span>
              ) : null}
              {user.course || user.academicYear ? (
                <span className="inline-flex items-center gap-1.5 rounded-full bg-[var(--cz-surface-strong)] border border-[var(--cz-border)] px-2.5 py-1 text-[12px] leading-none text-[var(--cz-text-secondary)]">
                  <GraduationCap className="h-3.5 w-3.5 text-[var(--cz-text-primary)] shrink-0" /> {user.course || "—"} {user.academicYear ? `• ${user.academicYear}` : ""}
                </span>
              ) : null}
              <span className="inline-flex items-center gap-1.5 rounded-full bg-[var(--cz-surface-strong)] border border-[var(--cz-border)] px-2.5 py-1 text-[12px] leading-none text-[var(--cz-text-secondary)]">
                <Calendar className="h-3.5 w-3.5 text-[var(--cz-text-primary)] shrink-0" /> Joined {new Date(user.createdAt).toLocaleDateString("en-IN", { month: "short", year: "numeric" })}
              </span>
            </div>
          ) : (
            <div className="mt-3 inline-flex items-center gap-1.5 rounded-full bg-[var(--cz-surface-strong)] border border-[var(--cz-border)] px-2.5 py-1 text-[12px] leading-none text-[var(--cz-text-secondary)]/70">
              <GraduationCap className="h-3.5 w-3.5 text-[var(--cz-text-primary)]" /> Add college, course & year to be discovered.
            </div>
          )}

          {/* social links — dark chips, light icons, minimal */}
          {user.socialLinks && (user.socialLinks.github || user.socialLinks.twitter || user.socialLinks.linkedin || user.socialLinks.instagram) ? (
            <div className="mt-3 flex flex-wrap items-center gap-2">
              {user.socialLinks.github ? (
                <a
                  href={`https://github.com/${user.socialLinks.github}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 rounded-full bg-[var(--cz-bg)] border border-[var(--cz-border)] hover:border-[var(--cz-border-strong)] hover:bg-[var(--cz-surface-strong)] px-2.5 py-1 text-[12px] font-medium text-[var(--cz-text-secondary)] hover:text-[var(--cz-text-primary)] transition-colors"
                >
                  <Github className="h-3.5 w-3.5 text-[var(--cz-text-primary)]" /> {user.socialLinks.github}
                </a>
              ) : null}
              {user.socialLinks.twitter ? (
                <a
                  href={`https://x.com/${user.socialLinks.twitter.replace(/^@/, "")}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 rounded-full bg-[var(--cz-bg)] border border-[var(--cz-border)] hover:border-[var(--cz-border-strong)] hover:bg-[var(--cz-surface-strong)] px-2.5 py-1 text-[12px] font-medium text-[var(--cz-text-secondary)] hover:text-[var(--cz-text-primary)] transition-colors"
                >
                  <Twitter className="h-3.5 w-3.5 text-[var(--cz-text-primary)]" /> {user.socialLinks.twitter}
                </a>
              ) : null}
              {user.socialLinks.linkedin ? (
                <a
                  href={user.socialLinks.linkedin.startsWith("http") ? user.socialLinks.linkedin : `https://linkedin.com/in/${user.socialLinks.linkedin}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 rounded-full bg-[var(--cz-bg)] border border-[var(--cz-border)] hover:border-[var(--cz-border-strong)] hover:bg-[var(--cz-surface-strong)] px-2.5 py-1 text-[12px] font-medium text-[var(--cz-text-secondary)] hover:text-[var(--cz-text-primary)] transition-colors"
                >
                  <Linkedin className="h-3.5 w-3.5 text-[var(--cz-text-primary)]" /> LinkedIn
                </a>
              ) : null}
              {user.socialLinks.instagram ? (
                <a
                  href={`https://instagram.com/${user.socialLinks.instagram.replace(/^@/, "")}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 rounded-full bg-[var(--cz-bg)] border border-[var(--cz-border)] hover:border-[var(--cz-border-strong)] hover:bg-[var(--cz-surface-strong)] px-2.5 py-1 text-[12px] font-medium text-[var(--cz-text-secondary)] hover:text-[var(--cz-text-primary)] transition-colors"
                >
                  <Instagram className="h-3.5 w-3.5 text-[var(--cz-text-primary)]" /> {user.socialLinks.instagram}
                </a>
              ) : null}
            </div>
          ) : null}

          <div className="mt-3 flex items-center gap-4 text-[13px]">
            <span>
              <b className="font-semibold text-[var(--cz-text-primary)]">{user.followingCount ?? 0}</b>{" "}
              <span className="text-[var(--cz-text-secondary)]">Following</span>
            </span>
            <span>
              <b className="font-semibold text-[var(--cz-text-primary)]">{user.followersCount ?? 0}</b>{" "}
              <span className="text-[var(--cz-text-secondary)]">Followers</span>
            </span>
            <span>
              <b className="font-semibold text-[var(--cz-text-primary)]">{user.postCount ?? 0}</b>{" "}
              <span className="text-[var(--cz-text-secondary)]">Posts</span>
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}

export function ProfileTabs({ active = "posts", onChange }) {
  const tabs = [
    { id: "posts", label: "Posts" },
    { id: "replies", label: "Replies" },
    { id: "media", label: "Media" },
    { id: "likes", label: "Likes" },
    { id: "github", label: "GitHub" },
  ];
  return (
    <div className="flex items-center gap-1 border-b border-[var(--cz-border)] overflow-x-auto scrollbar-none">
      {tabs.map((t) => (
        <button
          key={t.id}
          onClick={() => onChange?.(t.id)}
          aria-selected={active === t.id}
          className={`relative whitespace-nowrap px-3 sm:px-4 h-[40px] text-[13px] font-medium tracking-[-0.01em] transition-colors shrink-0 ${
            active === t.id ? "text-[var(--cz-text-primary)]" : "text-[var(--cz-text-secondary)] hover:text-[var(--cz-text-primary)]"
          }`}
        >
          {t.label}
          {active === t.id ? <span className="absolute bottom-0 left-2 right-2 h-[2px] rounded-full bg-[var(--cz-text-primary)]" /> : null}
        </button>
      ))}
    </div>
  );
}
