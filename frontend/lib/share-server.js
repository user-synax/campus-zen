/**
 * Server-only fetches for link previews and generated share images.
 *
 * The public post endpoints accept optional auth; OG crawlers are anonymous,
 * so this deliberately fetches without cookies. Private posts therefore fall
 * back to the branded generic card instead of leaking content.
 */
import { cache } from "react";

const API = (
  process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000"
).replace(/\/+$/, "");

const POST_ID = /^[a-f\d]{24}$/i;
const USERNAME = /^[a-z0-9_]{3,20}$/i;
const ARTICLE_SLUG = /^[a-z0-9][a-z0-9-]{0,99}$/i;

async function getJson(path) {
  try {
    const res = await fetch(`${API}${path}`, {
      headers: { Accept: "application/json" },
      next: { revalidate: 60 },
    });
    if (!res.ok) return null;
    const json = await res.json();
    return json?.data || null;
  } catch {
    return null;
  }
}

export const getPostForShare = cache(async (id) => {
  if (!POST_ID.test(String(id || ""))) return null;
  const data = await getJson(`/api/posts/${encodeURIComponent(id)}`);
  return data?.post || null;
});

export const getArticleForShare = cache(async (username, slug) => {
  if (!USERNAME.test(String(username || ""))) return null;
  if (!ARTICLE_SLUG.test(String(slug || ""))) return null;
  const data = await getJson(
    `/api/posts/articles/${encodeURIComponent(username)}/${encodeURIComponent(slug)}`,
  );
  return data?.post || null;
});
