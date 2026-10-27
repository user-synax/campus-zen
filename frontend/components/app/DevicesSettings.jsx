"use client";

import { useCallback, useEffect, useState } from "react";
import {
  ChevronRight,
  Loader2,
  LogOut,
  MonitorSmartphone,
  ShieldCheck,
} from "lucide-react";
import { api } from "@/lib/api";

function timeAgo(iso) {
  const then = new Date(iso).getTime();
  if (!then || Number.isNaN(then)) return "";
  const mins = Math.round((Date.now() - then) / 60000);
  if (mins < 1) return "Active now";
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.round(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.round(hours / 24);
  if (days < 30) return `${days}d ago`;
  return new Date(iso).toLocaleDateString("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

/**
 * Signed-in devices. Every login creates its own session, so this lists each
 * device with the ability to sign one out or sign out everywhere else.
 * Loads lazily on expand so the Menu tab still paints instantly. On its own
 * Security page the row header is redundant, so `showTitle={false}` renders
 * the list directly and `defaultOpen` loads it on mount.
 */
export function DevicesSettings({ showTitle = true, defaultOpen = false }) {
  const [open, setOpen] = useState(defaultOpen);
  const [loading, setLoading] = useState(false);
  const [sessions, setSessions] = useState([]);
  const [busy, setBusy] = useState(null);
  const [error, setError] = useState(null);
  const [note, setNote] = useState(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await api.listSessions();
      setSessions(res?.data?.sessions || []);
    } catch (e) {
      setError(e?.data?.message || e.message || "Couldn't load your devices");
    } finally {
      setLoading(false);
    }
  }, []);

  const toggle = () => {
    const next = !open;
    setOpen(next);
    setNote(null);
    if (next) load();
  };

  // Own-page mode: no row to tap, so fetch as soon as the page mounts.
  useEffect(() => {
    if (defaultOpen) load();
  }, [defaultOpen, load]);

  const onRevoke = async (id) => {
    setBusy(id);
    setError(null);
    setNote(null);
    try {
      await api.revokeSession(id);
      setSessions((prev) => prev.filter((s) => s.id !== id));
      setNote("That device was signed out.");
    } catch (e) {
      setError(e?.data?.message || e.message || "Couldn't sign that device out");
    } finally {
      setBusy(null);
    }
  };

  const onRevokeOthers = async () => {
    if (
      !confirm(
        "Sign out every other device? They'll need to log in again with your password.",
      )
    )
      return;
    setBusy("others");
    setError(null);
    setNote(null);
    try {
      const res = await api.revokeOtherSessions();
      setNote(res?.message || "Signed out other devices.");
      await load();
    } catch (e) {
      setError(e?.data?.message || e.message || "Couldn't sign other devices out");
    } finally {
      setBusy(null);
    }
  };

  const rowBase =
    "flex w-full cursor-pointer items-center gap-3 px-4 py-3 text-left transition-colors hover:bg-[var(--cz-surface-strong)]";
  const others = sessions.filter((s) => !s.current).length;

  return (
    <div className="overflow-hidden rounded-[16px] border border-[var(--cz-border)]">
      {showTitle ? (
        <button
          type="button"
          onClick={toggle}
          aria-expanded={open}
          className={rowBase}
        >
          <span className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-[var(--cz-surface-strong)] text-[var(--cz-text-primary)]">
            <MonitorSmartphone className="h-4 w-4" aria-hidden />
          </span>
          <span className="min-w-0 flex-1 text-[15px] font-bold leading-[20px]">
            Devices
          </span>
          {open && loading ? (
            <Loader2
              className="h-4 w-4 animate-spin text-[var(--cz-text-secondary)]"
              aria-hidden
            />
          ) : (
            <span className="text-[15px] text-[var(--cz-text-secondary)]">
              {open ? (sessions.length ? `${sessions.length}` : "") : "Manage"}
            </span>
          )}
          <ChevronRight
            className={`h-[18px] w-[18px] shrink-0 text-[var(--cz-text-secondary)] transition-transform ${
              open ? "rotate-90" : ""
            }`}
            aria-hidden
          />
        </button>
      ) : null}

      {open ? (
        <div className="bg-[var(--cz-surface-strong)]/50 px-4 py-2">
          {error ? (
            <p className="py-2 text-[14px] text-[var(--cz-error)]">{error}</p>
          ) : null}
          {note ? (
            <p className="py-2 text-[14px] text-[var(--cz-text-secondary)]">
              {note}
            </p>
          ) : null}

          {loading && sessions.length === 0 ? (
            <p className="flex items-center gap-2 py-3 text-[15px] text-[var(--cz-text-secondary)]">
              <Loader2 className="h-4 w-4 animate-spin" aria-hidden /> Loading…
            </p>
          ) : sessions.length === 0 ? (
            <p className="py-3 text-[15px] text-[var(--cz-text-secondary)]">
              No active devices found.
            </p>
          ) : (
            <ul className="divide-y divide-[var(--cz-border)]">
              {sessions.map((s) => (
                <li key={s.id} className="flex items-center gap-3 py-2.5">
                  <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-[var(--cz-border-strong)] text-[var(--cz-text-primary)]">
                    <MonitorSmartphone className="h-[18px] w-[18px]" aria-hidden />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="flex items-center gap-1.5">
                      <span className="truncate text-[15px] font-bold leading-[20px]">
                        {s.label || "Unknown device"}
                      </span>
                      {s.current ? (
                        <span className="inline-flex shrink-0 items-center gap-1 rounded-full bg-[var(--cz-accent-soft)] px-2 text-[12px] font-bold leading-[20px] text-[var(--cz-accent)]">
                          <ShieldCheck className="h-3 w-3" aria-hidden />
                          This device
                        </span>
                      ) : null}
                    </span>
                    <span className="block truncate text-[14px] leading-[20px] text-[var(--cz-text-secondary)]">
                      {timeAgo(s.lastUsedAt)}
                      {s.ip ? ` · ${s.ip}` : ""}
                    </span>
                  </span>
                  {s.current ? null : (
                    <button
                      type="button"
                      onClick={() => onRevoke(s.id)}
                      disabled={busy === s.id}
                      className="inline-flex h-[32px] shrink-0 items-center justify-center rounded-full border border-[var(--cz-border-strong)] px-3 text-[14px] font-bold text-[var(--cz-text-primary)] transition-colors hover:bg-[var(--cz-surface-strong)] disabled:opacity-50"
                    >
                      {busy === s.id ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        "Sign out"
                      )}
                    </button>
                  )}
                </li>
              ))}
            </ul>
          )}

          <button
            type="button"
            onClick={onRevokeOthers}
            disabled={busy === "others" || loading}
            className="mt-1 mb-2 flex h-[36px] w-full items-center justify-center gap-2 rounded-full border border-[var(--cz-border-strong)] text-[14px] font-bold text-[var(--cz-text-primary)] transition-colors hover:bg-[var(--cz-surface-strong)] disabled:opacity-50"
          >
            {busy === "others" ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <LogOut className="h-4 w-4" aria-hidden />
            )}
            {others > 0
              ? `Sign out other devices (${others})`
              : "Sign out other devices"}
          </button>
          <p className="pb-2 text-[13px] text-[var(--cz-text-secondary)]">
            Signing out a device ends its session immediately; it will need your
            password to come back.
          </p>
        </div>
      ) : null}
    </div>
  );
}
