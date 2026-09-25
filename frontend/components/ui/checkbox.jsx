"use client";

import { cn } from "@/lib/utils";

export function Checkbox({ checked, onChange, label, id, className, ...props }) {
  return (
    <label htmlFor={id} className={cn("group flex items-center gap-2.5 cursor-pointer select-none", className)}>
      <button
        type="button"
        role="checkbox"
        id={id}
        aria-checked={checked}
        onClick={() => onChange?.(!checked)}
        className={cn(
          "t-check relative grid place-items-center h-[18px] w-[18px] shrink-0 rounded-[5px] border",
          checked
            ? "bg-[var(--cz-muted)] border-[var(--cz-muted)] shadow-[0_2px_8px_rgba(125,130,217,0.28)]"
            : "bg-transparent border-[var(--cz-border-strong)] hover:border-[var(--cz-text-secondary)]/40"
        )}
        {...props}
      >
        <svg
          viewBox="0 0 10.1668 10.1668"
          className="h-[11px] w-[11px] pointer-events-none"
          fill="none"
          stroke="white"
          strokeWidth="1.6"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="M1 5.52L3.92 9.17L9.17 1" />
        </svg>
      </button>
      {label ? (
        <span className="text-[13px] leading-[18px] text-[var(--cz-text-secondary)] group-hover:text-[var(--cz-text-primary)] transition-colors">
          {label}
        </span>
      ) : null}
      <input type="checkbox" checked={checked} onChange={() => {}} className="sr-only" tabIndex={-1} aria-hidden />
    </label>
  );
}
