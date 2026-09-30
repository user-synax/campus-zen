import Link from "next/link";
import { ThemeToggle } from "@/components/app/ThemeToggle";
import { BrandMark } from "@/components/BrandLogo";

export function LandingNav() {
  return (
    <header className="sticky top-0 z-30 border-b border-[var(--cz-border)] bg-[var(--cz-bg)]/85 backdrop-blur">
      <div className="mx-auto flex h-[53px] max-w-[990px] items-center justify-between px-4">
        <Link
          href="/"
          className="text-[var(--cz-text-primary)] transition-opacity hover:opacity-70"
          aria-label="CampusZen home"
        >
          <BrandMark size={26} title="CampusZen" />
        </Link>
        <nav className="flex items-center gap-1" aria-label="Primary">
          <ThemeToggle className="h-[36px] w-[36px]" side="bottom" />
          <Link
            href="/login"
            className="inline-flex h-[34px] items-center rounded-full px-4 text-[15px] font-bold text-[var(--cz-text-primary)] transition-colors hover:bg-[var(--cz-surface-strong)]"
          >
            Log in
          </Link>
          <Link
            href="/signup"
            className="inline-flex h-[34px] items-center rounded-full bg-[var(--cz-accent)] px-4 text-[15px] font-bold text-[var(--cz-text-inverse)] transition-colors hover:bg-[var(--cz-accent-hover)]"
          >
            Sign up
          </Link>
        </nav>
      </div>
    </header>
  );
}
