"use client";

import { ArrowUpRight, Scale } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { api } from "@/lib/api";
import { cn } from "@/lib/utils";
import {
  AdminAvatar,
  Chip,
  EmptyRows,
  ErrorBanner,
  formatNumber,
  inputClass,
  LoadingRows,
  Panel,
  SectionIntro,
  Spinner,
  timeAgo,
} from "./ui";

const APPEAL_TABS = [
  { id: "open", label: "Open" },
  { id: "upheld", label: "Upheld" },
  { id: "rejected", label: "Rejected" },
  { id: "all", label: "All" },
];

const STATUS_TONE = {
  open: "warn",
  upheld: "accent",
  rejected: "neutral",
};

function errorMessage(err, fallback) {
  return err?.data?.message || err?.message || fallback;
}

export function AppealsSection({ refreshStats, onOpenUser }) {
  const [tab, setTab] = useState("open");
  const [appeals, setAppeals] = useState([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(false);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState(null);
  const [notes, setNotes] = useState({});
  const [acting, setActing] = useState({});
  const requestRef = useRef(0);

  const load = useCallback(
    async (pg = 1, append = false) => {
      const token = ++requestRef.current;
      if (append) setLoadingMore(true);
      else setLoading(true);
      setError(null);
      try {
        const res = await api.adminAppeals({
          status: tab,
          page: pg,
          limit: 20,
        });
        if (token !== requestRef.current) return;
        const data = res.data || {};
        setAppeals((prev) =>
          append ? [...prev, ...(data.appeals || [])] : data.appeals || [],
        );
        setTotal(data.total || 0);
        setPage(data.page || pg);
        setHasMore(Boolean(data.hasMore));
      } catch (err) {
        if (token === requestRef.current) {
          setError(errorMessage(err, "Could not load appeals."));
        }
      } finally {
        if (token === requestRef.current) {
          setLoading(false);
          setLoadingMore(false);
        }
      }
    },
    [tab],
  );

  useEffect(() => {
    load(1, false);
  }, [load]);

  const review = async (appeal, status) => {
    setActing((prev) => ({ ...prev, [appeal._id]: status }));
    try {
      const note = (notes[appeal._id] || "").trim();
      await api.adminReviewAppeal(
        appeal._id,
        note ? { status, reviewNote: note } : { status },
      );
      toast.success(
        status === "upheld"
          ? "Appeal upheld — report reopened"
          : "Appeal rejected",
      );
      if (tab === "open") {
        setAppeals((prev) => prev.filter((item) => item._id !== appeal._id));
        setTotal((value) => Math.max(0, value - 1));
      } else {
        setAppeals((prev) =>
          prev.map((item) =>
            item._id === appeal._id
              ? { ...item, status, reviewNote: note || item.reviewNote }
              : item,
          ),
        );
      }
      setNotes((prev) => ({ ...prev, [appeal._id]: "" }));
      refreshStats?.();
    } catch (err) {
      toast.error(errorMessage(err, "Could not review the appeal."));
    } finally {
      setActing((prev) => {
        const next = { ...prev };
        delete next[appeal._id];
        return next;
      });
    }
  };

  return (
    <div>
      <SectionIntro
        eyebrow="Fair process"
        title="Appeals"
        subtitle="Students asking for a second look. Upholding an appeal reopens the underlying report; rejecting it closes the appeal with your note."
        actions={
          <Chip tone="warn">
            <Scale className="h-3 w-3" aria-hidden />
            {formatNumber(total)} in this view
          </Chip>
        }
      />

      <div
        role="tablist"
        aria-label="Appeal status"
        className="mb-4 flex gap-1.5 overflow-x-auto scrollbar-none"
      >
        {APPEAL_TABS.map((item) => {
          const active = tab === item.id;
          return (
            <button
              key={item.id}
              type="button"
              role="tab"
              aria-selected={active}
              onClick={() => setTab(item.id)}
              className={cn(
                "h-[32px] shrink-0 rounded-full px-3.5 text-[13px] font-bold transition-colors",
                active
                  ? "bg-[var(--cz-text-primary)] text-[var(--cz-bg)]"
                  : "border border-[var(--cz-border-strong)] text-[var(--cz-text-secondary)] hover:bg-[var(--cz-surface-strong)] hover:text-[var(--cz-text-primary)]",
              )}
            >
              {item.label}
            </button>
          );
        })}
      </div>

      {error ? (
        <ErrorBanner onRetry={() => load(1, false)}>{error}</ErrorBanner>
      ) : null}

      {loading ? (
        <Panel>
          <LoadingRows label="Loading appeals…" />
        </Panel>
      ) : appeals.length ? (
        <div className="flex flex-col gap-3">
          {appeals.map((appeal) => {
            const busy = Boolean(acting[appeal._id]);
            return (
              <Panel key={appeal._id} className="overflow-hidden">
                <div className="flex flex-wrap items-center gap-1.5 border-b border-[var(--cz-border)] px-4 py-2.5">
                  <Chip className="capitalize">{appeal.type}</Chip>
                  <Chip tone={STATUS_TONE[appeal.status] || "neutral"}>
                    {appeal.status}
                  </Chip>
                  {appeal.report ? (
                    <Chip>
                      report · {appeal.report.reason} · {appeal.report.status}
                    </Chip>
                  ) : null}
                  <span className="ml-auto text-[11px] text-[var(--cz-text-secondary)]">
                    {timeAgo(appeal.createdAt)}
                  </span>
                </div>

                <div className="px-4 py-3">
                  <div className="flex items-center gap-2.5">
                    <AdminAvatar user={appeal.appellant} size={34} />
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-[13px] font-bold">
                        {appeal.appellant?.fullName ||
                          appeal.appellant?.username ||
                          "Deleted user"}
                      </p>
                      <p className="truncate text-[11px] text-[var(--cz-text-secondary)]">
                        @{appeal.appellant?.username || "unknown"}
                      </p>
                    </div>
                    {appeal.appellant?._id ? (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() =>
                          onOpenUser?.(String(appeal.appellant._id))
                        }
                        className="shrink-0 px-2"
                      >
                        Account
                        <ArrowUpRight
                          className="h-[13px] w-[13px]"
                          aria-hidden
                        />
                      </Button>
                    ) : null}
                  </div>

                  <blockquote className="mt-2.5 rounded-xl bg-[var(--cz-surface-strong)] px-3.5 py-3 text-[13px] leading-[19px] whitespace-pre-wrap">
                    {appeal.message}
                  </blockquote>

                  {appeal.reviewNote ? (
                    <p className="mt-2 text-[11px] leading-[16px] text-[var(--cz-text-secondary)]">
                      <span className="font-bold">Review note:</span>{" "}
                      {appeal.reviewNote}
                    </p>
                  ) : null}

                  <input
                    value={notes[appeal._id] || ""}
                    onChange={(e) =>
                      setNotes((prev) => ({
                        ...prev,
                        [appeal._id]: e.target.value,
                      }))
                    }
                    placeholder="Review note to the student (optional)"
                    maxLength={1000}
                    aria-label={`Review note for @${appeal.appellant?.username || "student"}`}
                    className={cn(inputClass, "mt-2.5 h-[36px]")}
                  />

                  <div className="mt-2.5 flex flex-wrap gap-1.5">
                    <Button
                      variant="secondary"
                      size="sm"
                      disabled={busy}
                      onClick={() => review(appeal, "upheld")}
                    >
                      {acting[appeal._id] === "upheld" ? <Spinner /> : null}
                      Uphold &amp; reopen
                    </Button>
                    <Button
                      variant="secondary"
                      size="sm"
                      disabled={busy}
                      onClick={() => review(appeal, "rejected")}
                    >
                      {acting[appeal._id] === "rejected" ? <Spinner /> : null}
                      Reject appeal
                    </Button>
                  </div>
                </div>
              </Panel>
            );
          })}
        </div>
      ) : (
        <Panel>
          <EmptyRows
            icon={Scale}
            title={tab === "open" ? "No open appeals" : `No ${tab} appeals`}
            description={
              tab === "open"
                ? "Nobody is waiting on a second look right now."
                : "Reviewed appeals remain available in this view."
            }
          />
        </Panel>
      )}

      {!loading && appeals.length ? (
        <div className="mt-3 flex items-center justify-between gap-3">
          <p className="text-[12px] text-[var(--cz-text-secondary)]">
            {formatNumber(total)} total
          </p>
          {hasMore ? (
            <Button
              variant="secondary"
              size="sm"
              disabled={loadingMore}
              onClick={() => load(page + 1, true)}
            >
              {loadingMore ? <Spinner /> : null}
              {loadingMore ? "Loading…" : "Show more"}
            </Button>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
