"use client";

import { Moon, Sun } from "lucide-react";
import { useState } from "react";
import { applyTheme, persistTheme, readTheme } from "@/lib/theme";
import { cn } from "@/lib/utils";

/**
 * Light/dark switch. DESIGN.md specifies a light theme, so light is the
 * default and dark is the same token system inverted. The root layout has
 * already stamped the right class on <html> from the cookie, so this only
 * has to flip it and record the choice.
 */
export function ThemeToggle({ className, side = "right" }) {
  const [theme, setTheme] = useState(null);

  const toggle = () => {
    const next = readTheme() === "dark" ? "light" : "dark";
    setTheme(next);
    applyTheme(next);
    persistTheme(next);
  };

  const isDark = readTheme() === "dark";

  return (
    <button
      type="button"
      onClick={toggle}
      aria-label={isDark ? "Switch to light mode" : "Switch to dark mode"}
      className={cn(
        "grid shrink-0 cursor-pointer place-items-center rounded-full text-[var(--cz-text-primary)] transition-colors duration-150 hover:bg-[var(--cz-surface-strong)]",
        className,
      )}
    >
      <span
        className="t-icon-swap"
        data-state={theme === null ? "a" : theme === "dark" ? "b" : "a"}
      >
        <Sun className="t-icon h-[24px] w-[24px]" data-icon="a" aria-hidden />
        <Moon className="t-icon h-[24px] w-[24px]" data-icon="b" aria-hidden />
      </span>
    </button>
  );
}
