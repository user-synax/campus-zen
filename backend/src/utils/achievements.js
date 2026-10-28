// Achievement ladder for CampusZen. Nine tiers across three metals
// (bronze / silver / gold), each with three sub-levels. Earning is
// automatic and metric-driven; the highest unlocked tier is stored on
// User.achievementTier so feeds/profiles can render without recomputing.
//
// Keep this module free of DB access — pure functions only.

export const ACHIEVEMENT_TIERS = [
  { level: 1, key: "bronze",   file: "bronze.svg",   name: "Bronze I",   short: "Bronze" },
  { level: 2, key: "bronze-2", file: "bronze-2.svg", name: "Bronze II",  short: "Bronze" },
  { level: 3, key: "bronze-3", file: "bronze-3.svg", name: "Bronze III", short: "Bronze" },
  { level: 4, key: "silver",   file: "silver.svg",   name: "Silver I",   short: "Silver" },
  { level: 5, key: "silver-2", file: "silver-2.svg", name: "Silver II",  short: "Silver" },
  { level: 6, key: "silver-3", file: "silver-3.svg", name: "Silver III", short: "Silver" },
  { level: 7, key: "gold",     file: "gold.svg",     name: "Gold I",     short: "Gold" },
  { level: 8, key: "gold-2",   file: "gold-2.svg",   name: "Gold II",    short: "Gold" },
  { level: 9, key: "gold-3",   file: "gold-3.svg",   name: "Gold III",   short: "Gold" },
];

export function tierInfo(level) {
  const n = Number(level) || 0;
  if (n < 1 || n > ACHIEVEMENT_TIERS.length) return null;
  return ACHIEVEMENT_TIERS[n - 1];
}

export function tierFile(level) {
  return tierInfo(level)?.file || null;
}

// Profile is "complete" enough to earn the first tier when the user has
// at least one of avatar/bio/college filled in.
export function isProfileComplete(user) {
  if (!user) return false;
  return Boolean(user.avatarUrl || (user.bio && String(user.bio).trim()) || (user.college && String(user.college).trim()));
}

export function computeAchievementTier({ user, activeRecently = true }) {
  if (!user) return 0;
  const posts = Number(user.postCount) || 0;
  const followers = Number(user.qualityFollowers ?? user.followersCount) || 0;

  // Evaluate highest tier whose rule passes.
  const rules = [
    () => isProfileComplete(user) && posts >= 1,
    () => posts >= 10 || followers >= 25,
    () => posts >= 25 || followers >= 50,
    () => posts >= 50 || followers >= 100,
    () => posts >= 75 || followers >= 250,
    () => posts >= 100 || followers >= 500,
    () => posts >= 150 || followers >= 1000,
    () => (posts >= 250 || followers >= 2500) && activeRecently,
    () => posts >= 500 || followers >= 5000,
  ];

  let level = 0;
  for (let i = 0; i < rules.length; i++) {
    try {
      if (rules[i]()) level = i + 1;
      else break; // tiers are sequential; stop at first miss
    } catch {
      break;
    }
  }
  return level;
}

// Progress toward the next tier, for UI progress bars.
// Returns { currentLevel, nextLevel, nextTier, progress (0..1), hint }.
export function progressToNext({ user, activeRecently = true }) {
  const currentLevel = computeAchievementTier({ user, activeRecently });
  if (currentLevel >= ACHIEVEMENT_TIERS.length) {
    return { currentLevel, nextLevel: null, nextTier: null, progress: 1, hint: "Max tier reached" };
  }
  const nextLevel = currentLevel + 1;
  const nextTier = tierInfo(nextLevel);
  // Heuristic progress: fraction of the most relevant threshold met.
  const posts = Number(user?.postCount) || 0;
  const followers = Number(user?.qualityFollowers ?? user?.followersCount) || 0;
  let progress = 0;
  let hint = "";
  switch (nextLevel) {
    case 1:
      progress = isProfileComplete(user) && posts >= 1 ? 1 : (posts > 0 ? 0.5 : 0);
      hint = "Complete your profile and create your first post";
      break;
    case 2:
      progress = Math.min(1, Math.max(posts / 10, followers / 25));
      hint = "Reach 10 posts or 25 followers";
      break;
    case 3:
      progress = Math.min(1, Math.max(posts / 25, followers / 50));
      hint = "Reach 25 posts or 50 followers";
      break;
    case 4:
      progress = Math.min(1, Math.max(posts / 50, followers / 100));
      hint = "Reach 50 posts or 100 followers";
      break;
    case 5:
      progress = Math.min(1, Math.max(posts / 75, followers / 250));
      hint = "Reach 75 posts or 250 followers";
      break;
    case 6:
      progress = Math.min(1, Math.max(posts / 100, followers / 500));
      hint = "Reach 100 posts or 500 followers";
      break;
    case 7:
      progress = Math.min(1, Math.max(posts / 150, followers / 1000));
      hint = "Reach 150 posts or 1,000 followers";
      break;
    case 8:
      progress = Math.min(1, Math.max(posts / 250, followers / 2500));
      hint = "Reach 250 posts or 2,500 followers (stay active)";
      break;
    case 9:
      progress = Math.min(1, Math.max(posts / 500, followers / 5000));
      hint = "Reach 500 posts or 5,000 followers";
      break;
    default:
      progress = 0;
  }
  return { currentLevel, nextLevel, nextTier, progress: Math.max(0, Math.min(1, progress)), hint };
}