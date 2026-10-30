import { AppError } from "../utils/AppError.js";

/**
 * Cosmetic perks are the only paid advantage in CampusZen. They never touch
 * ranking, reach, post limits, verification or moderation — the server only
 * checks whether a user may save a decorative value.
 *
 * `null` (and the explicit defaults `flat` / `classic`) are available to
 * everyone. The sets below are the Pro-only values; keeping them here means
 * the UI catalog and the API guard can be checked against one list.
 */
export const PROFILE_ACCENTS = ["peach", "lavender", "mint", "sky", "rose"];
export const PROFILE_THEMES = ["haze", "grid", "noir"];
export const HANDLE_STYLES = ["bold", "mono"];

const PRO_ONLY = {
  accent: new Set(PROFILE_ACCENTS),
  profileTheme: new Set(PROFILE_THEMES),
  handleStyle: new Set(HANDLE_STYLES),
};

const PERK_LABELS = {
  accent: "accent color",
  profileTheme: "profile theme",
  handleStyle: "handle style",
};

export function isPro(user) {
  return Boolean(user?.isPro);
}

/**
 * Throws PERK_LOCKED when a free account tries to save a Pro-only cosmetic.
 * Unknown values are left to Zod so the error stays a normal validation error.
 */
export function assertCanUsePerk(user, kind, value) {
  if (value == null) return;
  const proOnly = PRO_ONLY[kind];
  if (!proOnly || !proOnly.has(value)) return;
  if (isPro(user)) return;
  throw new AppError(
    `${PERK_LABELS[kind] || "This style"} is a Pro perk`,
    403,
    "PERK_LOCKED",
    { perk: kind, value, requiredTier: "pro" },
  );
}
