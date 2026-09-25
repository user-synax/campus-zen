"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

export function AuthShell({ children, title, subtitle }) {
  const [shown, setShown] = useState(false);
  useEffect(() => {
    const t = setTimeout(() => setShown(true), 80);
    return () => clearTimeout(t);
  }, []);

  return (
    <div className="min-h-dvh w-full grid lg:grid-cols-[1.05fr_0.95fr] bg-[var(--cz-bg)]">
      {/* Left - Branding */}
      <div className="relative hidden lg:flex flex-col justify-between overflow-hidden bg-[var(--cz-surface)] border-r border-[var(--cz-border)]">
        {/* subtle grid + glow */}
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 opacity-[0.06]"
          style={{
            backgroundImage:
              "linear-gradient(to right, rgba(255,206,173,0.8) 1px, transparent 1px), linear-gradient(to bottom, rgba(255,206,173,0.8) 1px, transparent 1px)",
            backgroundSize: "32px 32px",
          }}
        />
        <div
          aria-hidden
          className="pointer-events-none absolute -top-32 -left-32 h-[520px] w-[680px] rounded-full blur-[90px] opacity-30"
          style={{ background: "radial-gradient(closest-side, #7d82d9, transparent 70%)" }}
        />
        <div
          aria-hidden
          className="pointer-events-none absolute -bottom-40 -right-20 h-[460px] w-[460px] rounded-full blur-[80px] opacity-20"
          style={{ background: "radial-gradient(closest-side, #ffcead, transparent 72%)" }}
        />

        <div className="relative z-10 flex flex-col h-full p-8 xl:p-10">
          {/* top nav */}
          <Link href="/" className="inline-flex items-center gap-3 w-fit group">
            <span className="grid place-items-center h-9 w-9 rounded-[10px] bg-[var(--cz-text-primary)] text-[var(--cz-text-inverse)] font-bold text-[14px] tracking-[-0.04em] shadow-[0_8px_24px_rgba(255,206,173,0.18)] group-hover:scale-[1.02] transition-transform">
              CZ
            </span>
            <span className="text-[15px] font-semibold tracking-[-0.03em] text-[var(--cz-text-primary)]">campuszen</span>
            <span className="hidden xl:inline-flex ml-1 rounded-full border border-[var(--cz-border)] bg-[rgba(255,255,255,0.04)] px-2 py-0.5 text-[10px] font-medium tracking-[0.08em] uppercase text-[var(--cz-text-secondary)]">
              Student Network
            </span>
          </Link>

          {/* hero copy with staggered reveal */}
          <div className={`t-stagger flex-1 flex flex-col justify-center max-w-[560px] py-10 ${shown ? "is-shown" : ""}`}>
            <p className="t-stagger-line t-stagger-line--1 inline-flex w-fit items-center gap-2 rounded-full border border-[var(--cz-border)] bg-[rgba(255,255,255,0.04)] px-3 py-1 text-[11px] font-medium tracking-[0.08em] uppercase text-[var(--cz-text-secondary)]">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.8)] animate-pulse" />
              India • Students Only
            </p>

            <h1 className="t-stagger-line t-stagger-line--2 mt-6 text-[34px] xl:text-[40px] font-semibold leading-[0.95] tracking-[-0.04em] text-[var(--cz-text-primary)]">
              Where campus
              <br />
              <span className="text-[var(--cz-muted)]">actually connects.</span>
            </h1>

            <p className="t-stagger-line t-stagger-line--3 mt-4 text-[14.5px] leading-[24px] text-[var(--cz-text-secondary)] max-w-[46ch]">
              Discover students by college and course. Post thoughts, find your people, and stay in the loop — without the noise.
            </p>

            <div className="t-stagger-line t-stagger-line--4 mt-8 grid grid-cols-3 gap-3 max-w-[420px]">
              {[
                { k: "50K+", v: "Students" },
                { k: "1.2K", v: "Colleges" },
                { k: "X-style", v: "Feed" },
              ].map((s) => (
                <div
                  key={s.k}
                  className="rounded-[14px] border border-[var(--cz-border)] bg-[rgba(255,255,255,0.04)] backdrop-blur px-3 py-3"
                >
                  <div className="text-[16px] font-semibold tracking-[-0.03em] text-[var(--cz-text-primary)] leading-none">{s.k}</div>
                  <div className="mt-1 text-[11px] tracking-[0.06em] uppercase text-[var(--cz-text-secondary)] leading-none">{s.v}</div>
                </div>
              ))}
            </div>

            {/* demo social proof */}
            <div className="t-stagger-line t-stagger-line--4 mt-8 rounded-[16px] border border-[var(--cz-border)] bg-[var(--cz-surface-strong)]/80 backdrop-blur p-4">
              <div className="flex items-center gap-3">
                <div className="flex -space-x-2">
                  {["A", "R", "P"].map((c, i) => (
                    <span
                      key={c}
                      className="grid place-items-center h-8 w-8 rounded-full border-[2px] border-[var(--cz-surface)] bg-[var(--cz-bg)] text-[11px] font-semibold text-[var(--cz-text-primary)] shadow-sm"
                      style={{ zIndex: 3 - i }}
                    >
                      {c}
                    </span>
                  ))}
                  <span className="grid place-items-center h-8 w-8 rounded-full border-[2px] border-[var(--cz-surface)] bg-[var(--cz-muted)] text-[10px] font-bold text-white">
                    +2k
                  </span>
                </div>
                <div className="min-w-0">
                  <div className="text-[13px] font-medium leading-none text-[var(--cz-text-primary)]">Trusted by students</div>
                  <div className="text-[12px] leading-none text-[var(--cz-text-secondary)] mt-1">Across CSE, ECE, Mechanical & more</div>
                </div>
              </div>
              <blockquote className="mt-3 text-[13px] leading-[20px] text-[var(--cz-text-secondary)] border-l-2 border-[var(--cz-muted)]/40 pl-3">
                “Found my hackathon team in 2 days. Feed actually shows people from my college.”
                <span className="text-[var(--cz-text-primary)] font-medium"> — Ayush, B.Tech CSE 3rd Year</span>
              </blockquote>
            </div>
          </div>

          <div className="relative z-10 flex items-center justify-between gap-4 border-t border-[var(--cz-border)] pt-5 mt-auto">
            <p className="text-[11px] tracking-[0.06em] uppercase text-[var(--cz-text-secondary)]">© 2026 CampusZen</p>
            <div className="flex items-center gap-3 text-[11px]">
              <Link href="/terms" className="text-[var(--cz-text-secondary)] hover:text-[var(--cz-text-primary)] underline-offset-4 hover:underline transition-colors">
                Terms
              </Link>
              <span className="text-[var(--cz-border-strong)]">•</span>
              <Link href="/privacy" className="text-[var(--cz-text-secondary)] hover:text-[var(--cz-text-primary)] underline-offset-4 hover:underline transition-colors">
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
            <span className="grid place-items-center h-7 w-7 rounded-[8px] bg-[var(--cz-text-primary)] text-[var(--cz-text-inverse)] font-bold text-[12px]">CZ</span>
            <span className="text-[14px] font-semibold tracking-[-0.03em]">campuszen</span>
          </Link>
          <span className="text-[11px] tracking-[0.06em] uppercase text-[var(--cz-text-secondary)]">Student Network</span>
        </div>

        <div className="flex flex-1 flex-col items-center justify-center px-4 py-8 sm:px-6 lg:px-8 xl:px-10">
          <div className="w-full max-w-[420px]">
            {/* card */}
            <div className="rounded-[20px] border border-[var(--cz-border)] bg-[var(--cz-surface)]/90 backdrop-blur shadow-[0_16px_40px_rgba(0,0,0,0.35),0_1px_0_rgba(255,206,173,0.06)_inset] overflow-hidden">
              {/* subtle top highlight */}
              <div aria-hidden className="h-px w-full bg-gradient-to-r from-transparent via-[rgba(255,206,173,0.18)] to-transparent" />
              <div className="p-6 sm:p-7">
                {(title || subtitle) && (
                  <div className="mb-6">
                    {title ? (
                      <h1 className="text-[20px] font-semibold tracking-[-0.03em] leading-none text-[var(--cz-text-primary)]">{title}</h1>
                    ) : null}
                    {subtitle ? (
                      <p className="mt-2 text-[13px] leading-[20px] text-[var(--cz-text-secondary)]">{subtitle}</p>
                    ) : null}
                  </div>
                )}
                {children}
              </div>
            </div>

            <p className="mt-5 text-center text-[11px] leading-[16px] tracking-[0.02em] text-[var(--cz-text-secondary)]/80">
              By continuing, you agree to our{" "}
              <Link href="/terms" className="underline decoration-[var(--cz-border-strong)] underline-offset-4 hover:text-[var(--cz-text-primary)] hover:decoration-[var(--cz-text-secondary)] transition-colors">
                Terms
              </Link>{" "}
              and{" "}
              <Link href="/privacy" className="underline decoration-[var(--cz-border-strong)] underline-offset-4 hover:text-[var(--cz-text-primary)] hover:decoration-[var(--cz-text-secondary)] transition-colors">
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
