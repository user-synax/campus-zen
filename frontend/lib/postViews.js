"use client";

// Deduped view-recording helper for post impressions.
//
// Server enforces per-user-per-day dedup via unique (post, viewer, dayKey),
// but the client must ALSO avoid spamming:
// - once per post per page-load (in-memory set)
// - once per post per day across reloads (sessionStorage day-bucket)
// - feed impressions only after the card stays visible ~1.5s (so fast
//   scrolls don't count), detail opens record immediately.
//
// Auth-only: guests have no session, api.recordPostView would 401 — skip
// silently and never throw (views must never break reading).

const seenThisLoad = new Set();

function dayKey() {
  try {
    return new Date().toISOString().slice(0, 10);
  } catch {
    return "unknown-day";
  }
}

function storageKey(postId) {
  return `cz:viewed:${dayKey()}:${postId}`;
}

function alreadyCounted(postId) {
  const id = String(postId);
  if (seenThisLoad.has(id)) return true;
  try {
    if (
      typeof sessionStorage !== "undefined" &&
      sessionStorage.getItem(storageKey(id))
    ) {
      seenThisLoad.add(id);
      return true;
    }
  } catch {}
  return false;
}

function markCounted(postId) {
  const id = String(postId);
  seenThisLoad.add(id);
  try {
    if (typeof sessionStorage !== "undefined")
      sessionStorage.setItem(storageKey(id), "1");
  } catch {}
}

export async function recordPostViewOnce(
  api,
  postId,
  { isGuest = false } = {},
) {
  if (!postId || isGuest) return null;
  const id = String(postId);
  if (alreadyCounted(id)) return null;
  // Claim the slot BEFORE the network call so burst mounts / StrictMode
  // double-effects can't fire twice.
  markCounted(id);
  try {
    const res = await api.recordPostView(id);
    return res?.data || null;
  } catch {
    // Swallow: a failed view must never toast or break the feed. Keep the
    // local mark so we don't retry in a loop; next day-bucket retries.
    return null;
  }
}

// Attach to a card element: fires recordPostViewOnce after the card has been
// >=50% visible for delayMs continuously. Returns a cleanup fn.
// Usage: useEffect(() => observePostView(el, postId, opts), [postId]).
export function observePostView(
  element,
  postId,
  { api, isGuest = false, delayMs = 1500 } = {},
) {
  if (!element || !postId || isGuest) return () => {};
  if (alreadyCounted(String(postId))) return () => {};
  if (typeof IntersectionObserver === "undefined") {
    const t = setTimeout(
      () => recordPostViewOnce(api, postId, { isGuest }),
      delayMs,
    );
    return () => clearTimeout(t);
  }
  let timer = null;
  const io = new IntersectionObserver(
    (entries) => {
      const visible = entries.some(
        (e) => e.isIntersecting && e.intersectionRatio >= 0.5,
      );
      if (visible) {
        if (!timer) {
          timer = setTimeout(() => {
            recordPostViewOnce(api, postId, { isGuest });
          }, delayMs);
        }
      } else if (timer) {
        clearTimeout(timer);
        timer = null;
      }
    },
    { threshold: [0, 0.5, 1] },
  );
  try {
    io.observe(element);
  } catch {}
  return () => {
    try {
      io.disconnect();
    } catch {}
    if (timer) clearTimeout(timer);
  };
}
