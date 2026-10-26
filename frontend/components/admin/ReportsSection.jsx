"use client";

import {
  ArrowUpRight,
  FileText,
  Flag,
  Image as ImageIcon,
  Trash2,
  UserRound,
} from "lucide-react";
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
  LoadingRows,
  Panel,
  SectionIntro,
  Spinner,
  StatusPill,
  timeAgo,
} from "./ui";

const REPORT_TABS = [
  { id: "open", label: "Open" },
  { id: "dismissed", label: "Dismissed" },
  { id: "actioned", label: "Actioned" },
  { id: "all", label: "All" },
];

const REPORT_STATUS_TONE = {
  open: "warn",
  dismissed: "neutral",
  actioned: "accent",
};

function errorMessage(err, fallback) {
  return err?.data?.message || err?.message || fallback;
}

export function ReportsSection({ refreshStats, onOpenUser }) {
  const [tab, setTab] = useState("open");
  const [reports, setReports] = useState([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(false);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState(null);
  const [acting, setActing] = useState({});
  const requestRef = useRef(0);

  const load = useCallback(
    async (pg = 1, append = false) => {
      const token = ++requestRef.current;
      if (append) setLoadingMore(true);
      else setLoading(true);
      setError(null);
      try {
        const res = await api.adminReports({
          status: tab,
          page: pg,
          limit: 20,
        });
        if (token !== requestRef.current) return;
        const data = res.data || {};
        setReports((prev) =>
          append ? [...prev, ...(data.reports || [])] : data.reports || [],
        );
        setTotal(data.total || 0);
        setPage(data.page || pg);
        setHasMore(Boolean(data.hasMore));
      } catch (err) {
        if (token === requestRef.current) {
          setError(errorMessage(err, "Could not load reports."));
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

  const setBusy = (id, label) =>
    setActing((prev) => ({ ...prev, [id]: label }));
  const clearBusy = (id) =>
    setActing((prev) => {
      const next = { ...prev };
      delete next[id];
      return next;
    });

  const resolve = async (report, status) => {
    setBusy(report._id, status);
    try {
      await api.adminResolveReport(report._id, status);
      toast.success(
        status === "dismissed" ? "Report dismissed" : "Report marked actioned",
      );
      if (tab === "open") {
        setReports((prev) => prev.filter((item) => item._id !== report._id));
        setTotal((value) => Math.max(0, value - 1));
      } else {
        setReports((prev) =>
          prev.map((item) =>
            item._id === report._id ? { ...item, status } : item,
          ),
        );
      }
      refreshStats?.();
    } catch (err) {
      toast.error(errorMessage(err, "Could not update the report."));
    } finally {
      clearBusy(report._id);
    }
  };

  const deletePost = async (report) => {
    if (!window.confirm("Delete this post permanently?")) return;
    setBusy(report._id, "delete");
    try {
      await api.adminDeletePost(String(report.targetId));
      toast.success("Post deleted");
      if (tab === "open") {
        setReports((prev) => prev.filter((item) => item._id !== report._id));
        setTotal((value) => Math.max(0, value - 1));
      } else {
        setReports((prev) =>
          prev.map((item) =>
            item._id === report._id
              ? { ...item, status: "actioned", targetMissing: true }
              : item,
          ),
        );
      }
      refreshStats?.();
    } catch (err) {
      toast.error(errorMessage(err, "Could not delete the post."));
    } finally {
      clearBusy(report._id);
    }
  };

  return (
    <div>
      <SectionIntro
        eyebrow="Moderation"
        title="Reports"
        subtitle="Everything students have flagged. Resolve a report, remove a post, or open the reported account to restrict or ban it."
        actions={
          <Chip tone="warn">
            <Flag className="h-3 w-3" aria-hidden />
            {formatNumber(total)} in this view
          </Chip>
        }
      />

      <div
        role="tablist"
        aria-label="Report status"
        className="mb-4 flex gap-1.5 overflow-x-auto scrollbar-none"
      >
        {REPORT_TABS.map((item) => {
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
          <LoadingRows label="Loading reports…" />
        </Panel>
      ) : reports.length ? (
        <div className="flex flex-col gap-3">
          {reports.map((report) => {
            const busy = Boolean(acting[report._id]);
            const isPost = report.targetType === "post";
            const targetUser = isPost
              ? report.target?.author
              : report.target || null;
            return (
              <Panel key={report._id} className="overflow-hidden">
                <div className="flex flex-wrap items-center gap-1.5 border-b border-[var(--cz-border)] px-4 py-2.5">
                  <Chip tone="warn">
                    {isPost ? (
                      <FileText className="h-3 w-3" aria-hidden />
                    ) : (
                      <UserRound className="h-3 w-3" aria-hidden />
                    )}
                    {isPost ? "Post" : "Account"}
                  </Chip>
                  <Chip className="capitalize">{report.reason}</Chip>
                  <Chip tone={REPORT_STATUS_TONE[report.status] || "neutral"}>
                    {report.status}
                  </Chip>
                  <span className="ml-auto text-[11px] text-[var(--cz-text-secondary)]">
                    {timeAgo(report.createdAt)}
                  </span>
                </div>

                <div className="px-4 py-3">
                  <p className="text-[13px] leading-[19px]">
                    <span className="font-bold">
                      @{report.reporter?.username || "unknown"}
                    </span>
                    <span className="text-[var(--cz-text-secondary)]">
                      {" "}
                      reported{" "}
                    </span>
                    {isPost ? (
                      <span className="font-bold">
                        a post
                        {targetUser?.username
                          ? ` by @${targetUser.username}`
                          : ""}
                      </span>
                    ) : (
                      <span className="font-bold">
                        @{report.target?.username || "an account"}
                      </span>
                    )}
                    {report.details ? (
                      <span className="text-[var(--cz-text-secondary)]">
                        {" "}
                        — “{report.details}”
                      </span>
                    ) : null}
                  </p>

                  <div className="mt-2.5 rounded-xl bg-[var(--cz-surface-strong)] px-3 py-2.5">
                    {report.targetMissing || !report.target ? (
                      <p className="text-[12px] text-[var(--cz-text-secondary)]">
                        The reported content has already been deleted.
                      </p>
                    ) : isPost ? (
                      <>
                        <p className="line-clamp-4 text-[13px] leading-[19px] whitespace-pre-wrap">
                          {report.target.text || (
                            <span className="text-[var(--cz-text-secondary)]">
                              No text — this post is media or a poll.
                            </span>
                          )}
                        </p>
                        {report.target.imageUrl ||
                        report.target.media?.length ? (
                          <p className="mt-1.5 flex items-center gap-1 text-[11px] text-[var(--cz-text-secondary)]">
                            <ImageIcon className="h-3 w-3" aria-hidden />
                            {report.target.media?.length > 1
                              ? `${report.target.media.length} attachments`
                              : report.target.media?.[0]?.kind === "video"
                                ? "Video attachment"
                                : report.target.media?.[0]?.kind === "gif"
                                  ? "GIF attachment"
                                  : "Image attachment"}
                          </p>
                        ) : null}
                      </>
                    ) : (
                      <div className="flex items-center gap-2.5">
                        <AdminAvatar user={report.target} size={36} />
                        <div className="min-w-0 flex-1">
                          <div className="flex flex-wrap items-center gap-1.5">
                            <p className="truncate text-[13px] font-bold">
                              {report.target.fullName || report.target.username}
                            </p>
                            <StatusPill
                              status={
                                report.target.displayStatus ||
                                report.target.accountStatus
                              }
                            />
                          </div>
                          <p className="truncate text-[11px] text-[var(--cz-text-secondary)]">
                            @{report.target.username}
                            {report.target.college
                              ? ` · ${report.target.college}`
                              : ""}
                          </p>
                          {report.target.bio ? (
                            <p className="mt-1 line-clamp-2 text-[12px] leading-[17px] text-[var(--cz-text-secondary)]">
                              {report.target.bio}
                            </p>
                          ) : null}
                        </div>
                      </div>
                    )}
                  </div>

                  <div className="mt-3 flex flex-wrap items-center gap-1.5">
                    <Button
                      variant="secondary"
                      size="sm"
                      disabled={busy}
                      onClick={() => resolve(report, "dismissed")}
                    >
                      {acting[report._id] === "dismissed" ? <Spinner /> : null}
                      Dismiss
                    </Button>
                    <Button
                      variant="secondary"
                      size="sm"
                      disabled={busy}
                      onClick={() => resolve(report, "actioned")}
                    >
                      {acting[report._id] === "actioned" ? <Spinner /> : null}
                      Mark actioned
                    </Button>
                    {isPost && report.target && !report.targetMissing ? (
                      <Button
                        variant="dangerSolid"
                        size="sm"
                        disabled={busy}
                        onClick={() => deletePost(report)}
                      >
                        {acting[report._id] === "delete" ? (
                          <Spinner />
                        ) : (
                          <Trash2 className="h-[14px] w-[14px]" aria-hidden />
                        )}
                        Delete post
                      </Button>
                    ) : null}
                    {targetUser?._id || report.targetId ? (
                      <Button
                        variant="ghost"
                        size="sm"
                        disabled={busy}
                        onClick={() =>
                          onOpenUser?.(
                            String(targetUser?._id || report.targetId),
                          )
                        }
                        className="ml-auto"
                      >
                        {isPost ? "Open author" : "Open account"}
                        <ArrowUpRight
                          className="h-[14px] w-[14px]"
                          aria-hidden
                        />
                      </Button>
                    ) : null}
                  </div>
                </div>
              </Panel>
            );
          })}
        </div>
      ) : (
        <Panel>
          <EmptyRows
            icon={Flag}
            title={tab === "open" ? "The queue is clear" : `No ${tab} reports`}
            description={
              tab === "open"
                ? "Nothing is waiting for review. New flags will land here immediately."
                : "Reports you resolve will stay available in this view."
            }
          />
        </Panel>
      )}

      {!loading && reports.length ? (
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
