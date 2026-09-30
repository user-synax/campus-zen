"use client";

import { useEffect, useRef } from "react";
import { cn } from "@/lib/utils";

export function OtpInput({ value, onChange, length = 6, autoFocus = true, error }) {
  const refs = useRef([]);

  useEffect(() => {
    if (autoFocus) refs.current[0]?.focus();
  }, [autoFocus]);

  const handleChange = (e, idx) => {
    const v = e.target.value.replace(/\D/g, "").slice(-1);
    if (!v && e.target.value !== "") return;
    const next = value.split("");
    // ensure length
    while (next.length < length) next.push("");
    next[idx] = v;
    const joined = next.join("").slice(0, length);
    onChange(joined);
    if (v && idx < length - 1) refs.current[idx + 1]?.focus();
  };

  const handleKeyDown = (e, idx) => {
    if (e.key === "Backspace" && !value[idx] && idx > 0) {
      refs.current[idx - 1]?.focus();
    }
    if (e.key === "ArrowLeft" && idx > 0) refs.current[idx - 1]?.focus();
    if (e.key === "ArrowRight" && idx < length - 1) refs.current[idx + 1]?.focus();
  };

  const handlePaste = (e) => {
    e.preventDefault();
    const pasted = e.clipboardData.getData("text").replace(/\D/g, "").slice(0, length);
    if (pasted) onChange(pasted);
    const focusIdx = Math.min(pasted.length, length - 1);
    setTimeout(() => refs.current[focusIdx]?.focus(), 0);
  };

  return (
    <div className="flex items-center justify-between gap-2">
      {Array.from({ length }).map((_, i) => (
        <input
          key={i}
          ref={(el) => (refs.current[i] = el)}
          inputMode="numeric"
          autoComplete="one-time-code"
          maxLength={1}
          value={value[i] || ""}
          onChange={(e) => handleChange(e, i)}
          onKeyDown={(e) => handleKeyDown(e, i)}
          onPaste={handlePaste}
          aria-label={`Digit ${i + 1}`}
          className={cn(
            "h-[52px] w-full max-w-[56px] rounded-[4px] bg-[var(--cz-surface-strong)] text-center font-mono text-[20px] text-[var(--cz-text-primary)] caret-[var(--cz-accent)] outline-none transition-colors",
            "focus:ring-1 focus:ring-[var(--cz-accent)]",
            error &&
              "border border-[var(--cz-error)]! ring-[3px]! ring-[color-mix(in_srgb,var(--cz-error)_18%,transparent)]!",
          )}
        />
      ))}
    </div>
  );
}
