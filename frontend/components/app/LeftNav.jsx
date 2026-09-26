"use client";

import { Bell, Home, Plus, Search, User } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { AnimatedNumber } from "@/components/app/AnimatedNumber";
import { api } from "@/lib/api";
import { cn } from "@/lib/utils";

// Single instance — icon rail on md, full labels on lg via CSS only.
// Active style matches BottomNav: quiet tint, no solid fill.
const items = [
  { href: "/app", label: "Home", icon: Home, exact: true },
  { href: "/app/search", label: "Search", icon: Search },
  { href: "/app/notifications", label: "Notifications", icon: Bell },
  { href: "/app/profile", label: "Profile", icon: User },
];

const createItem = { href: "/app/create", label: "Create Post", icon: Plus };

const linkBase =
  "flex items-center gap-3 rounded-[12px] h-10 text-[14px] font-medium tracking-[-0.01em] transition-colors w-11 justify-center px-0 lg:w-full lg:justify-start lg:px-3";

export function LeftNav() {
  const pathname = usePathname();
  const [unread, setUnread] = useState(0);

  useEffect(() => {
    let cancelled = false;
    const fetchCount = async () => {
      try {
        const r = await api.getUnreadCount();
        if (!cancelled) setUnread(r.data?.count ?? 0);
      } catch {}
    };
    fetchCount();
    const id = setInterval(fetchCount, 30000);
    const onFocus = () => fetchCount();
    window.addEventListener("focus", onFocus);
    window.addEventListener("cz:notif-read", fetchCount);
    return () => {
      cancelled = true;
      clearInterval(id);
      window.removeEventListener("focus", onFocus);
      window.removeEventListener("cz:notif-read", fetchCount);
    };
  }, []);

  const isActive = (it) =>
    it.exact ? pathname === it.href : pathname.startsWith(it.href);
  const idle =
    "text-[var(--cz-text-secondary)] hover:text-[var(--cz-text-primary)] hover:bg-[rgba(255,206,173,0.05)]";
  const active = "bg-[rgba(255,206,173,0.08)] text-[var(--cz-text-primary)]";

  return (
    <nav aria-label="Primary" className="flex flex-col gap-1">
      {items.slice(0, 2).map((it) => {
        const on = isActive(it);
        return (
          <Link
            key={it.href}
            href={it.href}
            aria-label={it.label}
            aria-current={on ? "page" : undefined}
            className={cn(linkBase, on ? active : idle)}
          >
            <it.icon className="h-[18px] w-[18px] shrink-0" aria-hidden />
            <span className="hidden lg:inline">{it.label}</span>
          </Link>
        );
      })}

      {/* Create — the single primary action */}
      <Link
        href={createItem.href}
        aria-label={createItem.label}
        className="flex items-center justify-center lg:justify-center gap-2 rounded-[12px] h-10 text-[14px] font-medium tracking-[-0.01em] transition-colors bg-[var(--cz-text-primary)] text-[var(--cz-text-inverse)] hover:bg-[#ffd9c0] w-11 px-0 lg:w-full lg:px-3"
      >
        <createItem.icon className="h-[18px] w-[18px] shrink-0" aria-hidden />
        <span className="hidden lg:inline">{createItem.label}</span>
      </Link>

      {items.slice(2).map((it) => {
        const on = isActive(it);
        const isNotif = it.href === "/app/notifications";
        return (
          <Link
            key={it.href}
            href={it.href}
            aria-label={it.label}
            aria-current={on ? "page" : undefined}
            className={cn(linkBase, on ? active : idle)}
          >
            <span className="relative grid place-items-center shrink-0">
              <it.icon className="h-[18px] w-[18px]" aria-hidden />
              {isNotif && unread > 0 ? (
                <span className="absolute -top-1 -right-1 grid place-items-center min-w-[16px] h-[16px] rounded-full bg-[var(--cz-error)] px-1 text-[10px] font-bold leading-none text-white lg:hidden">
                  <AnimatedNumber
                    value={unread > 99 ? "99+" : unread}
                    className="text-[10px]"
                  />
                </span>
              ) : null}
            </span>
            <span className="hidden lg:inline">{it.label}</span>
            {isNotif && unread > 0 ? (
              <span className="ml-auto hidden lg:inline-flex min-w-[20px] items-center justify-center rounded-full bg-[var(--cz-error)] px-1.5 text-[11px] font-bold leading-[20px] text-white">
                <AnimatedNumber value={unread > 99 ? "99+" : unread} />
              </span>
            ) : null}
          </Link>
        );
      })}
    </nav>
  );
}

export function LeftBrand() {
  return (
    <Link
      href="/app"
      aria-label="CampusZen home"
      className="inline-flex items-center gap-2.5 justify-center lg:justify-start"
    >
      <span className="grid h-8 w-8 shrink-0 place-items-center rounded-[10px] bg-[var(--cz-text-primary)] text-[13px] font-bold tracking-[-0.04em] text-[var(--cz-text-inverse)]">
        CZ
      </span>
      <span className="hidden text-[14px] font-semibold leading-none tracking-[-0.03em] text-[var(--cz-text-primary)] lg:block">
        campuszen
      </span>
    </Link>
  );
}

export function LeftUserCard({ user }) {
  if (!user) return null;
  const initials = (user.fullName || user.username || "U")
    .trim()
    .slice(0, 1)
    .toUpperCase();
  return (
    <Link
      href="/app/profile"
      className="flex items-center justify-center gap-2.5 rounded-[12px] px-1 py-1.5 transition-colors hover:bg-[rgba(255,206,173,0.05)] lg:justify-start lg:px-2"
    >
      <span className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-[var(--cz-muted)] text-[12px] font-semibold text-white">
        {initials}
      </span>
      <span className="hidden min-w-0 flex-1 lg:block">
        <span className="block truncate text-[13px] font-medium leading-tight text-[var(--cz-text-primary)]">
          {user.fullName || user.username}
        </span>
        <span className="block truncate text-[12px] leading-tight text-[var(--cz-text-secondary)]">
          @{user.username}
        </span>
      </span>
    </Link>
  );
}
