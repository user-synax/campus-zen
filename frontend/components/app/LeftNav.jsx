"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Home, Search, Plus, Bell, User } from "lucide-react";
import { cn } from "@/lib/utils";

// Desktop shows all nav items with labels (space available)
// Mobile bottom keeps Menu at last (handled in BottomNav)
const desktopItems = [
  { href: "/app", label: "Home", icon: Home, exact: true },
  { href: "/app/search", label: "Search", icon: Search },
  { href: "/app/notifications", label: "Notifications", icon: Bell },
  { href: "/app/profile", label: "Profile", icon: User },
];

const createItem = { href: "/app/create", label: "Create", icon: Plus };

export function LeftNav({ user, collapsed }) {
  const pathname = usePathname();

  const isActive = (it) => (it.exact ? pathname === it.href : pathname.startsWith(it.href));

  return (
    <nav aria-label="Primary" className={cn("flex flex-col gap-1", collapsed && "items-center")}>
      {desktopItems.slice(0, 2).map((it) => {
        const active = isActive(it);
        return (
          <Link
            key={it.href}
            href={it.href}
            aria-current={active ? "page" : undefined}
            className={cn(
              "group inline-flex items-center gap-3 rounded-[12px] h-[40px] px-3 text-[14px] font-medium tracking-[-0.01em] transition-colors",
              collapsed ? "justify-center w-[44px] p-0" : "w-full",
              active
                ? "bg-[var(--cz-text-primary)] text-[var(--cz-text-inverse)] shadow-[0_2px_10px_rgba(255,206,173,0.18)]"
                : "text-[var(--cz-text-secondary)] hover:text-[var(--cz-text-primary)] hover:bg-[rgba(255,206,173,0.06)]"
            )}
          >
            <it.icon className={cn("h-[18px] w-[18px] shrink-0", active ? "opacity-100" : "opacity-80 group-hover:opacity-100")} />
            {!collapsed ? <span>{it.label}</span> : <span className="sr-only">{it.label}</span>}
          </Link>
        );
      })}

      {/* Create — highlighted as action */}
      {(() => {
        const active = isActive(createItem);
        return (
          <Link
            href={createItem.href}
            aria-current={active ? "page" : undefined}
            className={cn(
              "group inline-flex items-center gap-3 rounded-[12px] h-[40px] px-3 text-[14px] font-medium tracking-[-0.01em] transition-colors",
              collapsed ? "justify-center w-[44px] p-0" : "w-full",
              active
                ? "bg-[var(--cz-text-primary)] text-[var(--cz-text-inverse)] shadow-[0_2px_10px_rgba(255,206,173,0.18)]"
                : "text-[var(--cz-text-secondary)] hover:text-[var(--cz-text-primary)] hover:bg-[rgba(255,206,173,0.06)] border border-dashed border-[var(--cz-border)] hover:border-[var(--cz-border-strong)]"
            )}
          >
            <createItem.icon className="h-[18px] w-[18px] shrink-0" />
            {!collapsed ? <span>{createItem.label}</span> : <span className="sr-only">{createItem.label}</span>}
          </Link>
        );
      })()}

      {desktopItems.slice(2).map((it) => {
        const active = isActive(it);
        return (
          <Link
            key={it.href}
            href={it.href}
            aria-current={active ? "page" : undefined}
            className={cn(
              "group inline-flex items-center gap-3 rounded-[12px] h-[40px] px-3 text-[14px] font-medium tracking-[-0.01em] transition-colors",
              collapsed ? "justify-center w-[44px] p-0" : "w-full",
              active
                ? "bg-[var(--cz-text-primary)] text-[var(--cz-text-inverse)] shadow-[0_2px_10px_rgba(255,206,173,0.18)]"
                : "text-[var(--cz-text-secondary)] hover:text-[var(--cz-text-primary)] hover:bg-[rgba(255,206,173,0.06)]"
            )}
          >
            <it.icon className={cn("h-[18px] w-[18px] shrink-0", active ? "opacity-100" : "opacity-80 group-hover:opacity-100")} />
            {!collapsed ? <span>{it.label}</span> : <span className="sr-only">{it.label}</span>}
          </Link>
        );
      })}
    </nav>
  );
}

export function LeftBrand({ collapsed }) {
  return (
    <Link href="/app" className={cn("inline-flex items-center gap-2.5", collapsed && "justify-center")}>
      <span className="grid place-items-center h-8 w-8 rounded-[10px] bg-[var(--cz-text-primary)] text-[var(--cz-text-inverse)] font-bold text-[13px] tracking-[-0.04em] shrink-0">CZ</span>
      {!collapsed ? (
        <span className="min-w-0">
          <span className="block text-[14px] font-semibold tracking-[-0.03em] leading-none text-[var(--cz-text-primary)]">campuszen</span>
          <span className="block text-[11px] tracking-[0.06em] uppercase text-[var(--cz-text-secondary)] leading-none mt-0.5">Student Network</span>
        </span>
      ) : null}
    </Link>
  );
}

export function LeftUserCard({ user, collapsed }) {
  if (!user) return null;
  const initials = (user.fullName || user.username || "U").trim().slice(0, 1).toUpperCase();
  return (
    <Link
      href="/app/profile"
      className={cn(
        "flex items-center gap-3 rounded-[12px] border border-[var(--cz-border)] bg-[rgba(255,255,255,0.03)] p-2.5 hover:bg-[rgba(255,206,173,0.06)] hover:border-[var(--cz-border-strong)] transition-colors",
        collapsed && "justify-center p-2"
      )}
    >
      <span className="grid place-items-center h-9 w-9 rounded-full bg-[var(--cz-muted)] text-white text-[12px] font-semibold shrink-0">{initials}</span>
      {!collapsed ? (
        <span className="min-w-0 flex-1">
          <span className="block text-[13px] font-medium leading-none text-[var(--cz-text-primary)] truncate">{user.fullName || user.username}</span>
          <span className="block text-[12px] leading-none text-[var(--cz-text-secondary)] truncate">@{user.username}</span>
        </span>
      ) : null}
    </Link>
  );
}
