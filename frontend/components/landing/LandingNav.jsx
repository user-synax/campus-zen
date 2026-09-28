import Link from "next/link";
import { BrandMark } from "@/components/BrandLogo";

export function LandingNav() {
  return (
    <header className="sticky top-0 z-10 border-b border-[var(--cz-border)] bg-[var(--cz-bg)]/85 backdrop-blur">
      <div className="mx-auto flex h-[60px] max-w-[960px] items-center justify-between px-4 sm:px-6">
        <Link
          href="/"
          className="inline-flex items-center gap-2.5"
          aria-label="CampusZen home"
        >
          <BrandMark size={30} priority />
          <span className="text-[15px] font-semibold tracking-[-0.03em]">
            campuszen
          </span>
        </Link>
        <nav className="flex items-center gap-1 sm:gap-2" aria-label="Primary">
          <Link
            href="/login"
            className="hidden px-3 py-1.5 text-[13px] font-medium text-[var(--cz-text-secondary)] transition-colors hover:text-[var(--cz-text-primary)] sm:inline-flex"
          >
            Log in
          </Link>
          <Link
            href="/signup"
            className="inline-flex items-center justify-center rounded-full bg-[var(--cz-text-primary)] px-4 py-1.5 text-[13px] font-medium text-[var(--cz-text-inverse)] transition-colors hover:bg-[#ffd9c0]"
          >
            Create account
          </Link>
        </nav>
      </div>
    </header>
  );
}
