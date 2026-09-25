"use client";

import Link from "next/link";
import { ShieldAlert, X } from "lucide-react";
import { useState } from "react";

export function VerifyBanner({ email }) {
  const [dismissed, setDismissed] = useState(false);
  if (dismissed || !email) return null;
  return (
    <div className="flex items-center gap-3 rounded-[12px] border border-amber-500/20 bg-amber-500/10 px-3 py-2.5 text-[13px] leading-[18px] text-amber-200">
      <span className="grid place-items-center h-7 w-7 rounded-[9px] bg-amber-500/20 border border-amber-500/20 shrink-0">
        <ShieldAlert className="h-4 w-4" />
      </span>
      <span className="flex-1 min-w-0">
        Please verify your email <span className="font-mono text-amber-100">{email}</span> — posting and following work but verification unlocks full access.{" "}
        <Link href={`/verify-email?email=${encodeURIComponent(email)}`} className="underline underline-offset-4 font-medium text-amber-100 hover:text-white">
          Verify now
        </Link>
      </span>
      <button
        aria-label="Dismiss"
        onClick={() => setDismissed(true)}
        className="grid place-items-center h-7 w-7 rounded-[8px] hover:bg-amber-500/15 text-amber-200/70 hover:text-amber-100 transition-colors shrink-0"
      >
        <X className="h-4 w-4" />
      </button>
    </div>
  );
}
