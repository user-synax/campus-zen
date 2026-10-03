"use client";

import { Bell, BellOff } from "lucide-react";
import { usePush } from "@/lib/hooks/usePush";

/**
 * Settings toggle for closed-app push. Used on /app/notifications.
 * Banner handles first-run; this handles ongoing control.
 */
export function PushSettings() {
  const { supported, permission, subscribed, loading, busy, error, subscribe, unsubscribe } = usePush();

  if (loading) return null;
  if (!supported) return null;

  const blocked = permission === "denied";

  return (
    <div className="flex items-center justify-between gap-3 rounded-2xl border border-[var(--cz-border)] px-4 py-3">
      <div className="flex min-w-0 items-center gap-3">
        <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-[var(--cz-surface-strong)]">
          {subscribed ? (
            <Bell className="h-[18px] w-[18px] text-[var(--cz-accent)]" aria-hidden />
          ) : (
            <BellOff className="h-[18px] w-[18px] text-[var(--cz-text-secondary)]" aria-hidden />
          )}
        </span>
        <div className="min-w-0">
          <p className="text-[14px] font-bold text-[var(--cz-text-primary)]">Push notifications</p>
          <p className="truncate text-[13px] text-[var(--cz-text-secondary)]">
            {blocked
              ? "Blocked in browser settings — allow notifications, then reload."
              : subscribed
                ? "On — works even when CampusZen is closed."
                : "Off — enable to get alerts on this device."}
          </p>
          {error ? <p className="mt-0.5 text-[13px] text-[var(--cz-error)]">{error}</p> : null}
        </div>
      </div>
      {!blocked ? (
        <button
          onClick={() => (subscribed ? unsubscribe() : subscribe())}
          disabled={busy}
          role="switch"
          aria-checked={subscribed}
          aria-label="Toggle push notifications"
          className={`relative h-[28px] w-[48px] shrink-0 rounded-full transition-colors disabled:opacity-50 ${
            subscribed ? "bg-[var(--cz-accent)]" : "bg-[var(--cz-border-strong)]"
          }`}
        >
          <span
            className={`absolute top-[3px] h-[22px] w-[22px] rounded-full bg-white shadow transition-all ${
              subscribed ? "left-[23px]" : "left-[3px]"
            }`}
          />
        </button>
      ) : null}
    </div>
  );
}
