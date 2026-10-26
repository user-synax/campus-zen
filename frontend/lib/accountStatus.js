"use client";

// Account standing, shown only to the owner (Settings → Account details).
// The backend stores `accountStatus`; `isSuspended` is the flag the API
// actually enforces, so it always wins over a stale stored value.
export const ACCOUNT_STATUS = {
  good: {
    label: "Good standing",
    tone: "good",
    description: "No restrictions on your account.",
  },
  limited: {
    label: "Limited",
    tone: "warn",
    description:
      "Some actions are limited while we review your account. You can still browse and post.",
  },
  restricted: {
    label: "Temporarily restricted",
    tone: "warn",
    description:
      "You can browse CampusZen, but posting, replying, liking, following and bookmarking are paused until this lifts automatically.",
  },
  suspended: {
    label: "Suspended",
    tone: "error",
    description:
      "Your account is suspended. You can view your details and sign out, but you cannot post.",
  },
  banned: {
    label: "Banned",
    tone: "error",
    description:
      "This account has been permanently banned and can no longer sign in or use CampusZen.",
  },
};

export function accountStatusMeta(status) {
  return ACCOUNT_STATUS[status] || ACCOUNT_STATUS.good;
}

// A restriction whose deadline has passed is already lifted, even if the
// server sweep has not rewritten the row yet.
export function isRestrictionActive(user, now = Date.now()) {
  if (!user || user.isBanned) return false;
  if (user.accountStatus !== "restricted") return false;
  if (!user.restrictedUntil) return false;
  return new Date(user.restrictedUntil).getTime() > now;
}

export function effectiveAccountStatus(user) {
  if (!user) return "good";
  if (user.isBanned) return "banned";
  if (user.isSuspended) return "suspended";
  if (user.accountStatus === "restricted" && !isRestrictionActive(user)) {
    return "good";
  }
  return ACCOUNT_STATUS[user.accountStatus] ? user.accountStatus : "good";
}

export function formatAccountDate(value) {
  if (!value) return null;
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return null;
  return d.toLocaleDateString("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

export function formatAccountDateTime(value) {
  if (!value) return null;
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return null;
  return d.toLocaleString("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}
