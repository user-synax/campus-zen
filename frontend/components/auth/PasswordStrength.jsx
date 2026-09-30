"use client";

import { cn } from "@/lib/utils";

function scorePassword(pw) {
  let s = 0;
  if (!pw) return 0;
  if (pw.length >= 8) s++;
  if (pw.length >= 12) s++;
  if (/[A-Z]/.test(pw) && /[a-z]/.test(pw)) s++;
  if (/\d/.test(pw)) s++;
  if (/[^A-Za-z0-9]/.test(pw)) s++;
  return Math.min(s, 4);
}

const labels = ["Too weak", "Weak", "Good", "Strong", "Very strong"];

/**
 * X has no strength meter — but a signup form still needs to tell you the
 * password is too short. So: one achromatic track, and the fill only ever
 * uses Ink Black until it is long enough, then X Blue. No colour ramp.
 */
export function PasswordStrength({ password }) {
  const raw = scorePassword(password);
  const level = password ? (password.length < 8 ? 0 : Math.max(0, raw - 1)) : 0;
  const show = Boolean(password);
  const width = show ? ((level + 1) / 4) * 100 : 0;
  const tooShort = show && password.length < 8;

  return (
    <div className="mt-2">
      <div className="flex items-center gap-2">
        <div className="h-[4px] flex-1 overflow-hidden rounded-full bg-[var(--cz-surface-strong)]">
          <div
            className={cn(
              "h-full rounded-full transition-all duration-300 ease-[cubic-bezier(0.22,1,0.36,1)]",
              tooShort || level <= 1
                ? "bg-[var(--cz-text-primary)]"
                : "bg-[var(--cz-accent)]",
            )}
            style={{ width: `${width}%` }}
          />
        </div>
        <span
          className={cn(
            "min-w-[84px] text-right text-[13px] transition-colors",
            tooShort
              ? "text-[var(--cz-error)]"
              : "text-[var(--cz-text-secondary)]",
          )}
        >
          {show ? labels[level] : "8+ characters"}
        </span>
      </div>
      {tooShort ? (
        <p className="mt-1.5 text-[13px] leading-[17px] text-[var(--cz-error)]">
          Minimum 8 characters required.
        </p>
      ) : null}
    </div>
  );
}
