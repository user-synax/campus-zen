"use client";

import { LogOut, ShieldAlert } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { api } from "@/lib/api";
import { formatAccountDate } from "@/lib/accountStatus";

/**
 * Shown in place of the app whenever the signed-in account is suspended, and
 * on the sign-in screen when a login attempt lands on a suspended account.
 * The one thing it always offers is a way out: sign out of this account.
 */
export function AccountSuspended({ user, onSignedOut }) {
  const router = useRouter();
  const [signingOut, setSigningOut] = useState(false);

  const since = formatAccountDate(user?.suspendedAt || user?.accountStatusAt);
  const reason = user?.suspendReason || user?.accountStatusReason || null;

  const onSignOut = async () => {
    setSigningOut(true);
    // Best effort: the session is already unusable, so a failed logout must
    // not trap the user on this screen.
    try {
      await api.logout();
    } catch {}
    if (onSignedOut) {
      onSignedOut();
      setSigningOut(false);
      return;
    }
    router.replace("/login");
    router.refresh();
  };

  return (
    <div className="flex min-h-[60vh] items-center justify-center px-4 py-10">
      <div className="w-full max-w-[440px] overflow-hidden rounded-[16px] border border-[var(--cz-border)]">
        <div className="flex items-center gap-2 border-b border-[var(--cz-border)] px-4 py-3 text-[15px] font-bold leading-[20px]">
          <ShieldAlert className="h-4 w-4 text-[var(--cz-error)]" aria-hidden />
          Your account is suspended
        </div>
        <div className="p-4">
          <p className="text-[15px] leading-[21px] text-[var(--cz-text-primary)]">
            You can still see your account details and sign out, but you
            cannot post, reply or follow until this is lifted.
          </p>
          {reason ? (
            <p className="mt-3 rounded-[12px] bg-[var(--cz-surface-strong)] p-3 text-[14px] leading-[19px]">
              <span className="font-bold">Reason: </span>
              {reason}
            </p>
          ) : null}
          {since ? (
            <p className="mt-2 text-[13px] text-[var(--cz-text-secondary)]">
              Suspended since {since}
            </p>
          ) : null}

          <div className="mt-4 flex flex-col gap-2.5">
            {user ? (
              <Link
                href="/app/menu"
                className="flex h-[44px] items-center justify-center rounded-full border border-[var(--cz-border-strong)] px-4 text-[15px] font-bold text-[var(--cz-text-primary)] transition-colors hover:bg-[var(--cz-surface-strong)]"
              >
                View account details
              </Link>
            ) : null}
            <button
              type="button"
              onClick={onSignOut}
              disabled={signingOut}
              className="flex h-[44px] cursor-pointer items-center justify-center gap-2 rounded-full bg-[var(--cz-error)] px-4 text-[15px] font-bold text-white transition-opacity hover:opacity-90 disabled:opacity-50"
            >
              <LogOut className="h-[18px] w-[18px]" aria-hidden />
              {signingOut ? "Signing out…" : "Log out"}
            </button>
          </div>

          {user ? (
            <p className="mt-3 text-[13px] leading-[18px] text-[var(--cz-text-secondary)]">
              Think this is a mistake? Appeal from Settings → Safety.
            </p>
          ) : null}
        </div>
      </div>
    </div>
  );
}
