"use client";

import { useQueryClient } from "@tanstack/react-query";
import {
  BadgeCheck,
  BarChart3,
  Bookmark,
  ChevronRight,
  Loader2,
  Moon,
  Shield,
  Sun,
} from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { AccountData } from "@/components/app/AccountData";
import { AccountDetails } from "@/components/app/AccountDetails";
import { ContentSettings } from "@/components/app/ContentSettings";
import { CzImage } from "@/components/app/CzImage";
import { DevicesSettings } from "@/components/app/DevicesSettings";
import { FollowRequests } from "@/components/app/FollowRequests";
import { PageHeader } from "@/components/app/PageHeader";
import { PrivacySettings } from "@/components/app/PrivacySettings";
import { PushSettings } from "@/components/app/PushSettings";
import { SafetyReports } from "@/components/app/SafetyReports";
import { UserBadge } from "@/components/ui/verified-badge";
import { api } from "@/lib/api";
import { useBlocks, useMe } from "@/lib/hooks/queries";
import { applyTheme, persistTheme, readTheme } from "@/lib/theme";
import { cn } from "@/lib/utils";
import { SECTIONS } from "../sections";

const card = "overflow-hidden rounded-[16px] border border-[var(--cz-border)]";
const chevron = "h-[18px] w-[18px] shrink-0 text-[var(--cz-text-secondary)]";
const rowBase =
  "flex w-full cursor-pointer items-center gap-3 px-4 py-3 text-left transition-colors hover:bg-[var(--cz-surface-strong)]";
const iconWrap =
  "grid h-9 w-9 shrink-0 place-items-center rounded-full bg-[var(--cz-surface-strong)] text-[var(--cz-text-primary)]";

/** Quick links that the shell nav only exposes on the other viewport. */
const QUICK_LINKS = [
  {
    href: "/app/bookmarks",
    Icon: Bookmark,
    title: "Bookmarks",
    className: "md:hidden",
  },
  {
    href: "/app/analytics",
    Icon: BarChart3,
    title: "Analytics",
    className: "md:hidden",
  },
];

const LEGAL = [
  { href: "/privacy", title: "Privacy policy" },
  { href: "/terms", title: "Terms of service" },
];

/**
 * One settings sub-page. The shared frame (header, back arrow, the
 * suspended-session gate) lives in MenuSection; each id below owns only its
 * own controls, so a section never renders a title its page header already
 * shows.
 */
export function MenuSection({ id }) {
  // The route only ever resolves to a registered id (see page.jsx), so this
  // lookup is a formality — the title still degrades instead of throwing.
  const title = SECTIONS.find((s) => s.id === id)?.title || "Settings";
  const router = useRouter();
  const { data, isPending } = useMe();
  const user = data?.data?.user || null;
  // Suspended sessions may only read their own record — /menu redirects
  // them to Account instead of offering controls the API would reject.
  const suspended = Boolean(user?.isSuspended);
  const allowSuspended = id === "account";

  useEffect(() => {
    if (isPending || !suspended || allowSuspended) return;
    router.replace("/app/menu");
  }, [isPending, suspended, allowSuspended, router]);

  if (isPending) {
    return (
      <div>
        <PageHeader title={title} href="/app/menu" />
        <div className="space-y-3 px-4 py-4" aria-hidden="true">
          <span className="t-shimmer block h-6 w-32 rounded-full" />
          <span className="t-shimmer block h-40 w-full rounded-[16px]" />
        </div>
      </div>
    );
  }

  if (suspended && !allowSuspended) return null;

  return (
    <div>
      <PageHeader title={title} href="/app/menu" />
      <div className="flex flex-col gap-4 px-4 py-4">
        <SectionBody id={id} user={user} />
      </div>
    </div>
  );
}

function SectionBody({ id, user }) {
  switch (id) {
    case "account":
      return <AccountSection user={user} />;
    case "appearance":
      return <AppearanceSection />;
    case "notifications":
      return <PushSettings />;
    case "content":
      return <ContentSettings user={user} showTitle={false} />;
    case "privacy":
      return <PrivacySettings user={user} showTitle={false} />;
    case "people":
      return <PeopleSection />;
    case "safety":
      // The card header says "My reports", the page says "Safety" — they
      // carry different words, so the header stays.
      return <SafetyReports />;
    case "security":
      return <DevicesSettings showTitle={false} defaultOpen />;
    case "data":
      return <AccountData user={user} showTitle={false} />;
    default:
      return null;
  }
}

function AccountSection({ user }) {
  const initial = (
    user?.fullName?.[0] ||
    user?.username?.[0] ||
    "U"
  ).toUpperCase();

  const profileRow = (
    <Link
      href="/app/profile"
      aria-label="View your profile"
      className="flex items-center gap-3 p-4 transition-colors hover:bg-[var(--cz-surface-strong)]"
    >
      <span className="grid h-11 w-11 shrink-0 place-items-center overflow-hidden rounded-full bg-[var(--cz-border-strong)] text-[16px] font-bold text-[var(--cz-text-primary)]">
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
        <span className="flex items-center gap-1">
          <span className="truncate text-[16px] leading-[21px] font-extrabold">
            {user?.fullName || "CampusZen Student"}
          </span>
          <UserBadge user={user} size="md" />
        </span>
        <span className="mt-0.5 block truncate text-[14px] leading-[19px] text-[var(--cz-text-secondary)]">
          @{user?.username || "username"}
        </span>
      </span>
      <ChevronRight className={chevron} aria-hidden />
    </Link>
  );

  const verifiedRow = (
    <Link
      href="/app/verified"
      aria-label="Verification status"
      className={rowBase}
    >
      <span className={iconWrap}>
        <BadgeCheck className="h-[18px] w-[18px]" aria-hidden />
      </span>
      <span className="min-w-0 flex-1">
        <span className="block text-[15px] font-bold leading-[20px]">
          Verified badge
        </span>
        <span className="block truncate text-[13px] text-[var(--cz-text-secondary)]">
          {user?.isVerified
            ? "Active on your profile"
            : "50+ posts or 100+ followers — preview your tick"}
        </span>
      </span>
      <span
        className={cn(
          "shrink-0 text-[14px] font-bold",
          user?.isVerified
            ? "text-[var(--cz-text-secondary)]"
            : "text-[var(--cz-accent)]",
        )}
      >
        {user?.isVerified ? "On" : "Get"}
      </span>
      <ChevronRight className={chevron} aria-hidden />
    </Link>
  );

  return (
    <>
      <div className={`${card} divide-y divide-[var(--cz-border)]`}>
        {profileRow}
        {verifiedRow}
      </div>

      <AccountDetails user={user} showTitle={false} />

      {/* Bookmarks and Analytics live in the desktop rail, so the mobile
          tab bar gets them here instead of adding tabs. */}
      <nav
        aria-label="Your pages"
        className={`${card} divide-y divide-[var(--cz-border)]`}
      >
        {QUICK_LINKS.map(({ href, Icon, title, className }) => (
          <Link key={href} href={href} className={cn(rowBase, className)}>
            <span className={iconWrap}>
              <Icon className="h-[18px] w-[18px]" aria-hidden />
            </span>
            <span className="min-w-0 flex-1 text-[15px] font-bold leading-[20px]">
              {title}
            </span>
            <ChevronRight className={chevron} aria-hidden />
          </Link>
        ))}
      </nav>

      <nav
        aria-label="Legal"
        className={`${card} divide-y divide-[var(--cz-border)]`}
      >
        {LEGAL.map(({ href, title }) => (
          <Link key={href} href={href} className={rowBase}>
            <span className="min-w-0 flex-1 text-[15px] font-bold leading-[20px]">
              {title}
            </span>
            <ChevronRight className={chevron} aria-hidden />
          </Link>
        ))}
      </nav>
    </>
  );
}

function AppearanceSection() {
  const [theme, setTheme] = useState("light");

  useEffect(() => {
    setTheme(readTheme());
  }, []);

  const setThemeAndApply = (next) => {
    setTheme(next);
    applyTheme(next);
    persistTheme(next);
  };

  return (
    <div className={`${card} grid grid-cols-2`}>
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
              "flex cursor-pointer items-center justify-center gap-2 py-3.5 text-[15px] font-bold transition-colors hover:bg-[var(--cz-surface-strong)]",
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
  );
}

function PeopleSection() {
  const queryClient = useQueryClient();
  const { data: blocksData, isFetching } = useBlocks(true);
  const blocked = blocksData?.data?.users || [];
  const loadingBlocked = isFetching && blocked.length === 0;
  const [unblocking, setUnblocking] = useState(null);

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

  return (
    <>
      <FollowRequests />

      <section aria-label="Blocked accounts" className={card}>
        <p className="flex items-center gap-2 border-b border-[var(--cz-border)] px-4 py-3 text-[15px] font-bold leading-[20px]">
          <Shield className="h-4 w-4" aria-hidden /> Blocked
          {blocked.length > 0 ? (
            <span className="grid min-w-[22px] place-items-center rounded-full bg-[var(--cz-accent)] px-1.5 text-[13px] font-bold leading-[22px] text-white">
              {blocked.length}
            </span>
          ) : null}
        </p>
        <div className="bg-[var(--cz-surface-strong)]/50 px-4 py-2">
          {loadingBlocked ? (
            <p className="flex items-center gap-2 py-3 text-[15px] text-[var(--cz-text-secondary)]">
              <Loader2 className="h-4 w-4 animate-spin" aria-hidden /> Loading…
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
                    <span className="block truncate text-[13px] leading-[18px] text-[var(--cz-text-secondary)]">
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
      </section>
    </>
  );
}
