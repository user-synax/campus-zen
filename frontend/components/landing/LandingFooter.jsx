import Link from "next/link";
import { BrandMark } from "@/components/BrandLogo";

export function LandingFooter() {
  return (
    <footer className="border-t border-[var(--cz-border)]">
      <div className="mx-auto flex max-w-[960px] flex-col gap-3 px-4 py-6 text-[12px] sm:flex-row sm:items-center sm:justify-between sm:px-6">
        <span className="inline-flex items-center gap-2">
          <BrandMark size={22} />
          <span className="text-[var(--cz-text-secondary)]">
            &copy; 2026 CampusZen
          </span>
        </span>
        <nav
          className="flex items-center gap-4 text-[var(--cz-text-secondary)]"
          aria-label="Footer"
        >
          <Link
            href="/login"
            className="transition-colors hover:text-[var(--cz-text-primary)]"
          >
            Log in
          </Link>
          <Link
            href="/signup"
            className="transition-colors hover:text-[var(--cz-text-primary)]"
          >
            Sign up
          </Link>
          <Link
            href="/terms"
            className="transition-colors hover:text-[var(--cz-text-primary)]"
          >
            Terms
          </Link>
          <Link
            href="/privacy"
            className="transition-colors hover:text-[var(--cz-text-primary)]"
          >
            Privacy
          </Link>
        </nav>
      </div>
    </footer>
  );
}
