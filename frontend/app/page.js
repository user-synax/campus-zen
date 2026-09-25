import Link from "next/link";

export default function Home() {
  return (
    <div className="min-h-dvh bg-[var(--cz-bg)] text-[var(--cz-text-primary)]">
      {/* nav */}
      <header className="sticky top-0 z-10 border-b border-[var(--cz-border)] bg-[var(--cz-bg)]/80 backdrop-blur">
        <div className="mx-auto max-w-[1100px] px-4 sm:px-6 h-[56px] flex items-center justify-between">
          <Link href="/" className="inline-flex items-center gap-2.5">
            <span className="grid place-items-center h-8 w-8 rounded-[9px] bg-[var(--cz-text-primary)] text-[var(--cz-text-inverse)] font-bold text-[13px] tracking-[-0.04em]">CZ</span>
            <span className="text-[15px] font-semibold tracking-[-0.03em]">campuszen</span>
            <span className="hidden sm:inline-flex rounded-full border border-[var(--cz-border)] bg-[rgba(255,255,255,0.04)] px-2 py-0.5 text-[10px] tracking-[0.08em] uppercase text-[var(--cz-text-secondary)]">Student Network • MVP</span>
          </Link>
          <nav className="flex items-center gap-2 sm:gap-3">
            <Link href="/login" className="hidden sm:inline-flex text-[13px] font-medium text-[var(--cz-text-secondary)] hover:text-[var(--cz-text-primary)] px-3 py-1.5">Log in</Link>
            <Link href="/signup" className="inline-flex items-center justify-center rounded-full bg-[var(--cz-text-primary)] text-[var(--cz-text-inverse)] px-4 py-1.5 text-[13px] font-medium hover:bg-[#ffd9c0] transition-colors">Create account</Link>
          </nav>
        </div>
      </header>

      {/* hero */}
      <main className="mx-auto max-w-[1100px] px-4 sm:px-6">
        <div className="grid lg:grid-cols-[1.1fr_0.9fr] gap-8 lg:gap-10 py-10 sm:py-14">
          <div>
            <p className="inline-flex items-center gap-2 rounded-full border border-[var(--cz-border)] bg-[var(--cz-surface)] px-3 py-1 text-[11px] font-medium tracking-[0.08em] uppercase text-[var(--cz-text-secondary)]">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" /> India • College Students First
            </p>
            <h1 className="mt-5 text-[32px] sm:text-[42px] font-semibold leading-[0.95] tracking-[-0.04em] max-w-[18ch]">
              A social network that feels like <span className="text-[var(--cz-muted)]">campus.</span>
            </h1>
            <p className="mt-4 text-[15px] leading-[24px] text-[var(--cz-text-secondary)] max-w-[52ch]">
              Follow students by college and course. Post up to 500 characters. Like, reply, repost — and get notified when people mess with your stuff. No DMs, no noise — just the core social loop.
            </p>

            <div className="mt-7 flex flex-wrap gap-3">
              <Link href="/signup" className="inline-flex items-center justify-center rounded-[12px] bg-[var(--cz-text-primary)] text-[var(--cz-text-inverse)] px-6 h-[44px] text-[14px] font-medium hover:bg-[#ffd9c0] transition-colors">
                Join CampusZen
              </Link>
              <Link href="/login" className="inline-flex items-center justify-center rounded-[12px] border border-[var(--cz-border)] bg-transparent px-6 h-[44px] text-[14px] font-medium text-[var(--cz-text-primary)] hover:bg-[var(--cz-surface)] transition-colors">
                Log in
              </Link>
            </div>

            <div className="mt-7 flex flex-wrap items-center gap-2 text-[12px] text-[var(--cz-text-secondary)]">
              <span className="inline-flex items-center gap-1.5 rounded-full border border-[var(--cz-border)] bg-[var(--cz-surface)] px-3 py-1">
                <span className="h-1.5 w-1.5 rounded-full bg-[var(--cz-muted)]" /> Following Feed
              </span>
              <span className="inline-flex items-center gap-1.5 rounded-full border border-[var(--cz-border)] bg-[var(--cz-surface)] px-3 py-1">
                <span className="h-1.5 w-1.5 rounded-full bg-[#ffcead]" /> Discovery
              </span>
              <span className="inline-flex items-center gap-1.5 rounded-full border border-[var(--cz-border)] bg-[var(--cz-surface)] px-3 py-1">
                Notifications (poll)
              </span>
            </div>

            <div className="mt-8 grid grid-cols-3 gap-3 max-w-[420px]">
              {[
                ["Minimal signup", "name, username, email, pw"],
                ["Email via OTP", "/verify-email 6-digit"],
                ["3-step reset", "forgot → verify → reset"],
              ].map(([k, v]) => (
                <div key={k} className="rounded-[14px] border border-[var(--cz-border)] bg-[var(--cz-surface)] p-3">
                  <div className="text-[12px] font-semibold leading-none text-[var(--cz-text-primary)]">{k}</div>
                  <div className="text-[11px] leading-[14px] text-[var(--cz-text-secondary)] mt-1">{v}</div>
                </div>
              ))}
            </div>
          </div>

          {/* auth demo card */}
          <div className="relative">
            <div aria-hidden className="pointer-events-none absolute -top-10 -right-10 h-64 w-64 rounded-full blur-[70px] opacity-20" style={{ background: "radial-gradient(closest-side, #7d82d9, transparent)" }} />
            <div className="relative rounded-[20px] border border-[var(--cz-border)] bg-[var(--cz-surface)] overflow-hidden shadow-[0_16px_40px_rgba(0,0,0,0.35)]">
              <div className="h-px w-full bg-gradient-to-r from-transparent via-[rgba(255,206,173,0.18)] to-transparent" />
              <div className="p-5 sm:p-6">
                <div className="flex items-center justify-between">
                  <h3 className="text-[13px] font-semibold tracking-[-0.02em]">Auth — static demo</h3>
                  <span className="rounded-full bg-emerald-500/10 border border-emerald-500/20 px-2 py-0.5 text-[11px] font-medium text-emerald-300">No backend yet</span>
                </div>
                <p className="mt-1.5 text-[12px] leading-[18px] text-[var(--cz-text-secondary)]">
                  Frontend-only pages. Validation with shake, icon-swap, checkbox-check and stagger reveal. Left-branding layout on auth routes.
                </p>

                <div className="mt-5 grid gap-2.5">
                  {[
                    { href: "/signup", title: "Sign up", desc: "Full name + @username + gmail/proton + pw strength", cta: "Create account" },
                    { href: "/login", title: "Log in", desc: "@username + password + Remember me", cta: "Log in" },
                    { href: "/verify-email", title: "Verify email", desc: "6-digit OTP • resend 30s • success check", cta: "Verify" },
                    { href: "/forgot-password", title: "Forgot password", desc: "Step 1 of 3 — send code", cta: "Send code" },
                    { href: "/reset-password", title: "Reset password", desc: "Step 2+3 — OTP then new password", cta: "Reset" },
                  ].map((r) => (
                    <Link key={r.href} href={r.href} className="group flex items-center justify-between gap-3 rounded-[12px] border border-[var(--cz-border)] bg-[rgba(255,255,255,0.02)] hover:bg-[rgba(255,255,255,0.05)] hover:border-[var(--cz-border-strong)] px-3 py-3 transition-colors">
                      <div className="min-w-0">
                        <div className="text-[13px] font-medium leading-none text-[var(--cz-text-primary)] group-hover:text-white transition-colors">{r.title} <span className="font-normal text-[var(--cz-text-secondary)]">→ {r.href}</span></div>
                        <div className="text-[12px] leading-[16px] text-[var(--cz-text-secondary)] mt-1 truncate">{r.desc}</div>
                      </div>
                      <span className="shrink-0 inline-flex items-center justify-center rounded-full bg-[var(--cz-text-primary)] text-[var(--cz-text-inverse)] px-3 py-1 text-[11px] font-medium group-hover:bg-[#ffd9c0] transition-colors">{r.cta}</span>
                    </Link>
                  ))}
                </div>

                <div className="mt-5 rounded-[12px] border border-[var(--cz-border)] bg-[var(--cz-bg)]/50 px-3 py-3">
                  <div className="text-[11px] tracking-[0.06em] uppercase text-[var(--cz-text-secondary)]">Also</div>
                  <div className="mt-2 flex flex-wrap gap-2">
                    <Link href="/terms" className="rounded-full border border-[var(--cz-border)] bg-[var(--cz-surface)] px-3 py-1 text-[12px] text-[var(--cz-text-secondary)] hover:text-[var(--cz-text-primary)]">/terms</Link>
                    <Link href="/privacy" className="rounded-full border border-[var(--cz-border)] bg-[var(--cz-surface)] px-3 py-1 text-[12px] text-[var(--cz-text-secondary)] hover:text-[var(--cz-text-primary)]">/privacy</Link>
                    <span className="rounded-full border border-dashed border-[var(--cz-border)] px-3 py-1 text-[12px] text-[var(--cz-text-secondary)]/60">Design: JetBrains Mono • #000 / #0c122c / #ffcead</span>
                  </div>
                </div>
              </div>
            </div>

            <p className="mt-3 text-center text-[11px] text-[var(--cz-text-secondary)]/60">
              Built per PRD.md §6-7 + §17 — static frontend only, no API calls yet.
            </p>
          </div>
        </div>
      </main>

      <footer className="border-t border-[var(--cz-border)]">
        <div className="mx-auto max-w-[1100px] px-4 sm:px-6 h-[56px] flex items-center justify-between text-[11px]">
          <span className="tracking-[0.06em] uppercase text-[var(--cz-text-secondary)]">© 2026 CampusZen</span>
          <span className="hidden sm:inline text-[var(--cz-text-secondary)]/70">PRD-driven • Transitions-dev: shake / icon-swap / checkbox-check / stagger • WCAG AA</span>
          <span className="flex items-center gap-3">
            <Link href="/terms" className="hover:text-[var(--cz-text-primary)]">Terms</Link>
            <Link href="/privacy" className="hover:text-[var(--cz-text-primary)]">Privacy</Link>
          </span>
        </div>
      </footer>
    </div>
  );
}
