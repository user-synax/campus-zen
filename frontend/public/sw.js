/* CampusZen push service worker — served at /sw.js (public/sw.js).
 * Must stay dependency-free and version-agnostic: no Next.js imports.
 * Handles Web Push when the app/tab is closed via OS-level notifications.
 */

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
        const existing = await self.registration.getNotifications({ tag: options.tag });
        for (const n of existing) n.close();
      } catch {}
      await self.registration.showNotification(title, options);
    })()
  );
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const url = event.notification.data?.url || "/app/notifications";
  event.waitUntil(
    (async () => {
      const all = await clients.matchAll({ type: "window", includeUncontrolled: true });
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
    })()
  );
});
