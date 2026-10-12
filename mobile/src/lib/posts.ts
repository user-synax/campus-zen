import type { FeedAuthor, FeedPost, PostMediaItem } from "./api";

export type { FeedAuthor, FeedPost, PostMediaItem };

export const OWNER_EMAIL = "usersynax@gmail.com";
export const COFOUNDER_EMAIL = "yashvardhan4646@gmail.com";

export type BadgeKind = "owner" | "cofounder" | "pro" | "verified" | null;

export const badgeColors: Record<Exclude<BadgeKind, null>, string> = {
  owner: "#dd0e3b",
  cofounder: "#a78bfa",
  pro: "#eab308",
  verified: "#1d9bf0",
};

// Founder (red) > cofounder (lavender) > pro (gold) > verified (blue).
export function getBadgeKind(user: FeedAuthor | null | undefined): BadgeKind {
  if (!user) return null;
  const email = String(user.email || "").toLowerCase().trim();
  if (user.isOwner || user.isFounder || (email && email === OWNER_EMAIL)) return "owner";
  if (user.isCofounder || email === COFOUNDER_EMAIL) return "cofounder";
  if (user.isPro) return "pro";
  if (user.isVerified) return "verified";
  return null;
}

// Mirrors web timeAgo: <60s "now", Nm, Nh, Nd, else "Oct 5" (en-IN).
export function timeAgo(iso: string, now = Date.now()): string {
  const t = new Date(iso).getTime();
  if (Number.isNaN(t)) return "";
  const s = Math.max(0, Math.floor((now - t) / 1000));
  if (s < 60) return "now";
  const m = Math.floor(s / 60);
  if (m < 60) return `${m}m`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h`;
  const d = Math.floor(h / 24);
  if (d < 7) return `${d}d`;
  return new Date(t).toLocaleDateString("en-IN", { month: "short", day: "numeric" });
}

export function formatCount(n: number | null | undefined): string {
  if (n === null || n === undefined) return "";
  return n.toLocaleString("en-IN");
}

// Web normalizePostMedia: prefer media[].url, else legacy imageUrl single.
export function normalizeMedia(post: FeedPost): PostMediaItem[] {
  const items = (post.media ?? []).filter((m) => m?.url);
  if (items.length) return items.slice(0, 4);
  if (post.imageUrl) {
    return [
      {
        url: post.imageUrl,
        kind: /\.gif(\?|$)/i.test(post.imageUrl) ? "gif" : "image",
      },
    ];
  }
  return [];
}
