"use client";

import { cn } from "@/lib/utils";

// Mirrors backend/utils/achievements.js — keep in sync.
export const ACHIEVEMENT_TIERS = [
  { level: 1, file: "bronze.svg",   name: "Bronze I" },
  { level: 2, file: "bronze-2.svg", name: "Bronze II" },
  { level: 3, file: "bronze-3.svg", name: "Bronze III" },
  { level: 4, file: "silver.svg",   name: "Silver I" },
  { level: 5, file: "silver-2.svg", name: "Silver II" },
  { level: 6, file: "silver-3.svg", name: "Silver III" },
  { level: 7, file: "gold.svg",     name: "Gold I" },
  { level: 8, file: "gold-2.svg",   name: "Gold II" },
  { level: 9, file: "gold-3.svg",   name: "Gold III" },
];

export function tierInfo(level) {
  const n = Number(level) || 0;
  if (n < 1 || n > ACHIEVEMENT_TIERS.length) return null;
  return ACHIEVEMENT_TIERS[n - 1];
}

export function tierFile(level) {
  return tierInfo(level)?.file || null;
}

export function AchievementBadge({ tier, size = 24, className, locked = false, title }) {
  const info = tierInfo(tier);
  if (!info && !locked) return null;
  const file = info?.file || "bronze.svg";
  const px = typeof size === "number" ? size : 24;
  const label = title || info?.name || "Locked badge";
  return (
    <span
      role="img"
      className={cn(
        "relative inline-flex shrink-0 items-center justify-center",
        locked && "opacity-35 grayscale",
        className,
      )}
      style={{ width: px, height: px }}
      title={label}
      aria-label={label}
    >
      <img
        src={`/Badges/${file}`}
        alt={label}
        width={px}
        height={px}
        className="h-full w-full object-contain"
        loading="lazy"
      />
      {locked ? (
        <span
          aria-hidden
          className="absolute inset-0 grid place-items-center text-[10px] font-bold text-[var(--cz-text-tertiary)]"
        >
          🔒
        </span>
      ) : null}
    </span>
  );
}

// Inline "highest badge" for feeds/cards: renders nothing when no tier.
export function HighestAchievementBadge({ user, size = 14, className }) {
  const tier = Number(user?.achievementTier) || 0;
  if (tier < 1) return null;
  return (
    <AchievementBadge tier={tier} size={size} className={className} title={tierInfo(tier)?.name} />
  );
}