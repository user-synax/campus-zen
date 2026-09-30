"use client";

import { Bell, Home, Menu, Plus, Search, User } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { AnimatedNumber } from "@/components/app/AnimatedNumber";
import { useUnreadCount } from "@/lib/hooks/queries";
import { cn } from "@/lib/utils";

const items = [
  { href: "/app", icon: Home, label: "Home", exact: true },
  { href: "/app/search", icon: Search, label: "Search" },
  { href: "/app/create", icon: Plus, label: "Post", isCreate: true },
  { href: "/app/notifications", icon: Bell, label: "Notifications", badge: true },
  { href: "/app/profile", icon: User, label: "Profile" },
  { href: "/app/menu", icon: Menu, label: "Menu", exact: true },
];

export function BottomNav() {
  const pathname = usePathname();
  const { data } = useUnreadCount();
  const unread = data?.data?.count ?? 0;

  return (
    <nav
      aria-label="Bottom"
      className="fixed inset-x-0 bottom-0 z-30 border-t border-[var(--cz-border)] bg-[var(--cz-bg)]/90 backdrop-blur md:hidden"
      style={{ paddingBottom: "max(0px, env(safe-area-inset-bottom))" }}
    >
      <div className="mx-auto grid h-[53px] max-w-[560px] grid-cols-6 items-center px-1">
        {items.map((it) => {
          const active = it.exact
            ? pathname === it.href
            : pathname.startsWith(it.href);
          return (
            <Link
              key={it.href}
              href={it.href}
              aria-label={it.label}
              aria-current={active ? "page" : undefined}
              className={cn(
                "relative grid h-[44px] w-full place-items-center rounded-full transition-colors duration-150",
                it.isCreate
                  ? "text-[var(--cz-accent)]"
                  : active
                    ? "text-[var(--cz-accent)]"
                    : "text-[var(--cz-text-secondary)]",
              )}
            >
              <span className="relative grid place-items-center">
                <it.icon
                  className={cn("h-[24px] w-[24px]", it.isCreate && "h-[26px] w-[26px]")}
                  strokeWidth={active || it.isCreate ? 2.2 : 1.9}
                  aria-hidden
                />
                {it.badge && unread > 0 ? (
                  <span className="pointer-events-none absolute -top-1 -right-2 grid h-[18px] min-w-[18px] place-items-center rounded-full bg-[var(--cz-accent)] px-1 text-[11px] font-bold leading-none text-[var(--cz-text-inverse)] ring-2 ring-[var(--cz-bg)]">
                    <AnimatedNumber
                      value={unread > 99 ? "99+" : unread}
                      className="text-[11px]"
                    />
                  </span>
                ) : null}
              </span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
