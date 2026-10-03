"use client";

import { useEffect, useState } from "react";
import { Bell, X } from "lucide-react";
import { usePush } from "@/lib/hooks/usePush";

const DISMISS_KEY = "cz:push-banner-dismissed";
const DISMISS_DAYS = 7;

function isDismissed() {
  try {
    const raw = localStorage.getItem(DISMISS_KEY);
    if (!raw) return false;
    return Date.now() - Number(raw) < DISMISS_DAYS * 24 * 3600 * 1000;
  } catch {
    return false;
  }
}

export function PushEnableBanner() {
  const { supported, permission, subscribed, loading, busy, subscribe } = usePush();
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (loading) return;
    if (!supported) return;
    if (subscribed) return;
    if (permission === "denied") return;
    if (isDismissed()) return;
    // Small delay so it never competes with first paint / auth redirect.
    const t = setTimeout(() => setVisible(true), 2500);
    return () => clearTimeout(t);
  }, [loading, supported, subscribed, permission]);

  if (!visible) return null;

  const dismiss = () => {
    try {
      localStorage.setItem(DISMISS_KEY, String(Date.now()));
    } catch {}
    setVisible(false);
  };

  const enable = async () => {
    const ok = await subscribe();
    if (ok) setVisible(false);
  };

  const isIOS = typeof navigator !== "undefined" && /iPad|iPhone|iPod/.test(navigator.userAgent || "");
  const isStandalone =
    typeof window !== "undefined" &&
    (window.matchMedia?.("(display-mode: standalone)").matches || window.navigator?.standalone === true);

  return (
    <div
      role="dialog"
      aria-label="Enable notifications"
      className="fixed inset-x-3 bottom-[calc(60px+env(safe-area-inset-bottom))] z-40 mx-auto max-w-[560px] rounded-2xl border border-[var(--cz-border)] bg-[var(--cz-bg)] p-3 shadow-xl md:inset-x-auto md:right-6 md:bottom-6 md:left-auto md:w-[360px]"
    >
      <div className="flex items-start gap-3">
        <span className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-[var(--cz-accent-softer)]">
          <Bell className="h-5 w-5 text-[var(--cz-accent)]" aria-hidden />
        </span>
        <div className="min-w-0 flex-1">
          <p className="text-[15px] font-bold text-[var(--cz-text-primary)]">Get notified everywhere</p>
          <p className="mt-0.5 text-[13px] leading-[18px] text-[var(--cz-text-secondary)]">
            {isIOS && !isStandalone
              ? "On iPhone, install CampusZen to Home Screen first, then enable notifications."
              : "Likes, replies, mentions and follows — even when CampusZen is closed."}
          </p>
          <div className="mt-2 flex items-center gap-2">
            <button
              onClick={enable}
              disabled={busy}
              className="h-[36px] rounded-full bg-[var(--cz-accent)] px-4 text-[14px] font-bold text-[var(--cz-text-inverse)] transition-opacity disabled:opacity-50"
            >
              {busy ? "Enabling…" : "Enable"}
            </button>
            <button
              onClick={dismiss}
              className="h-[36px] rounded-full px-3 text-[14px] font-bold text-[var(--cz-text-secondary)] hover:bg-[var(--cz-surface-strong)]"
            >
              Later
            </button>
          </div>
        </div>
        <button
          onClick={dismiss}
          aria-label="Dismiss"
          className="grid h-[32px] w-[32px] shrink-0 place-items-center rounded-full text-[var(--cz-text-secondary)] hover:bg-[var(--cz-surface-strong)]"
        >
          <X className="h-4 w-4" aria-hidden />
        </button>
      </div>
    </div>
  );
}
