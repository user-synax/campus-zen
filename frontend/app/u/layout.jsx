import Link from "next/link";

export default function PublicLayout({ children }) {
  return (
    <div className="min-h-dvh bg-[var(--cz-bg)] text-[var(--cz-text-primary)]">
      <header className="sticky top-0 z-20 border-b border-[var(--cz-border)] bg-[var(--cz-bg)]/90 backdrop-blur">
        <div className="mx-auto max-w-[1100px] px-4 sm:px-6 h-[56px] flex items-center justify-between gap-4">
          <Link href="/" className="inline-flex items-center gap-2.5 shrink-0">
            <span className="grid place-items-center h-8 w-8 rounded-[10px] bg-[var(--cz-text-primary)] text-[var(--cz-text-inverse)] font-bold text-[13px] tracking-[-0.04em]">CZ</span>
            <span className="hidden sm:block text-[14px] font-semibold tracking-[-0.03em]">campuszen</span>
            <span className="hidden sm:inline-flex rounded-full border border-[var(--cz-border)] bg-[rgba(255,255,255,0.04)] px-2 py-0.5 text-[10px] tracking-[0.08em] uppercase text-[var(--cz-text-secondary)]">Public</span>
          </Link>
          <nav className="flex items-center gap-2">
            <Link href="/u" className="hidden sm:inline-flex text-[13px] font-medium text-[var(--cz-text-secondary)] hover:text-[var(--cz-text-primary)] px-3 py-1.5">
              Explore
            </Link>
            <Link href="/app" className="hidden sm:inline-flex text-[13px] font-medium text-[var(--cz-text-secondary)] hover:text-[var(--cz-text-primary)] px-3 py-1.5">
              App
            </Link>
            <Link href="/login" className="inline-flex items-center justify-center rounded-full border border-[var(--cz-border)] bg-transparent px-4 h-[36px] text-[13px] font-medium text-[var(--cz-text-primary)] hover:bg-[var(--cz-surface)] transition-colors">
              Log in
            </Link>
            <Link href="/signup" className="inline-flex items-center justify-center rounded-full bg-[var(--cz-text-primary)] text-[var(--cz-text-inverse)] px-4 h-[36px] text-[13px] font-medium hover:bg-[#ffd9c0] transition-colors">
              Join
            </Link>
          </nav>
        </div>
      </header>
      <main className="mx-auto max-w-[1100px] px-4 sm:px-6 py-6 sm:py-8">{children}</main>
      <footer className="border-t border-[var(--cz-border)] mt-8">
        <div className="mx-auto max-w-[1100px] px-4 sm:px-6 h-[56px] flex items-center justify-between text-[11px] tracking-[0.06em] uppercase text-[var(--cz-text-secondary)]">
          <span>© 2026 CampusZen</span>
          <span className="hidden sm:inline">Public profiles • Clean URLs /u/:username</span>
          <Link href="/signup" className="text-[var(--cz-text-primary)] normal-case tracking-normal underline underline-offset-4">
            Join to connect
          </Link>
        </div>
      </footer>
    </div>
  );
}
