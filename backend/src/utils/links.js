export const MAX_CUSTOM_LINKS = 3;
export const MAX_CUSTOM_LINK_LABEL = 24;
export const MAX_CUSTOM_LINK_URL = 200;

const HAS_SCHEME = /^[a-z][a-z0-9+.-]*:/i;

/**
 * Normalize a profile link to an HTTPS URL.
 *
 * Bare hosts are accepted (`example.com/portfolio` -> `https://example.com/portfolio`),
 * but an explicit `http:`, `javascript:`, `data:` or credentialed URL is rejected.
 * Fragments are dropped because they are not meaningful on a profile chip.
 */
export function normalizeHttpsUrl(value) {
  if (typeof value !== "string") return null;
  let raw = value.trim();
  if (!raw || raw.length > MAX_CUSTOM_LINK_URL) return null;
  if (HAS_SCHEME.test(raw)) {
    if (!/^https:\/\//i.test(raw)) return null;
  } else {
    raw = `https://${raw}`;
  }

  let url;
  try {
    url = new URL(raw);
  } catch {
    return null;
  }

  if (url.protocol !== "https:") return null;
  if (!url.hostname || url.username || url.password) return null;
  if (url.hostname === "localhost" || url.hostname.endsWith(".local")) return null;
  url.hash = "";
  return url.toString();
}

export function isHttpsUrl(value) {
  return normalizeHttpsUrl(value) !== null;
}