"use client";

import { useEffect, useState } from "react";
import Cloudscape from "@/components/forgeui/cloudscape";
import { readTheme } from "@/lib/theme";
import { cn } from "@/lib/utils";

// Tuned against the class-based tokens in globals.css (`:root` light,
// `.dark` dark — no `dark:` utilities). Light stays airy so ink text keeps
// contrast; dark stays deep navy so primary text stays readable.
const LIGHT = {
  colorBottom: "#9ecff2",
  colorMid: "#e6f0f8",
  colorTop: "#ffffff",
};

const DARK = {
  colorBottom: "#04070d",
  colorMid: "#0e2236",
  colorTop: "#2b4e70",
};

export function LandingCloudscape() {
  const [theme, setTheme] = useState("light");
  const [mounted, setMounted] = useState(false);
  const [reduceMotion, setReduceMotion] = useState(false);

  useEffect(() => {
    const sync = () => setTheme(readTheme());
    sync();
    setMounted(true);

    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    const syncMotion = (e) => setReduceMotion(e.matches);
    setReduceMotion(mq.matches);
    mq.addEventListener?.("change", syncMotion);

    // ThemeToggle flips the `dark` class on <html> (see lib/theme.js),
    // so observe it instead of adding another source of truth.
    const obs = new MutationObserver(sync);
    obs.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ["class"],
    });

    return () => {
      obs.disconnect();
      mq.removeEventListener?.("change", syncMotion);
    };
  }, []);

  const palette = theme === "dark" ? DARK : LIGHT;

  return (
    <div
      aria-hidden
      className="pointer-events-none absolute inset-x-0 top-0 z-0 h-[720px] overflow-hidden sm:h-[800px]"
    >
      <div
        className={cn(
          "absolute inset-0 transition-opacity duration-700",
          mounted ? "opacity-100" : "opacity-0",
        )}
      >
        <Cloudscape
          colorBottom={palette.colorBottom}
          colorMid={palette.colorMid}
          colorTop={palette.colorTop}
          speed={reduceMotion ? 0 : 0.8}
          height="100%"
          className="h-full w-full bg-[var(--cz-bg)]"
        />
      </div>
      {/* Readability scrims — page tokens so both themes keep contrast,
          fading to solid page bg so the sections below start clean. */}
      <div className="absolute inset-0 bg-[var(--cz-bg)]/30" />
      <div className="absolute inset-0 bg-gradient-to-b from-[var(--cz-bg)]/70 via-transparent to-[var(--cz-bg)]" />
    </div>
  );
}
