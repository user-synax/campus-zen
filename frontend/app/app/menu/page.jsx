"use client";

import { useQueryClient } from "@tanstack/react-query";
import {
  Bookmark,
  ChevronRight,
  FileText,
  Loader2,
  Lock,
  LogOut,
  Moon,
  School,
  Shield,
  Sun,
  User,
  Users,
} from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { CzImage } from "@/components/app/CzImage";
import { PageHeader } from "@/components/app/PageHeader";
import { UserBadge } from "@/components/ui/verified-badge";
import { api } from "@/lib/api";
import { useBlocks, useMe } from "@/lib/hooks/queries";
import { applyTheme, persistTheme, readTheme } from "@/lib/theme";
import { cn } from "@/lib/utils";

export default function MenuPage() {
  const router = useRouter();
  const queryClient = useQueryClient();
  // Reuse the shell's cached session — no second /me on tab open.
  const { data: meData, isPending: loadingUser } = useMe();
  const user = meData?.data?.user || null;
  const [loggingOut, setLoggingOut] = useState(false);
  const [unblocking, setUnblocking] = useState(null);
  const [showBlocked, setShowBlocked] = useState(false);
  const [theme, setTheme] = useState("light");

  // Blocked list loads lazily, only when the section is expanded, so the
  // Menu tab paints instantly.
  const { data: blocksData, isFetching: fetchingBlocked } =
    useBlocks(showBlocked);
  const blocked = blocksData?.data?.users || [];
  const loadingBlocked = showBlocked && fetchingBlocked && blocked.length === 0;

  useEffect(() => {
    setTheme(readTheme());
  }, []);

  const onUnblock = async (id) => {
    setUnblocking(id);
    try {
      await api.unblockUser(id);
      queryClient.setQueryData(["blocks"], (old) => {
        if (!old) return old;
        return {
          ...old,
          data: {
            ...old.data,
            users: (old.data?.users || []).filter(
              (u) => String(u._id) !== String(id),
            ),
          },
        };
      });
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

  const setThemeAndApply = (next) => {
    setTheme(next);
    applyTheme(next);
    persistTheme(next);
  };
  const initial = (
    user?.fullName?.[0] ||
    user?.username?.[0] ||
    "U"
  ).toUpperCase();

  const rowBase =
    "flex w-full cursor-pointer items-center gap-3 px-4 py-3 text-left transition-colors hover:bg-[var(--cz-surface-strong)]";
  const iconWrap =
    "grid h-8 w-8 shrink-0 place-items-center rounded-full bg-[var(--cz-surface-strong)] text-[var(--cz-text-primary)]";
  const chevron = "h-[18px] w-[18px] shrink-0 text-[var(--cz-text-secondary)]";

  return (
    <div>
      <PageHeader title="Menu" />

      <div className="p-4">
        <Link
          href="/app/profile"
          aria-label="View your profile"
          className="flex items-center gap-3 rounded-[16px] border border-[var(--cz-border)] p-4 transition-colors hover:bg-[var(--cz-surface-strong)]"
        >
          <span className="grid h-14 w-14 shrink-0 place-items-center overflow-hidden rounded-full bg-[var(--cz-border-strong)] text-[18px] font-bold text-[var(--cz-text-primary)]">
            {user?.avatarUrl ? (
              <CzImage
                src={user.avatarUrl}
                alt=""
                className="h-full w-full rounded-full"
                imgClassName="h-full w-full"
              />
            ) : (
              initial
            )}
          </span>
          <span className="min-w-0 flex-1">
            {loadingUser ? (
              <span className="block space-y-2" aria-hidden="true">
                <span className="t-shimmer block h-4 w-32 rounded-full" />
                <span className="t-shimmer block h-3 w-24 rounded-full" />
              </span>
            ) : (
              <>
                <span className="flex items-center gap-1">
                  <span className="truncate text-[20px] leading-6 font-extrabold">
                    {user?.fullName || "CampusZen Student"}
                  </span>
                  <UserBadge user={user} size="md" />
                </span>
                <span className="mt-0.5 block truncate text-[15px] leading-[20px] text-[var(--cz-text-secondary)]">
                  @{user?.username || "username"}
                </span>
              </>
            )}
          </span>
          <ChevronRight className={chevron} aria-hidden />
        </Link>

        <nav
          aria-label="Menu"
          className="mt-4 divide-y divide-[var(--cz-border)] overflow-hidden rounded-[16px] border border-[var(--cz-border)]"
        >
          {[
            {
              href: "/u",
              Icon: Users,
              title: "Discover students",
              sub: "By college and course",
            },
            {
              href: "/c",
              Icon: School,
              title: "Discover colleges",
              sub: "Browse all campuses",
            },
            {
              href: "/app/profile",
              Icon: User,
              title: "View profile",
              sub: "Posts, replies and media",
            },
            {
              href: "/app/bookmarks",
              Icon: Bookmark,
              title: "Bookmarks",
              sub: "Private to you",
            },
          ].map(({ href, Icon, title, sub }) => (
            <Link key={href} href={href} className={rowBase}>
              <span className={iconWrap}>
                <Icon className="h-4 w-4" aria-hidden />
              </span>
              <span className="min-w-0 flex-1">
                <span className="block text-[15px] font-bold leading-[20px]">
                  {title}
                </span>
                <span className="block text-[15px] leading-[20px] text-[var(--cz-text-secondary)]">
                  {sub}
                </span>
              </span>
              <ChevronRight className={chevron} aria-hidden />
            </Link>
          ))}
        </nav>

        {/* Appearance — the one place the light/dark switch is spelled out */}
        <div className="mt-4 overflow-hidden rounded-[16px] border border-[var(--cz-border)]">
          <p className="border-b border-[var(--cz-border)] px-4 py-3 text-[15px] font-bold leading-[20px] text-[var(--cz-text-secondary)]">
            Appearance
          </p>
          <div className="grid grid-cols-2">
            {[
              { id: "light", label: "Light", Icon: Sun },
              { id: "dark", label: "Dark", Icon: Moon },
            ].map(({ id, label, Icon }, i) => {
              const on = theme === id;
              return (
                <button
                  key={id}
                  type="button"
                  onClick={() => setThemeAndApply(id)}
                  aria-pressed={on}
                  className={cn(
                    "flex cursor-pointer items-center justify-center gap-2 py-4 text-[15px] font-bold transition-colors hover:bg-[var(--cz-surface-strong)]",
                    i === 0 ? "border-r border-[var(--cz-border)]" : null,
                    on
                      ? "bg-[var(--cz-accent-soft)] text-[var(--cz-accent)]"
                      : "text-[var(--cz-text-primary)]",
                  )}
                >
                  <Icon className="h-[18px] w-[18px]" aria-hidden />
                  {label}
                </button>
              );
            })}
          </div>
        </div>

        <nav
          aria-label="Safety and legal"
          className="mt-4 divide-y divide-[var(--cz-border)] overflow-hidden rounded-[16px] border border-[var(--cz-border)]"
        >
          <button
            type="button"
            onClick={() => setShowBlocked((v) => !v)}
            aria-expanded={showBlocked}
            className={rowBase}
          >
            <span className={iconWrap}>
              <Shield className="h-4 w-4" aria-hidden />
            </span>
            <span className="min-w-0 flex-1 text-[15px] font-bold leading-[20px]">
              Blocked
            </span>
            {loadingBlocked ? (
              <Loader2
                className="h-4 w-4 animate-spin text-[var(--cz-text-secondary)]"
                aria-hidden
              />
            ) : blocked.length > 0 ? (
              <span className="grid min-w-[22px] place-items-center rounded-full bg-[var(--cz-accent)] px-1.5 text-[13px] font-bold leading-[22px] text-[var(--cz-text-inverse)]">
                {blocked.length}
              </span>
            ) : (
              <span className="text-[15px] text-[var(--cz-text-secondary)]">
                None
              </span>
            )}
            <ChevronRight
              className={cn(
                chevron,
                "transition-transform",
                showBlocked && "rotate-90",
              )}
              aria-hidden
            />
          </button>

          {showBlocked ? (
            <div className="bg-[var(--cz-surface-strong)]/50 px-4 py-2">
              {loadingBlocked ? (
                <p className="flex items-center gap-2 py-3 text-[15px] text-[var(--cz-text-secondary)]">
                  <Loader2 className="h-4 w-4 animate-spin" aria-hidden />{" "}
                  Loading…
                </p>
              ) : blocked.length === 0 ? (
                <p className="py-3 text-[15px] text-[var(--cz-text-secondary)]">
                  No blocked accounts.
                </p>
              ) : (
                <ul className="divide-y divide-[var(--cz-border)]">
                  {blocked.map((u) => (
                    <li key={u._id} className="flex items-center gap-3 py-2.5">
                      <span className="grid h-9 w-9 shrink-0 place-items-center overflow-hidden rounded-full bg-[var(--cz-border-strong)] text-[12px] font-bold text-[var(--cz-text-primary)]">
                        {u.avatarUrl ? (
                          <CzImage
                            src={u.avatarUrl}
                            alt=""
                            className="h-full w-full rounded-full"
                            imgClassName="h-full w-full"
                          />
                        ) : (
                          (u.fullName || u.username || "U")
                            .slice(0, 1)
                            .toUpperCase()
                        )}
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-[15px] font-bold leading-[20px]">
                          {u.fullName || u.username}
                        </span>
                        <span className="block truncate text-[15px] leading-[20px] text-[var(--cz-text-secondary)]">
                          @{u.username}
                        </span>
                      </span>
                      <button
                        type="button"
                        onClick={() => onUnblock(u._id)}
                        disabled={unblocking === u._id}
                        className="inline-flex h-[32px] shrink-0 items-center justify-center rounded-full border border-[var(--cz-border-strong)] px-4 text-[14px] font-bold text-[var(--cz-text-primary)] transition-colors hover:bg-[var(--cz-surface-strong)] disabled:opacity-50"
                      >
                        {unblocking === u._id ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
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

          {[
            { href: "/privacy", Icon: Lock, title: "Privacy policy" },
            { href: "/terms", Icon: FileText, title: "Terms of service" },
          ].map(({ href, Icon, title }) => (
            <Link key={href} href={href} className={rowBase}>
              <span className={iconWrap}>
                <Icon className="h-4 w-4" aria-hidden />
              </span>
              <span className="min-w-0 flex-1 text-[15px] font-bold leading-[20px]">
                {title}
              </span>
              <ChevronRight className={chevron} aria-hidden />
            </Link>
          ))}
        </nav>

        <button
          type="button"
          onClick={onLogout}
          disabled={loggingOut}
          className="mt-4 flex min-h-[52px] w-full cursor-pointer items-center justify-center gap-2 rounded-full px-4 py-3 text-[15px] font-bold text-[var(--cz-error)] transition-colors hover:bg-[color-mix(in_srgb,var(--cz-error)_10%,transparent)] disabled:opacity-50"
        >
          {loggingOut ? (
            <Loader2 className="h-[18px] w-[18px] animate-spin" aria-hidden />
          ) : (
            <LogOut className="h-[18px] w-[18px]" aria-hidden />
          )}
          {loggingOut ? "Logging out…" : "Log out"}
        </button>

        <p className="mt-4 text-center text-[13px] text-[var(--cz-text-secondary)]">
          CampusZen · {new Date().getFullYear()}
        </p>
      </div>
    </div>
  );
}
