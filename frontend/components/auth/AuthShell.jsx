"use client";

import Link from "next/link";

export function AuthShell({ children, title, subtitle }) {
  return (
    <div className="min-h-dvh w-full grid lg:grid-cols-[1fr_1fr] bg-[var(--cz-bg)]">
      {/* Left — Branding */}
      <div className="relative hidden lg:flex flex-col bg-[var(--cz-surface-strong)] border-r border-[var(--cz-border)]">
        <div className="flex flex-col h-full w-full max-w-[600px] mx-auto px-12 xl:px-16 py-10">
          {/* mark */}
          <Link href="/" className="inline-flex items-center gap-2.5 w-fit">
            <span className="grid place-items-center h-8 w-8 rounded-lg bg-[var(--cz-text-primary)] text-[var(--cz-text-inverse)] font-bold text-[13px] tracking-tight">
              CZ
            </span>
            <span className="text-[15px] font-semibold tracking-[-0.02em] text-[var(--cz-text-primary)]">
              campuszen
            </span>
          </Link>

          {/* copy */}
          <div className="flex-1 flex flex-col justify-center py-16">
            <p className="text-[11px] font-medium tracking-[0.14em] uppercase text-[var(--cz-text-secondary)]">
              For verified students
            </p>

            <h1 className="mt-5 text-[42px] xl:text-[48px] font-semibold leading-[1.02] tracking-[-0.04em] text-[var(--cz-text-primary)]">
              Where campus
              <br />
              actually connects.
            </h1>

            <p className="mt-5 text-[14px] leading-[24px] text-[var(--cz-text-secondary)] max-w-[38ch]">
              Find your people, share what matters, and keep up with life on
              campus.
            </p>

            <ul className="mt-12 max-w-[360px]">
              {[
                ["01", "Profiles tied to real colleges"],
                ["02", "A quiet feed, no noise"],
                ["03", "Private by default"],
              ].map(([n, label]) => (
                <li
                  key={n}
                  className="flex items-baseline gap-4 border-t border-[var(--cz-border)] py-3.5 last:border-b"
                >
                  <span className="text-[11px] font-medium tabular-nums text-[var(--cz-text-secondary)]/70">
                    {n}
                  </span>
                  <span className="text-[13px] text-[var(--cz-text-primary)]/90">
                    {label}
                  </span>
                </li>
              ))}
            </ul>
          </div>

          {/* footer */}
          <div className="flex items-center justify-between pt-6 border-t border-[var(--cz-border)]">
            <p className="text-[12px] text-[var(--cz-text-secondary)]/70">
              © 2026 CampusZen
            </p>
            <div className="flex items-center gap-4 text-[12px]">
              <Link
                href="/terms"
                className="text-[var(--cz-text-secondary)]/70 hover:text-[var(--cz-text-primary)] transition-colors"
              >
                Terms
              </Link>
              <Link
                href="/privacy"
                className="text-[var(--cz-text-secondary)]/70 hover:text-[var(--cz-text-primary)] transition-colors"
              >
                Privacy
              </Link>
            </div>
          </div>
        </div>
      </div>

      {/* Right - Form */}
      <div className="relative flex min-h-dvh flex-col bg-[var(--cz-bg)]">
        {/* mobile header */}
        <div className="lg:hidden sticky top-0 z-10 flex items-center justify-between border-b border-[var(--cz-border)] bg-[var(--cz-bg)]/80 backdrop-blur supports-[backdrop-filter]:bg-[var(--cz-bg)]/60 px-4 h-[56px]">
          <Link href="/" className="inline-flex items-center gap-2">
            <span className="grid place-items-center h-7 w-7 rounded-[8px] bg-[var(--cz-text-primary)] text-[var(--cz-text-inverse)] font-bold text-[12px]">
              CZ
            </span>
            <span className="text-[14px] font-semibold tracking-[-0.03em]">
              campuszen
            </span>
          </Link>
          <span className="text-[11px] tracking-[0.06em] uppercase text-[var(--cz-text-secondary)]">
            Student Network
          </span>
        </div>

        <div className="flex flex-1 flex-col items-center justify-center px-4 py-8 sm:px-6 lg:px-8 xl:px-10">
          <div className="w-full max-w-[420px]">
            {/* card */}
            <div className="rounded-[20px] border border-[var(--cz-border)] bg-[var(--cz-surface)]/90 backdrop-blur shadow-[0_16px_40px_rgba(0,0,0,0.35),0_1px_0_rgba(255,206,173,0.06)_inset] overflow-hidden">
              {/* subtle top highlight */}
              <div
                aria-hidden
                className="h-px w-full bg-gradient-to-r from-transparent via-[rgba(255,206,173,0.18)] to-transparent"
              />
              <div className="p-6 sm:p-7">
                {(title || subtitle) && (
                  <div className="mb-6">
                    {title ? (
                      <h1 className="text-[20px] font-semibold tracking-[-0.03em] leading-none text-[var(--cz-text-primary)]">
                        {title}
                      </h1>
                    ) : null}
                    {subtitle ? (
                      <p className="mt-2 text-[13px] leading-[20px] text-[var(--cz-text-secondary)]">
                        {subtitle}
                      </p>
                    ) : null}
                  </div>
                )}
                {children}
              </div>
            </div>

            <p className="mt-5 text-center text-[11px] leading-[16px] tracking-[0.02em] text-[var(--cz-text-secondary)]/80">
              By continuing, you agree to our{" "}
              <Link
                href="/terms"
                className="underline decoration-[var(--cz-border-strong)] underline-offset-4 hover:text-[var(--cz-text-primary)] hover:decoration-[var(--cz-text-secondary)] transition-colors"
              >
                Terms
              </Link>{" "}
              and{" "}
              <Link
                href="/privacy"
                className="underline decoration-[var(--cz-border-strong)] underline-offset-4 hover:text-[var(--cz-text-primary)] hover:decoration-[var(--cz-text-secondary)] transition-colors"
              >
                Privacy Policy
              </Link>
              .
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
