"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Home, Search, Plus, Bell, Menu } from "lucide-react";
import { cn } from "@/lib/utils";

// Mobile: 5 icons only, no labels — Menu stays at last
const items = [
  { href: "/app", icon: Home, label: "Home", exact: true },
  { href: "/app/search", icon: Search, label: "Search" },
  { href: "/app/create", icon: Plus, label: "Create" },
  { href: "/app/notifications", icon: Bell, label: "Notifications" },
  { href: "/app/menu", icon: Menu, label: "Menu" },
];

export function BottomNav() {
  const pathname = usePathname();
  return (
    <nav
      aria-label="Bottom"
      className="lg:hidden fixed bottom-0 inset-x-0 z-30 border-t border-[var(--cz-border)] bg-[var(--cz-bg)]/95 backdrop-blur supports-[backdrop-filter]:bg-[var(--cz-bg)]/80"
      style={{ paddingBottom: "max(0px, env(safe-area-inset-bottom))" }}
    >
      <div className="mx-auto max-w-[560px] grid grid-cols-5 gap-1 px-2 h-[56px] items-center">
        {items.map((it) => {
          const active = it.exact ? pathname === it.href : pathname.startsWith(it.href);
          const isCreate = it.href === "/app/create";
          return (
            <Link
              key={it.href}
              href={it.href}
              aria-label={it.label}
              aria-current={active ? "page" : undefined}
              className={cn(
                "grid place-items-center rounded-[12px] h-[44px] w-full transition-colors",
                isCreate
                  ? "bg-[var(--cz-text-primary)] text-[var(--cz-text-inverse)] shadow-[0_2px_10px_rgba(255,206,173,0.18)] mx-1"
                  : active
                    ? "text-[var(--cz-text-primary)] bg-[rgba(255,206,173,0.08)]"
                    : "text-[var(--cz-text-secondary)] hover:text-[var(--cz-text-primary)] active:bg-[rgba(255,206,173,0.06)]"
              )}
            >
              <it.icon className={cn("h-[20px] w-[20px]", isCreate && "h-[22px] w-[22px]")} aria-hidden />
              <span className="sr-only">{it.label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
