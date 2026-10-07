const ARTICLE_MENTION_REGEX = /\$\{([a-z0-9_]{3,20})\/([a-z0-9-]{1,100})\}/gi;

export const ARTICLE_TITLE_MAX = 120;
export const ARTICLE_DESC_MAX = 200;
export const ARTICLE_BODY_MAX = 50000;
export const ARTICLE_SLUG_MAX = 100;
export const ARTICLE_MENTION_MAX = 10;

export function slugifyArticle(title) {
  if (!title || typeof title !== "string") return "article";
  let slug = title
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9\s-]/g, "")
    .trim()
    .replace(/[\s_]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, ARTICLE_SLUG_MAX);
  if (!slug) slug = "article";
  return slug;
}

export function normalizeArticleSlug(slug) {
  if (!slug || typeof slug !== "string") return "";
  return slug.toLowerCase().trim().replace(/^-+|-+$/g, "").slice(0, ARTICLE_SLUG_MAX);
}

export function isValidArticleSlug(slug) {
  if (!slug) return false;
  return /^[a-z0-9][a-z0-9-]{0,99}$/.test(slug);
}

export function extractArticleMentions(text) {
  if (!text || typeof text !== "string") return [];
  const seen = new Set();
  const out = [];
  ARTICLE_MENTION_REGEX.lastIndex = 0;
  let m;
  while ((m = ARTICLE_MENTION_REGEX.exec(text)) !== null) {
    const username = m[1].toLowerCase();
    const slug = m[2].toLowerCase();
    if (!/^[a-z0-9_]{3,20}$/.test(username)) continue;
    if (!isValidArticleSlug(slug)) continue;
    const key = `${username}/${slug}`;
    if (seen.has(key)) continue;
    seen.add(key);
    out.push({ username, slug, key, raw: m[0] });
    if (out.length >= ARTICLE_MENTION_MAX) break;
  }
  ARTICLE_MENTION_REGEX.lastIndex = 0;
  return out;
}

export function stripMarkdownToText(md, max = 280) {
  if (!md || typeof md !== "string") return "";
  let t = md
    .replace(/```[\s\S]*?```/g, " ")
    .replace(/`([^`]+)`/g, "$1")
    .replace(/!\[([^\]]*)\]\([^)]+\)/g, "$1")
    .replace(/\[([^\]]+)\]\([^)]+\)/g, "$1")
    .replace(/^#{1,6}\s+/gm, "")
    .replace(/^[>\s-]*\[[ xX]\]\s+/gm, "")
    .replace(/[*_~]{1,3}([^*_~]+)[*_~]{1,3}/g, "$1")
    .replace(/^[-*+]\s+/gm, "")
    .replace(/^\d+\.\s+/gm, "")
    .replace(/^>\s?/gm, "")
    .replace(/\$\{[a-z0-9_]{3,20}\/[a-z0-9-]{1,100}\}/gi, "")
    .replace(/[#*_`>|[\]()]/g, "")
    .replace(/\s+/g, " ")
    .trim();
  if (t.length > max) t = t.slice(0, max - 1).trimEnd() + "…";
  return t;
}

export function buildArticleTeaser(description, body) {
  const d = String(description || "").trim();
  if (d) return d.slice(0, ARTICLE_DESC_MAX);
  return stripMarkdownToText(body, 280);
}
