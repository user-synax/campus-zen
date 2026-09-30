"use client";

import { Bell, Home, Menu, Plus, Search } from "lucide-react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useCallback, useEffect } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { AnimatedNumber } from "@/components/app/AnimatedNumber";
import { api } from "@/lib/api";
import { useUnreadCount } from "@/lib/hooks/queries";
import { cn } from "@/lib/utils";

// Mobile tab bar — exactly 5 tabs:
// Home · Search · Post · Notifications · Menu
// Profile lives under Menu → View profile, so the bar stays thumb-sized.
const items = [
  { href: "/app", label: "Home", icon: Home, exact: true },
  { href: "/app/search", label: "Search", icon: Search },
  { href: "/app/create", label: "Post", icon: Plus, isCreate: true },
  { href: "/app/notifications", label: "Notifications", icon: Bell, badge: true },
  { href: "/app/menu", label: "Menu", icon: Menu, exact: true },
];

export function BottomNav() {
  const pathname = usePathname();
  const router = useRouter();
  const queryClient = useQueryClient();
  const { data } = useUnreadCount();
  const unread = data?.data?.count ?? 0;

  // Warm both the Next.js route bundle and the React Query cache before the
  // tap lands. Hover / focus covers desktop testing, touchstart covers the
  // ~80ms gap between touchstart and click on mobile.
  const prefetchTab = useCallback(
    (href) => {
      try {
        router.prefetch(href);
      } catch {}
      try {
        if (href === "/app") {
          queryClient.prefetchInfiniteQuery({
            queryKey: ["feed", "discovery"],
            queryFn: ({ pageParam = 1 }) =>
              api.getPublicFeed({ page: pageParam }),
            initialPageParam: 1,
            staleTime: 15_000,
          });
        } else if (href === "/app/notifications") {
          queryClient.prefetchInfiniteQuery({
            queryKey: ["notifications", "all", "all"],
            queryFn: ({ pageParam = 1 }) =>
              api.getNotifications({ page: pageParam, filter: "all", type: "all" }),
            initialPageParam: 1,
            staleTime: 10_000,
          });
          queryClient.prefetchQuery({
            queryKey: ["unreadCount"],
            queryFn: () => api.getUnreadCount(),
            staleTime: 15_000,
          });
        } else if (href === "/app/menu" || href === "/app/create") {
          queryClient.prefetchQuery({
            queryKey: ["me"],
            queryFn: () => api.me(),
            staleTime: 60_000,
          });
        }
      } catch {}
    },
    [router, queryClient],
  );

  // After the first paint, idle-prefetch the other tabs once so every tap
  // after the first is a cache hit. requestIdleCallback keeps this off the
  // critical path; setTimeout is the fallback.
  useEffect(() => {
    let cancelled = false;
    const idle = (fn) => {
      if (typeof window !== "undefined" && "requestIdleCallback" in window) {
        return window.requestIdleCallback(fn, { timeout: 2500 });
      }
      return setTimeout(fn, 1200);
    };
    const handle = idle(() => {
      if (cancelled) return;
      ["/app", "/app/search", "/app/notifications", "/app/menu"].forEach(
        (href) => {
          try {
            router.prefetch(href);
          } catch {}
        },
      );
      try {
        queryClient.prefetchInfiniteQuery({
          queryKey: ["feed", "discovery"],
          queryFn: ({ pageParam = 1 }) =>
            api.getPublicFeed({ page: pageParam }),
          initialPageParam: 1,
          staleTime: 15_000,
        });
        queryClient.prefetchQuery({
          queryKey: ["unreadCount"],
          queryFn: () => api.getUnreadCount(),
          staleTime: 15_000,
        });
      } catch {}
    });
    return () => {
      cancelled = true;
      try {
        if (typeof window !== "undefined" && "cancelIdleCallback" in window) {
          window.cancelIdleCallback(handle);
        } else {
          clearTimeout(handle);
        }
      } catch {}
    };
  }, [router, queryClient]);

  return (
    <nav
      aria-label="Bottom"
      className="fixed inset-x-0 bottom-0 z-30 border-t border-[var(--cz-border)] bg-[var(--cz-bg)]/90 backdrop-blur md:hidden"
      style={{ paddingBottom: "max(0px, env(safe-area-inset-bottom))" }}
    >
      <div className="mx-auto grid h-[53px] max-w-[560px] grid-cols-5 items-center px-1">
        {items.map((it) => {
          const active = it.exact
            ? pathname === it.href
            : pathname.startsWith(it.href);
          return (
            <Link
              key={it.href}
              href={it.href}
              prefetch
              aria-label={it.label}
              aria-current={active ? "page" : undefined}
              onMouseEnter={() => prefetchTab(it.href)}
              onTouchStart={() => prefetchTab(it.href)}
              onFocus={() => prefetchTab(it.href)}
              className={cn(
                "relative grid h-[44px] w-full place-items-center rounded-full transition-colors duration-150 active:scale-95",
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
