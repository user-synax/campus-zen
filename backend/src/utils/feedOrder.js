import crypto from "crypto";

/**
 * Randomized "For you" feed ordering + cursor pagination helpers.
 *
 * Design (Render free tier friendly — no Redis, no $sample aggregation):
 *  1. Each browsing session gets a random seed. The server deterministically
 *     shuffles that session's candidate post IDs by rank = hash(seed + ":" + id)
 *     and memoizes the shuffled ID list (~10 min, see TTL.FEED_ORDER).
 *  2. Every page is an O(1) RAM slice of that list — page 2+ never re-sorts,
 *     re-resamples or cursor-scans Mongo. The only DB work per page is one
 *     `$in` hydration of the slice (same as the old offset approach).
 *  3. The cursor is an opaque base64url JSON token { seed, start, lastId }.
 *     `lastId` self-heals drift: if the memoized order gets rebuilt mid-session
 *     (new posts) the server resumes right after the post the user last saw
 *     instead of trusting the stored index — no repeats, worst case a few new
 *     posts land between them.
 *
 * Determinism matters: same (seed, candidate ids) always produces the same
 * order, so a cache miss never breaks an in-flight session's page sequence.
 */

/** 12-char hex seed — opaque, URL-safe, always valid for the route regex. */
export function createSeed() {
  return crypto.randomBytes(6).toString("hex");
}

/** FNV-1a 32-bit — tiny, stateless, no deps. Good enough for shuffle ranks. */
export function fnv1a(str) {
  let h = 0x811c9dc5;
  for (let i = 0; i < str.length; i++) {
    const c = str.charCodeAt(i);
    if (c > 0x7f) {
      // crude utf-8 continuation for safety (ids + seeds are ASCII in practice)
      h = Math.imul(h ^ (0xc0 | (c >> 6)), 0x01000193) >>> 0;
      h = Math.imul(h ^ (0x80 | (c & 0x3f)), 0x01000193) >>> 0;
    } else {
      h = Math.imul(h ^ c, 0x01000193) >>> 0;
    }
  }
  return h >>> 0;
}

/** Deterministic per-seed order — same input ids ⇒ same output order. */
export function orderIds(seed, ids) {
  const scored = new Array(ids.length);
  for (let i = 0; i < ids.length; i++) {
    scored[i] = { id: ids[i], rank: fnv1a(seed + ":" + ids[i]) };
  }
  scored.sort((a, b) => a.rank - b.rank || (a.id < b.id ? -1 : a.id > b.id ? 1 : 0));
  return scored.map((s) => s.id);
}

/**
 * Opaque, URL-safe cursor: base64url(JSON).
 *
 * Two cursor shapes (tagged on decode):
 *  - order cursor  { s, k, l }  → seeded-random "For you" sessions
 *      s = session seed, k = candidate index the NEXT page starts at,
 *      l = id of the last post actually shown on THIS page (drift anchor).
 *  - keyset cursor { c, i }     → chronological following feed
 *      c = createdAt (epoch ms), i = _id of the last post shown (tie-break).
 *
 * Both consume the same opaque wire format; callers branch on `kind`.
 */
export function encodeCursor({ seed, start, lastId }) {
  const payload = JSON.stringify({ s: seed, k: start, l: lastId || "" });
  return Buffer.from(payload, "utf8").toString("base64url");
}

export function encodeKeysetCursor({ createdAtMs, lastId }) {
  const payload = JSON.stringify({ c: createdAtMs, i: lastId || "" });
  return Buffer.from(payload, "utf8").toString("base64url");
}

/** Returns { kind: "order", seed, start, lastId } | { kind: "keyset", ... } | null */
export function decodeCursor(cursor) {
  try {
    const raw = Buffer.from(String(cursor), "base64url").toString("utf8");
    const obj = JSON.parse(raw);
    if (!obj || typeof obj !== "object") return null;
    if (typeof obj.s === "string") {
      const start = Number(obj.k);
      if (!/^[a-f0-9]{6,32}$/.test(obj.s)) return null;
      if (!Number.isInteger(start) || start < 0 || start > 10_000_000) return null;
      const lastId = typeof obj.l === "string" && /^[a-f\d]{24}$/i.test(obj.l) ? obj.l : "";
      return { kind: "order", seed: obj.s, start, lastId };
    }
    if (obj.c !== undefined) {
      const createdAtMs = Number(obj.c);
      const lastId = typeof obj.i === "string" && /^[a-f\d]{24}$/i.test(obj.i) ? obj.i : "";
      if (!Number.isFinite(createdAtMs) || createdAtMs < 0 || createdAtMs > Date.now() + 86400_000) return null;
      return { kind: "keyset", createdAtMs, lastId };
    }
    return null;
  } catch {
    return null;
  }
}

/**
 * Resolve the paging start for a SEEDED-ORDER feed (.For you). Sessions embed
 * the seed inside the cursor so pages 2+ never re-randomize; a seed param
 * lets callers rehydrate an existing session. Keyset cursors (wrong feed)
 * or garbage → treated as a fresh session. Chronological following uses
 * decodeCursor directly with zero randomness.
 */
export function resolveFeedState(cursor, seedParam) {
  if (cursor) {
    const state = decodeCursor(cursor);
    if (state?.kind === "order") return { ...state, fresh: false };
  }
  const seed = /^[a-f0-9]{6,32}$/.test(String(seedParam || ""))
    ? String(seedParam)
    : createSeed();
  return { kind: "order", seed, start: 0, lastId: "", fresh: true };
}
