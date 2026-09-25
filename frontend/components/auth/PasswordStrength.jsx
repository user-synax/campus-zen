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
const colors = [
  "bg-[var(--cz-error)]",
  "bg-[#ff8a5c]",
  "bg-[#ffcead]",
  "bg-[var(--cz-muted)]",
  "bg-emerald-400",
];

export function PasswordStrength({ password }) {
  const raw = scorePassword(password);
  // map 0-5 to 0-4 index
  const level = password ? (password.length < 8 ? 0 : Math.max(0, raw - 1)) : 0;
  const show = password && password.length > 0;
  const width = show ? ((level + 1) / 4) * 100 : 0;

  return (
    <div className="mt-2">
      <div className="flex items-center gap-1.5">
        <div className="flex-1 h-[4px] rounded-full bg-[rgba(255,206,173,0.12)] overflow-hidden">
          <div
            className={cn("h-full rounded-full transition-all duration-300 ease-[cubic-bezier(0.22,1,0.36,1)]", colors[level])}
            style={{ width: `${width}%` }}
          />
        </div>
        {show ? (
          <span
            className={cn(
              "text-[11px] font-medium tracking-[0.04em] uppercase min-w-[72px] text-right transition-colors",
              level <= 1 ? "text-[var(--cz-error)]" : level === 2 ? "text-[#ffcead]" : "text-[var(--cz-text-secondary)]"
            )}
          >
            {labels[level]}
          </span>
        ) : (
          <span className="text-[11px] tracking-[0.04em] uppercase text-[var(--cz-text-secondary)]/60 min-w-[72px] text-right">
            8+ chars
          </span>
        )}
      </div>
      {show && password.length < 8 ? (
        <p className="mt-1.5 text-[11px] leading-[14px] text-[var(--cz-error)]">Minimum 8 characters required.</p>
      ) : null}
    </div>
  );
}
