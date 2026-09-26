const HASHTAG_REGEX = /#([\p{L}\p{M}\p{N}_]+)/gu;

export const HASHTAG_MAX_PER_POST = 10;
export const HASHTAG_MAX_LENGTH = 30;

export function extractHashtags(text) {
  if (!text || typeof text !== "string") return [];
  const matches = text.match(HASHTAG_REGEX) || [];
  const seen = new Set();
  const out = [];
  for (const m of matches) {
    const tag = m.slice(1).toLowerCase();
    if (!tag) continue;
    if (tag.length > HASHTAG_MAX_LENGTH) continue;
    if (seen.has(tag)) continue;
    seen.add(tag);
    out.push(tag);
    if (out.length >= HASHTAG_MAX_PER_POST) break;
  }
  return out;
}

export function normalizeHashtag(tag) {
  if (!tag || typeof tag !== "string") return "";
  return tag.replace(/^#+/, "").toLowerCase().trim().slice(0, HASHTAG_MAX_LENGTH);
}

export function isValidHashtag(tag) {
  if (!tag) return false;
  return /^[\p{L}\p{M}\p{N}_]{1,30}$/u.test(tag);
}
