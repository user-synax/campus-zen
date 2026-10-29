"use client";

import { useQuery } from "@tanstack/react-query";
import { ACHIEVEMENT_TIERS, AchievementBadge } from "@/components/ui/achievement-badge";
import { StreakFlame } from "@/components/ui/streak-flame";
import { api } from "@/lib/api";
import { cn } from "@/lib/utils";

const BADGE_CRITERIA = [
  "Complete your profile and create your first post",
  "Reach 10 posts or 25 followers",
  "Reach 25 posts or 50 followers",
  "Reach 50 posts or 100 followers",
  "Reach 75 posts or 250 followers",
  "Reach 100 posts or 500 followers",
  "Reach 150 posts or 1,000 followers",
  "Reach 250 posts or 2,500 followers and stay active",
  "Reach 500 posts or 5,000 followers",
];

export function BadgesTab({ user, isOwn = false }) {
  const { data } = useQuery({
    queryKey: ["myAchievements"],
    queryFn: () => api.getMyAchievements(),
    enabled: !!isOwn,
    staleTime: 60_000,
  });

  const progress = data?.data?.progress || null;
  const currentLevel = Number(user?.achievementTier) || 0;
  const nextLevel = progress?.nextLevel || null;
  const progressValue = progress?.progress ?? 0;

  // DPDP s.9: no behavioural gamification for children. The API already
  // refuses to advance tiers/streaks for minors; keep the UI honest too.
  if (progress?.disabled) {
    return (
      <div className="px-4 py-6">
        <h2 className="text-[17px] font-extrabold text-[var(--cz-text-primary)]">
          Badges
        </h2>
        <div className="mt-4 rounded-[16px] border border-[var(--cz-border)] p-4 text-[14px] leading-[20px] text-[var(--cz-text-secondary)]">
          Badge progression and posting streaks are turned off for under-18
          accounts. There is no behavioural gamification on child accounts; you
          can still post and interact normally.
        </div>
      </div>
    );
  }

  return (
    <div className="px-4 py-6">
      <div className="mb-4">
        <h2 className="text-[17px] font-extrabold text-[var(--cz-text-primary)]">
          Badges
        </h2>
        <p className="mt-1 text-[14px] text-[var(--cz-text-secondary)]">
          Earn badges by posting and growing your followers.
        </p>
      </div>

      <div className="mb-4 rounded-[16px] border border-[var(--cz-border)] p-4">
        <div className="flex items-center gap-3">
          {(user?.streakCount || 0) > 0 ? (
            <StreakFlame count={user.streakCount} size={32} showCount={false} />
          ) : null}
          <div className="min-w-0 flex-1">
            {(user?.streakCount || 0) > 0 ? (
              <>
                <p className="text-[17px] font-extrabold text-[var(--cz-text-primary)]">
                  {user.streakCount}-day streak
                </p>
                <p className="text-[13px] text-[var(--cz-text-secondary)]">
                  Longest: {user?.longestStreak || 0} days. Post today to keep it going.
                </p>
              </>
            ) : (
              <p className="text-[14px] text-[var(--cz-text-secondary)]">
                Post today to start your first streak.
              </p>
            )}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        {ACHIEVEMENT_TIERS.map((t) => {
          const earned = t.level <= currentLevel;
          const isNext = t.level === nextLevel;
          return (
            <div
              key={t.level}
              className={cn(
                "flex flex-col items-center gap-2 rounded-[16px] border border-[var(--cz-border)] p-3 text-center",
                earned ? "bg-[var(--cz-surface)]" : "bg-[var(--cz-surface-strong)]/40",
              )}
            >
              <AchievementBadge
                tier={earned ? t.level : t.level}
                size={44}
                locked={!earned}
              />
              <span
                className={cn(
                  "text-[12px] font-bold",
                  earned
                    ? "text-[var(--cz-text-primary)]"
                    : "text-[var(--cz-text-tertiary)]",
                )}
              >
                {t.name}
              </span>
              {earned ? (
                <span className="rounded-full bg-[var(--cz-accent-soft)] px-2 py-0.5 text-[10px] font-extrabold uppercase tracking-[0.06em] text-[var(--cz-accent)]">
                  Earned
                </span>
              ) : null}
              <p
                className={cn(
                  "text-[10px] leading-[13px] text-[var(--cz-text-secondary)]",
                  earned && "line-through text-[var(--cz-text-tertiary)]",
                )}
              >
                {BADGE_CRITERIA[t.level - 1]}
              </p>
              {isNext ? (
                <div className="w-full">
                  <div className="h-1.5 w-full overflow-hidden rounded-full bg-[var(--cz-border)]">
                    <div
                      className="h-full rounded-full bg-[var(--cz-accent)] transition-all"
                      style={{ width: `${Math.round(progressValue * 100)}%` }}
                    />
                  </div>
                </div>
              ) : null}
            </div>
          );
        })}
      </div>

      {currentLevel === 0 ? (
        <p className="mt-4 text-[13px] text-[var(--cz-text-secondary)]">
          Complete your profile and create your first post to earn your first
          badge.
        </p>
      ) : null}
    </div>
  );
}