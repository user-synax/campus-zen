"use client";

import {
  Bell,
  Bookmark,
  Home,
  MoreHorizontal,
  Plus,
  School,
  Search,
  Settings,
  User,
  Users,
} from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { AnimatedNumber } from "@/components/app/AnimatedNumber";
import { CzImage } from "@/components/app/CzImage";
import { ThemeToggle } from "@/components/app/ThemeToggle";
import { BrandMark } from "@/components/BrandLogo";
import { useUnreadCount } from "@/lib/hooks/queries";
import { cn } from "@/lib/utils";

/**
 * The expanded X sidebar.
 *
 * Width comes from the shell grid, not from here: 72px of icons on md, a
 * full 275px with labels from lg up. One DOM tree — the label is just
 * hidden below lg, so there is no duplicate nav to keep in sync.
 */
const items = [
  { href: "/app", label: "Home", icon: Home, exact: true },
  { href: "/app/search", label: "Search", icon: Search },
  { href: "/u", label: "Students", icon: Users, exact: true },
  { href: "/c", label: "Colleges", icon: School, exact: true },
  { href: "/app/bookmarks", label: "Bookmarks", icon: Bookmark },
  {
    href: "/app/notifications",
    label: "Notifications",
    icon: Bell,
    badge: true,
  },
  { href: "/app/profile", label: "Profile", icon: User },
];

export function LeftNav({ user }) {
  const pathname = usePathname();
  const { data } = useUnreadCount();
  const unread = data?.data?.count ?? 0;

  const isActive = (it) =>
    it.exact ? pathname === it.href : pathname.startsWith(it.href);

  return (
    <div className="flex h-full min-h-0 flex-col px-2 lg:px-3">
      <Link
        href="/app"
        aria-label="CampusZen home"
        className="my-1 grid h-[50px] w-[50px] shrink-0 place-items-center rounded-full transition-opacity hover:opacity-70"
      >
        <BrandMark size={30} priority />
      </Link>

      <nav aria-label="Primary" className="flex min-h-0 flex-1 flex-col">
        <ul className="min-h-0 overflow-y-auto scrollbar-none">
          {items.map((it) => {
            const on = isActive(it);
            return (
              <li key={it.href}>
                <Link
                  href={it.href}
                  aria-label={it.label}
                  aria-current={on ? "page" : undefined}
                  className={cn(
                    "group flex h-[50px] cursor-pointer items-center gap-5 rounded-full px-4 transition-colors duration-150",
                    on
                      ? "font-bold text-[var(--cz-accent)]"
                      : "text-[var(--cz-text-primary)] hover:bg-[var(--cz-surface-strong)]",
                  )}
                >
                  <span className="relative grid shrink-0 place-items-center">
                    <it.icon
                      className="h-[26px] w-[26px]"
                      strokeWidth={on ? 2.2 : 1.9}
                      aria-hidden
                    />
                    {it.badge && unread > 0 ? (
                      <span className="pointer-events-none absolute -top-1 -right-2 grid h-[18px] min-w-[18px] place-items-center rounded-full bg-[var(--cz-accent)] px-1 text-[11px] leading-none font-bold text-[var(--cz-text-inverse)] ring-2 ring-[var(--cz-bg)]">
                        <AnimatedNumber
                          value={unread > 99 ? "99+" : unread}
                          className="text-[11px]"
                        />
                      </span>
                    ) : null}
                  </span>
                  <span className="hidden truncate text-[20px] leading-none lg:inline">
                    {it.label}
                  </span>
                </Link>
              </li>
            );
          })}
        </ul>

        {/* The one filled control in the rail. Achromatic so it never
            competes with X Blue for "this is a link" signalling. */}
        <Link
          href="/app/create"
          aria-label="Create post"
          className="mt-3 flex h-[52px] shrink-0 cursor-pointer items-center justify-center gap-2 rounded-full bg-[var(--cz-text-primary)] px-6 text-[17px] font-extrabold text-[var(--cz-brand-contrast)] transition-opacity hover:opacity-90"
        >
          <Plus
            className="h-[22px] w-[22px] shrink-0"
            strokeWidth={2.4}
            aria-hidden
          />
          <span className="hidden lg:inline">Post</span>
        </Link>
      </nav>

      {/* theme + account sit at the very bottom, like X */}
      <div className="flex shrink-0 flex-col gap-0.5 pb-2">
        {user ? <LeftUserCard user={user} /> : null}
      </div>
    </div>
  );
}

function Avatar({ user, size = 40 }) {
  const initials = (user.fullName || user.username || "U")
    .trim()
    .slice(0, 1)
    .toUpperCase();
  return (
    <span
      className="grid shrink-0 place-items-center overflow-hidden rounded-full bg-[var(--cz-border-strong)] font-bold text-[var(--cz-text-primary)]"
      style={{ height: size, width: size, fontSize: size * 0.36 }}
    >
      {user.avatarUrl ? (
        <CzImage
          src={user.avatarUrl}
          alt=""
          className="h-full w-full rounded-full"
          imgClassName="h-full w-full"
        />
      ) : (
        initials
      )}
    </span>
  );
}

export function LeftUserCard({ user }) {
  if (!user) return null;
  return (
    <div className="flex items-center gap-3 rounded-full px-2 py-1.5 transition-colors hover:bg-[var(--cz-surface-strong)] lg:px-3">
      <Link
        href="/app/profile"
        aria-label={`Your profile, @${user.username}`}
        className="flex min-w-0 flex-1 items-center gap-3"
      >
        <Avatar user={user} />
        <span className="hidden min-w-0 lg:block">
          <span className="block truncate text-[15px] leading-tight font-bold text-[var(--cz-text-primary)]">
            {user.fullName || user.username}
          </span>
          <span className="block truncate text-[15px] leading-tight text-[var(--cz-text-secondary)]">
            @{user.username}
          </span>
        </span>
      </Link>
      <Link
        href="/app/menu"
        aria-label="More options and settings"
        className="grid h-[34px] w-[34px] shrink-0 place-items-center rounded-full text-[var(--cz-text-primary)] transition-colors hover:bg-[var(--cz-border)]"
      >
        <Settings className="h-[18px] w-[18px]" aria-hidden />
      </Link>
    </div>
  );
}

export function LeftBrand({ className }) {
  return (
    <Link
      href="/app"
      aria-label="CampusZen home"
      className={cn(
        "grid h-[50px] w-[50px] shrink-0 place-items-center rounded-full transition-opacity hover:opacity-70",
        className,
      )}
    >
      <BrandMark size={30} priority />
    </Link>
  );
}
