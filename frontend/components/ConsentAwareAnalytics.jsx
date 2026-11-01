"use client";

import { Analytics } from "@vercel/analytics/next";
import { SpeedInsights } from "@vercel/speed-insights/next";
import { useEffect, useState } from "react";

// Vercel Analytics is optional processing. The backend mirrors the consent
// decision into the first-party `cz_analytics` cookie; it is not an auth
// secret. Reading it here (not in the root layout) keeps every route
// statically renderable and fully prefetchable — see the theme bootstrap in
// app/layout.js for the same trade.
const checkConsent = () =>
  typeof document !== "undefined" &&
  /(?:^|;\s*)cz_analytics=1(?:;|$)/.test(document.cookie);

export function ConsentAwareAnalytics() {
  const [allowed, setAllowed] = useState(false);

  useEffect(() => {
    setAllowed(checkConsent());
  }, []);

  if (!allowed) return null;
  return (
    <>
      <Analytics />
      <SpeedInsights />
    </>
  );
}
