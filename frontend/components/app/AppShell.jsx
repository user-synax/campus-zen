"use client";

import { Loader2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { BottomNav } from "@/components/app/BottomNav";
import { LeftNav } from "@/components/app/LeftNav";
import { RightMinimal } from "@/components/app/RightMinimal";
import { ThemeToggle } from "@/components/app/ThemeToggle";
import { BrandMark } from "@/components/BrandLogo";
import { useCurrentUser } from "@/lib/hooks/useRequireSession";
import { useSSE } from "@/lib/hooks/useSSE";

/**
 * The three-column X shell, shared by /app, /u and /c so those routes sit
 * in exactly the same frame as every other tab.
 *
 *   md   72px  icon-only rail  ·  feed
 *   lg  275px  expanded rail   ·  feed
 *   xl  275px  expanded rail   ·  feed  · 350px right rail
 *
 * Columns are separated by hairlines, not gaps — the page is one
 * continuous surface.
 */
export function AppShell({ children, requireAuth = false }) {
  const router = useRouter();
  const { user, loading, signedOut, failed } = useCurrentUser();

  // One live-notification stream for the whole shell.
  useSSE();

  // /app/* has no guest reading experience, so a signed-out visitor goes to
  // sign in. /u and /c don't: their own pages gate themselves with
  // useRequireSession, and /u/[username] stays public by design.
  useEffect(() => {
    if (loading) return;
    if (requireAuth && (signedOut || failed)) router.replace("/login");
  }, [loading, signedOut, failed, requireAuth, router]);

  // Only the auth-gated segments wait on the session. The public profile at
  // /u/[username] renders immediately and the sign-in redirect happens
  // alongside it, so a slow or failing /me never blanks the page.
  if (requireAuth && loading) {
    return (
      <div className="grid min-h-dvh place-items-center bg-[var(--cz-bg)] px-4">
        <div className="flex flex-col items-center gap-3 text-[var(--cz-text-primary)]">
          <BrandMark size={40} priority />
          <span className="inline-flex items-center gap-2 text-[15px] text-[var(--cz-text-secondary)]">
            <Loader2 className="h-[18px] w-[18px] animate-spin" aria-hidden />
            Loading CampusZen…
          </span>
        </div>
      </div>
    );
  }

  if (requireAuth && !user) return null;

  return (
    <div className="min-h-dvh bg-[var(--cz-bg)] text-[var(--cz-text-primary)]">
      {/* mobile top bar */}
      <header className="sticky top-0 z-30 flex h-[53px] items-center justify-between border-b border-[var(--cz-border)] bg-[var(--cz-bg)]/85 px-4 backdrop-blur md:hidden">
        <BrandMark size={26} priority />
        <ThemeToggle className="h-[40px] w-[40px]" />
      </header>

      <div className="mx-auto grid w-full max-w-[1275px] md:grid-cols-[72px_minmax(0,1fr)] lg:grid-cols-[275px_minmax(0,1fr)] xl:grid-cols-[275px_minmax(0,1fr)_350px]">
        <aside className="sticky top-0 hidden h-[100dvh] min-h-0 flex-col border-r border-[var(--cz-border)] md:flex">
          <LeftNav user={user} />
        </aside>

        <main className="min-w-0 xl:border-r xl:border-[var(--cz-border)]">
          {/* room for the mobile tab bar */}
          <div className="pb-[calc(53px+env(safe-area-inset-bottom))] md:pb-0">
            {children}
          </div>
        </main>

        <aside className="sticky top-0 hidden h-[100dvh] min-h-0 overflow-y-auto xl:block">
          <RightMinimal currentUser={user} />
        </aside>
      </div>

      <BottomNav />
    </div>
  );
}
