"use client";

import { Analytics } from "@vercel/analytics/next";
import { SpeedInsights } from "@vercel/speed-insights/next";

// Vercel Analytics is optional processing. The root layout reads the
// `cz_analytics` consent cookie server-side; without it we render nothing.
export function ConsentAwareAnalytics({ enabled = false }) {
  if (!enabled) return null;
  return (
    <>
      <Analytics />
      <SpeedInsights />
    </>
  );
}
