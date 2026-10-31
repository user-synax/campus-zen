/**
 * Image URL optimisation for Appwrite storage.
 *
 * Uploads are stored at full resolution and the `/view` endpoint serves that
 * original (a 5MB, 3000px photo for a 40px avatar). Appwrite's `/preview`
 * endpoint resizes and re-encodes server-side, which is where the bytes
 * actually disappear on slow connections.
 *
 * Anything that is not an Appwrite file view URL (external avatars, blob:,
 * data:, local assets) is returned untouched, so this is always safe to call.
 */

const APPWRITE_VIEW_RE = /\/storage\/buckets\/[^/]+\/files\/[^/]+\/view$/;

export function optimizedImageUrl(src, { width = 800, height, quality = 75 } = {}) {
  if (typeof src !== "string" || !src) return src;

  const queryAt = src.indexOf("?");
  const base = queryAt === -1 ? src : src.slice(0, queryAt);
  if (!APPWRITE_VIEW_RE.test(base)) return src;

  const params = new URLSearchParams(queryAt === -1 ? "" : src.slice(queryAt + 1));
  params.set("width", String(width));
  if (height) params.set("height", String(height));
  params.set("quality", String(quality));
  params.set("output", "webp");

  return `${base.replace(/\/view$/, "/preview")}?${params.toString()}`;
}
