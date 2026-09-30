"use client";

import { MailCheck, X } from "lucide-react";
import Link from "next/link";
import { useState } from "react";

export function VerifyBanner({ email }) {
  const [dismissed, setDismissed] = useState(false);
  if (dismissed || !email) return null;
  return (
    <div className="flex items-start gap-3 border-b border-[var(--cz-border-strong)] bg-[var(--cz-surface-strong)] px-4 py-2.5 text-[13px] leading-[18px] text-[var(--cz-text-primary)]">
      <MailCheck
        className="mt-0.5 h-[18px] w-[18px] shrink-0 text-[var(--cz-accent)]"
        aria-hidden
      />
      <span className="min-w-0 flex-1">
        Verify <span className="font-mono">{email}</span> to unlock full
        access.{" "}
        <Link
          href={`/verify-email?email=${encodeURIComponent(email)}`}
          className="font-bold text-[var(--cz-accent)] hover:underline"
        >
          Verify now
        </Link>
      </span>
      <button
        aria-label="Dismiss"
        onClick={() => setDismissed(true)}
        className="mt-px grid h-[24px] w-[24px] shrink-0 place-items-center rounded-full text-[var(--cz-text-secondary)] transition-colors hover:bg-[var(--cz-border)] hover:text-[var(--cz-text-primary)]"
      >
        <X className="h-4 w-4" aria-hidden />
      </button>
    </div>
  );
}
