"use client";

import { ArrowLeft, ShieldBan } from "lucide-react";
import { formatAccountDate } from "@/lib/accountStatus";

/**
 * Shown on the sign-in screen when an account is permanently banned. The ban
 * is intentionally terminal for the account owner: there is no self-service
 * way back in, only an admin unban. The copy avoids revealing whether the
 * password was correct and keeps the door open for a human review.
 */
export function AccountBanned({ reason, bannedAt, onBack }) {
  const since = formatAccountDate(bannedAt);
  return (
    <div className="mx-auto flex min-h-dvh w-full max-w-[440px] flex-col justify-center px-4 py-10">
      <div className="overflow-hidden rounded-[16px] border border-[color-mix(in_srgb,var(--cz-error)_35%,var(--cz-border))]">
        <div className="flex items-center gap-2 border-b border-[var(--cz-border)] bg-[color-mix(in_srgb,var(--cz-error)_7%,transparent)] px-4 py-3 text-[15px] leading-[20px] font-bold">
          <ShieldBan className="h-4 w-4 text-[var(--cz-error)]" aria-hidden />
          This account is banned
        </div>
        <div className="p-4">
          <p className="text-[15px] leading-[21px] text-[var(--cz-text-primary)]">
            CampusZen has permanently banned this account. You cannot sign in,
            and any open sessions have been ended. The profile and posts are
            hidden from other students.
          </p>
          {reason ? (
            <p className="mt-3 rounded-[12px] bg-[var(--cz-surface-strong)] p-3 text-[14px] leading-[19px]">
              <span className="font-bold">Reason: </span>
              {reason}
            </p>
          ) : null}
          {since ? (
            <p className="mt-2 text-[13px] text-[var(--cz-text-secondary)]">
              Banned since {since}
            </p>
          ) : null}
          <p className="mt-3 text-[13px] leading-[18px] text-[var(--cz-text-secondary)]">
            If you believe this was a mistake, contact the CampusZen team. Only
            an administrator can reinstate the account.
          </p>

          <button
            type="button"
            onClick={onBack}
            className="mt-4 flex h-[44px] w-full cursor-pointer items-center justify-center gap-2 rounded-full border border-[var(--cz-border-strong)] px-4 text-[15px] font-bold text-[var(--cz-text-primary)] transition-colors hover:bg-[var(--cz-surface-strong)]"
          >
            <ArrowLeft className="h-[18px] w-[18px]" aria-hidden />
            Back to sign in
          </button>
        </div>
      </div>
    </div>
  );
}
