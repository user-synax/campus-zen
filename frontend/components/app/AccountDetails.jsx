"use client";

import {
  AtSign,
  CalendarDays,
  Clock3,
  GraduationCap,
  Mail,
  School,
  ShieldAlert,
  ShieldCheck,
  UserRound,
} from "lucide-react";
import {
  accountStatusMeta,
  effectiveAccountStatus,
  formatAccountDate,
  formatAccountDateTime,
} from "@/lib/accountStatus";
import { cn } from "@/lib/utils";

const TONE = {
  good: {
    chip: "bg-[color-mix(in_srgb,var(--cz-success)_14%,transparent)] text-[var(--cz-success)]",
    dot: "bg-[var(--cz-success)]",
  },
  warn: {
    chip: "bg-[color-mix(in_srgb,var(--cz-warn)_16%,transparent)] text-[var(--cz-warn)]",
    dot: "bg-[var(--cz-warn)]",
  },
  error: {
    chip: "bg-[var(--cz-error)] text-white",
    dot: "bg-white",
  },
};

function Row({ Icon, label, value, note }) {
  return (
    <div className="flex items-start gap-3 px-4 py-3">
      <Icon
        className="mt-0.5 h-4 w-4 shrink-0 text-[var(--cz-text-secondary)]"
        aria-hidden
      />
      <div className="min-w-0 flex-1">
        <p className="text-[13px] leading-[17px] text-[var(--cz-text-secondary)]">
          {label}
        </p>
        <p className="mt-0.5 break-words text-[15px] font-bold leading-[20px] text-[var(--cz-text-primary)]">
          {value || "Not set"}
        </p>
        {note ? (
          <p className="mt-0.5 text-[13px] leading-[17px] text-[var(--cz-text-secondary)]">
            {note}
          </p>
        ) : null}
      </div>
    </div>
  );
}

/**
 * The owner's own account record. Rendered on /menu from the /me payload —
 * the same query the shell uses, so there is no extra request and no other
 * viewer can ever reach this card.
 */
export function AccountDetails({ user, loading = false, showTitle = true }) {
  const status = effectiveAccountStatus(user);
  const meta = accountStatusMeta(status);
  const tone = TONE[meta.tone] || TONE.good;
  const joined = formatAccountDate(user?.createdAt);
  const lastLogin = formatAccountDateTime(user?.lastLoginAt);
  const statusSince =
    formatAccountDate(
      status === "suspended"
        ? user?.suspendedAt
        : status === "banned"
          ? user?.bannedAt
          : status === "restricted"
            ? user?.restrictedAt || user?.accountStatusAt
            : user?.accountStatusAt,
    ) || joined;
  const statusReason =
    status === "banned"
      ? user?.banReason || user?.accountStatusReason
      : user?.accountStatusReason;
  const restrictionUntil =
    status === "restricted"
      ? formatAccountDateTime(user?.restrictedUntil)
      : null;

  if (loading && !user) {
    return (
      <section
        aria-label="Account details"
        className="overflow-hidden rounded-[16px] border border-[var(--cz-border)]"
      >
        {showTitle ? (
          <p className="flex items-center gap-2 border-b border-[var(--cz-border)] px-4 py-3 text-[15px] font-bold leading-[20px]">
            <ShieldCheck className="h-4 w-4" aria-hidden /> Account details
          </p>
        ) : null}
        <div className="space-y-3 p-4" aria-hidden="true">
          <span className="t-shimmer block h-6 w-28 rounded-full" />
          <span className="t-shimmer block h-4 w-48 rounded-full" />
          <span className="t-shimmer block h-4 w-40 rounded-full" />
        </div>
      </section>
    );
  }

  return (
    <section
      aria-label="Account details"
      className="overflow-hidden rounded-[16px] border border-[var(--cz-border)]"
    >
      {showTitle ? (
        <p className="flex items-center gap-2 border-b border-[var(--cz-border)] px-4 py-3 text-[15px] font-bold leading-[20px]">
          <ShieldCheck className="h-4 w-4" aria-hidden /> Account details
        </p>
      ) : null}

      <div className="border-b border-[var(--cz-border)] px-4 py-3.5">
        <p className="text-[13px] leading-[17px] text-[var(--cz-text-secondary)]">
          Account status
        </p>
        <p className="mt-1.5 flex flex-wrap items-center gap-2">
          <span
            className={cn(
              "inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[13px] font-extrabold leading-[16px]",
              tone.chip,
            )}
          >
            <span
              className={cn("h-1.5 w-1.5 rounded-full", tone.dot)}
              aria-hidden
            />
            {meta.label}
          </span>
          {status !== "good" && statusSince ? (
            <span className="text-[13px] text-[var(--cz-text-secondary)]">
              since {statusSince}
            </span>
          ) : null}
        </p>
        <p className="mt-2 text-[14px] leading-[19px] text-[var(--cz-text-secondary)]">
          {meta.description}
        </p>
        {restrictionUntil ? (
          <div className="mt-2 flex items-start gap-2 rounded-[12px] bg-[color-mix(in_srgb,var(--cz-warn)_10%,transparent)] p-3 text-[13px] leading-[18px] text-[var(--cz-text-primary)]">
            <Clock3
              className="mt-0.5 h-4 w-4 shrink-0 text-[var(--cz-warn)]"
              aria-hidden
            />
            <p>
              Read-only until{" "}
              <span className="font-bold">{restrictionUntil}</span>. This lifts
              automatically — you do not need to do anything.
            </p>
          </div>
        ) : null}
        {status === "banned" ? (
          <div className="mt-2 flex items-start gap-2 rounded-[12px] bg-[color-mix(in_srgb,var(--cz-error)_9%,transparent)] p-3 text-[13px] leading-[18px] text-[var(--cz-text-primary)]">
            <ShieldAlert
              className="mt-0.5 h-4 w-4 shrink-0 text-[var(--cz-error)]"
              aria-hidden
            />
            <p>
              This ban is permanent until an administrator reverses it. Sign-in,
              sessions, and public visibility are blocked.
            </p>
          </div>
        ) : null}
        {statusReason ? (
          <p className="mt-2 rounded-[12px] bg-[var(--cz-surface-strong)] p-3 text-[14px] leading-[19px] text-[var(--cz-text-primary)]">
            <span className="font-bold">Reason: </span>
            {statusReason}
          </p>
        ) : null}
      </div>

      <div className="divide-y divide-[var(--cz-border)]">
        <Row
          Icon={Mail}
          label="Email"
          value={user?.email}
          note={
            user?.email
              ? user.isEmailVerified
                ? "Verified"
                : "Not verified"
              : null
          }
        />
        <Row Icon={UserRound} label="Full name" value={user?.fullName} />
        <Row
          Icon={AtSign}
          label="Username"
          value={user?.username ? `@${user.username}` : null}
        />
        <Row Icon={School} label="College" value={user?.college} />
        <Row Icon={GraduationCap} label="Course" value={user?.course} />
        <Row
          Icon={CalendarDays}
          label="Academic year"
          value={user?.academicYear}
        />
        <Row Icon={CalendarDays} label="Member since" value={joined} />
        <Row Icon={Clock3} label="Last login" value={lastLogin} />
      </div>
    </section>
  );
}
