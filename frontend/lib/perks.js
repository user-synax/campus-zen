/**
 * Cosmetic profile perks.
 *
 * The server is the gate (backend/src/config/perks.js); this catalog is only
 * the visual vocabulary. Ids must stay in sync with the backend enums, and
 * `pro: true` must stay in sync with the server's PRO_ONLY sets.
 *
 * Nothing here changes reach, ranking, verification or moderation. The
 * effects are scoped to the profile header by the `.cz-profile-scope`
 * wrapper in globals.css, so the rest of the app stays X Blue.
 */

export const PROFILE_ACCENTS = [
  {
    id: "blue",
    label: "Campus blue",
    swatch: "#1d9bf0",
    check: "#0f1419",
    pro: false,
  },
  {
    id: "peach",
    label: "Peach",
    swatch: "#f4a261",
    check: "#2a1405",
    pro: true,
  },
  {
    id: "lavender",
    label: "Lavender",
    swatch: "#a78bfa",
    check: "#1c1235",
    pro: true,
  },
  {
    id: "mint",
    label: "Mint",
    swatch: "#34d399",
    check: "#052e21",
    pro: true,
  },
  {
    id: "sky",
    label: "Sky",
    swatch: "#38bdf8",
    check: "#082f49",
    pro: true,
  },
  {
    id: "rose",
    label: "Rose",
    swatch: "#fb7185",
    check: "#4c0519",
    pro: true,
  },
];

export const PROFILE_THEMES = [
  { id: "flat", label: "Flat", pro: false },
  { id: "haze", label: "Haze", pro: true },
  { id: "grid", label: "Grid", pro: true },
  { id: "noir", label: "Noir", pro: true },
];

export const HANDLE_STYLES = [
  { id: "classic", label: "Classic", pro: false },
  { id: "bold", label: "Bold", pro: true },
  { id: "mono", label: "Mono", pro: true },
];

export function isProUser(user) {
  return Boolean(user?.isPro);
}

export function profileAccentFor(id) {
  return PROFILE_ACCENTS.find((item) => item.id === id) || PROFILE_ACCENTS[0];
}

export function profileThemeFor(id) {
  return PROFILE_THEMES.find((item) => item.id === id) || PROFILE_THEMES[0];
}

export function handleStyleFor(id) {
  return HANDLE_STYLES.find((item) => item.id === id) || HANDLE_STYLES[0];
}

/**
 * Render-side gates. A revoked Pro account keeps its saved values in the
 * database, but the profile falls back to the free look until it is upgraded
 * again — the same rule the API enforces on write.
 */
export function accentIdFor(user) {
  return isProUser(user) && user?.accent ? user.accent : "blue";
}

export function themeIdFor(user) {
  return isProUser(user) && user?.profileTheme ? user.profileTheme : "flat";
}

export function handleIdFor(user) {
  return isProUser(user) && user?.handleStyle ? user.handleStyle : "classic";
}

/** The paid accent is shown as a ring; the default blue keeps the plain avatar. */
export function profileRingClass(accentId) {
  if (!accentId || accentId === "blue") return "";
  return "ring-2 ring-[var(--cz-profile-accent)] ring-offset-2 ring-offset-[var(--cz-bg)]";
}

/**
 * Typography only — the actual @username never changes. This is deliberate:
 * styling must not create confusable handles or alter profile URLs.
 */
export function handleClass(styleId) {
  switch (styleId) {
    case "bold":
      return "text-[15px] leading-[20px] font-semibold text-[var(--cz-text-primary)]";
    case "mono":
      return "font-mono text-[13px] leading-[20px] tracking-[0.02em] text-[var(--cz-text-secondary)]";
    default:
      return "text-[15px] leading-[20px] text-[var(--cz-text-secondary)]";
  }
}

/** True when the item is Pro-only, regardless of the current user. */
export function isProPerk(item) {
  return Boolean(item?.pro);
}
