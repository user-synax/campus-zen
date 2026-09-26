"use client";

import { cn } from "@/lib/utils";
import { forwardRef } from "react";

export const Input = forwardRef(({ className, type = "text", error, ...props }, ref) => {
  return (
    <input
      ref={ref}
      type={type}
      data-error={error ? "true" : "false"}
      className={cn(
        "flex h-[42px] w-full rounded-[10px] cz-input px-3 py-2 text-[14px] leading-none tracking-[-0.01em] placeholder:text-[var(--cz-text-secondary)]/55 text-[var(--cz-text-primary)] outline-none transition-all duration-150 disabled:opacity-45 disabled:cursor-not-allowed",
        "focus-visible:border-[var(--cz-border)] focus-visible:shadow-[0_0_0_3px_rgba(125,130,217,0.18)]",
        error && "border-[var(--cz-error)]! shadow-[0_0_0_3px_rgba(255,90,106,0.12)]!",
        className
      )}
      {...props}
    />
  );
});
Input.displayName = "Input";

export function InputWrap({ children, className, error }) {
  return (
    <div className={cn("t-input-wrap flex flex-col gap-0", error && "is-error", className)}>
      {children}
    </div>
  );
}

export function InputShell({ children, className, error, shaking }) {
  return (
    <div
      className={cn(
        "t-input cz-input flex items-center gap-2 rounded-[10px] px-3 h-[42px] transition-colors",
        error && "is-error border-[var(--cz-error)]!",
        shaking && "is-shaking",
        className
      )}
    >
      {children}
    </div>
  );
}

export function ErrorMsg({ children }) {
  if (!children) return <p className="t-error-msg" aria-live="polite" />;
  return (
    <p className="t-error-msg text-[12px] leading-[16px] text-[var(--cz-error)]" aria-live="polite">
      {children}
    </p>
  );
}
