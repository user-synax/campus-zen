"use client";

import { ChevronRight, Loader2, LogOut, Search, X } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { PageHeader } from "@/components/app/PageHeader";
import { api } from "@/lib/api";
import { useMe } from "@/lib/hooks/queries";
import { matches, SECTIONS } from "./sections";

/**
 * Settings index — one row per sub-page, plus search.
 *
 * Everything that used to live inline on this tab (theme, privacy, blocked
 * accounts, device list, export…) now sits on its own route under
 * /app/menu/[section]; this screen only points at it, so it stays a single
 * short list.
 */
export default function MenuPage() {
  const router = useRouter();
  const { data: meData, isPending: loadingUser } = useMe();
  const user = meData?.data?.user || null;
  // A suspended account keeps a read-only session: it can read its own
  // record and sign out, nothing else. The API rejects every other write,
  // so the rest of the list stays hidden instead of half-broken.
  const readOnly = Boolean(user?.isSuspended);
  const [loggingOut, setLoggingOut] = useState(false);
  const [query, setQuery] = useState("");

  const q = query.trim().toLowerCase();
  const visible = (
    readOnly ? SECTIONS.filter((s) => s.id === "account") : SECTIONS
  ).filter((s) => matches(q, s.title, s.sub, s.keywords));

  const onLogout = async () => {
    setLoggingOut(true);
    try {
      const { ensureUnsubscribed } = await import("@/lib/push");
      await ensureUnsubscribed(api);
    } catch {}
    try {
      await api.logout();
    } catch {}
    router.replace("/login");
    router.refresh();
  };

  return (
    <div>
      <PageHeader title="Settings" />

      {/* Sticky search: filters the rows below without leaving the page. */}
      <search className="sticky top-[106px] z-10 border-b border-[var(--cz-border)] bg-[var(--cz-bg)]/95 px-4 py-2.5 backdrop-blur md:top-[53px]">
        <div className="flex h-[38px] items-center gap-2 rounded-full bg-[var(--cz-surface-strong)] px-3">
          <Search
            className="h-4 w-4 shrink-0 text-[var(--cz-text-secondary)]"
            aria-hidden
          />
          <input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search settings"
            aria-label="Search settings"
            className="h-full w-full min-w-0 bg-transparent text-[15px] text-[var(--cz-text-primary)] outline-none placeholder:text-[var(--cz-text-secondary)] [&::-webkit-search-cancel-button]:hidden"
          />
          {query ? (
            <button
              type="button"
              onClick={() => setQuery("")}
              aria-label="Clear search"
              className="grid h-6 w-6 shrink-0 place-items-center rounded-full text-[var(--cz-text-secondary)] hover:bg-[var(--cz-border)] hover:text-[var(--cz-text-primary)]"
            >
              <X className="h-[15px] w-[15px]" aria-hidden />
            </button>
          ) : null}
        </div>
      </search>

      <div className="px-4 py-4">
        {loadingUser ? (
          <div
            className="overflow-hidden rounded-[16px] border border-[var(--cz-border)]"
            aria-hidden="true"
          >
            {[0, 1, 2].map((i) => (
              <div
                key={i}
                className="flex items-center gap-3 border-b border-[var(--cz-border)] px-4 py-3 last:border-b-0"
              >
                <span className="t-shimmer h-9 w-9 shrink-0 rounded-full" />
                <span className="min-w-0 flex-1 space-y-2">
                  <span className="t-shimmer block h-3.5 w-28 rounded-full" />
                  <span className="t-shimmer block h-3 w-40 rounded-full" />
                </span>
              </div>
            ))}
          </div>
        ) : visible.length === 0 ? (
          <div className="py-16 text-center">
            <Search
              className="mx-auto h-7 w-7 text-[var(--cz-text-secondary)]"
              aria-hidden
            />
            <p className="mt-3 text-[15px] font-bold text-[var(--cz-text-primary)]">
              No settings found
            </p>
            <p className="mt-1 text-[14px] text-[var(--cz-text-secondary)]">
              Nothing matches “{query.trim()}”.
            </p>
            <button
              type="button"
              onClick={() => setQuery("")}
              className="mt-4 h-[36px] rounded-full border border-[var(--cz-border-strong)] px-4 text-[14px] font-bold text-[var(--cz-text-primary)] hover:bg-[var(--cz-surface-strong)]"
            >
              Clear search
            </button>
          </div>
        ) : (
          <nav
            aria-label="Settings sections"
            className="overflow-hidden rounded-[16px] border border-[var(--cz-border)] divide-y divide-[var(--cz-border)]"
          >
            {visible.map(({ id, title, sub, Icon }) => (
              <Link
                key={id}
                href={`/app/menu/${id}`}
                className="flex w-full items-center gap-3 px-4 py-3 text-left transition-colors hover:bg-[var(--cz-surface-strong)]"
              >
                <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-[var(--cz-surface-strong)] text-[var(--cz-text-primary)]">
                  <Icon className="h-[18px] w-[18px]" aria-hidden />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block text-[15px] font-bold leading-[20px]">
                    {title}
                  </span>
                  <span className="block truncate text-[13px] leading-[18px] text-[var(--cz-text-secondary)]">
                    {sub}
                  </span>
                </span>
                <ChevronRight
                  className="h-[18px] w-[18px] shrink-0 text-[var(--cz-text-secondary)]"
                  aria-hidden
                />
              </Link>
            ))}
          </nav>
        )}

        <button
          type="button"
          onClick={onLogout}
          disabled={loggingOut}
          className="mt-5 flex min-h-[44px] w-full cursor-pointer items-center justify-center gap-2 rounded-full px-4 py-2.5 text-[15px] font-bold text-[var(--cz-error)] transition-colors hover:bg-[color-mix(in_srgb,var(--cz-error)_10%,transparent)] disabled:opacity-50"
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
