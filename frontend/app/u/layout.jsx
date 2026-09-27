"use client";

import { ArrowLeft } from "lucide-react";
import Link from "next/link";

function MinimalBar() {
  return (
    <header className="sticky top-0 z-20 border-b border-[var(--cz-border)] bg-[var(--cz-bg)]/90 backdrop-blur">
      <div className="mx-auto max-w-[1100px] px-4 sm:px-6 h-[56px] flex items-center">
        <Link
          href="/app"
          className="inline-flex items-center gap-1.5 rounded-full border border-[var(--cz-border)] bg-transparent px-4 h-[36px] text-[13px] font-medium text-[var(--cz-text-primary)] hover:bg-[var(--cz-surface)] transition-colors"
        >
          <ArrowLeft className="h-4 w-4" /> Back to app
        </Link>
      </div>
    </header>
  );
}

export default function PublicLayout({ children }) {
  return (
    <div className="min-h-dvh bg-[var(--cz-bg)] text-[var(--cz-text-primary)]">
      <MinimalBar />
      <main className="mx-auto max-w-[1100px] px-4 sm:px-6 py-6 sm:py-8">
        {children}
      </main>
    </div>
  );
}
