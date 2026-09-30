"use client";

import { Loader2, School, Search } from "lucide-react";
import Link from "next/link";
import { useEffect, useState } from "react";
import { EmptyState } from "@/components/app/EmptyState";
import { api } from "@/lib/api";
import { useRequireSession } from "@/lib/hooks/useRequireSession";

export default function CollegesDirectoryPage() {
  const [colleges, setColleges] = useState([]);
  const [q, setQ] = useState("");
  const [debouncedQ, setDebouncedQ] = useState("");
  const [loading, setLoading] = useState(true);

  const { user, checking } = useRequireSession();

  useEffect(() => {
    const t = setTimeout(() => setDebouncedQ(q), 300);
    return () => clearTimeout(t);
  }, [q]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      try {
        const res = await api.listColleges({ q: debouncedQ || undefined, page: 1, limit: 30 });
        if (!cancelled) setColleges(res.data?.colleges || []);
      } catch {
        if (!cancelled) setColleges([]);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [debouncedQ]);

  // Signed out: useRequireSession is already redirecting to /login.
  if (checking || !user) {
    return (
      <div className="flex items-center gap-2 px-4 py-10 text-[15px] text-[var(--cz-text-secondary)]">
        <Loader2 className="h-[18px] w-[18px] animate-spin" aria-hidden />
        Redirecting to sign in…
      </div>
    );
  }

  return (
    <div>
      {/* Just a label — same as any other tab. No sticky header. */}
      <div className="px-4 pt-4 pb-3">
        <h1 className="text-[20px] leading-6 font-extrabold text-[var(--cz-text-primary)]">
          Colleges
        </h1>
        <p className="text-[13px] leading-[16px] text-[var(--cz-text-secondary)]">
          {colleges.length} on CampusZen
        </p>
      </div>

      <div className="border-b border-[var(--cz-border)] px-4 pb-3">
        <div className="flex h-[44px] items-center gap-3 rounded-full bg-[var(--cz-surface-strong)] px-4 transition-colors focus-within:ring-1 focus-within:ring-[var(--cz-accent)]">
          <Search
            className="h-[18px] w-[18px] shrink-0 text-[var(--cz-text-secondary)]"
            aria-hidden
          />
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search colleges"
            aria-label="Search colleges"
            className="h-full min-w-0 flex-1 bg-transparent text-[15px] text-[var(--cz-text-primary)] outline-none placeholder:text-[var(--cz-text-secondary)]"
          />
          {q ? (
            <button
              type="button"
              onClick={() => setQ("")}
              className="-mr-1 shrink-0 text-[15px] font-bold text-[var(--cz-accent)] hover:underline"
            >
              Clear
            </button>
          ) : null}
        </div>
      </div>

      {loading ? (
        <div className="grid place-items-center py-12">
          <Loader2
            className="h-5 w-5 animate-spin text-[var(--cz-text-secondary)]"
            aria-label="Loading colleges"
          />
        </div>
      ) : colleges.length === 0 ? (
        <EmptyState
          icon={School}
          title={
            debouncedQ ? `No colleges for "${debouncedQ}"` : "No colleges yet"
          }
          description="Colleges appear automatically once students add them to their profile."
        />
      ) : (
        <div>
          {colleges.map((c) => (
            <Link
              key={c._id || c.slug}
              href={`/c/${encodeURIComponent(c.slug)}`}
              className="cz-row flex items-center gap-3 px-4 py-3 transition-colors hover:bg-[var(--cz-surface-strong)]"
            >
              <span className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-[var(--cz-surface-strong)] text-[15px] font-bold text-[var(--cz-text-primary)]">
                {(c.name || c.slug || "C").trim().slice(0, 1).toUpperCase()}
              </span>
              <span className="min-w-0 flex-1">
                <span className="block truncate text-[15px] font-bold leading-[20px] text-[var(--cz-text-primary)]">
                  {c.name}
                </span>
                <span className="block truncate text-[15px] leading-[20px] text-[var(--cz-text-secondary)]">
                  {c.memberCount ?? 0} student{c.memberCount === 1 ? "" : "s"}
                </span>
              </span>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
