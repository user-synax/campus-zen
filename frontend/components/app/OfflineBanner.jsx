"use client";

import { WifiOff } from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";

/**
 * Sticky offline bar — persists until back online.
 * Listens to navigator.onLine + online/offline events.
 * Placed at top of AppShell so feed/composer/search all inherit it.
 */
export function OfflineBanner() {
  const [online, setOnline] = useState(() =>
    typeof navigator !== "undefined" ? navigator.onLine : true,
  );

  useEffect(() => {
    const goOffline = () => setOnline(false);
    const goOnline = () => {
      setOnline(true);
      toast.success("Back online — retrying");
    };
    window.addEventListener("offline", goOffline);
    window.addEventListener("online", goOnline);
    // In case state hydrated as online but actually offline
    setOnline(navigator.onLine);
    return () => {
      window.removeEventListener("offline", goOffline);
      window.removeEventListener("online", goOnline);
    };
  }, []);

  if (online) return null;

  return (
    <div
      role="status"
      aria-live="polite"
      className="sticky top-0 z-40 flex items-center justify-center gap-2 bg-[var(--cz-warn)] px-4 py-2 text-center text-[13px] font-semibold text-black md:top-0"
    >
      <WifiOff className="h-4 w-4 shrink-0" aria-hidden />
      <span>You’re offline — new posts and actions will retry when you’re back.</span>
    </div>
  );
}
