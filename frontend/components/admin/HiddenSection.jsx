"use client";

import { EyeOff, RotateCcw, Trash2 } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { api } from "@/lib/api";
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
  timeAgo,
} from "./ui";

function errorMessage(err, fallback) {
  return err?.data?.message || err?.message || fallback;
}

// Reports quarantine a post automatically once the threshold is crossed, and
// this is the queue for everything currently off the feeds. Restoring publishes
// it again and dismisses the open reports behind it; deleting is permanent.
export function HiddenSection({ onOpenUser }) {
  const [posts, setPosts] = useState([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(false);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState(null);
  const [acting, setActing] = useState({});
  const requestRef = useRef(0);

  const load = useCallback(async (pg = 1, append = false) => {
    const token = ++requestRef.current;
    if (append) setLoadingMore(true);
    else setLoading(true);
    setError(null);
    try {
      const res = await api.adminHiddenPosts({ page: pg, limit: 20 });
      if (token !== requestRef.current) return;
      const data = res.data || {};
      setPosts((prev) =>
        append ? [...prev, ...(data.posts || [])] : data.posts || [],
      );
      setTotal(data.total || 0);
      setPage(data.page || pg);
      setHasMore(Boolean(data.hasMore));
    } catch (err) {
      if (token === requestRef.current) {
        setError(errorMessage(err, "Could not load hidden posts."));
      }
    } finally {
      if (token === requestRef.current) {
        setLoading(false);
        setLoadingMore(false);
      }
    }
  }, []);

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

  const restore = async (post) => {
    setBusy(post._id, "restore");
    try {
      await api.adminRestorePost(post._id);
      toast.success("Post restored to the feeds");
      setPosts((prev) => prev.filter((item) => item._id !== post._id));
      setTotal((value) => Math.max(0, value - 1));
    } catch (err) {
      toast.error(errorMessage(err, "Could not restore the post."));
    } finally {
      clearBusy(post._id);
    }
  };

  const remove = async (post) => {
    if (!window.confirm("Delete this post permanently?")) return;
    setBusy(post._id, "delete");
    try {
      await api.adminDeletePost(post._id);
      toast.success("Post deleted");
      setPosts((prev) => prev.filter((item) => item._id !== post._id));
      setTotal((value) => Math.max(0, value - 1));
    } catch (err) {
      toast.error(errorMessage(err, "Could not delete the post."));
    } finally {
      clearBusy(post._id);
    }
  };

  return (
    <div>
      <SectionIntro
        eyebrow="Moderation"
        title="Hidden posts"
        subtitle="Posts quarantined by the report threshold are off every feed, profile and search result until you restore or delete them."
        actions={
          <Chip tone="warn">
            <EyeOff className="h-3 w-3" aria-hidden />
            {formatNumber(total)} hidden
          </Chip>
        }
      />

      {error ? (
        <ErrorBanner onRetry={() => load(1, false)}>{error}</ErrorBanner>
      ) : null}

      {loading ? (
        <Panel>
          <LoadingRows label="Loading hidden posts…" />
        </Panel>
      ) : posts.length ? (
        <div className="flex flex-col gap-3">
          {posts.map((post) => {
            const busy = Boolean(acting[post._id]);
            const author = post.author || null;
            return (
              <Panel key={post._id} className="overflow-hidden">
                <div className="flex flex-wrap items-center gap-1.5 border-b border-[var(--cz-border)] px-4 py-2.5">
                  <Chip tone="warn">
                    <EyeOff className="h-3 w-3" aria-hidden />
                    Hidden
                  </Chip>
                  <Chip className="capitalize">
                    {post.kind === "article" ? "Article" : "Post"}
                  </Chip>
                  {post.isSensitive ? <Chip tone="warn">18+</Chip> : null}
                  <span className="ml-auto text-[11px] text-[var(--cz-text-secondary)]">
                    {timeAgo(post.hiddenAt || post.createdAt)}
                  </span>
                </div>

                <div className="px-4 py-3">
                  <div className="flex items-center gap-2.5">
                    <AdminAvatar user={author} size={32} />
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-[13px] font-bold">
                        {author?.fullName || author?.username || "Unknown author"}
                      </p>
                      {author?.username ? (
                        <p className="truncate text-[11px] text-[var(--cz-text-secondary)]">
                          @{author.username}
                        </p>
                      ) : null}
                    </div>
                  </div>

                  <div className="mt-2.5 rounded-xl bg-[var(--cz-surface-strong)] px-3 py-2.5">
                    <p className="line-clamp-4 text-[13px] leading-[19px] whitespace-pre-wrap">
                      {post.title || post.text || (
                        <span className="text-[var(--cz-text-secondary)]">
                          No text — this post is media or a poll.
                        </span>
                      )}
                    </p>
                    {post.hiddenReason ? (
                      <p className="mt-1.5 text-[11px] text-[var(--cz-text-secondary)]">
                        {post.hiddenReason}
                      </p>
                    ) : null}
                  </div>

                  <div className="mt-3 flex flex-wrap items-center gap-1.5">
                    <Button
                      variant="secondary"
                      size="sm"
                      disabled={busy}
                      onClick={() => restore(post)}
                    >
                      {acting[post._id] === "restore" ? (
                        <Spinner />
                      ) : (
                        <RotateCcw
                          className="h-[14px] w-[14px]"
                          aria-hidden
                        />
                      )}
                      Restore
                    </Button>
                    <Button
                      variant="dangerSolid"
                      size="sm"
                      disabled={busy}
                      onClick={() => remove(post)}
                    >
                      {acting[post._id] === "delete" ? (
                        <Spinner />
                      ) : (
                        <Trash2 className="h-[14px] w-[14px]" aria-hidden />
                      )}
                      Delete post
                    </Button>
                    {author?._id ? (
                      <Button
                        variant="ghost"
                        size="sm"
                        disabled={busy}
                        onClick={() => onOpenUser?.(String(author._id))}
                        className="ml-auto"
                      >
                        Open author
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
            icon={EyeOff}
            title="Nothing is hidden"
            description="Posts quarantined by reports will appear here for review."
          />
        </Panel>
      )}

      {!loading && posts.length ? (
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
