"use client";

import { useEffect, useState } from "react";
import { useRouter, usePathname } from "next/navigation";
import { LeftNav, LeftBrand, LeftUserCard } from "@/components/app/LeftNav";
import { BottomNav } from "@/components/app/BottomNav";
import { RightMinimal } from "@/components/app/RightMinimal";
import { VerifyBanner } from "@/components/app/VerifyBanner";
import { api } from "@/lib/api";
import { Loader2 } from "lucide-react";

export default function AppLayout({ children }) {
  const router = useRouter();
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [auth, setAuth] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await api.me();
        if (cancelled) return;
        setUser(res.data?.user || null);
        setAuth(true);
      } catch (err) {
        if (cancelled) return;
        // 401 → redirect to login, keep fast
        if (err.status === 401) router.replace("/login");
        else {
          // network error → show minimal, but still allow empty state
          // fallback: try refresh once
          try {
            await api.refresh();
            const r2 = await api.me();
            setUser(r2.data?.user || null);
            setAuth(true);
            return;
          } catch {
            router.replace("/login");
          }
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [router]);

  if (loading) {
    return (
      <div className="min-h-dvh bg-[var(--cz-bg)] grid place-items-center px-4">
        <div className="flex flex-col items-center gap-3">
          <span className="grid place-items-center h-10 w-10 rounded-[12px] bg-[var(--cz-text-primary)] text-[var(--cz-text-inverse)] font-bold text-[14px] animate-pulse">CZ</span>
          <span className="inline-flex items-center gap-2 text-[13px] text-[var(--cz-text-secondary)]">
            <Loader2 className="h-4 w-4 animate-spin" /> Loading CampusZen…
          </span>
        </div>
      </div>
    );
  }

  if (!auth) return null;

  return (
    <div className="min-h-dvh bg-[var(--cz-bg)] text-[var(--cz-text-primary)]">
      {/* top bar mobile */}
      <header className="lg:hidden sticky top-0 z-20 flex items-center justify-between border-b border-[var(--cz-border)] bg-[var(--cz-bg)]/90 backdrop-blur px-4 h-[56px]">
        <LeftBrand collapsed={false} />
        <span className="text-[11px] tracking-[0.06em] uppercase text-[var(--cz-text-secondary)]">App • MVP</span>
      </header>

      <div className="mx-auto max-w-[1280px] px-0 lg:px-4">
        <div className="grid lg:grid-cols-[272px_1fr_320px] md:grid-cols-[68px_1fr] grid-cols-1 gap-0 lg:gap-6">
          {/* left nav desktop/tablet */}
          <aside className="hidden md:flex flex-col sticky top-0 h-[100dvh] py-4 lg:py-6 gap-4 overflow-hidden">
            {/* brand */}
            <div className="px-2 lg:px-3">
              {/* show full at lg, icon at md */}
              <span className="hidden lg:block">
                <LeftBrand collapsed={false} />
              </span>
              <span className="hidden md:block lg:hidden">
                <LeftBrand collapsed={true} />
              </span>
            </div>

            {/* nav — Create Post lives inside LeftNav only */}
            <div className="flex-1 overflow-y-auto px-2 lg:px-2 space-y-3">
              <div className="hidden lg:block">
                <LeftNav user={user} collapsed={false} />
              </div>
              <div className="hidden md:block lg:hidden">
                <LeftNav user={user} collapsed={true} />
              </div>
            </div>

            <div className="px-2 lg:px-3 mt-auto">
              <div className="hidden lg:block">
                <LeftUserCard user={user} collapsed={false} />
              </div>
              <div className="hidden md:block lg:hidden">
                <LeftUserCard user={user} collapsed={true} />
              </div>
            </div>
          </aside>

          {/* center feed */}
          <main className="min-h-[100dvh] flex flex-col min-w-0 border-x-0 lg:border-x border-[var(--cz-border)] bg-[var(--cz-bg)]">
            {/* verify banner if skipped OTP */}
            {!user?.isEmailVerified ? (
              <div className="px-3 sm:px-4 lg:px-6 pt-3">
                <VerifyBanner email={user?.email} />
              </div>
            ) : null}

            <div className="flex-1 px-3 sm:px-4 lg:px-6 py-4 pb-[72px] lg:pb-4">{children}</div>
          </main>

          {/* right minimal desktop only */}
          <aside className="hidden lg:block sticky top-0 h-[100dvh] overflow-y-auto py-6">
            <RightMinimal currentUser={user} />
          </aside>
        </div>
      </div>

      <BottomNav />

      {/* subtle safe area for bottom nav on mobile */}
      <div aria-hidden className="lg:hidden h-[56px]" />
    </div>
  );
}
