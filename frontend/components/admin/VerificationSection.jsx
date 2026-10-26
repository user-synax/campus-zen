"use client";

import { ArrowUpRight, BadgeCheck, Check, X } from "lucide-react";
import Link from "next/link";
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

const VERIFICATION_TABS = [
  { id: "open", label: "Open" },
  { id: "approved", label: "Approved" },
  { id: "rejected", label: "Rejected" },
  { id: "all", label: "All" },
];

const STATUS_TONE = {
  open: "warn",
  approved: "accent",
  rejected: "neutral",
};

function errorMessage(err, fallback) {
  return err?.data?.message || err?.message || fallback;
}

function Threshold({ label, value, target }) {
  const pct =
    target > 0 ? Math.min(100, Math.round((value / target) * 100)) : 0;
  const met = value >= target;
  return (
    <div className="min-w-0 flex-1">
      <div className="flex items-baseline justify-between gap-2">
        <span className="text-[11px] text-[var(--cz-text-secondary)]">
          {label}
        </span>
        <span
          className={cn(
            "text-[11px] font-bold tabular-nums",
            met ? "text-[var(--cz-success)]" : "text-[var(--cz-text-primary)]",
          )}
        >
          {formatNumber(value)}/{formatNumber(target)}
        </span>
      </div>
      <div className="mt-1 h-[4px] overflow-hidden rounded-full bg-[var(--cz-surface-strong)]">
        <span
          className={cn(
            "block h-full rounded-full",
            met ? "bg-[var(--cz-success)]" : "bg-[var(--cz-accent)]",
          )}
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}

export function VerificationSection({ refreshStats, onOpenUser }) {
  const [tab, setTab] = useState("open");
  const [requests, setRequests] = useState([]);
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
        const res = await api.adminVerifications({
          status: tab,
          page: pg,
          limit: 20,
        });
        if (token !== requestRef.current) return;
        const data = res.data || {};
        setRequests((prev) =>
          append ? [...prev, ...(data.requests || [])] : data.requests || [],
        );
        setTotal(data.total || 0);
        setPage(data.page || pg);
        setHasMore(Boolean(data.hasMore));
      } catch (err) {
        if (token === requestRef.current) {
          setError(errorMessage(err, "Could not load verification requests."));
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

  const review = async (request, status) => {
    setActing((prev) => ({ ...prev, [request._id]: status }));
    try {
      const note = (notes[request._id] || "").trim();
      await api.adminReviewVerification(
        request._id,
        note ? { status, reviewNote: note } : { status },
      );
      toast.success(
        status === "approved"
          ? "Verification approved — blue tick granted"
          : "Verification rejected",
      );
      if (tab === "open") {
        setRequests((prev) => prev.filter((item) => item._id !== request._id));
        setTotal((value) => Math.max(0, value - 1));
      } else {
        setRequests((prev) =>
          prev.map((item) =>
            item._id === request._id
              ? {
                  ...item,
                  status,
                  reviewNote: note || item.reviewNote,
                  user:
                    status === "approved" && item.user
                      ? { ...item.user, isVerified: true }
                      : item.user,
                  live:
                    status === "approved" && item.live
                      ? { ...item.live, isVerified: true }
                      : item.live,
                }
              : item,
          ),
        );
      }
      setNotes((prev) => ({ ...prev, [request._id]: "" }));
      refreshStats?.();
    } catch (err) {
      toast.error(errorMessage(err, "Could not review the request."));
    } finally {
      setActing((prev) => {
        const next = { ...prev };
        delete next[request._id];
        return next;
      });
    }
  };

  const setVerified = async (request, isVerified) => {
    const userId = request.user?._id;
    if (!userId) return;
    if (
      !window.confirm(
        isVerified
          ? `Grant a blue tick to @${request.user?.username || "this student"}?`
          : `Revoke the blue tick from @${request.user?.username || "this student"}?`,
      )
    )
      return;
    setActing((prev) => ({
      ...prev,
      [request._id]: isVerified ? "grant" : "revoke",
    }));
    try {
      await api.adminSetVerified(String(userId), isVerified);
      toast.success(isVerified ? "Blue tick granted" : "Blue tick revoked");
      setRequests((prev) =>
        prev.map((item) =>
          item._id === request._id
            ? {
                ...item,
                user: item.user ? { ...item.user, isVerified } : item.user,
                live: item.live ? { ...item.live, isVerified } : item.live,
              }
            : item,
        ),
      );
      refreshStats?.();
    } catch (err) {
      toast.error(errorMessage(err, "Could not update verification."));
    } finally {
      setActing((prev) => {
        const next = { ...prev };
        delete next[request._id];
        return next;
      });
    }
  };

  return (
    <div>
      <SectionIntro
        eyebrow="Trust"
        title="Verification"
        subtitle="Blue-tick requests from students. Approving a request grants the badge immediately; revoking it removes the badge everywhere."
        actions={
          <Chip tone="accent">
            <BadgeCheck className="h-3 w-3" aria-hidden />
            {formatNumber(total)} in this view
          </Chip>
        }
      />

      <div
        role="tablist"
        aria-label="Verification status"
        className="mb-4 flex gap-1.5 overflow-x-auto scrollbar-none"
      >
        {VERIFICATION_TABS.map((item) => {
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
          <LoadingRows label="Loading verification requests…" />
        </Panel>
      ) : requests.length ? (
        <div className="flex flex-col gap-3">
          {requests.map((request) => {
            const user = request.user || {};
            const live = request.live || {};
            const posts = live.postCount ?? user.postCount ?? 0;
            const followers = live.followersCount ?? user.followersCount ?? 0;
            const verified = live.isVerified ?? user.isVerified ?? false;
            const busy = Boolean(acting[request._id]);
            return (
              <Panel key={request._id} className="overflow-hidden">
                <div className="flex flex-wrap items-center gap-1.5 border-b border-[var(--cz-border)] px-4 py-2.5">
                  <Chip>Verification</Chip>
                  <Chip tone={STATUS_TONE[request.status] || "neutral"}>
                    {request.status}
                  </Chip>
                  {verified ? (
                    <Chip tone="accent">
                      <BadgeCheck className="h-3 w-3" aria-hidden />
                      Verified
                    </Chip>
                  ) : null}
                  <span className="ml-auto text-[11px] text-[var(--cz-text-secondary)]">
                    {timeAgo(request.createdAt)}
                  </span>
                </div>

                <div className="px-4 py-3">
                  <div className="flex items-center gap-2.5">
                    <AdminAvatar user={user} size={42} />
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-[14px] font-extrabold">
                        {user.fullName || user.username || "Deleted user"}
                      </p>
                      <p className="truncate text-[11px] text-[var(--cz-text-secondary)]">
                        {user.username ? (
                          <Link
                            href={`/u/${user.username}`}
                            target="_blank"
                            className="font-bold text-[var(--cz-accent)] hover:underline"
                          >
                            @{user.username}
                          </Link>
                        ) : (
                          "No profile"
                        )}
                        {user.college ? ` · ${user.college}` : ""}
                      </p>
                    </div>
                    {user._id ? (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => onOpenUser?.(String(user._id))}
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

                  <div className="mt-3 flex flex-col gap-2.5 rounded-xl bg-[var(--cz-surface-strong)] px-3.5 py-3 sm:flex-row sm:gap-5">
                    <Threshold label="Posts" value={posts} target={50} />
                    <Threshold
                      label="Followers"
                      value={followers}
                      target={100}
                    />
                  </div>

                  {request.message ? (
                    <p className="mt-2.5 rounded-xl border border-[var(--cz-border)] px-3.5 py-2.5 text-[13px] leading-[19px] whitespace-pre-wrap">
                      {request.message}
                    </p>
                  ) : null}

                  {request.reviewNote ? (
                    <p className="mt-2 text-[11px] leading-[16px] text-[var(--cz-text-secondary)]">
                      <span className="font-bold">Review note:</span>{" "}
                      {request.reviewNote}
                    </p>
                  ) : null}

                  <input
                    value={notes[request._id] || ""}
                    onChange={(e) =>
                      setNotes((prev) => ({
                        ...prev,
                        [request._id]: e.target.value,
                      }))
                    }
                    placeholder="Review note to the student (optional)"
                    maxLength={1000}
                    aria-label={`Review note for @${user.username || "student"}`}
                    className={cn(inputClass, "mt-2.5 h-[36px]")}
                  />

                  <div className="mt-2.5 flex flex-wrap gap-1.5">
                    <Button
                      variant="secondary"
                      size="sm"
                      disabled={busy}
                      onClick={() => review(request, "approved")}
                    >
                      {acting[request._id] === "approved" ? (
                        <Spinner />
                      ) : (
                        <Check className="h-[14px] w-[14px]" aria-hidden />
                      )}
                      Approve
                    </Button>
                    <Button
                      variant="secondary"
                      size="sm"
                      disabled={busy}
                      onClick={() => review(request, "rejected")}
                    >
                      {acting[request._id] === "rejected" ? (
                        <Spinner />
                      ) : (
                        <X className="h-[14px] w-[14px]" aria-hidden />
                      )}
                      Reject
                    </Button>
                    {verified ? (
                      <Button
                        variant="dangerSolid"
                        size="sm"
                        disabled={busy}
                        onClick={() => setVerified(request, false)}
                      >
                        {acting[request._id] === "revoke" ? <Spinner /> : null}
                        Revoke tick
                      </Button>
                    ) : (
                      <Button
                        variant="secondary"
                        size="sm"
                        disabled={busy}
                        onClick={() => setVerified(request, true)}
                      >
                        {acting[request._id] === "grant" ? <Spinner /> : null}
                        Grant tick
                      </Button>
                    )}
                  </div>
                </div>
              </Panel>
            );
          })}
        </div>
      ) : (
        <Panel>
          <EmptyRows
            icon={BadgeCheck}
            title={
              tab === "open"
                ? "No open requests"
                : `No ${tab} verification requests`
            }
            description={
              tab === "open"
                ? "Students who meet the posting and follower thresholds can request a blue tick."
                : "Reviewed requests remain available in this view."
            }
          />
        </Panel>
      )}

      {!loading && requests.length ? (
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
