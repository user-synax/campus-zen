"use client";

import { cn } from "@/lib/utils";

export function streakFile(count) {
  const n = Number(count) || 0;
  if (n >= 50) return "50-day-streak.svg";
  if (n >= 20) return "20-day-streak.svg";
  if (n >= 10) return "10-day-streak.svg";
  return "1-day-streak.svg";
}

export function StreakFlame({ count, size = 16, showCount = false, className }) {
  const n = Number(count) || 0;
  if (n <= 0) return null;
  const px = typeof size === "number" ? size : 16;
  const file = streakFile(n);
  return (
    <span
      role="img"
      aria-label={`${n}-day streak`}
      title={`${n}-day streak`}
      className={cn("relative inline-flex shrink-0 items-center", className)}
      style={{ width: px, height: px }}
    >
      <img
        src={`/Streak-flames/${file}`}
        alt=""
        width={px}
        height={px}
        className="h-full w-full object-contain"
        loading="lazy"
      />
      {showCount ? (
        <span className="ml-1 text-[12px] font-bold">{n}</span>
      ) : null}
    </span>
  );
}