"use client";

import { useQueryClient } from "@tanstack/react-query";
import {
  AtSign,
  Bell,
  Check,
  CheckCheck,
  Heart,
  Loader2,
  MessageCircle,
  Repeat2,
  Trash2,
  UserPlus,
} from "lucide-react";
import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import { CzImage } from "@/components/app/CzImage";
import { EmptyState, PostSkeleton } from "@/components/app/EmptyState";
import { PageHeader } from "@/components/app/PageHeader";
import { withAvatarRing } from "@/lib/avatar";
import { Button } from "@/components/ui/button";
import { api } from "@/lib/api";
import {
  useMarkAllNotificationsRead,
  useMarkNotificationRead,
  useNotifications,
} from "@/lib/hooks/queries";
import { useSSE } from "@/lib/hooks/useSSE";
import { cn } from "@/lib/utils";

// The glyph that leads each notification row, and the colour it takes.
// Like → pink, repost → green, everything else → X Blue.
const NOTIF_ICON = {
  follow: { Icon: UserPlus, className: "text-[var(--cz-text-secondary)]" },
  like: { Icon: Heart, className: "text-[var(--cz-like)]" },
  reply: { Icon: MessageCircle, className: "text-[var(--cz-accent)]" },
  repost: { Icon: Repeat2, className: "text-[var(--cz-repost)]" },
  mention: { Icon: AtSign, className: "text-[var(--cz-accent)]" },
};

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
          if (!timer)
            timer = setTimeout(() => {
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

  const queryClient = useQueryClient();
  const markReadMutation = useMarkNotificationRead();
  const markAllMutation = useMarkAllNotificationsRead();

  // SSE for real-time notifications (replaces polling)
  useSSE();

  const { data, fetchNextPage, hasNextPage, isPending, isFetchingNextPage, isError, error, refetch } =
    useNotifications(filter, typeFilter);

  const notifications =
    data?.pages?.flatMap((p) => p.data?.notifications || []) || [];

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
                n._id === id ? { ...n, read: true } : n,
              ),
            },
          })),
        };
      });
      markReadMutation.mutate(id);
    },
    [filter, typeFilter, queryClient, markReadMutation],
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
                (n) => n._id !== id,
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
                (n) => !n.read,
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
    <div className="min-w-0 overflow-x-clip">
      <PageHeader
        title="Notifications"
        right={
          <div className="flex items-center gap-1">
            {unreadInView > 0 ? (
              <button
                onClick={markAll}
                disabled={markingAll}
                aria-label="Mark all as read"
                className="grid h-[36px] w-[36px] place-items-center rounded-full text-[var(--cz-text-primary)] transition-colors hover:bg-[var(--cz-surface-strong)] disabled:opacity-50"
              >
                {markingAll ? (
                  <Loader2 className="h-[18px] w-[18px] animate-spin" />
                ) : (
                  <CheckCheck className="h-[18px] w-[18px]" />
                )}
              </button>
            ) : null}
            {readInView > 0 ? (
              <button
                onClick={clearRead}
                disabled={clearing}
                aria-label="Delete read notifications"
                className="grid h-[36px] w-[36px] place-items-center rounded-full text-[var(--cz-text-primary)] transition-colors hover:bg-[var(--cz-surface-strong)] disabled:opacity-50"
              >
                {clearing ? (
                  <Loader2 className="h-[18px] w-[18px] animate-spin" />
                ) : (
                  <Trash2 className="h-[18px] w-[18px]" />
                )}
              </button>
            ) : null}
          </div>
        }
        tabs={[
          { id: "all", label: "All" },
          ...TYPE_TABS.filter((t) => t.id !== "all"),
        ]}
        activeTab={typeFilter}
        onTabChange={setTypeFilter}
      />

      <div className="flex items-center gap-2 border-b border-[var(--cz-border)] px-4 py-2">
        {[
          { id: "all", label: "All" },
          {
            id: "unread",
            label: `Unread${unreadInView ? ` (${unreadInView})` : ""}`,
          },
        ].map((t) => (
          <button
            key={t.id}
            onClick={() => setFilter(t.id)}
            aria-pressed={filter === t.id}
            className={`h-[32px] cursor-pointer rounded-full px-4 text-[15px] font-bold transition-colors ${
              filter === t.id
                ? "bg-[var(--cz-accent)] text-[var(--cz-text-inverse)]"
                : "border border-[var(--cz-border-strong)] text-[var(--cz-text-primary)] hover:bg-[var(--cz-surface-strong)]"
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {isPending ? (
        <PostSkeleton rows={5} />
      ) : isError && notifications.length === 0 ? (
        <EmptyState
          icon={Bell}
          title="Couldn't load notifications"
          description={error?.data?.message || error?.message || "Check your connection and try again."}
          actionLabel="Try again"
          onAction={() => refetch()}
        />
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
          description="You'll be notified when someone follows you, likes, replies, reposts or mentions you."
        />
      ) : (
        <div>
          {notifications.map((n) => {
            const glyph = NOTIF_ICON[n.type] ?? {
              Icon: Bell,
              className: "text-[var(--cz-text-secondary)]",
            };
            const Glyph = glyph.Icon;
            return (
              <AutoRead
                key={n._id}
                id={n._id}
                active={!n.read}
                onRead={markRead}
              >
                <div
                  className={`cz-row relative flex gap-3 px-4 py-3 ${n.read ? "" : "bg-[var(--cz-accent-softer)]"}`}
                >
                  <Link
                    href={`/u/${n.actor?.username || ""}`}
                    className="shrink-0"
                  >
                    <span className={withAvatarRing(n.actor, "grid h-10 w-10 place-items-center overflow-hidden rounded-full bg-[var(--cz-border-strong)] text-[13px] font-bold text-[var(--cz-text-primary)]")}>
                      {n.actor?.avatarUrl ? (
                        <CzImage
                          src={n.actor.avatarUrl}
                          alt={n.actor.username}
                          className="h-full w-full rounded-full"
                          imgClassName="h-full w-full"
                        />
                      ) : (
                        (n.actor?.username || "U").slice(0, 1).toUpperCase()
                      )}
                      {/* unread marker — a blue dot on the avatar, per DESIGN.md */}
                      {!n.read ? (
                        <span
                          aria-label="Unread"
                          className="absolute bottom-0 right-0 h-[10px] w-[10px] rounded-full bg-[var(--cz-accent)] ring-2 ring-[var(--cz-bg)]"
                        />
                      ) : null}
                    </span>
                  </Link>

                  <div className="min-w-0 flex-1">
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0 flex-1">
                        <p
                          className={`flex items-start gap-1.5 text-[15px] leading-[20px] ${
                            n.read
                              ? "text-[var(--cz-text-secondary)]"
                              : "text-[var(--cz-text-primary)]"
                          }`}
                        >
                          <Glyph
                            className={cn(
                              "mt-0.5 h-[18px] w-[18px] shrink-0",
                              glyph.className,
                            )}
                            strokeWidth={1.9}
                            aria-hidden
                          />
                          <span>
                            <Link
                              href={`/u/${n.actor?.username || ""}`}
                              className={cn(
                                "hover:underline",
                                !n.read && "font-bold",
                              )}
                            >
                              {n.actor?.fullName || n.actor?.username}
                            </Link>{" "}
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
                            className="mt-1.5 block text-[15px] leading-[20px] text-[var(--cz-text-secondary)] hover:text-[var(--cz-text-primary)]"
                          >
                            {n.post.text.slice(0, 140)}
                          </Link>
                        ) : null}

                        <p className="mt-1 text-[13px] leading-[16px] text-[var(--cz-text-secondary)]">
                          {new Date(n.createdAt).toLocaleString("en-IN", {
                            month: "short",
                            day: "numeric",
                            hour: "numeric",
                            minute: "2-digit",
                          })}
                        </p>
                      </div>

                      <div className="flex shrink-0 items-center">
                        {!n.read ? (
                          <button
                            onClick={() => markRead(n._id)}
                            aria-label="Mark as read"
                            className="grid h-[36px] w-[36px] place-items-center rounded-full text-[var(--cz-text-primary)] transition-colors hover:bg-[var(--cz-surface-strong)]"
                          >
                            <Check className="h-[18px] w-[18px]" />
                          </button>
                        ) : (
                          <button
                            onClick={() => deleteOne(n._id)}
                            aria-label="Delete notification"
                            className="grid h-[36px] w-[36px] place-items-center rounded-full text-[var(--cz-text-primary)] transition-colors hover:bg-[color-mix(in_srgb,var(--cz-error)_10%,transparent)] hover:text-[var(--cz-error)]"
                          >
                            <Trash2 className="h-[18px] w-[18px]" />
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              </AutoRead>
            );
          })}

          {hasNextPage ? (
            <div className="p-4">
              <Button
                onClick={() => fetchNextPage()}
                disabled={isFetchingNextPage}
                variant="secondary"
                className="w-full"
              >
                {isFetchingNextPage ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
                    Loading
                  </>
                ) : (
                  "Show more"
                )}
              </Button>
            </div>
          ) : (
            <p className="py-6 text-center text-[13px] text-[var(--cz-text-secondary)]">
              {notifications.length} notification
              {notifications.length === 1 ? "" : "s"}
            </p>
          )}
        </div>
      )}
    </div>
  );
}
