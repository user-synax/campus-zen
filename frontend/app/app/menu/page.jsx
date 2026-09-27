"use client";

import {
  BadgeCheck,
  Bookmark,
  ChevronRight,
  FileText,
  Loader2,
  Lock,
  LogOut,
  Shield,
  User,
  Users,
} from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import { cn } from "@/lib/utils";

export default function MenuPage() {
  const router = useRouter();
  const [user, setUser] = useState(null);
  const [loadingUser, setLoadingUser] = useState(true);
  const [loggingOut, setLoggingOut] = useState(false);
  const [blocked, setBlocked] = useState([]);
  const [loadingBlocked, setLoadingBlocked] = useState(true);
  const [unblocking, setUnblocking] = useState(null);

  const [showBlocked, setShowBlocked] = useState(false);

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

  const initial = (
    user?.fullName?.[0] ||
    user?.username?.[0] ||
    "U"
  ).toUpperCase();
  const profileHref = "/app/profile";

  const rowBase =
    "flex w-full items-center gap-3 px-4 min-h-[56px] py-3 text-left transition-colors active:bg-[rgba(255,206,173,0.06)] hover:bg-[rgba(255,206,173,0.04)]";
  const iconWrap =
    "grid h-8 w-8 shrink-0 place-items-center rounded-full bg-[rgba(255,206,173,0.08)] text-[var(--cz-text-primary)]";

  return (
    <div className="mx-auto w-full max-w-[520px] pb-2">
      {/* Profile hero — single tap to profile */}
      <Link
        href={profileHref}
        aria-label="View your profile"
        className="group flex items-center gap-3 rounded-[20px] border border-[var(--cz-border)] bg-[var(--cz-surface)] p-4 transition-colors hover:border-[var(--cz-border-strong)] active:bg-[rgba(255,206,173,0.04)]"
      >
        <span className="relative grid h-14 w-14 shrink-0 place-items-center overflow-hidden rounded-full bg-[var(--cz-muted)] text-[18px] font-semibold text-white">
          {user?.avatarUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={user.avatarUrl}
              alt=""
              className="h-full w-full object-cover"
            />
          ) : (
            initial
          )}
        </span>
        <span className="min-w-0 flex-1">
          {loadingUser ? (
            <span className="block space-y-2" aria-hidden="true">
              <span className="block h-4 w-32 animate-pulse rounded-full bg-[rgba(255,206,173,0.12)]" />
              <span className="block h-3 w-24 animate-pulse rounded-full bg-[rgba(255,206,173,0.08)]" />
            </span>
          ) : (
            <>
              <span className="flex items-center gap-1.5 text-[16px] font-semibold leading-tight tracking-[-0.02em] truncate">
                <span className="truncate">
                  {user?.fullName || "CampusZen Student"}
                </span>
                {user?.isEmailVerified ? (
                  <BadgeCheck
                    className="h-4 w-4 shrink-0 text-emerald-300"
                    aria-label="Verified"
                  />
                ) : null}
              </span>
              <span className="mt-0.5 block truncate text-[13px] leading-tight text-[var(--cz-text-secondary)]">
                @{user?.username || "username"}
              </span>
            </>
          )}
        </span>
        <ChevronRight
          className="h-5 w-5 shrink-0 text-[var(--cz-text-secondary)] transition-transform group-active:translate-x-0.5"
          aria-hidden
        />
      </Link>

      {/* Primary */}
      <nav
        aria-label="Menu"
        className="mt-3 overflow-hidden rounded-[20px] border border-[var(--cz-border)] bg-[var(--cz-surface)] divide-y divide-[var(--cz-border)]/70"
      >
        <Link href="/u" className={rowBase}>
          <span className={iconWrap}>
            <Users className="h-4 w-4" aria-hidden />
          </span>
          <span className="min-w-0 flex-1">
            <span className="block text-[14px] font-medium leading-tight">
              Discover friends
            </span>
            <span className="block text-[12px] leading-tight text-[var(--cz-text-secondary)]">
              Students by college & course
            </span>
          </span>
          <ChevronRight
            className="h-4 w-4 shrink-0 text-[var(--cz-text-secondary)]/70"
            aria-hidden
          />
        </Link>
        <Link href={profileHref} className={rowBase}>
          <span className={iconWrap}>
            <User className="h-4 w-4" aria-hidden />
          </span>
          <span className="min-w-0 flex-1 text-[14px] font-medium">
            View profile
          </span>
          <ChevronRight
            className="h-4 w-4 shrink-0 text-[var(--cz-text-secondary)]/70"
            aria-hidden
          />
        </Link>
        <Link href="/app/bookmarks" className={rowBase}>
          <span className={iconWrap}>
            <Bookmark className="h-4 w-4" aria-hidden />
          </span>
          <span className="min-w-0 flex-1">
            <span className="block text-[14px] font-medium leading-tight">
              Bookmarks
            </span>
            <span className="block text-[12px] leading-tight text-[var(--cz-text-secondary)]">
              Private to you
            </span>
          </span>
          <ChevronRight
            className="h-4 w-4 shrink-0 text-[var(--cz-text-secondary)]/70"
            aria-hidden
          />
        </Link>
      </nav>

      {/* Safety + legal */}
      <nav
        aria-label="Settings and legal"
        className="mt-3 overflow-hidden rounded-[20px] border border-[var(--cz-border)] bg-[var(--cz-surface)] divide-y divide-[var(--cz-border)]/70"
      >
        <button
          type="button"
          onClick={() => setShowBlocked((v) => !v)}
          aria-expanded={showBlocked}
          className={cn(rowBase, "cursor-pointer")}
        >
          <span className={iconWrap}>
            <Shield className="h-4 w-4" aria-hidden />
          </span>
          <span className="min-w-0 flex-1 text-[14px] font-medium">
            Blocked
          </span>
          {loadingBlocked ? (
            <Loader2
              className="h-4 w-4 animate-spin text-[var(--cz-text-secondary)]"
              aria-hidden
            />
          ) : blocked.length > 0 ? (
            <span className="grid min-w-[22px] place-items-center rounded-full bg-[rgba(255,206,173,0.12)] px-1.5 text-[12px] font-semibold leading-[22px]">
              {blocked.length}
            </span>
          ) : (
            <span className="text-[12px] text-[var(--cz-text-secondary)]/70">
              None
            </span>
          )}
          <ChevronRight
            className={cn(
              "h-4 w-4 shrink-0 text-[var(--cz-text-secondary)]/70 transition-transform",
              showBlocked && "rotate-90",
            )}
            aria-hidden
          />
        </button>

        {showBlocked ? (
          <div className="bg-[rgba(255,255,255,0.015)] px-4 py-2">
            {loadingBlocked ? (
              <p className="flex items-center gap-2 py-3 text-[13px] text-[var(--cz-text-secondary)]">
                <Loader2 className="h-4 w-4 animate-spin" /> Loading…
              </p>
            ) : blocked.length === 0 ? (
              <p className="py-3 text-[13px] text-[var(--cz-text-secondary)]/80">
                No blocked accounts.
              </p>
            ) : (
              <ul className="divide-y divide-[var(--cz-border)]/60">
                {blocked.map((u) => (
                  <li key={u._id} className="flex items-center gap-3 py-2.5">
                    <span className="grid h-9 w-9 shrink-0 place-items-center overflow-hidden rounded-full bg-[var(--cz-muted)] text-[12px] font-semibold text-white">
                      {u.avatarUrl ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={u.avatarUrl}
                          alt=""
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
                      type="button"
                      onClick={() => onUnblock(u._id)}
                      disabled={unblocking === u._id}
                      className="inline-flex h-[32px] shrink-0 items-center justify-center rounded-full border border-[var(--cz-border)] px-3.5 text-[12px] font-medium text-[var(--cz-text-secondary)] transition-colors hover:border-[var(--cz-border-strong)] hover:text-[var(--cz-text-primary)] disabled:opacity-50"
                    >
                      {unblocking === u._id ? (
                        <Loader2 className="h-3.5 w-3.5 animate-spin" />
                      ) : (
                        "Unblock"
                      )}
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
        ) : null}

        <Link href="/privacy" className={rowBase}>
          <span className={iconWrap}>
            <Lock className="h-4 w-4" aria-hidden />
          </span>
          <span className="min-w-0 flex-1 text-[14px] font-medium">
            Privacy
          </span>
          <ChevronRight
            className="h-4 w-4 shrink-0 text-[var(--cz-text-secondary)]/70"
            aria-hidden
          />
        </Link>
        <Link href="/terms" className={rowBase}>
          <span className={iconWrap}>
            <FileText className="h-4 w-4" aria-hidden />
          </span>
          <span className="min-w-0 flex-1 text-[14px] font-medium">Terms</span>
          <ChevronRight
            className="h-4 w-4 shrink-0 text-[var(--cz-text-secondary)]/70"
            aria-hidden
          />
        </Link>
      </nav>

      {/* Destructive */}
      <button
        type="button"
        onClick={onLogout}
        disabled={loggingOut}
        className="mt-3 flex min-h-[56px] w-full items-center justify-center gap-2 rounded-[20px] border border-[rgba(255,90,106,0.25)] bg-[rgba(255,90,106,0.06)] px-4 py-3 text-[14px] font-semibold text-[var(--cz-error)] transition-colors hover:bg-[rgba(255,90,106,0.10)] active:bg-[rgba(255,90,106,0.12)] disabled:opacity-50"
      >
        {loggingOut ? (
          <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
        ) : (
          <LogOut className="h-4 w-4" aria-hidden />
        )}
        {loggingOut ? "Logging out…" : "Log out"}
      </button>

      <p className="mt-4 text-center text-[11px] tracking-[0.04em] text-[var(--cz-text-secondary)]/60">
        campuszen
      </p>
    </div>
  );
}
