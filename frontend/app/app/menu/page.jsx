"use client";

import {
  Bookmark,
  FileText,
  Loader2,
  LogOut,
  Settings,
  Shield,
  User,
} from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { EmptyState } from "@/components/app/EmptyState";
import { api } from "@/lib/api";

export default function MenuPage() {
  const router = useRouter();
  const [user, setUser] = useState(null);
  const [loadingUser, setLoadingUser] = useState(true);
  const [loggingOut, setLoggingOut] = useState(false);
  const [blocked, setBlocked] = useState([]);
  const [loadingBlocked, setLoadingBlocked] = useState(true);
  const [unblocking, setUnblocking] = useState(null);

  useEffect(() => {
    api
      .me()
      .then((r) => setUser(r.data?.user))
      .catch(() => {})
      .finally(() => setLoadingUser(false));
    api
      .getBlocks()
      .then((r) => setBlocked(r.data?.users || []))
      .catch(() => {})
      .finally(() => setLoadingBlocked(false));
  }, []);

  const onUnblock = async (id) => {
    setUnblocking(id);
    try {
      await api.unblockUser(id);
      setBlocked((prev) => prev.filter((u) => String(u._id) !== String(id)));
    } catch {}
    setUnblocking(null);
  };

  const onLogout = async () => {
    setLoggingOut(true);
    try {
      await api.logout();
    } catch {}
    router.replace("/login");
    router.refresh();
  };

  return (
    <div className="mx-auto w-full max-w-[640px] space-y-4">
      <h1 className="text-[18px] font-semibold tracking-[-0.02em]">Menu</h1>

      <div className="rounded-[16px] border border-[var(--cz-border)] bg-[var(--cz-surface)] overflow-hidden">
        <div className="h-px w-full bg-gradient-to-r from-transparent via-[rgba(255,206,173,0.12)] to-transparent" />
        <div className="p-4 flex items-center gap-3">
          <span className="grid place-items-center h-11 w-11 rounded-full bg-[var(--cz-muted)] text-white font-semibold">
            {(user?.fullName?.[0] || user?.username?.[0] || "U").toUpperCase()}
          </span>
          <span className="min-w-0 flex-1">
            {loadingUser ? (
              <span className="inline-flex items-center gap-1.5 text-[13px] text-[var(--cz-text-secondary)]">
                <Loader2 className="h-3.5 w-3.5 animate-spin" /> Loading…
              </span>
            ) : (
              <>
                <span className="block text-[14px] font-medium leading-none truncate">
                  {user?.fullName || "CampusZen Student"}
                </span>
                <span className="block text-[12px] leading-none text-[var(--cz-text-secondary)] mt-1 truncate">
                  @{user?.username || "username"} • {user?.email || ""}
                </span>
                <span
                  className={`mt-1.5 inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-medium tracking-[0.04em] uppercase border ${user?.isEmailVerified ? "bg-emerald-500/10 border-emerald-500/20 text-emerald-300" : "bg-amber-500/10 border-amber-500/20 text-amber-200"}`}
                >
                  {user?.isEmailVerified
                    ? "Verified"
                    : "Unverified — verify later"}
                </span>
              </>
            )}
          </span>
        </div>

        <div className="grid grid-cols-2 gap-0 border-t border-[var(--cz-border)]">
          <Link
            href="/app/menu"
            className="flex items-center gap-2 px-4 h-[44px] border-r border-[var(--cz-border)] text-[13px] font-medium hover:bg-[rgba(255,206,173,0.06)]"
          >
            <User className="h-4 w-4 text-[var(--cz-muted)]" /> Profile
          </Link>
          <button
            onClick={onLogout}
            disabled={loggingOut}
            className="flex items-center gap-2 px-4 h-[44px] text-[13px] font-medium hover:bg-[rgba(255,206,173,0.06)] text-[var(--cz-error)] disabled:opacity-50"
          >
            {loggingOut ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <LogOut className="h-4 w-4" />
            )}{" "}
            {loggingOut ? "Logging out…" : "Log out"}
          </button>
        </div>
      </div>

      <Link
        href="/app/bookmarks"
        className="flex items-center gap-3 rounded-[16px] border border-[var(--cz-border)] bg-[var(--cz-surface)] px-4 h-[52px] hover:border-[var(--cz-border-strong)] transition-colors"
      >
        <Bookmark className="h-4 w-4 text-[var(--cz-muted)] shrink-0" />
        <span className="flex-1 min-w-0">
          <span className="block text-[13px] font-medium leading-tight">
            Bookmarks
          </span>
          <span className="block text-[12px] leading-tight text-[var(--cz-text-secondary)]">
            Your saved posts • private
          </span>
        </span>
        <span
          aria-hidden
          className="text-[var(--cz-text-secondary)] text-[16px] leading-none"
        >
          →
        </span>
      </Link>

      <div className="grid gap-3">
        <div className="rounded-[12px] border border-[var(--cz-border)] bg-[rgba(255,255,255,0.02)] p-4">
          <h3 className="text-[13px] font-medium flex items-center gap-1.5">
            <Settings className="h-4 w-4 text-[var(--cz-text-secondary)]" />{" "}
            Account
          </h3>
          <p className="mt-1 text-[12px] leading-[16px] text-[var(--cz-text-secondary)]">
            Edit profile, college/course/year per PRD §8 — coming after auth
            stabilization.
          </p>
        </div>
        <div className="rounded-[12px] border border-[var(--cz-border)] bg-[rgba(255,255,255,0.02)] p-4">
          <h3 className="text-[13px] font-medium flex items-center gap-1.5">
            <Shield className="h-4 w-4 text-[var(--cz-text-secondary)]" />{" "}
            Safety
          </h3>
          <p className="mt-1 text-[12px] leading-[16px] text-[var(--cz-text-secondary)]">
            Blocked accounts can&apos;t see you or interact with you, and vice
            versa.
          </p>
          <div className="mt-3">
            {loadingBlocked ? (
              <p className="inline-flex items-center gap-1.5 text-[12px] text-[var(--cz-text-secondary)]">
                <Loader2 className="h-3.5 w-3.5 animate-spin" /> Loading…
              </p>
            ) : blocked.length === 0 ? (
              <p className="text-[12px] text-[var(--cz-text-secondary)]/70">
                No blocked accounts.
              </p>
            ) : (
              <div className="divide-y divide-[var(--cz-border)]/60">
                {blocked.map((u) => (
                  <div key={u._id} className="flex items-center gap-2.5 py-2">
                    <span className="grid place-items-center h-8 w-8 rounded-full bg-[var(--cz-muted)] text-white text-[11px] font-semibold shrink-0 overflow-hidden">
                      {u.avatarUrl ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={u.avatarUrl}
                          alt={u.username}
                          className="h-full w-full object-cover"
                        />
                      ) : (
                        (u.fullName || u.username || "U")
                          .slice(0, 1)
                          .toUpperCase()
                      )}
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-[13px] font-medium leading-tight">
                        {u.fullName || u.username}
                      </span>
                      <span className="block truncate text-[12px] leading-tight text-[var(--cz-text-secondary)]">
                        @{u.username}
                      </span>
                    </span>
                    <button
                      onClick={() => onUnblock(u._id)}
                      disabled={unblocking === u._id}
                      className="shrink-0 inline-flex items-center justify-center rounded-full px-3 h-[30px] text-[12px] font-medium text-[var(--cz-text-secondary)] hover:text-[var(--cz-text-primary)] border border-[var(--cz-border)] hover:border-[var(--cz-border-strong)] transition-colors disabled:opacity-50"
                    >
                      {unblocking === u._id ? (
                        <Loader2 className="h-3.5 w-3.5 animate-spin" />
                      ) : (
                        "Unblock"
                      )}
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      <EmptyState
        icon={FileText}
        title="More soon"
        description="Menu will grow with Settings, Privacy, and Admin moderation entry points."
      />

      <div className="flex flex-wrap gap-2 text-[11px]">
        <Link
          href="/terms"
          className="rounded-full border border-[var(--cz-border)] px-3 py-1.5 text-[var(--cz-text-secondary)] hover:text-[var(--cz-text-primary)]"
        >
          Terms
        </Link>
        <Link
          href="/privacy"
          className="rounded-full border border-[var(--cz-border)] px-3 py-1.5 text-[var(--cz-text-secondary)] hover:text-[var(--cz-text-primary)]"
        >
          Privacy
        </Link>
        <Link
          href="/"
          className="rounded-full border border-[var(--cz-border)] px-3 py-1.5 text-[var(--cz-text-secondary)] hover:text-[var(--cz-text-primary)]"
        >
          Landing
        </Link>
      </div>
    </div>
  );
}
