"use client";

import { ArrowLeft, Loader2, School, Search } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { EmptyState } from "@/components/app/EmptyState";
import { api } from "@/lib/api";

export default function CollegesDirectoryPage() {
  const router = useRouter();
  const [colleges, setColleges] = useState([]);
  const [q, setQ] = useState("");
  const [debouncedQ, setDebouncedQ] = useState("");
  const [loading, setLoading] = useState(true);
  const [isGuest, setIsGuest] = useState(true);

  useEffect(() => {
    api
      .me()
      .then(() => setIsGuest(false))
      .catch(() => setIsGuest(true));
  }, []);

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

  return (
    <div className="space-y-4 max-w-[640px] mx-auto my-8">
      <div className="flex items-center justify-between gap-2">
        <button
          type="button"
          onClick={() => {
            if (typeof window !== "undefined" && window.history.length > 1) router.back();
            else router.push(isGuest ? "/" : "/app");
          }}
          className="inline-flex items-center gap-1.5 rounded-full border border-[var(--cz-border)] px-3 h-[34px] text-[13px] font-medium text-[var(--cz-text-secondary)] hover:text-[var(--cz-text-primary)] hover:bg-[var(--cz-surface)] transition-colors"
        >
          <ArrowLeft className="h-3.5 w-3.5" /> Back
        </button>
        {isGuest ? null : (
          <Link
            href="/app"
            className="inline-flex items-center justify-center rounded-full bg-[var(--cz-text-primary)] text-[var(--cz-text-inverse)] px-4 h-[34px] text-[13px] font-medium hover:bg-[#ffd9c0] transition-colors"
          >
            Back to app
          </Link>
        )}
      </div>

      <div>
        <h1 className="text-[20px] font-semibold tracking-[-0.03em]">Colleges</h1>
        <p className="text-[13px] leading-[18px] text-[var(--cz-text-secondary)]">
          Auto-created from student profiles • read-only
        </p>
      </div>

      <div className="flex items-center gap-2 rounded-[12px] border border-[var(--cz-border)] bg-[var(--cz-surface)] px-3 h-[42px]">
        <Search className="h-4 w-4 text-[var(--cz-text-secondary)] shrink-0" />
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Search colleges…"
          className="flex-1 bg-transparent outline-none text-[14px] placeholder:text-[var(--cz-text-secondary)]/50 h-full"
        />
        {q ? (
          <button
            type="button"
            onClick={() => setQ("")}
            className="text-[12px] font-medium text-[var(--cz-text-secondary)] hover:text-[var(--cz-text-primary)]"
          >
            Clear
          </button>
        ) : null}
      </div>

      {loading ? (
        <div className="grid place-items-center py-8">
          <Loader2 className="h-5 w-5 animate-spin text-[var(--cz-text-secondary)]" />
        </div>
      ) : colleges.length === 0 ? (
        <EmptyState
          icon={School}
          title={debouncedQ ? `No colleges for "${debouncedQ}"` : "No colleges yet"}
          description="Colleges appear automatically once students add them to their profile."
        />
      ) : (
        <div className="grid sm:grid-cols-2 gap-3">
          {colleges.map((c) => (
            <Link
              key={c._id || c.slug}
              href={`/c/${encodeURIComponent(c.slug)}`}
              className="flex items-center gap-3 rounded-[12px] border border-[var(--cz-border)] bg-[var(--cz-surface)] p-3 hover:border-[var(--cz-border-strong)] transition-colors"
            >
              <span className="grid place-items-center h-10 w-10 rounded-[10px] bg-[var(--cz-surface-strong)] border border-[var(--cz-border)] text-[15px] font-semibold shrink-0">
                {(c.name || c.slug || "C").trim().slice(0, 1).toUpperCase()}
              </span>
              <span className="min-w-0 flex-1">
                <span className="block text-[13px] font-semibold truncate">{c.name}</span>
                <span className="block text-[11px] font-mono text-[var(--cz-text-secondary)] truncate">
                  /c/{c.slug} • {c.memberCount ?? 0} students
                </span>
              </span>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
