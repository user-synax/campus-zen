"use client";

import { cn } from "@/lib/utils";

export function Checkbox({
  checked,
  onChange,
  label,
  id,
  className,
  ...props
}) {
  return (
    <label
      htmlFor={id}
      className={cn(
        "group flex items-center gap-2.5 cursor-pointer select-none",
        className,
      )}
    >
      <button
        type="button"
        role="checkbox"
        id={id}
        aria-checked={checked}
        onClick={() => onChange?.(!checked)}
        className={cn(
          "t-check relative grid place-items-center h-[20px] w-[20px] shrink-0 rounded-[4px] border",
          checked
            ? "bg-[var(--cz-accent)] border-[var(--cz-accent)]"
            : "bg-transparent border-[var(--cz-border-strong)] hover:border-[var(--cz-text-secondary)]",
        )}
        {...props}
      >
        <svg
          viewBox="0 0 10.1668 10.1668"
          className="h-[12px] w-[12px] pointer-events-none"
          fill="none"
          stroke="var(--cz-text-inverse)"
          strokeWidth="1.7"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="M1 5.52L3.92 9.17L9.17 1" />
        </svg>
      </button>
      {label ? (
        <span className="text-[15px] leading-[20px] text-[var(--cz-text-primary)] transition-colors">
          {label}
        </span>
      ) : null}
      <input
        type="checkbox"
        checked={checked}
        onChange={() => {}}
        className="sr-only"
        tabIndex={-1}
        aria-hidden
      />
    </label>
  );
}
