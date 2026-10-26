"use client";

import { Loader2, ShieldAlert } from "lucide-react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect } from "react";
import { AccountSuspended } from "@/components/app/AccountSuspended";
import { BottomNav } from "@/components/app/BottomNav";
import { LeftNav } from "@/components/app/LeftNav";
import { OfflineBanner } from "@/components/app/OfflineBanner";
import { PushEnableBanner } from "@/components/app/PushEnableBanner";
import { RightMinimal } from "@/components/app/RightMinimal";
import { ThemeToggle } from "@/components/app/ThemeToggle";
import { BrandMark } from "@/components/BrandLogo";
import {
  formatAccountDateTime,
  isRestrictionActive,
} from "@/lib/accountStatus";
import { redirectToVerify } from "@/lib/authRedirect";
import { useCurrentUser } from "@/lib/hooks/useRequireSession";
import { useSSE } from "@/lib/hooks/useSSE";
import { cn } from "@/lib/utils";

/**
 * The three-column X shell, shared by /app, /u and /c so those routes sit
 * in exactly the same frame as every other tab.
 *
 *   md   72px  icon-only rail  ·  feed
 *   lg  275px  expanded rail   ·  feed
 *   xl  275px  expanded rail   ·  feed  · 350px right rail
 *
 * The article reader (/app/a/…) drops the right rail on xl so the piece
 * gets the full column — reading mode, not browsing mode. Every other
 * route keeps the three-column frame.
 *
 * Columns are separated by hairlines, not gaps — the page is one
 * continuous surface.
 */
export function AppShell({ children, requireAuth = false }) {
  const router = useRouter();
  const pathname = usePathname();
  const {
    user,
    loading,
    signedOut,
    failed,
    needsVerification,
    pendingEmail,
    suspended: suspendedSession,
  } = useCurrentUser();
  // A suspended account keeps a read-only session: it gets the standing
  // notice instead of the app, and /menu so it can still read its own record.
  const suspended = suspendedSession || Boolean(user?.isSuspended);
  const restricted = isRestrictionActive(user);
  const restrictedUntil = formatAccountDateTime(user?.restrictedUntil);
  const onMenu = pathname === "/app/menu";

  // /app/a/<username>/<slug> — the long-form reader. On xl the right rail
  // unmounts and the main column grows to fill the freed width.
  const isArticleReader = Boolean(pathname?.startsWith("/app/a/"));

  // One live-notification stream for the whole shell.
  useSSE(!suspended);

  // /app/* has no guest reading experience, so a signed-out visitor goes to
  // sign in. /u and /c don't: their own pages gate themselves with
  // useRequireSession, and /u/[username] stays public by design.
  //
  // Unverified accounts are a separate state in every segment: they hold no
  // usable session (signup/login issue none) and must finish OTP first.
  useEffect(() => {
    if (loading) return;
    if (needsVerification) {
      redirectToVerify(router, pendingEmail);
      return;
    }
    if (requireAuth && (signedOut || failed)) router.replace("/login");
  }, [
    loading,
    signedOut,
    failed,
    requireAuth,
    router,
    needsVerification,
    pendingEmail,
  ]);

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

  if (requireAuth && !user && !suspended) return null;

  // The standing notice renders without a user record too (an error state
  // where /me itself was refused): it still has to offer a way out.

  // Redirect is in flight — don't flash the app frame for an unverified
  // account (also covers /u and /c, which are not requireAuth).
  if (needsVerification) return null;

  return (
    <div className="min-h-dvh bg-[var(--cz-bg)] text-[var(--cz-text-primary)]">
      <OfflineBanner />
      {user && !suspended ? <PushEnableBanner /> : null}
      {/* mobile top bar */}
      <header className="sticky top-0 z-30 flex h-[53px] items-center justify-between border-b border-[var(--cz-border)] bg-[var(--cz-bg)]/85 px-4 backdrop-blur md:hidden">
        <BrandMark size={26} priority />
        <ThemeToggle className="h-[40px] w-[40px]" />
      </header>

      {/* Temporary restriction: still signed in and browsing, but the API
          rejects every engagement write until the deadline passes. */}
      {restricted && !suspended ? (
        <div className="border-b border-[color-mix(in_srgb,var(--cz-warn)_35%,var(--cz-border))] bg-[color-mix(in_srgb,var(--cz-warn)_10%,var(--cz-bg))]">
          <div className="mx-auto flex max-w-[1275px] items-start gap-2 px-4 py-2.5 text-[14px] leading-[19px] text-[var(--cz-text-primary)]">
            <ShieldAlert
              className="mt-0.5 h-[18px] w-[18px] shrink-0 text-[var(--cz-warn)]"
              aria-hidden
            />
            <p className="min-w-0 flex-1">
              <span className="font-bold">
                Your account is temporarily restricted.
              </span>{" "}
              You can browse, but posting and interactions are paused
              {restrictedUntil ? ` until ${restrictedUntil}` : ""}.{" "}
              <Link
                href="/app/menu"
                className="font-bold text-[var(--cz-accent)] hover:underline"
              >
                Details
              </Link>
            </p>
          </div>
        </div>
      ) : null}

      <div
        className={cn(
          "mx-auto grid w-full max-w-[1275px] md:grid-cols-[72px_minmax(0,1fr)] lg:grid-cols-[275px_minmax(0,1fr)]",
          isArticleReader
            ? "xl:grid-cols-[275px_minmax(0,1fr)]"
            : "xl:grid-cols-[275px_minmax(0,1fr)_350px]",
        )}
      >
        <aside className="sticky top-0 hidden h-[100dvh] min-h-0 flex-col border-r border-[var(--cz-border)] md:flex">
          <LeftNav user={user} />
        </aside>

        <main
          className={cn(
            "min-w-0",
            !isArticleReader && "xl:border-r xl:border-[var(--cz-border)]",
          )}
        >
          {/* room for the mobile tab bar */}
          <div className="pb-[calc(53px+env(safe-area-inset-bottom))] md:pb-0">
            {requireAuth && suspended && !onMenu ? (
              <AccountSuspended user={user} />
            ) : (
              children
            )}
          </div>
        </main>

        {isArticleReader ? null : (
          /* Rail scrolls on its own — cz-scrollbar keeps the same thin bar
             as the page instead of the native-width default. */
          <aside className="cz-scrollbar sticky top-0 hidden h-[100dvh] min-h-0 overflow-y-auto xl:block">
            <RightMinimal currentUser={user} />
          </aside>
        )}
      </div>

      <BottomNav />
    </div>
  );
}
