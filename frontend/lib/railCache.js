"use client";

// Persistent cache for the right rail (suggestions + trending).
//
// RightMinimal remounts on every route change (/app, /u, /c each own an
// AppShell), and it fetches outside react-query — so each remount cost two
// network requests. This module adds a two-level cache in front of those
// fetches:
//
//   memory Map  → instant, synchronous; kills refetches on tab switches
//   IndexedDB   → survives reloads; painted first, then revalidated
//
// Entries are `{ value, ts }`. Keys embed the user id so one account never
// reads another's suggestions. No new dependencies — raw IndexedDB.

const DB_NAME = "cz-rail";
const STORE = "kv";

export const RAIL_TTL = {
  // Suggestions shift when you follow people (also patched locally on
  // follow), so 10 minutes is plenty fresh.
  SUGGESTIONS: 10 * 60 * 1000,
  // Trending rides a 5-minute server cache; matching it avoids refetching
  // data the server wouldn't recompute anyway.
  TRENDING: 5 * 60 * 1000,
};

const mem = new Map();

let dbPromise = null;
function openDb() {
  return new Promise((resolve) => {
    try {
      if (typeof indexedDB === "undefined") return resolve(null);
      const req = indexedDB.open(DB_NAME, 1);
      req.onupgradeneeded = () => {
        if (!req.result.objectStoreNames.contains(STORE)) {
          req.result.createObjectStore(STORE);
        }
      };
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => resolve(null);
    } catch {
      resolve(null);
    }
  });
}

function db() {
  if (!dbPromise) dbPromise = openDb();
  return dbPromise;
}

export function railKey(kind, userKey) {
  if (kind === "trending") return "trending";
  return `suggestions:${userKey || "guest"}`;
}

/** Synchronous in-memory read — returns `{ value, ts }` or null. */
export function readRailMem(key) {
  return mem.get(key) || null;
}

export function isRailFresh(entry, ttl) {
  return !!entry && Date.now() - entry.ts < ttl;
}

/** Memory first, then IndexedDB (promoted back into memory). */
export async function readRail(key) {
  const hit = mem.get(key);
  if (hit) return hit;
  try {
    const d = await db();
    if (!d) return null;
    const stored = await new Promise((resolve) => {
      try {
        const tx = d.transaction(STORE, "readonly");
        const rq = tx.objectStore(STORE).get(key);
        rq.onsuccess = () => resolve(rq.result || null);
        rq.onerror = () => resolve(null);
      } catch {
        resolve(null);
      }
    });
    if (stored) mem.set(key, stored);
    return stored;
  } catch {
    return null;
  }
}

/** Write-through: memory updated synchronously, IDB in the background. */
export function writeRail(key, value) {
  const entry = { value, ts: Date.now() };
  mem.set(key, entry);
  db().then((d) => {
    if (!d) return;
    try {
      const tx = d.transaction(STORE, "readwrite");
      tx.objectStore(STORE).put(entry, key);
    } catch {}
  });
  return entry;
}
