import Link from "next/link";
import { BrandMark } from "@/components/BrandLogo";

export function LandingFooter() {
  return (
    <footer className="border-t border-[var(--cz-border)]">
      <div className="mx-auto flex max-w-[990px] flex-col gap-3 px-4 py-6 text-[13px] sm:flex-row sm:items-center sm:justify-between">
        <span className="inline-flex items-center gap-2 text-[var(--cz-text-secondary)]">
          <BrandMark size={18} />
          &copy; {new Date().getFullYear()} CampusZen
        </span>
        <nav
          className="flex flex-wrap items-center gap-x-4 gap-y-1 text-[var(--cz-text-secondary)]"
          aria-label="Footer"
        >
          {[
            { href: "/docs", label: "Docs" },
            { href: "/terms", label: "Terms of Service" },
            { href: "/privacy", label: "Privacy Policy" },
            { href: "/u", label: "Students" },
            { href: "/c", label: "Colleges" },
            { href: "/login", label: "Log in" },
          ].map((l) => (
            <Link key={l.href} href={l.href} className="hover:underline">
              {l.label}
            </Link>
          ))}
        </nav>
      </div>
    </footer>
  );
}
