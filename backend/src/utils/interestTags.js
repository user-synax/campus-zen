import { AppError } from "./AppError.js";

/**
 * Interest-tag taxonomy (v1, fixed): the Interest Hub filters posts by these.
 * MIRRORED on the web client (frontend/lib/interestTags.js) — keep both lists
 * in sync. Extending the list later is a constant change + deployment; no
 * schema migration needed (enum widens forward-compatibly).
 */
export const INTEREST_TAGS = ["coding", "design", "cybersecurity", "devops", "drawing", "business"];

export const INTEREST_TAG_SET = new Set(INTEREST_TAGS);

export const MIN_INTEREST_TAGS = 0;
export const MAX_INTEREST_TAGS = 3;

/**
 * Validate + normalize user-selected interest tags. OPTIONAL — a post without
 * topics is valid (it just never surfaces in the hub).
 * Accepts array of strings (also tolerates a JSON string / single string for
 * lenient clients). Throws 400 with clear codes: UNKNOWN_TAG (not in the
 * taxonomy), INVALID_TAGS (non-array / non-string items, e.g. nested arrays
 * or objects).
 */
export function normalizeInterestTags(raw) {
  let input = raw;
  if (typeof input === "string") {
    try {
      input = JSON.parse(input);
    } catch {
      input = [input];
    }
  }
  if (input == null) input = [];
  if (!Array.isArray(input)) throw new AppError("Invalid topics", 400, "INVALID_TAGS");
  const seen = new Set();
  const tags = [];
  for (const item of input.slice(0, MAX_INTEREST_TAGS + 8)) {
    const raw =
      typeof item === "string" ? item : typeof item === "number" ? String(item) : null;
    if (raw === null) throw new AppError("Invalid topics", 400, "INVALID_TAGS");
    const t = raw.trim().toLowerCase();
    if (!t || seen.has(t)) continue;
    if (!INTEREST_TAG_SET.has(t)) throw new AppError("Unknown topic", 400, "UNKNOWN_TAG");
    seen.add(t);
    tags.push(t);
    if (tags.length >= MAX_INTEREST_TAGS) break;
  }
  return tags;
}

export const isInterestTag = (t) => INTEREST_TAG_SET.has(t);
