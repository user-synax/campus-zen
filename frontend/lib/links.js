export const MAX_CUSTOM_LINKS = 3;
export const MAX_CUSTOM_LINK_LABEL = 24;

const HAS_SCHEME = /^[a-z][a-z0-9+.-]*:/i;

/** Mirror of the backend rule: bare hosts get https://; explicit non-HTTPS is rejected. */
export function normalizeHttpsUrl(value) {
  if (typeof value !== "string") return null;
  let raw = value.trim();
  if (!raw || raw.length > 200) return null;
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