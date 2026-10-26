/* CampusZen service worker — served at /sw.js (public/sw.js).
 * Must stay dependency-free and version-agnostic: no Next.js imports.
 * 1. Web Push handling for closed tabs (OS-level notifications).
 * 2. 60-minute runtime cache for cross-origin post images/avatars via the
 *    Cache API — repeat views skip the CDN round-trip entirely, which matters
 *    on the free-tier backend setup. Videos, API and same-origin requests are
 *    never intercepted.
 */

// ─── Push ─────────────────────────────────────────────────────────────────────

self.addEventListener("push", (event) => {
  let data = {};
  try {
    data = event.data ? event.data.json() : {};
  } catch {
    try {
      data = { body: event.data ? event.data.text() : "" };
    } catch {
      data = {};
    }
  }

  const title = data.title || "CampusZen";
  const options = {
    body: data.body || "You have a new notification",
    icon: data.icon || "/campusZen.png",
    badge: data.badge || "/icon.svg",
    tag: data.tag || "campuszen",
    data: {
      url: data.url || "/app/notifications",
      notifId: data.notifId || null,
    },
    renotify: false,
  };

  event.waitUntil(
    (async () => {
      // Collapse duplicates with the same tag before showing.
      try {
        const existing = await self.registration.getNotifications({
          tag: options.tag,
        });
        for (const n of existing) n.close();
      } catch {}
      await self.registration.showNotification(title, options);
    })(),
  );
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const url = event.notification.data?.url || "/app/notifications";
  event.waitUntil(
    (async () => {
      const all = await clients.matchAll({
        type: "window",
        includeUncontrolled: true,
      });
      // Focus an open CampusZen tab on the same origin if one exists.
      for (const client of all) {
        try {
          const u = new URL(client.url);
          if (u.pathname.startsWith("/app") || u.pathname === "/") {
            await client.focus();
            // Navigate focused tab to the target when possible.
            if ("navigate" in client) await client.navigate(url);
            else await client.postMessage({ type: "PUSH_NAVIGATE", url });
            return;
          }
        } catch {}
      }
      // Otherwise open a new window.
      try {
        await clients.openWindow(url);
      } catch {}
    })(),
  );
});

// ─── Media runtime cache (images only, 60 min TTL) ──────────────────────────

const MEDIA_CACHE = "cz-media-v1";
const MEDIA_TTL_MS = 60 * 60 * 1000; // 60 minutes
const MEDIA_MAX_ENTRIES = 150; // hard cap so Cache API quota stays healthy
const MEDIA_TS_HOST = "https://cz-media-ts.internal/?u=";

// Mirrors the project CSP img-src: Appwrite storage/avatars + GitHub avatars.
const MEDIA_HOST_RE =
  /(^|\.)appwrite\.io$|^cloud\.appwrite\.io$|(^|\.)cloudflarestream\.com$|(^|\.)cloudflare\.com$|(^|\.)githubusercontent\.com$|^github\.com$/;

self.addEventListener("activate", (event) => {
  event.waitUntil(
    (async () => {
      // drop older media cache versions on update
      const names = await caches.keys();
      await Promise.all(
        names
          .filter((n) => n.startsWith("cz-media-") && n !== MEDIA_CACHE)
          .map((n) => caches.delete(n)),
      );
    })(),
  );
});

self.addEventListener("fetch", (event) => {
  const req = event.request;
  if (req.method !== "GET") return;
  // <img> resources only — avatars + post media. Fetch/XHR/audio/video and
  // navigation pass through untouched.
  if (req.destination !== "image") return;
  let url;
  try {
    url = new URL(req.url);
  } catch {
    return;
  }
  if (url.protocol !== "https:") return;
  if (url.origin === self.location.origin) return; // Next.js owns same-origin caching
  if (!MEDIA_HOST_RE.test(url.hostname)) return;
  event.respondWith(serveMedia(req));
});

function tsKeyFor(href) {
  return MEDIA_TS_HOST + encodeURIComponent(href);
}

async function isMediaFresh(cache, href) {
  const tsRes = await cache.match(tsKeyFor(href));
  if (!tsRes) return false;
  const ts = Number(await tsRes.text());
  return Number.isFinite(ts) && Date.now() - ts < MEDIA_TTL_MS;
}

async function serveMedia(req) {
  const cache = await caches.open(MEDIA_CACHE);
  let hit = null;
  try {
    hit = await cache.match(req, { ignoreVary: true });
  } catch {}
  if (hit) {
    let fresh = false;
    try {
      fresh = await isMediaFresh(cache, req.url);
    } catch {}
    if (fresh) return hit;
    // expired → refetch, but keep the stale copy as an offline fallback
    try {
      await cache.delete(req, { ignoreVary: true });
    } catch {}
  }

  let res;
  try {
    res = await fetch(req);
  } catch {
    // offline: stale beats broken image
    if (hit) return hit;
    return Response.error();
  }
  const usable = Boolean(res) && (res.ok || res.type === "opaque");
  if (usable) {
    try {
      await cache.put(req, res.clone());
      await cache.put(tsKeyFor(req.url), new Response(String(Date.now())));
      pruneMediaCache(cache);
    } catch {}
  }
  return res;
}

// Keep the media cache bounded — evict oldest (by timestamp) beyond the cap.
async function pruneMediaCache(cache) {
  try {
    const keys = await cache.keys();
    const mediaKeys = keys.filter((r) => !r.url.startsWith(MEDIA_TS_HOST));
    if (mediaKeys.length <= MEDIA_MAX_ENTRIES) return;
    const entries = [];
    for (const r of mediaKeys) {
      let ts = 0;
      const tsRes = await cache.match(tsKeyFor(r.url));
      if (tsRes) ts = Number(await tsRes.text()) || 0;
      entries.push({ url: r.url, ts });
    }
    entries.sort((a, b) => a.ts - b.ts);
    const excess = mediaKeys.length - MEDIA_MAX_ENTRIES;
    for (let i = 0; i < excess; i++) {
      await cache.delete(tsKeyFor(entries[i].url));
      await cache.delete(entries[i].url, { ignoreVary: true });
    }
  } catch {}
}
