"use client";

import {
  BadgeCheck,
  Ban,
  CalendarDays,
  ChevronRight,
  Clock,
  Copy,
  ExternalLink,
  GraduationCap,
  Mail,
  RotateCcw,
  Search,
  ShieldAlert,
  ShieldBan,
  ShieldCheck,
  X,
} from "lucide-react";
import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { UserBadge } from "@/components/ui/verified-badge";
import { api } from "@/lib/api";
import { cn } from "@/lib/utils";
import {
  AdminAvatar,
  AdminDialog,
  AdminDrawer,
  Chip,
  EmptyRows,
  ErrorBanner,
  Field,
  formatDate,
  formatDateTime,
  formatNumber,
  formatUntil,
  inputClass,
  LoadingRows,
  Panel,
  SectionIntro,
  Spinner,
  StatusPill,
  textareaClass,
  timeAgo,
} from "./ui";

const USER_STATUS_FILTERS = [
  { id: "all", label: "All" },
  { id: "good", label: "Good" },
  { id: "restricted", label: "Restricted" },
  { id: "suspended", label: "Suspended" },
  { id: "banned", label: "Banned" },
  { id: "verified", label: "Verified" },
  { id: "deactivated", label: "Deactivated" },
];

const SORTS = [
  { id: "recent", label: "Newest first" },
  { id: "active", label: "Recently active" },
  { id: "name", label: "Name A–Z" },
  { id: "posts", label: "Most posts" },
  { id: "followers", label: "Most followers" },
  { id: "oldest", label: "Oldest first" },
];

const RESTRICT_PRESETS = [
  { minutes: 60, label: "1 hour", hint: "Quick cool-off" },
  { minutes: 360, label: "6 hours", hint: "Same-day pause" },
  { minutes: 1440, label: "24 hours", hint: "One full day" },
  { minutes: 10080, label: "7 days", hint: "Long read-only" },
];

function statusOf(user) {
  return user?.displayStatus || user?.accountStatus || "good";
}

function errorMessage(err, fallback) {
  return err?.data?.message || err?.message || fallback;
}

function Identity({ user, size = 40 }) {
  return (
    <span className="flex min-w-0 items-center gap-3">
      <AdminAvatar user={user} size={size} />
      <span className="min-w-0 flex-1">
        <span className="flex items-center gap-1.5">
          <span className="truncate text-[14px] leading-[18px] font-bold text-[var(--cz-text-primary)]">
            {user.fullName || user.username || "Deleted user"}
          </span>
          <UserBadge user={user} size="sm" />
          {user.isDeactivated ? (
            <Chip className="hidden sm:inline-flex">Deactivated</Chip>
          ) : null}
        </span>
        <span className="mt-0.5 block truncate text-[12px] leading-[16px] text-[var(--cz-text-secondary)]">
          @{user.username || "unknown"}
          {user.email ? (
            <>
              <span className="px-1 text-[var(--cz-text-tertiary)]">·</span>
              {user.email}
            </>
          ) : null}
        </span>
      </span>
    </span>
  );
}

export function UsersSection({
  refreshStats,
  focusUserId,
  onFocusConsumed,
  onNavigate,
}) {
  const [query, setQuery] = useState("");
  const [debouncedQuery, setDebouncedQuery] = useState("");
  const [status, setStatus] = useState("all");
  const [sort, setSort] = useState("recent");
  const [users, setUsers] = useState([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(false);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState(null);
  const [selectedId, setSelectedId] = useState(null);
  const requestRef = useRef(0);

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedQuery(query.trim()), 280);
    return () => clearTimeout(timer);
  }, [query]);

  const load = useCallback(
    async (pg = 1, append = false) => {
      const token = ++requestRef.current;
      if (append) setLoadingMore(true);
      else setLoading(true);
      setError(null);
      try {
        const res = await api.adminUsers({
          q: debouncedQuery,
          status,
          sort,
          page: pg,
          limit: 25,
        });
        if (token !== requestRef.current) return;
        const data = res.data || {};
        const next = data.users || [];
        setUsers((prev) => (append ? [...prev, ...next] : next));
        setTotal(data.total || 0);
        setPage(data.page || pg);
        setHasMore(Boolean(data.hasMore));
      } catch (err) {
        if (token === requestRef.current) {
          setError(errorMessage(err, "Could not load students."));
        }
      } finally {
        if (token === requestRef.current) {
          setLoading(false);
          setLoadingMore(false);
        }
      }
    },
    [debouncedQuery, status, sort],
  );

  useEffect(() => {
    load(1, false);
  }, [load]);

  useEffect(() => {
    if (!focusUserId) return;
    setSelectedId(focusUserId);
    onFocusConsumed?.();
  }, [focusUserId, onFocusConsumed]);

  const handleChanged = (updated) => {
    if (!updated?._id) return;
    setUsers((prev) =>
      prev.map((u) => (u._id === updated._id ? { ...u, ...updated } : u)),
    );
    refreshStats?.();
  };

  const emptyCopy =
    debouncedQuery || status !== "all"
      ? {
          title: "No students match",
          description:
            "Try a different name, username, email, or clear the status filter.",
        }
      : {
          title: "No students yet",
          description: "New sign-ups will appear here as they join CampusZen.",
        };

  return (
    <div>
      <SectionIntro
        eyebrow="Directory"
        title="Students"
        subtitle="Every account, with the full picture behind it. Open a student to restrict them to read-only, issue a permanent ban, or manage verification."
        actions={
          <Button
            variant="secondary"
            size="sm"
            onClick={() => onNavigate?.("broadcast")}
          >
            Message students
          </Button>
        }
      />

      <Panel className="overflow-hidden">
        <div className="border-b border-[var(--cz-border)] px-4 py-3">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
            <div className="relative min-w-0 flex-1">
              <Search
                className="pointer-events-none absolute top-1/2 left-3 h-[16px] w-[16px] -translate-y-1/2 text-[var(--cz-text-secondary)]"
                aria-hidden
              />
              <input
                type="search"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search name, @username, or email"
                aria-label="Search students"
                className={cn(inputClass, "pr-9 pl-9")}
              />
              {query ? (
                <button
                  type="button"
                  onClick={() => setQuery("")}
                  aria-label="Clear search"
                  className="absolute top-1/2 right-2 grid h-[26px] w-[26px] -translate-y-1/2 place-items-center rounded-full text-[var(--cz-text-secondary)] hover:bg-[var(--cz-surface-strong)]"
                >
                  <X className="h-[15px] w-[15px]" aria-hidden />
                </button>
              ) : null}
            </div>

            <div className="flex shrink-0 items-center gap-2">
              <label htmlFor="admin-user-sort" className="sr-only">
                Sort students
              </label>
              <select
                id="admin-user-sort"
                value={sort}
                onChange={(e) => setSort(e.target.value)}
                className={cn(inputClass, "h-[40px] w-auto pr-2 text-[13px]")}
              >
                {SORTS.map((option) => (
                  <option key={option.id} value={option.id}>
                    {option.label}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <fieldset
            aria-label="Filter by account status"
            className="mt-3 flex min-w-0 gap-1.5 overflow-x-auto border-0 p-0 pb-0.5 scrollbar-none"
          >
            <legend className="sr-only">Filter by account status</legend>
            {USER_STATUS_FILTERS.map((filter) => {
              const active = status === filter.id;
              return (
                <button
                  key={filter.id}
                  type="button"
                  aria-pressed={active}
                  onClick={() => setStatus(filter.id)}
                  className={cn(
                    "h-[30px] shrink-0 rounded-full px-3 text-[12px] font-bold whitespace-nowrap transition-colors",
                    active
                      ? "bg-[var(--cz-text-primary)] text-[var(--cz-bg)]"
                      : "border border-[var(--cz-border-strong)] text-[var(--cz-text-secondary)] hover:bg-[var(--cz-surface-strong)] hover:text-[var(--cz-text-primary)]",
                  )}
                >
                  {filter.label}
                </button>
              );
            })}
          </fieldset>
        </div>

        <div className="hidden grid-cols-[minmax(0,2.2fr)_112px_112px_112px_16px] gap-3 border-b border-[var(--cz-border)] px-4 py-2 text-[11px] font-bold tracking-[0.06em] text-[var(--cz-text-tertiary)] uppercase md:grid">
          <span>Student</span>
          <span>Status</span>
          <span>Joined</span>
          <span>Last active</span>
          <span />
        </div>

        {error ? (
          <div className="px-4 py-3">
            <ErrorBanner onRetry={() => load(1, false)}>{error}</ErrorBanner>
          </div>
        ) : null}

        {loading ? (
          <LoadingRows label="Loading students…" />
        ) : users.length ? (
          <ul className="divide-y divide-[var(--cz-border)]">
            {users.map((user) => (
              <li key={user._id}>
                <button
                  type="button"
                  onClick={() => setSelectedId(user._id)}
                  className="grid w-full grid-cols-[minmax(0,1fr)_16px] items-center gap-3 px-4 py-3 text-left transition-colors hover:bg-[color-mix(in_srgb,var(--cz-surface-strong)_50%,transparent)] md:grid-cols-[minmax(0,2.2fr)_112px_112px_112px_16px]"
                >
                  <span className="min-w-0">
                    <Identity user={user} />
                    <span className="mt-1.5 flex items-center gap-1.5 md:hidden">
                      <StatusPill status={statusOf(user)} />
                      <span className="text-[11px] text-[var(--cz-text-secondary)]">
                        joined {timeAgo(user.createdAt)}
                      </span>
                    </span>
                  </span>
                  <span className="hidden md:block">
                    <StatusPill status={statusOf(user)} />
                  </span>
                  <span className="hidden text-[12px] text-[var(--cz-text-secondary)] md:block">
                    {formatDate(user.createdAt)}
                  </span>
                  <span className="hidden text-[12px] text-[var(--cz-text-secondary)] md:block">
                    {user.lastLoginAt ? timeAgo(user.lastLoginAt) : "Never"}
                  </span>
                  <ChevronRight
                    className="h-[16px] w-[16px] text-[var(--cz-text-tertiary)]"
                    aria-hidden
                  />
                </button>
              </li>
            ))}
          </ul>
        ) : (
          <EmptyRows
            icon={Search}
            title={emptyCopy.title}
            description={emptyCopy.description}
          />
        )}

        <div className="flex items-center justify-between gap-3 border-t border-[var(--cz-border)] px-4 py-3">
          <p className="text-[12px] text-[var(--cz-text-secondary)]">
            {formatNumber(total)} {total === 1 ? "student" : "students"}
            {debouncedQuery ? ` matching “${debouncedQuery}”` : ""}
          </p>
          {hasMore ? (
            <Button
              variant="secondary"
              size="sm"
              disabled={loadingMore}
              onClick={() => load(page + 1, true)}
            >
              {loadingMore ? <Spinner /> : null}
              {loadingMore ? "Loading…" : "Load more"}
            </Button>
          ) : null}
        </div>
      </Panel>

      <UserDetail
        userId={selectedId}
        onClose={() => setSelectedId(null)}
        onChanged={handleChanged}
      />
    </div>
  );
}

/* ── Detail drawer ──────────────────────────────────────────── */

function UserDetail({ userId, onClose, onChanged }) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [action, setAction] = useState(null);
  const [restrictOpen, setRestrictOpen] = useState(false);
  const [banOpen, setBanOpen] = useState(false);

  const load = useCallback(
    async (silent = false) => {
      if (!userId) return;
      if (!silent) setLoading(true);
      setError(null);
      try {
        const res = await api.adminUser(userId);
        setData(res.data || null);
      } catch (err) {
        setError(errorMessage(err, "Could not load this student."));
      } finally {
        if (!silent) setLoading(false);
      }
    },
    [userId],
  );

  useEffect(() => {
    if (!userId) {
      setData(null);
      return;
    }
    load(false);
  }, [userId, load]);

  const user = data?.user;
  const counts = data?.counts;
  const status = statusOf(user);
  const owner = Boolean(user?.isOwner);

  const applyUser = (updated) => {
    if (!updated) return;
    setData((prev) =>
      prev ? { ...prev, user: { ...prev.user, ...updated } } : prev,
    );
    onChanged?.(updated);
  };

  const finishAction = async (updated, message) => {
    applyUser(updated);
    toast.success(message);
    await load(true);
  };

  const liftRestriction = async () => {
    setAction("unrestrict");
    try {
      const res = await api.adminUnrestrictUser(userId);
      await finishAction(res.data?.user, "Restriction lifted");
    } catch (err) {
      toast.error(errorMessage(err, "Could not lift the restriction."));
    } finally {
      setAction(null);
    }
  };

  const applyRestriction = async (minutes, reason) => {
    setAction("restrict");
    try {
      const res = await api.adminRestrictUser(userId, minutes, reason);
      setRestrictOpen(false);
      await finishAction(
        res.data?.user,
        `Read-only restriction applied for ${
          RESTRICT_PRESETS.find((p) => p.minutes === minutes)?.label ||
          `${minutes} minutes`
        }`,
      );
    } catch (err) {
      toast.error(errorMessage(err, "Could not restrict the account."));
    } finally {
      setAction(null);
    }
  };

  const applyBan = async (reason) => {
    setAction("ban");
    try {
      const res = await api.adminBanUser(userId, reason);
      setBanOpen(false);
      await finishAction(res.data?.user, "Account permanently banned");
    } catch (err) {
      toast.error(errorMessage(err, "Could not ban the account."));
    } finally {
      setAction(null);
    }
  };

  const unban = async () => {
    if (
      !window.confirm(
        `Unban @${user?.username || "this student"}? They will be able to sign in and use CampusZen again.`,
      )
    )
      return;
    setAction("unban");
    try {
      const res = await api.adminUnbanUser(userId);
      await finishAction(res.data?.user, "Account reinstated");
    } catch (err) {
      toast.error(errorMessage(err, "Could not unban the account."));
    } finally {
      setAction(null);
    }
  };

  const unsuspend = async () => {
    setAction("unsuspend");
    try {
      const res = await api.adminUnsuspendUser(userId);
      await finishAction(res.data?.user, "Suspension removed");
    } catch (err) {
      toast.error(errorMessage(err, "Could not remove the suspension."));
    } finally {
      setAction(null);
    }
  };

  const toggleVerified = async () => {
    const next = !user?.isVerified;
    setAction("verify");
    try {
      const res = await api.adminSetVerified(userId, next);
      applyUser({ ...res.data?.user, isVerified: next });
      toast.success(next ? "Blue tick granted" : "Blue tick revoked");
    } catch (err) {
      toast.error(errorMessage(err, "Could not update verification."));
    } finally {
      setAction(null);
    }
  };

  const copyEmail = async () => {
    try {
      await navigator.clipboard.writeText(user?.email || "");
      toast.success("Email copied");
    } catch {
      toast.error("Could not copy the email address.");
    }
  };

  const social = user?.socialLinks || {};
  const socialLinks = [
    ["github", social.github, (v) => `https://github.com/${v}`],
    ["x", social.twitter, (v) => `https://x.com/${v}`],
    [
      "linkedin",
      social.linkedin,
      (v) => (v.startsWith("http") ? v : `https://linkedin.com/in/${v}`),
    ],
    ["instagram", social.instagram, (v) => `https://instagram.com/${v}`],
  ].filter(([, value]) => Boolean(value));

  return (
    <>
      <AdminDrawer
        open={Boolean(userId)}
        onClose={onClose}
        title={user?.fullName || "Student details"}
        subtitle={
          user ? `@${user.username} · ${user.email}` : "Loading account…"
        }
      >
        {loading && !user ? (
          <LoadingRows label="Opening student record…" />
        ) : error && !user ? (
          <div className="p-4">
            <ErrorBanner onRetry={() => load(false)}>{error}</ErrorBanner>
          </div>
        ) : user ? (
          <div className="flex flex-col gap-5 p-5">
            <div className="flex items-start gap-3.5">
              <AdminAvatar user={user} size={64} />
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-1.5">
                  <h3 className="text-[19px] leading-[24px] font-extrabold tracking-[-0.01em]">
                    {user.fullName || user.username}
                  </h3>
                  <UserBadge user={user} size="md" />
                </div>
                <div className="mt-1 flex flex-wrap items-center gap-1.5">
                  <StatusPill status={status} />
                  {user.isDeactivated ? <Chip>Deactivated</Chip> : null}
                  {user.isPrivate ? <Chip>Private</Chip> : null}
                  {user.isEmailVerified ? (
                    <Chip tone="accent">Email verified</Chip>
                  ) : (
                    <Chip>Email unverified</Chip>
                  )}
                </div>
                <div className="mt-2 flex flex-wrap items-center gap-2">
                  <a
                    href={`/u/${user.username}`}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex h-[28px] items-center gap-1 rounded-full border border-[var(--cz-border-strong)] px-2.5 text-[12px] font-bold text-[var(--cz-text-primary)] transition-colors hover:bg-[var(--cz-surface-strong)]"
                  >
                    View profile
                    <ExternalLink className="h-[12px] w-[12px]" aria-hidden />
                  </a>
                  <button
                    type="button"
                    onClick={copyEmail}
                    className="inline-flex h-[28px] items-center gap-1.5 rounded-full border border-[var(--cz-border-strong)] px-2.5 text-[12px] font-bold text-[var(--cz-text-primary)] transition-colors hover:bg-[var(--cz-surface-strong)]"
                  >
                    <Mail className="h-[12px] w-[12px]" aria-hidden />
                    {user.email}
                    <Copy className="h-[11px] w-[11px]" aria-hidden />
                  </button>
                </div>
              </div>
            </div>

            <ModerationCard
              user={user}
              status={status}
              owner={owner}
              action={action}
              busy={Boolean(action)}
              onRestrict={() => setRestrictOpen(true)}
              onUnrestrict={liftRestriction}
              onBan={() => setBanOpen(true)}
              onUnban={unban}
              onUnsuspend={unsuspend}
              onToggleVerified={toggleVerified}
            />

            {error ? <ErrorBanner>{error}</ErrorBanner> : null}

            <section>
              <h4 className="text-[12px] font-bold tracking-[0.06em] text-[var(--cz-text-secondary)] uppercase">
                Activity
              </h4>
              <div className="mt-2 grid grid-cols-2 gap-2 sm:grid-cols-4">
                {[
                  ["Posts", counts?.posts],
                  ["Followers", counts?.followers],
                  ["Following", counts?.following],
                  ["Sessions", counts?.sessions],
                  [
                    "Reports against",
                    counts?.reportsAgainst,
                    counts?.openReports
                      ? `${counts.openReports} open`
                      : "none open",
                  ],
                  ["Reports filed", counts?.reportsFiled],
                  ["Appeals", counts?.appeals],
                  ["Verifications", counts?.verifications],
                ].map(([label, value, sub]) => (
                  <StatBox key={label} label={label} value={value} sub={sub} />
                ))}
              </div>
            </section>

            <section>
              <h4 className="text-[12px] font-bold tracking-[0.06em] text-[var(--cz-text-secondary)] uppercase">
                Profile
              </h4>
              <div className="mt-2 rounded-xl border border-[var(--cz-border)]">
                <dl className="divide-y divide-[var(--cz-border)]">
                  <Fact
                    icon={GraduationCap}
                    label="College"
                    value={
                      user.college ||
                      (user.collegeSlug ? user.collegeSlug : "Not provided")
                    }
                  />
                  <Fact
                    icon={GraduationCap}
                    label="Course"
                    value={
                      [user.course, user.academicYear]
                        .filter(Boolean)
                        .join(" · ") || "Not provided"
                    }
                  />
                  <Fact
                    icon={CalendarDays}
                    label="Joined"
                    value={formatDateTime(user.createdAt)}
                  />
                  <Fact
                    icon={Clock}
                    label="Last login"
                    value={
                      user.lastLoginAt
                        ? formatDateTime(user.lastLoginAt)
                        : "Never signed in"
                    }
                  />
                </dl>
                {user.bio ? (
                  <p className="border-t border-[var(--cz-border)] px-3.5 py-3 text-[13px] leading-[19px] whitespace-pre-wrap">
                    {user.bio}
                  </p>
                ) : null}
                {socialLinks.length ? (
                  <div className="flex flex-wrap gap-1.5 border-t border-[var(--cz-border)] px-3.5 py-3">
                    {socialLinks.map(([label, value, toUrl]) => (
                      <a
                        key={label}
                        href={toUrl(value)}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex h-[26px] items-center gap-1 rounded-full bg-[var(--cz-surface-strong)] px-2.5 text-[12px] font-bold text-[var(--cz-text-primary)] transition-colors hover:bg-[var(--cz-border)]"
                      >
                        {label}
                        <ExternalLink
                          className="h-[10px] w-[10px]"
                          aria-hidden
                        />
                      </a>
                    ))}
                  </div>
                ) : null}
              </div>
            </section>

            <section>
              <h4 className="text-[12px] font-bold tracking-[0.06em] text-[var(--cz-text-secondary)] uppercase">
                Recent posts
              </h4>
              {data.recentPosts?.length ? (
                <ul className="mt-2 divide-y divide-[var(--cz-border)] rounded-xl border border-[var(--cz-border)]">
                  {data.recentPosts.map((post) => (
                    <li key={post._id}>
                      <Link
                        href={`/app/p/${post._id}`}
                        target="_blank"
                        className="block px-3.5 py-3 transition-colors hover:bg-[var(--cz-surface-strong)]"
                      >
                        <p className="line-clamp-3 text-[13px] leading-[19px]">
                          {post.text || (
                            <span className="text-[var(--cz-text-secondary)]">
                              {post.isAnonymous ? "Anonymous " : ""}
                              {post.kind && post.kind !== "text"
                                ? `${post.kind} post`
                                : "Media post"}
                            </span>
                          )}
                        </p>
                        <p className="mt-1.5 flex flex-wrap items-center gap-2 text-[11px] text-[var(--cz-text-secondary)]">
                          <span>{timeAgo(post.createdAt)}</span>
                          <span>·</span>
                          <span>{formatNumber(post.likeCount)} likes</span>
                          <span>{formatNumber(post.replyCount)} replies</span>
                          <span>{formatNumber(post.repostCount)} reposts</span>
                          {post.isAnonymous ? (
                            <Chip className="h-[18px] px-1.5 text-[10px]">
                              Anonymous
                            </Chip>
                          ) : null}
                        </p>
                      </Link>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="mt-2 rounded-xl border border-dashed border-[var(--cz-border-strong)] px-3.5 py-6 text-center text-[13px] text-[var(--cz-text-secondary)]">
                  This student has not posted yet.
                </p>
              )}
            </section>

            <div className="flex items-center justify-between gap-3 border-t border-[var(--cz-border)] pt-4">
              <p className="text-[11px] text-[var(--cz-text-tertiary)]">
                ID {user._id}
              </p>
              <Button variant="secondary" size="sm" onClick={onClose}>
                Close
              </Button>
            </div>
          </div>
        ) : null}
      </AdminDrawer>

      {user ? (
        <>
          <RestrictDialog
            open={restrictOpen}
            user={user}
            busy={action === "restrict"}
            onClose={() => setRestrictOpen(false)}
            onConfirm={applyRestriction}
          />
          <BanDialog
            open={banOpen}
            user={user}
            busy={action === "ban"}
            onClose={() => setBanOpen(false)}
            onConfirm={applyBan}
          />
        </>
      ) : null}
    </>
  );
}

function StatBox({ label, value, sub }) {
  return (
    <div className="rounded-xl bg-[var(--cz-surface-strong)] px-3 py-2.5">
      <p className="text-[18px] leading-none font-extrabold tabular-nums">
        {formatNumber(value)}
      </p>
      <p className="mt-1 text-[11px] leading-[14px] font-bold text-[var(--cz-text-secondary)]">
        {label}
      </p>
      {sub ? (
        <p className="mt-0.5 text-[10px] leading-[13px] text-[var(--cz-text-tertiary)]">
          {sub}
        </p>
      ) : null}
    </div>
  );
}

function Fact({ icon: Icon, label, value }) {
  return (
    <div className="flex items-start gap-2.5 px-3.5 py-2.5">
      <Icon
        className="mt-0.5 h-[14px] w-[14px] shrink-0 text-[var(--cz-text-secondary)]"
        aria-hidden
      />
      <span className="min-w-0 flex-1">
        <span className="block text-[11px] font-bold text-[var(--cz-text-secondary)]">
          {label}
        </span>
        <span className="block text-[13px] leading-[18px]">{value}</span>
      </span>
    </div>
  );
}

function ModerationCard({
  user,
  status,
  owner,
  action,
  busy,
  onRestrict,
  onUnrestrict,
  onBan,
  onUnban,
  onUnsuspend,
  onToggleVerified,
}) {
  const restricted = status === "restricted";
  const banned = status === "banned";
  const suspended = status === "suspended";

  return (
    <section
      className={cn(
        "rounded-xl border px-3.5 py-3.5",
        banned
          ? "border-[color-mix(in_srgb,var(--cz-error)_35%,var(--cz-border))] bg-[color-mix(in_srgb,var(--cz-error)_6%,transparent)]"
          : restricted || suspended
            ? "border-[color-mix(in_srgb,var(--cz-warn)_35%,var(--cz-border))] bg-[color-mix(in_srgb,var(--cz-warn)_6%,transparent)]"
            : "border-[var(--cz-border)]",
      )}
    >
      <div className="flex items-start gap-2.5">
        <span
          className={cn(
            "grid h-[30px] w-[30px] shrink-0 place-items-center rounded-full",
            banned
              ? "bg-[color-mix(in_srgb,var(--cz-error)_12%,transparent)] text-[var(--cz-error)]"
              : restricted || suspended
                ? "bg-[color-mix(in_srgb,var(--cz-warn)_14%,transparent)] text-[color-mix(in_srgb,var(--cz-warn)_72%,var(--cz-text-primary))]"
                : "bg-[var(--cz-surface-strong)] text-[var(--cz-text-secondary)]",
          )}
        >
          {banned ? (
            <ShieldBan className="h-[15px] w-[15px]" aria-hidden />
          ) : restricted || suspended ? (
            <ShieldAlert className="h-[15px] w-[15px]" aria-hidden />
          ) : (
            <ShieldCheck className="h-[15px] w-[15px]" aria-hidden />
          )}
        </span>
        <div className="min-w-0 flex-1">
          <p className="text-[14px] font-extrabold">
            {banned
              ? "Permanently banned"
              : restricted
                ? "Read-only restriction"
                : suspended
                  ? "Suspended"
                  : "Good standing"}
          </p>
          {banned ? (
            <p className="mt-0.5 text-[12px] leading-[17px] text-[var(--cz-text-secondary)]">
              Banned {formatDateTime(user.bannedAt)}
              {user.banReason ? ` — ${user.banReason}` : ""}. Sign-in is blocked
              and the profile is hidden.
            </p>
          ) : restricted ? (
            <p className="mt-0.5 text-[12px] leading-[17px] text-[var(--cz-text-secondary)]">
              Lifts {formatUntil(user.restrictedUntil)} (
              {formatDateTime(user.restrictedUntil)})
              {user.restrictionReason ? ` — ${user.restrictionReason}` : ""}
            </p>
          ) : suspended ? (
            <p className="mt-0.5 text-[12px] leading-[17px] text-[var(--cz-text-secondary)]">
              Suspended {formatDateTime(user.suspendedAt)}
              {user.suspendReason ? ` — ${user.suspendReason}` : ""}
            </p>
          ) : (
            <p className="mt-0.5 text-[12px] leading-[17px] text-[var(--cz-text-secondary)]">
              No active moderation action.
            </p>
          )}

          {owner ? (
            <p className="mt-1.5 text-[11px] font-bold text-[var(--cz-text-secondary)]">
              Owner accounts are protected from restriction and bans.
            </p>
          ) : null}

          <div className="mt-2.5 flex flex-wrap items-center gap-1.5">
            {!banned && !owner ? (
              <Button
                variant="secondary"
                size="sm"
                onClick={onRestrict}
                disabled={busy}
              >
                {busy && action === "restrict" ? (
                  <Spinner />
                ) : (
                  <Clock className="h-[14px] w-[14px]" aria-hidden />
                )}
                {restricted ? "Change restriction" : "Restrict"}
              </Button>
            ) : null}
            {restricted ? (
              <Button
                variant="secondary"
                size="sm"
                onClick={onUnrestrict}
                disabled={busy}
              >
                {busy && action === "unrestrict" ? (
                  <Spinner />
                ) : (
                  <RotateCcw className="h-[14px] w-[14px]" aria-hidden />
                )}
                Lift restriction
              </Button>
            ) : null}
            {suspended ? (
              <Button
                variant="secondary"
                size="sm"
                onClick={onUnsuspend}
                disabled={busy}
              >
                {busy && action === "unsuspend" ? (
                  <Spinner />
                ) : (
                  <RotateCcw className="h-[14px] w-[14px]" aria-hidden />
                )}
                Remove suspension
              </Button>
            ) : null}
            {banned ? (
              <Button
                variant="secondary"
                size="sm"
                onClick={onUnban}
                disabled={busy}
              >
                {busy && action === "unban" ? (
                  <Spinner />
                ) : (
                  <RotateCcw className="h-[14px] w-[14px]" aria-hidden />
                )}
                Unban account
              </Button>
            ) : !owner ? (
              <Button
                variant="dangerSolid"
                size="sm"
                onClick={onBan}
                disabled={busy}
              >
                {busy && action === "ban" ? (
                  <Spinner />
                ) : (
                  <Ban className="h-[14px] w-[14px]" aria-hidden />
                )}
                Ban permanently
              </Button>
            ) : null}
            <Button
              variant="secondary"
              size="sm"
              onClick={onToggleVerified}
              disabled={busy}
            >
              {busy && action === "verify" ? (
                <Spinner />
              ) : user.isVerified ? (
                <X className="h-[14px] w-[14px]" aria-hidden />
              ) : (
                <BadgeCheck className="h-[14px] w-[14px]" aria-hidden />
              )}
              {user.isVerified ? "Revoke tick" : "Grant blue tick"}
            </Button>
          </div>
        </div>
      </div>
    </section>
  );
}

function RestrictDialog({ open, user, busy, onClose, onConfirm }) {
  const [preset, setPreset] = useState(60);
  const [customValue, setCustomValue] = useState("2");
  const [customUnit, setCustomUnit] = useState("hours");
  const [reason, setReason] = useState("");

  useEffect(() => {
    if (!open) return;
    setPreset(60);
    setCustomValue("2");
    setCustomUnit("hours");
    setReason("");
  }, [open]);

  const customMinutes =
    Number(customValue) *
    (customUnit === "minutes" ? 1 : customUnit === "hours" ? 60 : 1440);
  const minutes = preset === "custom" ? customMinutes : preset;
  const valid = Number.isFinite(minutes) && minutes >= 5 && minutes <= 43_200;
  const until = valid ? new Date(Date.now() + minutes * 60_000) : null;
  const presetLabel =
    RESTRICT_PRESETS.find((item) => item.minutes === minutes)?.label ||
    (valid ? `${Math.round(minutes)} minutes` : "Invalid duration");

  return (
    <AdminDialog
      open={open}
      onClose={onClose}
      title="Restrict to read-only"
      description={`@${user?.username || "This student"} stays signed in and can browse, but cannot post, reply, like, repost, follow, bookmark, or vote until the timer ends.`}
      icon={Clock}
      footer={
        <>
          <Button
            variant="secondary"
            size="sm"
            onClick={onClose}
            disabled={busy}
          >
            Cancel
          </Button>
          <Button
            size="sm"
            disabled={!valid || busy}
            onClick={() => onConfirm(Math.round(minutes), reason.trim())}
          >
            {busy ? <Spinner /> : <Clock className="h-[14px] w-[14px]" />}
            {busy ? "Applying…" : `Restrict for ${presetLabel}`}
          </Button>
        </>
      }
    >
      <div className="flex flex-col gap-4">
        <div>
          <p className="text-[13px] font-bold">Duration</p>
          <div
            role="radiogroup"
            aria-label="Restriction duration"
            className="mt-2 grid grid-cols-2 gap-2"
          >
            {RESTRICT_PRESETS.map((item) => {
              const active = preset === item.minutes;
              return (
                <label
                  key={item.minutes}
                  className={cn(
                    "relative block cursor-pointer rounded-xl border px-3 py-2.5 text-left transition-colors focus-within:ring-2 focus-within:ring-[var(--cz-accent)]",
                    active
                      ? "border-[var(--cz-accent)] bg-[var(--cz-accent-soft)]"
                      : "border-[var(--cz-border-strong)] hover:bg-[var(--cz-surface-strong)]",
                  )}
                >
                  <input
                    type="radio"
                    name="restriction-duration"
                    value={item.minutes}
                    checked={active}
                    onChange={() => setPreset(item.minutes)}
                    className="sr-only"
                  />
                  <span className="block text-[13px] font-bold">
                    {item.label}
                  </span>
                  <span className="mt-0.5 block text-[11px] text-[var(--cz-text-secondary)]">
                    {item.hint}
                  </span>
                </label>
              );
            })}
            <label
              className={cn(
                "relative col-span-2 block cursor-pointer rounded-xl border px-3 py-2.5 text-left transition-colors focus-within:ring-2 focus-within:ring-[var(--cz-accent)]",
                preset === "custom"
                  ? "border-[var(--cz-accent)] bg-[var(--cz-accent-soft)]"
                  : "border-[var(--cz-border-strong)] hover:bg-[var(--cz-surface-strong)]",
              )}
            >
              <input
                type="radio"
                name="restriction-duration"
                value="custom"
                checked={preset === "custom"}
                onChange={() => setPreset("custom")}
                className="sr-only"
              />
              <span className="block text-[13px] font-bold">
                Custom duration
              </span>
              <span className="mt-0.5 block text-[11px] text-[var(--cz-text-secondary)]">
                Between 5 minutes and 30 days
              </span>
            </label>
          </div>

          {preset === "custom" ? (
            <div className="mt-2 flex gap-2">
              <input
                type="number"
                min="1"
                value={customValue}
                onChange={(e) => setCustomValue(e.target.value)}
                aria-label="Custom duration value"
                className={cn(inputClass, "flex-1")}
              />
              <select
                value={customUnit}
                onChange={(e) => setCustomUnit(e.target.value)}
                aria-label="Custom duration unit"
                className={cn(inputClass, "w-[132px] shrink-0")}
              >
                <option value="minutes">Minutes</option>
                <option value="hours">Hours</option>
                <option value="days">Days</option>
              </select>
            </div>
          ) : null}

          <p className="mt-2 text-[12px] leading-[17px] text-[var(--cz-text-secondary)]">
            {valid ? (
              <>
                Lifts automatically on{" "}
                <span className="font-bold text-[var(--cz-text-primary)]">
                  {formatDateTime(until)}
                </span>
                . You can lift it earlier at any time.
              </>
            ) : (
              <span className="text-[var(--cz-error)]">
                Enter a duration between 5 minutes and 30 days.
              </span>
            )}
          </p>
        </div>

        <Field
          label="Reason (optional)"
          hint="Shown to the student in their notification and account details."
          htmlFor="restrict-reason"
          counter={`${reason.length}/500`}
        >
          <textarea
            id="restrict-reason"
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            maxLength={500}
            rows={3}
            placeholder="e.g. Repeated off-topic replies after a warning"
            className={textareaClass}
          />
        </Field>

        <div className="rounded-xl bg-[var(--cz-surface-strong)] px-3 py-2.5 text-[12px] leading-[17px] text-[var(--cz-text-secondary)]">
          The student keeps their session, can read the feed, and can open
          notifications, appeals, and account settings. Every engagement write
          is blocked until the restriction expires.
        </div>
      </div>
    </AdminDialog>
  );
}

function BanDialog({ open, user, busy, onClose, onConfirm }) {
  const [reason, setReason] = useState("");
  const [confirmation, setConfirmation] = useState("");

  useEffect(() => {
    if (!open) return;
    setReason("");
    setConfirmation("");
  }, [open]);

  const username = user?.username || "";
  const matches = confirmation.trim().toLowerCase() === username.toLowerCase();

  return (
    <AdminDialog
      open={open}
      onClose={onClose}
      title="Permanently ban this account?"
      description="This is reversible from this panel, but the student cannot undo it themselves."
      icon={ShieldBan}
      tone="danger"
      footer={
        <>
          <Button
            variant="secondary"
            size="sm"
            onClick={onClose}
            disabled={busy}
          >
            Cancel
          </Button>
          <Button
            variant="dangerSolid"
            size="sm"
            disabled={!matches || busy}
            onClick={() => onConfirm(reason.trim())}
          >
            {busy ? <Spinner /> : <Ban className="h-[14px] w-[14px]" />}
            {busy ? "Banning…" : "Ban permanently"}
          </Button>
        </>
      }
    >
      <div className="flex flex-col gap-4">
        <div className="rounded-xl border border-[color-mix(in_srgb,var(--cz-error)_35%,var(--cz-border))] bg-[color-mix(in_srgb,var(--cz-error)_7%,transparent)] px-3.5 py-3">
          <p className="text-[13px] font-extrabold text-[var(--cz-error)]">
            What happens immediately
          </p>
          <ul className="mt-1.5 flex list-disc flex-col gap-1 pl-4 text-[12px] leading-[17px] text-[var(--cz-text-secondary)]">
            <li>Every active session is revoked and sign-in is blocked.</li>
            <li>
              The public profile and posts are hidden from other students.
            </li>
            <li>Open reports against this account are marked actioned.</li>
            <li>The account can be reinstated later with Unban.</li>
          </ul>
        </div>

        <Field
          label="Reason (optional, kept in the audit trail)"
          htmlFor="ban-reason"
          counter={`${reason.length}/500`}
        >
          <textarea
            id="ban-reason"
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            maxLength={500}
            rows={3}
            placeholder="e.g. Coordinated harassment after a prior restriction"
            className={textareaClass}
          />
        </Field>

        <Field
          label={`Type @${username} to confirm`}
          htmlFor="ban-confirm"
          hint="This guard prevents banning the wrong account."
        >
          <input
            id="ban-confirm"
            value={confirmation}
            onChange={(e) => setConfirmation(e.target.value)}
            autoComplete="off"
            placeholder={username}
            className={cn(
              inputClass,
              matches &&
                "border-[color-mix(in_srgb,var(--cz-error)_55%,var(--cz-border-strong))]",
            )}
          />
        </Field>
      </div>
    </AdminDialog>
  );
}
