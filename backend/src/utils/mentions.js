const MENTION_REGEX = /(?<!\w)@([a-z0-9_]{3,20})\b/gi;

export const MENTION_MAX_PER_POST = 10;

export function extractMentions(text) {
  if (!text || typeof text !== "string") return [];
  const seen = new Set();
  const out = [];
  // reset lastIndex for global regex reuse
  MENTION_REGEX.lastIndex = 0;
  let m;
  while ((m = MENTION_REGEX.exec(text)) !== null) {
    const name = m[1].toLowerCase();
    if (seen.has(name)) continue;
    seen.add(name);
    out.push(name);
    if (out.length >= MENTION_MAX_PER_POST) break;
  }
  MENTION_REGEX.lastIndex = 0;
  return out;
}

export function normalizeMention(tag) {
  if (!tag || typeof tag !== "string") return "";
  return tag.replace(/^@+/, "").toLowerCase().trim().slice(0, 20);
}

export function isValidMention(name) {
  if (!name) return false;
  return /^[a-z0-9_]{3,20}$/.test(name);
}
