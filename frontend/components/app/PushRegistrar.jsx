"use client";

import { useEffect } from "react";

/**
 * Registers /sw.js once. Per Next.js docs, service workers must live in
 * public/ and be registered from a client component — never from SSR.
 * Registration alone does not subscribe; usePush() subscribes after permission.
 */
export function PushRegistrar() {
  useEffect(() => {
    if (!("serviceWorker" in navigator)) return;
    // Skip re-register churn in dev; SW still works in prod builds.
    navigator.serviceWorker.register("/sw.js", { scope: "/" }).catch(() => {});
    // Handle push-click navigation fallback via postMessage.
    const onMessage = (event) => {
      if (event.data?.type === "PUSH_NAVIGATE" && event.data?.url) {
        try {
          window.location.href = event.data.url;
        } catch {}
      }
    };
    navigator.serviceWorker.addEventListener?.("message", onMessage);
    return () => navigator.serviceWorker.removeEventListener?.("message", onMessage);
  }, []);
  return null;
}
