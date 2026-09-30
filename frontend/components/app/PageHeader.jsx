"use client";

import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import { cn } from "@/lib/utils";

/**
 * DESIGN.md — the timeline header. A bold 20px title with a hairline
 * bottom border, optionally carrying a tab strip. Sticks to the top of the
 * centre column; on mobile it offsets the app's own 53px top bar.
 */
export function PageHeader({
  title,
  subtitle,
  href,
  right,
  tabs,
  activeTab,
  onTabChange,
  className,
}) {
  return (
    <div
      className={cn(
        "sticky top-[53px] z-10 border-b border-[var(--cz-border)] bg-[var(--cz-bg)]/90 backdrop-blur md:top-0",
        className,
      )}
    >
      <div className="flex min-h-[53px] items-center gap-3 px-4">
        {href ? (
          <Link
            href={href}
            aria-label="Back"
            className="-ml-2 grid h-[36px] w-[36px] shrink-0 place-items-center rounded-full text-[var(--cz-text-primary)] transition-colors hover:bg-[var(--cz-surface-strong)]"
          >
            <ArrowLeft className="h-[20px] w-[20px]" aria-hidden />
          </Link>
        ) : null}
        <div className="min-w-0 flex-1">
          <h1 className="truncate text-[20px] leading-6 font-extrabold text-[var(--cz-text-primary)]">
            {title}
          </h1>
          {subtitle ? (
            <p className="truncate text-[13px] leading-[16px] text-[var(--cz-text-secondary)]">
              {subtitle}
            </p>
          ) : null}
        </div>
        {right ? <div className="shrink-0">{right}</div> : null}
      </div>

      {tabs?.length ? (
        <div
          role="tablist"
          aria-label={title}
          className="flex overflow-x-auto scrollbar-none"
        >
          {tabs.map((t) => {
            const on = t.id === activeTab;
            return (
              <button
                key={t.id}
                role="tab"
                aria-selected={on}
                onClick={() => onTabChange?.(t.id)}
                disabled={t.disabled}
                className={cn(
                  "relative h-[52px] min-w-[64px] flex-1 shrink-0 cursor-pointer whitespace-nowrap px-4 text-[15px] font-medium transition-colors",
                  t.disabled && "cursor-not-allowed opacity-45",
                  on
                    ? "font-bold text-[var(--cz-text-primary)]"
                    : "text-[var(--cz-text-secondary)] hover:bg-[var(--cz-surface-strong)] hover:text-[var(--cz-text-primary)]",
                )}
              >
                {t.label}
                {on ? (
                  <span
                    aria-hidden
                    className="absolute inset-x-0 bottom-0 h-[2px] bg-[var(--cz-accent)]"
                  />
                ) : null}
              </button>
            );
          })}
        </div>
      ) : null}
    </div>
  );
}
