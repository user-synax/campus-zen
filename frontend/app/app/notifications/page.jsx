"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import {
  Bell,
  Heart,
  MessageCircle,
  Repeat2,
  UserPlus,
  AtSign,
  Loader2,
  CheckCheck,
  Check,
  Trash2,
} from "lucide-react";
import { useQueryClient } from "@tanstack/react-query";
import { EmptyState } from "@/components/app/EmptyState";
import { api } from "@/lib/api";
import { Button } from "@/components/ui/button";
import {
  useNotifications,
  useMarkNotificationRead,
  useMarkAllNotificationsRead,
} from "@/lib/hooks/queries";

function timeAgo(date) {
  const d = new Date(date);
  const diff = Date.now() - d.getTime();
  const s = Math.floor(diff / 1000);
  if (s < 60) return "now";
  const m = Math.floor(s / 60);
  if (m < 60) return `${m}m`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h`;
  const days = Math.floor(h / 24);
  if (days < 7) return `${days}d`;
  return d.toLocaleDateString("en-IN", { month: "short", day: "numeric" });
}

function NotifIcon({ type }) {
  switch (type) {
    case "follow":
      return <UserPlus className="h-3.5 w-3.5" />;
    case "like":
      return <Heart className="h-3.5 w-3.5" />;
    case "reply":
      return <MessageCircle className="h-3.5 w-3.5" />;
    case "repost":
      return <Repeat2 className="h-3.5 w-3.5" />;
    case "mention":
      return <AtSign className="h-3.5 w-3.5" />;
    default:
      return <Bell className="h-3.5 w-3.5" />;
  }
}

// Marks an unread card read after ~1s in view. Fires once per card.
function AutoRead({ id, active, onRead, children }) {
  const ref = useRef(null);
  const firedRef = useRef(false);
  const onReadRef = useRef(onRead);
  onReadRef.current = onRead;

  useEffect(() => {
    if (!active || firedRef.current) return;
    const el = ref.current;
    if (!el) return;
    let timer = null;
    const obs = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting && !document.hidden) {
          if (!timer) timer = setTimeout(() => {
            firedRef.current = true;
            onReadRef.current(id);
          }, 1000);
        } else if (timer) {
          clearTimeout(timer);
          timer = null;
        }
      },
      { threshold: 0.6 },
    );
    obs.observe(el);
    return () => {
      obs.disconnect();
      if (timer) clearTimeout(timer);
    };
  }, [active, id]);

  return <div ref={ref}>{children}</div>;
}

const TYPE_TABS = [
  { id: "all", label: "All" },
  { id: "follow", label: "Follows" },
  { id: "like", label: "Likes" },
  { id: "reply", label: "Replies" },
  { id: "repost", label: "Reposts" },
  { id: "mention", label: "Mentions" },
];

export default function NotificationsPage() {
  const [filter, setFilter] = useState("all");
  const [typeFilter, setTypeFilter] = useState("all");
  const [markingAll, setMarkingAll] = useState(false);
  const [clearing, setClearing] = useState(false);
  const listRef = useRef([]);
  const checkingRef = useRef(false);

  const queryClient = useQueryClient();
  const markReadMutation = useMarkNotificationRead();
  const markAllMutation = useMarkAllNotificationsRead();

  const {
    data,
    fetchNextPage,
    hasNextPage,
    isPending,
    isFetchingNextPage,
  } = useNotifications(filter, typeFilter);

  const notifications = data?.pages?.flatMap((p) => p.data?.notifications || []) || [];
  listRef.current = notifications;

  // Live updates — poll latest page-1, prepend unseen
  const checkForUpdates = useCallback(async () => {
    if (checkingRef.current || document.hidden) return;
    checkingRef.current = true;
    try {
      const params = { page: 1, limit: 20, filter };
      if (typeFilter !== "all") params.type = typeFilter;
      const res = await api.getNotifications(params);
      const fresh = res.data?.notifications || [];
      const known = new Set(listRef.current.map((n) => n._id));
      const unseen = fresh.filter((n) => !known.has(n._id));
      if (unseen.length > 0) {
        queryClient.setQueryData(["notifications", filter, typeFilter], (old) => {
          if (!old) return old;
          const newPages = [...old.pages];
          if (newPages.length > 0) {
            const firstPage = newPages[0];
            const existingIds = new Set(
              (firstPage.data?.notifications || []).map((n) => n._id)
            );
            const add = unseen.filter((n) => !existingIds.has(n._id));
            if (add.length > 0) {
              newPages[0] = {
                ...firstPage,
                data: {
                  ...firstPage.data,
                  notifications: [...add, ...(firstPage.data?.notifications || [])],
                },
              };
            }
          }
          return { ...old, pages: newPages };
        });
      }
    } catch {}
    checkingRef.current = false;
  }, [filter, typeFilter, queryClient]);

  useEffect(() => {
    if (isPending) return;
    const id = setInterval(checkForUpdates, 30000);
    const onFocus = () => checkForUpdates();
    const onVisible = () => {
      if (!document.hidden) checkForUpdates();
    };
    window.addEventListener("focus", onFocus);
    document.addEventListener("visibilitychange", onVisible);
    return () => {
      clearInterval(id);
      window.removeEventListener("focus", onFocus);
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, [checkForUpdates, isPending]);

  const markRead = useCallback(
    (id) => {
      // Optimistic update
      queryClient.setQueryData(["notifications", filter, typeFilter], (old) => {
        if (!old) return old;
        return {
          ...old,
          pages: old.pages.map((page) => ({
            ...page,
            data: {
              ...page.data,
              notifications: (page.data?.notifications || []).map((n) =>
                n._id === id ? { ...n, read: true } : n
              ),
            },
          })),
        };
      });
      markReadMutation.mutate(id);
    },
    [filter, typeFilter, queryClient, markReadMutation]
  );

  const markAll = async () => {
    setMarkingAll(true);
    try {
      await markAllMutation.mutateAsync();
      queryClient.setQueryData(["notifications", filter, typeFilter], (old) => {
        if (!old) return old;
        return {
          ...old,
          pages: old.pages.map((page) => ({
            ...page,
            data: {
              ...page.data,
              notifications: (page.data?.notifications || []).map((n) => ({
                ...n,
                read: true,
              })),
            },
          })),
        };
      });
    } catch {}
    setMarkingAll(false);
  };

  const deleteOne = async (id) => {
    try {
      await api.deleteNotification(id);
      queryClient.setQueryData(["notifications", filter, typeFilter], (old) => {
        if (!old) return old;
        return {
          ...old,
          pages: old.pages.map((page) => ({
            ...page,
            data: {
              ...page.data,
              notifications: (page.data?.notifications || []).filter(
                (n) => n._id !== id
              ),
            },
          })),
        };
      });
    } catch {}
  };

  const clearRead = async () => {
    if (!confirm("Delete all read notifications?")) return;
    setClearing(true);
    try {
      await api.clearReadNotifications();
      queryClient.setQueryData(["notifications", filter, typeFilter], (old) => {
        if (!old) return old;
        return {
          ...old,
          pages: old.pages.map((page) => ({
            ...page,
            data: {
              ...page.data,
              notifications: (page.data?.notifications || []).filter(
                (n) => !n.read
              ),
            },
          })),
        };
      });
    } catch {}
    setClearing(false);
  };

  const unreadInView = notifications.filter((n) => !n.read).length;
  const readInView = notifications.length - unreadInView;

  return (
    <div className="mx-auto w-full max-w-[640px] space-y-4">
      <div className="flex items-center justify-between gap-2">
        <h1 className="text-[18px] font-semibold tracking-[-0.02em]">
          Notifications
        </h1>
        <div className="flex items-center gap-2">
          <div className="inline-flex items-center gap-1 rounded-full border border-[var(--cz-border)] bg-[var(--cz-surface)] p-1">
            {[
              { id: "all", label: "All" },
              { id: "unread", label: "Unread" },
            ].map((t) => (
              <button
                key={t.id}
                onClick={() => setFilter(t.id)}
                aria-selected={filter === t.id}
                className={`px-3 h-[28px] rounded-full text-[12px] font-medium transition-colors ${filter === t.id ? "bg-[var(--cz-text-primary)] text-[var(--cz-text-inverse)]" : "text-[var(--cz-text-secondary)] hover:text-[var(--cz-text-primary)]"}`}
              >
                {t.label}
              </button>
            ))}
          </div>
          {unreadInView > 0 ? (
            <Button
              variant="secondary"
              size="sm"
              onClick={markAll}
              disabled={markingAll}
              className="h-[32px] px-3 text-[12px] hidden sm:inline-flex"
            >
              {markingAll ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <CheckCheck className="h-3.5 w-3.5" />
              )}
              Mark all read
            </Button>
          ) : null}
          {readInView > 0 ? (
            <Button
              variant="ghost"
              size="sm"
              onClick={clearRead}
              disabled={clearing}
              className="h-[32px] px-3 text-[12px] hidden sm:inline-flex"
            >
              {clearing ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <Trash2 className="h-3.5 w-3.5" />
              )}
              Clear read
            </Button>
          ) : null}
        </div>
      </div>

      <div className="flex items-center gap-1.5 overflow-x-auto pb-1 -mb-1">
        {TYPE_TABS.map((t) => (
          <button
            key={t.id}
            onClick={() => setTypeFilter(t.id)}
            aria-selected={typeFilter === t.id}
            className={`inline-flex shrink-0 items-center gap-1.5 rounded-full border px-3 h-[30px] text-[12px] font-medium transition-colors ${
              typeFilter === t.id
                ? "border-[var(--cz-border-strong)] bg-[rgba(255,206,173,0.1)] text-[var(--cz-text-primary)]"
                : "border-[var(--cz-border)] text-[var(--cz-text-secondary)] hover:text-[var(--cz-text-primary)]"
            }`}
          >
            {t.id !== "all" ? <NotifIcon type={t.id} /> : null}
            {t.label}
          </button>
        ))}
      </div>

      {unreadInView > 0 ? (
        <div className="sm:hidden flex justify-end">
          <Button
            variant="secondary"
            size="sm"
            onClick={markAll}
            disabled={markingAll}
            className="h-[32px] px-3 text-[12px] w-full"
          >
            {markingAll ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <CheckCheck className="h-3.5 w-3.5" />
            )}
            Mark all read ({unreadInView})
          </Button>
        </div>
      ) : null}
      {readInView > 0 ? (
        <div className="sm:hidden flex justify-end">
          <Button
            variant="ghost"
            size="sm"
            onClick={clearRead}
            disabled={clearing}
            className="h-[32px] px-3 text-[12px] w-full"
          >
            {clearing ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <Trash2 className="h-3.5 w-3.5" />
            )}
            Clear read ({readInView})
          </Button>
        </div>
      ) : null}

      {isPending ? (
        <div className="space-y-3">
          {Array.from({ length: 4 }).map((_, i) => (
            <div
              key={i}
              className="rounded-[12px] border border-[var(--cz-border)] bg-[var(--cz-surface)] p-4 animate-pulse"
            >
              <div className="flex gap-3">
                <div className="h-9 w-9 rounded-full bg-[var(--cz-border)]" />
                <div className="flex-1 space-y-2">
                  <div className="h-3 w-40 rounded bg-[var(--cz-border)]" />
                  <div className="h-2 w-full rounded bg-[var(--cz-border)]/60" />
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : notifications.length === 0 ? (
        <EmptyState
          icon={Bell}
          title={
            typeFilter !== "all"
              ? `No ${typeFilter} notifications`
              : filter === "unread"
                ? "No unread notifications"
                : "No notifications yet"
          }
          description="You'll get notified when someone follows you, likes, replies, reposts or mentions you. Cards mark themselves read as you view them."
        />
      ) : (
        <div className="space-y-3">
          {notifications.map((n) => (
            <AutoRead key={n._id} id={n._id} active={!n.read} onRead={markRead}>
              <div
                className={`group relative overflow-hidden rounded-[16px] border bg-[var(--cz-surface)] p-3 sm:p-4 flex gap-3 hover:border-[var(--cz-border-strong)] transition-colors ${n.read ? "border-[var(--cz-border)]" : "border-[var(--cz-muted)]/30 bg-[var(--cz-surface-strong)]"}`}
              >
                {!n.read ? (
                  <span className="absolute left-0 top-0 bottom-0 w-[3px] bg-[var(--cz-muted)]" />
                ) : null}
                <Link href={`/u/${n.actor?.username || ""}`} className="shrink-0">
                  <span className="grid place-items-center h-9 w-9 rounded-full bg-[var(--cz-muted)] text-white text-[12px] font-semibold overflow-hidden">
                    {n.actor?.avatarUrl ? (
                      <img
                        src={n.actor.avatarUrl}
                        alt={n.actor.username}
                        className="h-full w-full object-cover"
                      />
                    ) : (
                      (n.actor?.username || "U").slice(0, 1).toUpperCase()
                    )}
                  </span>
                </Link>
                <div className="min-w-0 flex-1">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0 flex-1">
                      <p className="text-[13px] leading-[18px] text-[var(--cz-text-primary)]">
                        <Link
                          href={`/u/${n.actor?.username || ""}`}
                          className="font-semibold hover:underline underline-offset-4"
                        >
                          {n.actor?.fullName || n.actor?.username}
                        </Link>{" "}
                        <span className="text-[var(--cz-text-secondary)]">
                          {n.type === "follow"
                            ? "followed you"
                            : n.type === "like"
                              ? "liked your post"
                              : n.type === "reply"
                                ? "replied to your post"
                                : n.type === "mention"
                                  ? "mentioned you"
                                  : "reposted your post"}
                        </span>
                      </p>
                      {n.post?.text ? (
                        <Link
                          href={`/app/p/${n.post._id || n.post}`}
                          className="mt-1 block rounded-[10px] border border-[var(--cz-border)] bg-[rgba(255,255,255,0.03)] px-2.5 py-1.5 text-[12px] leading-[16px] text-[var(--cz-text-secondary)] hover:text-[var(--cz-text-primary)] hover:border-[var(--cz-border-strong)] transition-colors line-clamp-2"
                        >
                          {n.post.text.slice(0, 120)}
                        </Link>
                      ) : null}
                      <div className="mt-1.5 flex items-center gap-2 text-[11px] leading-none">
                        <span className="inline-flex items-center gap-1 rounded-full bg-[var(--cz-bg)] border border-[var(--cz-border)] px-2 py-1 text-[11px] text-[var(--cz-text-secondary)]">
                          <span className="grid place-items-center h-4 w-4 rounded-full bg-[var(--cz-surface-strong)] border border-[var(--cz-border)] text-[var(--cz-text-primary)]">
                            <NotifIcon type={n.type} />
                          </span>
                          {n.type}
                        </span>
                        <span className="text-[var(--cz-text-secondary)]/60">
                          ·{" "}
                          {new Date(n.createdAt).toLocaleString("en-IN", {
                            month: "short",
                            day: "numeric",
                            hour: "numeric",
                            minute: "2-digit",
                          })}
                        </span>
                      </div>
                    </div>
                    {!n.read ? (
                      <button
                        onClick={() => markRead(n._id)}
                        className="shrink-0 inline-flex items-center gap-1 rounded-full border border-[var(--cz-border)] bg-transparent px-2.5 h-[28px] text-[11px] font-medium text-[var(--cz-text-secondary)] hover:text-[var(--cz-text-primary)] hover:bg-[rgba(255,206,173,0.06)] transition-colors"
                        aria-label="Mark read"
                      >
                        <Check className="h-3.5 w-3.5" /> Read
                      </button>
                    ) : (
                      <button
                        onClick={() => deleteOne(n._id)}
                        className="shrink-0 inline-flex items-center justify-center rounded-full h-[28px] w-[28px] text-[var(--cz-text-secondary)]/50 hover:text-[var(--cz-error)] hover:bg-[rgba(255,90,106,0.08)] transition-colors"
                        aria-label="Delete notification"
                        title="Delete notification"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    )}
                  </div>
                </div>
              </div>
            </AutoRead>
          ))}

          {hasNextPage ? (
            <button
              onClick={() => fetchNextPage()}
              disabled={isFetchingNextPage}
              className="w-full rounded-[12px] border border-[var(--cz-border)] bg-transparent h-[40px] text-[13px] font-medium hover:bg-[var(--cz-surface)] transition-colors disabled:opacity-50"
            >
              {isFetchingNextPage ? (
                <span className="inline-flex items-center gap-2">
                  <Loader2 className="h-4 w-4 animate-spin" /> Loading...
                </span>
              ) : (
                "Load more"
              )}
            </button>
          ) : (
            <p className="text-center text-[11px] text-[var(--cz-text-secondary)]/60 py-2">
              End • {notifications.length} notifications
            </p>
          )}
        </div>
      )}
    </div>
  );
}
