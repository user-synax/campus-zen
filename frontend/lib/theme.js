export const THEME_COOKIE = "cz-theme";

/**
 * The token system is class-based (`:root` light, `.dark` dark — see
 * `globals.css`). The root layout does NOT read this cookie on the server
 * (any `cookies()` access makes every route dynamic, which disables link
 * prefetching entirely); instead a tiny pre-paint script in the root layout
 * stamps the class onto <html> straight from `document.cookie`, so the very
 * first paint is already in the right theme: no flash, no hydration shift.
 *
 * A cookie (rather than localStorage) keeps that possible in one synchronous
 * read, and it travels with the session for other local surfaces.
 */

export function normalizeTheme(value) {
  return value === "dark" ? "dark" : "light";
}

/** Server-side: read the preference out of the request cookies. */
export function readThemeCookie(cookieStore) {
  return normalizeTheme(cookieStore?.get?.(THEME_COOKIE)?.value);
}

/** Client-side: the current effective theme, used for the toggle's label. */
export function readTheme() {
  if (typeof document === "undefined") return "light";
  return normalizeTheme(
    document.documentElement.classList.contains("dark") ? "dark" : "light",
  );
}

export function applyTheme(theme) {
  if (typeof document === "undefined") return;
  const next = normalizeTheme(theme);
  document.documentElement.classList.toggle("dark", next === "dark");
  for (const meta of document.querySelectorAll('meta[name="theme-color"]')) {
    meta.setAttribute("content", next === "dark" ? "#000000" : "#ffffff");
  }
}

/**
 * Persist the choice for one year. SameSite=lax is fine — this is not a
 * credential, and the server only reads it to pick a class name.
 */
export function persistTheme(theme) {
  if (typeof document === "undefined") return;
  const next = normalizeTheme(theme);
  document.cookie = `${THEME_COOKIE}=${next}; path=/; max-age=31536000; samesite=lax`;
}
