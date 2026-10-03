import { cn } from "@/lib/utils";

/**
 * Owner avatar ring — red circle everywhere the owner appears
 * (feed, search, right rail, notifications, profile, composers).
 * Owner = user.isOwner (synced from OWNER_EMAIL on backend).
 * Co-founder = user.isCofounder (synced from COFOUNDER_EMAIL, lavender ring).
 * Pro keeps no ring here (gold frame ships with vibe system later).
 */
export function isOwnerUser(user) {
  if (!user) return false;
  return Boolean(user.isOwner);
}

export function isCofounderUser(user) {
  if (!user) return false;
  if (Boolean(user.isCofounder)) return true;
  // Email fallback so the ring shows even before the DB backfill runs
  // (mirrors getBadgeKind in verified-badge.jsx).
  return String(user.email || "").toLowerCase().trim() === "yashvardhan4646@gmail.com";
}

export function avatarRingClass(user) {
  if (isOwnerUser(user)) {
    return "ring-2 ring-[#eb1c49] ring-offset-2 ring-offset-[var(--cz-bg)]";
  }
  if (isCofounderUser(user)) {
    return "ring-2 ring-[#a78bfa] ring-offset-2 ring-offset-[var(--cz-bg)]";
  }
  return "";
}

export function withAvatarRing(user, baseClass) {
  return cn(baseClass, avatarRingClass(user));
}
