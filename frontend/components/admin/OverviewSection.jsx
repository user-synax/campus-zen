"use client";

import {
  ArrowRight,
  BadgeCheck,
  BellRing,
  ChevronRight,
  Flag,
  Megaphone,
  RefreshCw,
  ShieldAlert,
  ShieldBan,
  Sparkles,
  UserPlus,
  Users,
} from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { api } from "@/lib/api";
import { cn } from "@/lib/utils";
import {
  AdminAvatar,
  Chip,
  EmptyRows,
  ErrorBanner,
  formatNumber,
  LoadingRows,
  Panel,
  PanelHeader,
  SectionIntro,
  Spinner,
  timeAgo,
} from "./ui";

function KpiCard({
  label,
  value,
  hint,
  icon: Icon,
  onClick,
  tone = "neutral",
}) {
  const Tag = onClick ? "button" : "div";
  return (
    <Tag
      type={onClick ? "button" : undefined}
      onClick={onClick}
      className={cn(
        "group relative flex min-h-[124px] flex-col justify-between rounded-2xl border border-[var(--cz-border)] bg-[var(--cz-surface)] p-4 text-left transition-colors",
        onClick &&
          "cursor-pointer hover:border-[var(--cz-border-strong)] hover:bg-[color-mix(in_srgb,var(--cz-surface-strong)_45%,transparent)]",
      )}
    >
      <div className="flex items-start justify-between gap-2">
        <p className="text-[12px] leading-[16px] font-bold tracking-[0.06em] text-[var(--cz-text-secondary)] uppercase">
          {label}
        </p>
        <span
          className={cn(
            "grid h-[30px] w-[30px] shrink-0 place-items-center rounded-full",
            tone === "warn" &&
              "bg-[color-mix(in_srgb,var(--cz-warn)_14%,transparent)] text-[color-mix(in_srgb,var(--cz-warn)_72%,var(--cz-text-primary))]",
            tone === "danger" &&
              "bg-[color-mix(in_srgb,var(--cz-error)_10%,transparent)] text-[var(--cz-error)]",
            tone === "neutral" &&
              "bg-[var(--cz-accent-soft)] text-[var(--cz-accent)]",
          )}
        >
          <Icon className="h-[15px] w-[15px]" aria-hidden />
        </span>
      </div>
      <div className="mt-3">
        <p className="text-[30px] leading-none font-extrabold tracking-[-0.03em] tabular-nums">
          {value ?? "—"}
        </p>
        <p className="mt-1.5 text-[12px] leading-[16px] text-[var(--cz-text-secondary)]">
          {hint}
        </p>
      </div>
      {onClick ? (
        <ChevronRight
          className="absolute right-3 bottom-3 h-[15px] w-[15px] text-[var(--cz-text-tertiary)] transition-transform group-hover:translate-x-0.5"
          aria-hidden
        />
      ) : null}
    </Tag>
  );
}

function PulseRow({ label, value, total, hint }) {
  const pct =
    total > 0 ? Math.min(100, Math.round((Number(value) / total) * 100)) : 0;
  return (
    <div>
      <div className="flex items-baseline justify-between gap-3">
        <span className="text-[13px] text-[var(--cz-text-secondary)]">
          {label}
        </span>
        <span className="text-[13px] font-bold tabular-nums">
          {formatNumber(value)}
        </span>
      </div>
      <div className="mt-1.5 h-[5px] overflow-hidden rounded-full bg-[var(--cz-surface-strong)]">
        <span
          className="block h-full rounded-full bg-[var(--cz-accent)]"
          style={{ width: `${pct}%` }}
        />
      </div>
      <p className="mt-1 text-[11px] leading-[15px] text-[var(--cz-text-tertiary)]">
        {hint}
      </p>
    </div>
  );
}

function reportTargetLabel(report) {
  if (report.targetType === "post") {
    return report.target?.author?.username
      ? `post by @${report.target.author.username}`
      : "a post";
  }
  return report.target?.username ? `@${report.target.username}` : "an account";
}

export function OverviewSection({
  stats,
  adminEmail,
  onNavigate,
  onOpenUser,
  refreshStats,
}) {
  const [reports, setReports] = useState([]);
  const [newUsers, setNewUsers] = useState([]);
  const [broadcasts, setBroadcasts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    const [r, u, b] = await Promise.allSettled([
      api.adminReports({ status: "open", page: 1, limit: 5 }),
      api.adminUsers({ status: "all", sort: "recent", page: 1, limit: 5 }),
      api.adminBroadcasts({ page: 1, limit: 3 }),
    ]);
    if (r.status === "fulfilled") setReports(r.value.data?.reports || []);
    if (u.status === "fulfilled") setNewUsers(u.value.data?.users || []);
    if (b.status === "fulfilled") setBroadcasts(b.value.data?.broadcasts || []);
    if ([r, u, b].every((x) => x.status === "rejected")) {
      setError("Could not load the overview. Check the API connection.");
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const refresh = async () => {
    setRefreshing(true);
    await Promise.allSettled([load(), refreshStats?.()]);
    setRefreshing(false);
  };

  const today = new Date().toLocaleDateString("en-IN", {
    weekday: "long",
    day: "numeric",
    month: "long",
  });
  const totalUsers = stats?.users?.total || 0;
  const hour = new Date().getHours();
  const greeting =
    hour < 12 ? "Good morning" : hour < 17 ? "Good afternoon" : "Good evening";
  const adminName = adminEmail ? adminEmail.split("@")[0] : "admin";

  return (
    <div>
      <SectionIntro
        eyebrow={today}
        title={`${greeting}, ${adminName}.`}
        subtitle="A live read on the community, the moderation queue, and everything you have shipped to students. Nothing here is public."
        actions={
          <Button
            variant="secondary"
            size="sm"
            onClick={refresh}
            disabled={refreshing}
          >
            {refreshing ? <Spinner /> : <RefreshCw className="h-4 w-4" />}
            Refresh
          </Button>
        }
      />

      <div className="grid grid-cols-2 gap-3 xl:grid-cols-4">
        <KpiCard
          label="Students"
          value={stats ? formatNumber(stats.users?.total) : "—"}
          hint={
            stats
              ? `+${formatNumber(stats.users?.newToday)} today · +${formatNumber(
                  stats.users?.newWeek,
                )} this week`
              : "Loading the roster…"
          }
          icon={Users}
          onClick={() => onNavigate("users")}
        />
        <KpiCard
          label="Open reports"
          value={stats ? formatNumber(stats.reports?.open) : "—"}
          hint={
            stats
              ? `${formatNumber(stats.reports?.actioned)} actioned all-time`
              : "Loading the queue…"
          }
          icon={Flag}
          tone="warn"
          onClick={() => onNavigate("reports")}
        />
        <KpiCard
          label="Restricted"
          value={stats ? formatNumber(stats.users?.restricted) : "—"}
          hint="Read-only until the timer runs out"
          icon={ShieldAlert}
          tone="warn"
          onClick={() => onNavigate("users")}
        />
        <KpiCard
          label="Banned"
          value={stats ? formatNumber(stats.users?.banned) : "—"}
          hint="Permanent until manually unbanned"
          icon={ShieldBan}
          tone="danger"
          onClick={() => onNavigate("users")}
        />
      </div>

      <div className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-4">
        {[
          {
            label: "Appeals",
            value: stats?.appeals?.open ?? "—",
            sub: `${formatNumber(stats?.appeals?.total)} all-time`,
            section: "appeals",
          },
          {
            label: "Verifications",
            value: stats?.verifications?.open ?? "—",
            sub: `${formatNumber(stats?.verifications?.total)} all-time`,
            section: "verification",
          },
          {
            label: "Push devices",
            value: stats?.push?.subscribers ?? "—",
            sub: "reachable outside the app",
            section: "broadcast",
          },
          {
            label: "Broadcasts",
            value: stats?.broadcasts?.total ?? "—",
            sub: stats?.broadcasts?.lastAt
              ? `last ${timeAgo(stats.broadcasts.lastAt)}`
              : "none sent yet",
            section: "broadcast",
          },
        ].map((item) => (
          <button
            key={item.label}
            type="button"
            onClick={() => onNavigate(item.section)}
            className="flex items-center justify-between gap-2 rounded-xl border border-[var(--cz-border)] px-3.5 py-3 text-left transition-colors hover:bg-[var(--cz-surface-strong)]"
          >
            <span className="min-w-0">
              <span className="block truncate text-[12px] font-bold text-[var(--cz-text-secondary)]">
                {item.label}
              </span>
              <span className="block truncate text-[11px] text-[var(--cz-text-tertiary)]">
                {item.sub}
              </span>
            </span>
            <span className="shrink-0 text-[18px] leading-none font-extrabold tabular-nums">
              {item.value}
            </span>
          </button>
        ))}
      </div>

      {error ? <ErrorBanner className="mt-4">{error}</ErrorBanner> : null}

      <div className="mt-5 grid gap-4 xl:grid-cols-[minmax(0,1.55fr)_minmax(0,1fr)]">
        <div className="flex flex-col gap-4">
          <Panel>
            <PanelHeader
              icon={Flag}
              title="Needs attention"
              subtitle="The newest unresolved reports across posts and accounts."
              action={
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => onNavigate("reports")}
                  className="px-2"
                >
                  View queue <ArrowRight className="h-4 w-4" />
                </Button>
              }
            />
            {loading ? (
              <LoadingRows label="Loading the queue…" />
            ) : reports.length ? (
              <ul className="divide-y divide-[var(--cz-border)]">
                {reports.map((report) => (
                  <li key={report._id}>
                    <button
                      type="button"
                      onClick={() => onNavigate("reports")}
                      className="flex w-full items-start gap-3 px-4 py-3 text-left transition-colors hover:bg-[color-mix(in_srgb,var(--cz-surface-strong)_50%,transparent)]"
                    >
                      <span className="mt-0.5 grid h-[30px] w-[30px] shrink-0 place-items-center rounded-full bg-[color-mix(in_srgb,var(--cz-warn)_14%,transparent)] text-[color-mix(in_srgb,var(--cz-warn)_72%,var(--cz-text-primary))]">
                        <Flag className="h-[14px] w-[14px]" aria-hidden />
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="block text-[13px] leading-[18px]">
                          <span className="font-bold capitalize">
                            {report.reason}
                          </span>
                          <span className="text-[var(--cz-text-secondary)]">
                            {" "}
                            on {reportTargetLabel(report)}
                          </span>
                        </span>
                        <span className="mt-1 block truncate text-[12px] text-[var(--cz-text-secondary)]">
                          Reported by @{report.reporter?.username || "unknown"}{" "}
                          · {timeAgo(report.createdAt)}
                        </span>
                      </span>
                      <ChevronRight
                        className="mt-1 h-[15px] w-[15px] shrink-0 text-[var(--cz-text-tertiary)]"
                        aria-hidden
                      />
                    </button>
                  </li>
                ))}
              </ul>
            ) : (
              <EmptyRows
                icon={Sparkles}
                title="The queue is clear"
                description="No open reports right now. New ones will appear here the moment a student flags something."
              />
            )}
          </Panel>

          <Panel>
            <PanelHeader
              icon={UserPlus}
              title="New students"
              subtitle="The latest accounts to join CampusZen."
              action={
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => onNavigate("users")}
                  className="px-2"
                >
                  Browse <ArrowRight className="h-4 w-4" />
                </Button>
              }
            />
            {loading ? (
              <LoadingRows label="Loading new students…" />
            ) : newUsers.length ? (
              <ul className="divide-y divide-[var(--cz-border)]">
                {newUsers.map((u) => (
                  <li key={u._id}>
                    <button
                      type="button"
                      onClick={() => onOpenUser?.(u._id)}
                      className="flex w-full items-center gap-3 px-4 py-2.5 text-left transition-colors hover:bg-[color-mix(in_srgb,var(--cz-surface-strong)_50%,transparent)]"
                    >
                      <AdminAvatar user={u} size={34} />
                      <span className="min-w-0 flex-1">
                        <span className="flex items-center gap-1.5">
                          <span className="truncate text-[13px] font-bold">
                            {u.fullName || u.username}
                          </span>
                          {u.isVerified ? (
                            <BadgeCheck
                              className="h-[14px] w-[14px] shrink-0 text-[var(--cz-accent)]"
                              aria-label="Verified"
                            />
                          ) : null}
                        </span>
                        <span className="block truncate text-[12px] text-[var(--cz-text-secondary)]">
                          @{u.username} · joined {timeAgo(u.createdAt)}
                        </span>
                      </span>
                      <ChevronRight
                        className="h-[15px] w-[15px] shrink-0 text-[var(--cz-text-tertiary)]"
                        aria-hidden
                      />
                    </button>
                  </li>
                ))}
              </ul>
            ) : (
              <EmptyRows
                icon={Users}
                title="No students yet"
                description="New sign-ups will show up here."
              />
            )}
          </Panel>
        </div>

        <div className="flex flex-col gap-4">
          <Panel>
            <PanelHeader
              icon={Users}
              title="Platform pulse"
              subtitle="Share of the community in each state."
            />
            <div className="flex flex-col gap-4 px-4 py-4">
              <PulseRow
                label="Active today"
                value={stats?.users?.activeToday}
                total={totalUsers}
                hint={`${formatNumber(
                  stats?.users?.activeToday,
                )} of ${formatNumber(totalUsers)} signed in today`}
              />
              <PulseRow
                label="Verified accounts"
                value={stats?.users?.verified}
                total={totalUsers}
                hint="Blue tick granted by the moderation team"
              />
              <PulseRow
                label="Push-enabled"
                value={stats?.push?.subscribers}
                total={totalUsers}
                hint="Devices that receive broadcasts outside the app"
              />
              <PulseRow
                label="Joined this week"
                value={stats?.users?.newWeek}
                total={totalUsers}
                hint={`${formatNumber(stats?.users?.newToday)} joined today`}
              />
            </div>
          </Panel>

          <Panel>
            <PanelHeader
              icon={Megaphone}
              title="Recent broadcasts"
              subtitle="Announcements delivered in-app and by push."
              action={
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => onNavigate("broadcast")}
                  className="px-2"
                >
                  Send <ArrowRight className="h-4 w-4" />
                </Button>
              }
            />
            {loading ? (
              <LoadingRows label="Loading broadcasts…" />
            ) : broadcasts.length ? (
              <ul className="divide-y divide-[var(--cz-border)]">
                {broadcasts.map((b) => (
                  <li key={b._id} className="px-4 py-3">
                    <p className="truncate text-[13px] font-bold">{b.title}</p>
                    <p className="mt-1 flex items-center gap-1.5 text-[11px] text-[var(--cz-text-secondary)]">
                      <BellRing className="h-[12px] w-[12px]" aria-hidden />
                      {formatNumber(b.recipientCount)} recipients ·{" "}
                      {timeAgo(b.createdAt)}
                    </p>
                  </li>
                ))}
              </ul>
            ) : (
              <EmptyRows
                icon={Megaphone}
                title="No announcements yet"
                description="Send your first broadcast to reach every student."
                action={
                  <Button size="sm" onClick={() => onNavigate("broadcast")}>
                    Compose broadcast
                  </Button>
                }
              />
            )}
          </Panel>

          <Panel className="p-4">
            <p className="text-[12px] font-bold tracking-[0.06em] text-[var(--cz-text-secondary)] uppercase">
              Today at a glance
            </p>
            <div className="mt-3 grid grid-cols-2 gap-3">
              {[
                {
                  label: "Posts",
                  value: stats?.posts?.total,
                  icon: Sparkles,
                },
                {
                  label: "New today",
                  value: stats?.users?.newToday,
                  icon: UserPlus,
                },
                {
                  label: "Suspended",
                  value: stats?.users?.suspended,
                  icon: ShieldAlert,
                },
                {
                  label: "Verified",
                  value: stats?.users?.verified,
                  icon: BadgeCheck,
                },
              ].map((item) => (
                <div
                  key={item.label}
                  className="rounded-xl bg-[var(--cz-surface-strong)] px-3 py-2.5"
                >
                  <item.icon
                    className="h-[14px] w-[14px] text-[var(--cz-text-secondary)]"
                    aria-hidden
                  />
                  <p className="mt-2 text-[19px] leading-none font-extrabold tabular-nums">
                    {formatNumber(item.value)}
                  </p>
                  <p className="mt-1 text-[11px] font-bold text-[var(--cz-text-secondary)]">
                    {item.label}
                  </p>
                </div>
              ))}
            </div>
            <div className="mt-3 flex flex-wrap gap-1.5">
              <Chip tone="accent">Live data</Chip>
              <Chip>{formatNumber(stats?.users?.total)} students</Chip>
            </div>
          </Panel>
        </div>
      </div>
    </div>
  );
}
