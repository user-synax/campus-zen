import { cn } from "@/lib/utils";

/**
 * Owner avatar ring — red circle everywhere the owner appears
 * (feed, search, right rail, notifications, profile, composers).
 * Owner = user.isOwner (synced from OWNER_EMAIL on backend).
 * Pro keeps no ring here (gold frame ships with vibe system later).
 */
export function isOwnerUser(user) {
  if (!user) return false;
  return Boolean(user.isOwner);
}

export function avatarRingClass(user) {
  if (isOwnerUser(user)) {
    return "ring-2 ring-[#eb1c49] ring-offset-2 ring-offset-[var(--cz-bg)]";
  }
  return "";
}

export function withAvatarRing(user, baseClass) {
  return cn(baseClass, avatarRingClass(user));
}
