"use client";

export const ARTICLE_MENTION_REGEX = /\$\{([a-z0-9_]{3,20})\/([a-z0-9-]{1,100})\}/gi;
export const ARTICLE_TITLE_MAX = 120;
export const ARTICLE_DESC_MAX = 200;
export const ARTICLE_BODY_MAX = 50000;

export function slugifyArticleClient(title) {
  if (!title) return "article";
  let slug = String(title)
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9\s-]/g, "")
    .trim()
    .replace(/[\s_]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 100);
  return slug || "article";
}

export function extractArticleMentionsForRender(text) {
  if (!text) return [];
  const seen = new Set();
  const out = [];
  ARTICLE_MENTION_REGEX.lastIndex = 0;
  let m;
  while ((m = ARTICLE_MENTION_REGEX.exec(text)) !== null) {
    const username = m[1].toLowerCase();
    const slug = m[2].toLowerCase();
    const key = `${username}/${slug}`;
    if (seen.has(key)) continue;
    seen.add(key);
    out.push({ username, slug, key, raw: m[0] });
    if (out.length >= 10) break;
  }
  ARTICLE_MENTION_REGEX.lastIndex = 0;
  return out;
}

export function articleUrl(username, slug) {
  return `/app/a/${encodeURIComponent(username)}/${encodeURIComponent(slug)}`;
}

export function excerptOf(post, max = 200) {
  const d = String(post?.description || "").trim();
  if (d) return d.slice(0, max);
  const b = String(post?.body || post?.text || "").replace(/\s+/g, " ").trim();
  if (b.length <= max) return b;
  return b.slice(0, max - 1).trimEnd() + "…";
}
