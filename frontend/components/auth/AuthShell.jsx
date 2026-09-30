"use client";

import Link from "next/link";
import { ThemeToggle } from "@/components/app/ThemeToggle";
import { BrandMark } from "@/components/BrandLogo";

/**
 * DESIGN.md has no split-screen auth and no card — X's sign-in is a single
 * centred column on the bare canvas with a floating mark above it. The
 * chrome dissolves; the form is the interface.
 */
export function AuthShell({ children, title, subtitle }) {
  return (
    <div className="flex min-h-dvh flex-col bg-[var(--cz-bg)] text-[var(--cz-text-primary)]">
      <div className="flex flex-1 flex-col items-center px-4 py-8 sm:px-6">
        <div className="flex w-full max-w-[440px] flex-1 flex-col">
          <div className="flex flex-1 flex-col items-center justify-center">
            <Link
              href="/"
              aria-label="CampusZen home"
              className="transition-opacity hover:opacity-70"
            >
              <BrandMark size={40} title="CampusZen" />
            </Link>

            {title ? (
              <h1 className="mt-8 text-center text-[31px] leading-[1.11] font-extrabold tracking-[-0.02em] text-[var(--cz-text-primary)]">
                {title}
              </h1>
            ) : null}
            {subtitle ? (
              <p className="mt-3 max-w-[36ch] text-center text-[15px] leading-[20px] text-[var(--cz-text-secondary)]">
                {subtitle}
              </p>
            ) : null}

            <div className="mt-8 w-full">{children}</div>
          </div>

          <nav
            aria-label="Legal"
            className="mt-10 flex items-center justify-center gap-4 text-[13px] text-[var(--cz-text-secondary)]"
          >
            <Link href="/terms" className="hover:underline">
              Terms of Service
            </Link>
            <Link href="/privacy" className="hover:underline">
              Privacy Policy
            </Link>
          </nav>
        </div>
      </div>

      <div className="flex shrink-0 items-center justify-center pb-6">
        <ThemeToggle className="h-[36px] w-[36px]" side="top" />
      </div>
    </div>
  );
}
