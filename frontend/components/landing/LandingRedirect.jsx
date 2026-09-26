"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { api } from "@/lib/api";

// Logged-in visitors skip the landing page and go straight to the app.
export function LandingRedirect() {
  const router = useRouter();
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        await api.me();
        if (!cancelled) router.replace("/app");
      } catch {
        // logged out — stay on landing
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [router]);
  return null;
}
