"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { api } from "@/lib/api";

// Guest-only page: signed-in visitors go straight to the app,
// same pattern as LandingRedirect and GuestGuard.
export function DocsRedirect() {
  const router = useRouter();
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        await api.me();
        if (!cancelled) router.replace("/app");
      } catch {
        // logged out — stay on /docs
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [router]);
  return null;
}
