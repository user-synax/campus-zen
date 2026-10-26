"use client";

import {
  BadgeCheck,
  ExternalLink,
  Flag,
  LayoutDashboard,
  LogOut,
  Megaphone,
  Scale,
  Users,
} from "lucide-react";
import Link from "next/link";
import { ThemeToggle } from "@/components/app/ThemeToggle";
import { BrandMark } from "@/components/BrandLogo";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { Spinner } from "./ui";

export const ADMIN_SECTIONS = [
  { id: "overview", label: "Overview", icon: LayoutDashboard },
  { id: "users", label: "Users", icon: Users },
  { id: "broadcast", label: "Broadcast", icon: Megaphone },
  { id: "reports", label: "Reports", icon: Flag, badge: "reports" },
  { id: "appeals", label: "Appeals", icon: Scale, badge: "appeals" },
  {
    id: "verification",
    label: "Verification",
    icon: BadgeCheck,
    badge: "verifications",
  },
];

function badgeFor(item, stats) {
  if (item.badge === "reports") return stats?.reports?.open || 0;
  if (item.badge === "appeals") return stats?.appeals?.open || 0;
  if (item.badge === "verifications") return stats?.verifications?.open || 0;
  return 0;
}

function NavItem({ item, active, count, onClick, compact = false }) {
  const Icon = item.icon;
  return (
    <button
      type="button"
      onClick={() => onClick(item.id)}
      aria-current={active ? "page" : undefined}
      className={cn(
        "group flex w-full items-center gap-3 rounded-xl px-3 text-left transition-colors",
        compact ? "h-[38px] shrink-0" : "h-[42px]",
        active
          ? "bg-[var(--cz-surface-strong)] font-bold text-[var(--cz-text-primary)]"
          : "font-medium text-[var(--cz-text-secondary)] hover:bg-[color-mix(in_srgb,var(--cz-surface-strong)_60%,transparent)] hover:text-[var(--cz-text-primary)]",
      )}
    >
      <span className="relative grid shrink-0 place-items-center">
        <Icon
          className={cn(
            "h-[19px] w-[19px]",
            active ? "text-[var(--cz-text-primary)]" : "text-current",
          )}
          strokeWidth={active ? 2.2 : 1.9}
          aria-hidden
        />
        {count > 0 ? (
          <span className="absolute -top-1.5 -right-2 grid h-[15px] min-w-[15px] place-items-center rounded-full bg-[var(--cz-accent)] px-1 text-[10px] leading-none font-bold text-[var(--cz-text-inverse)] ring-2 ring-[var(--cz-bg)]">
            {count > 99 ? "99+" : count}
          </span>
        ) : null}
      </span>
      <span
        className={cn("truncate text-[14px]", compact && "whitespace-nowrap")}
      >
        {item.label}
      </span>
    </button>
  );
}

export function AdminRail({
  section,
  onNavigate,
  stats,
  adminEmail,
  onLogout,
  loggingOut,
}) {
  return (
    <aside className="fixed inset-y-0 left-0 z-30 hidden w-[252px] flex-col border-r border-[var(--cz-border)] bg-[var(--cz-bg)] px-3 py-4 lg:flex">
      <div className="flex items-center gap-2.5 px-2">
        <BrandMark size={34} priority />
        <span className="min-w-0">
          <span className="block truncate text-[16px] leading-[19px] font-extrabold tracking-[-0.02em]">
            CampusZen
          </span>
          <span className="block text-[11px] leading-[15px] font-bold tracking-[0.08em] text-[var(--cz-text-secondary)] uppercase">
            Admin console
          </span>
        </span>
      </div>

      <nav
        aria-label="Admin sections"
        className="mt-6 flex min-h-0 flex-1 flex-col"
      >
        <p className="px-3 pb-2 text-[11px] font-bold tracking-[0.08em] text-[var(--cz-text-tertiary)] uppercase">
          Workspace
        </p>
        <ul className="flex flex-col gap-0.5">
          {ADMIN_SECTIONS.map((item) => (
            <li key={item.id}>
              <NavItem
                item={item}
                active={section === item.id}
                count={badgeFor(item, stats)}
                onClick={onNavigate}
              />
            </li>
          ))}
        </ul>

        <div className="mt-auto flex flex-col gap-3 pt-6">
          <div className="rounded-2xl border border-[var(--cz-border)] bg-[var(--cz-surface)] p-3">
            <p className="text-[11px] font-bold tracking-[0.08em] text-[var(--cz-text-tertiary)] uppercase">
              Moderation load
            </p>
            <div className="mt-2 flex flex-col gap-1.5 text-[12px]">
              <div className="flex items-center justify-between gap-2">
                <span className="text-[var(--cz-text-secondary)]">
                  Open reports
                </span>
                <span className="font-bold tabular-nums">
                  {stats?.reports?.open ?? "—"}
                </span>
              </div>
              <div className="flex items-center justify-between gap-2">
                <span className="text-[var(--cz-text-secondary)]">Appeals</span>
                <span className="font-bold tabular-nums">
                  {stats?.appeals?.open ?? "—"}
                </span>
              </div>
              <div className="flex items-center justify-between gap-2">
                <span className="text-[var(--cz-text-secondary)]">
                  Verifications
                </span>
                <span className="font-bold tabular-nums">
                  {stats?.verifications?.open ?? "—"}
                </span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-1 px-1">
            <ThemeToggle className="h-[34px] w-[34px]" side="top" />
            <Link
              href="/"
              className="inline-flex h-[34px] flex-1 items-center gap-1.5 rounded-full px-2.5 text-[12px] font-bold text-[var(--cz-text-secondary)] transition-colors hover:bg-[var(--cz-surface-strong)] hover:text-[var(--cz-text-primary)]"
            >
              <ExternalLink className="h-[14px] w-[14px]" aria-hidden />
              View site
            </Link>
          </div>

          <div className="border-t border-[var(--cz-border)] pt-3">
            {adminEmail ? (
              <p className="truncate px-2 pb-2 text-[12px] text-[var(--cz-text-secondary)]">
                Signed in as{" "}
                <span className="font-bold text-[var(--cz-text-primary)]">
                  {adminEmail}
                </span>
              </p>
            ) : null}
            <Button
              variant="secondary"
              size="sm"
              onClick={onLogout}
              disabled={loggingOut}
              className="w-full"
            >
              {loggingOut ? (
                <Spinner />
              ) : (
                <LogOut className="h-[15px] w-[15px]" aria-hidden />
              )}
              {loggingOut ? "Signing out…" : "Sign out"}
            </Button>
          </div>
        </div>
      </nav>
    </aside>
  );
}

export function AdminMobileNav({
  section,
  onNavigate,
  stats,
  adminEmail,
  onLogout,
  loggingOut,
}) {
  return (
    <div className="sticky top-0 z-30 border-b border-[var(--cz-border)] bg-[var(--cz-bg)]/95 backdrop-blur lg:hidden">
      <div className="flex items-center gap-2.5 px-4 py-3">
        <BrandMark size={30} priority />
        <div className="min-w-0 flex-1">
          <p className="truncate text-[14px] leading-[18px] font-extrabold">
            CampusZen Admin
          </p>
          <p className="truncate text-[11px] leading-[14px] text-[var(--cz-text-secondary)]">
            {adminEmail || "Moderation console"}
          </p>
        </div>
        <ThemeToggle className="h-[34px] w-[34px]" side="bottom" />
        <Button
          variant="secondary"
          size="sm"
          onClick={onLogout}
          disabled={loggingOut}
        >
          {loggingOut ? (
            <Spinner />
          ) : (
            <LogOut className="h-[14px] w-[14px]" aria-hidden />
          )}
          Sign out
        </Button>
      </div>
      <nav
        aria-label="Admin sections"
        className="flex gap-1 overflow-x-auto px-3 pb-2 scrollbar-none"
      >
        {ADMIN_SECTIONS.map((item) => {
          const active = section === item.id;
          const Icon = item.icon;
          return (
            <button
              key={item.id}
              type="button"
              onClick={() => onNavigate(item.id)}
              aria-current={active ? "page" : undefined}
              className={cn(
                "inline-flex h-[34px] shrink-0 items-center gap-1.5 rounded-full px-3 text-[13px] font-bold whitespace-nowrap transition-colors",
                active
                  ? "bg-[var(--cz-text-primary)] text-[var(--cz-bg)]"
                  : "text-[var(--cz-text-secondary)] hover:bg-[var(--cz-surface-strong)] hover:text-[var(--cz-text-primary)]",
              )}
            >
              <Icon className="h-[15px] w-[15px]" aria-hidden />
              {item.label}
              {badgeFor(item, stats) > 0 ? (
                <span
                  className={cn(
                    "grid h-[16px] min-w-[16px] place-items-center rounded-full px-1 text-[10px] leading-none font-bold",
                    active
                      ? "bg-[var(--cz-bg)] text-[var(--cz-text-primary)]"
                      : "bg-[var(--cz-accent)] text-[var(--cz-text-inverse)]",
                  )}
                >
                  {badgeFor(item, stats)}
                </span>
              ) : null}
            </button>
          );
        })}
      </nav>
    </div>
  );
}
