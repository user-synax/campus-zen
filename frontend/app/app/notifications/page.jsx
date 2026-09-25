"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Bell, Heart, MessageCircle, Repeat2, UserPlus, Loader2, CheckCheck, Check } from "lucide-react";
import { EmptyState } from "@/components/app/EmptyState";
import { api } from "@/lib/api";
import { Button } from "@/components/ui/button";

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

function notifText(n) {
  const name = n.actor?.fullName || n.actor?.username || "Someone";
  switch (n.type) {
    case "follow":
      return `${name} followed you`;
    case "like":
      return `${name} liked your post`;
    case "reply":
      return `${name} replied to your post`;
    case "repost":
      return `${name} reposted your post`;
    default:
      return `${name} interacted`;
  }
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
    default:
      return <Bell className="h-3.5 w-3.5" />;
  }
}

export default function NotificationsPage() {
  const [notifications, setNotifications] = useState([]);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(false);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [filter, setFilter] = useState("all"); // all | unread
  const [markingAll, setMarkingAll] = useState(false);

  const fetchPage = async (p, f, append = false) => {
    if (append) setLoadingMore(true);
    else setLoading(true);
    try {
      const res = await api.getNotifications({ page: p, limit: 20, filter: f });
      const d = res.data;
      if (append) setNotifications((prev) => [...prev, ...(d.notifications || [])]);
      else setNotifications(d.notifications || []);
      setHasMore(Boolean(d.hasMore));
      setPage(p);
    } catch {}
    setLoading(false);
    setLoadingMore(false);
  };

  useEffect(() => {
    fetchPage(1, filter, false);
  }, [filter]);

  const markRead = async (id) => {
    try {
      await api.markNotificationRead(id);
      setNotifications((prev) => prev.map((n) => (n._id === id ? { ...n, read: true } : n)));
      window.dispatchEvent(new Event("cz:notif-read"));
    } catch {}
  };

  const markAll = async () => {
    setMarkingAll(true);
    try {
      await api.markAllNotificationsRead();
      setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
      window.dispatchEvent(new Event("cz:notif-read"));
    } catch {}
    setMarkingAll(false);
  };

  const unreadInView = notifications.filter((n) => !n.read).length;

  return (
    <div className="mx-auto w-full max-w-[640px] space-y-4">
      <div className="flex items-center justify-between gap-2">
        <h1 className="text-[18px] font-semibold tracking-[-0.02em]">Notifications</h1>
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
            <Button variant="secondary" size="sm" onClick={markAll} disabled={markingAll} className="h-[32px] px-3 text-[12px] hidden sm:inline-flex">
              {markingAll ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <CheckCheck className="h-3.5 w-3.5" />}
              Mark all read
            </Button>
          ) : null}
        </div>
      </div>

      {unreadInView > 0 ? (
        <div className="sm:hidden flex justify-end">
          <Button variant="secondary" size="sm" onClick={markAll} disabled={markingAll} className="h-[32px] px-3 text-[12px] w-full">
            {markingAll ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <CheckCheck className="h-3.5 w-3.5" />}
            Mark all read ({unreadInView})
          </Button>
        </div>
      ) : null}

      {loading ? (
        <div className="space-y-3">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="rounded-[12px] border border-[var(--cz-border)] bg-[var(--cz-surface)] p-4 animate-pulse">
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
        <EmptyState icon={Bell} title={filter === "unread" ? "No unread notifications" : "No notifications yet"} description="You’ll get notified when someone follows you, likes, replies or reposts your post. Manual read only, duplicates ignored within 1h." />
      ) : (
        <div className="space-y-3">
          {notifications.map((n) => (
            <div key={n._id} className={`group relative overflow-hidden rounded-[16px] border bg-[var(--cz-surface)] p-3 sm:p-4 flex gap-3 hover:border-[var(--cz-border-strong)] transition-colors ${n.read ? "border-[var(--cz-border)]" : "border-[var(--cz-muted)]/30 bg-[var(--cz-surface-strong)]"}`}>
              {!n.read ? <span className="absolute left-0 top-0 bottom-0 w-[3px] bg-[var(--cz-muted)]" /> : null}
              <Link href={`/u/${n.actor?.username || ""}`} className="shrink-0">
                <span className="grid place-items-center h-9 w-9 rounded-full bg-[var(--cz-muted)] text-white text-[12px] font-semibold overflow-hidden">
                  {n.actor?.avatarUrl ? <img src={n.actor.avatarUrl} alt={n.actor.username} className="h-full w-full object-cover" /> : (n.actor?.username || "U").slice(0, 1).toUpperCase()}
                </span>
              </Link>
              <div className="min-w-0 flex-1">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0 flex-1">
                    <p className="text-[13px] leading-[18px] text-[var(--cz-text-primary)]">
                      <Link href={`/u/${n.actor?.username || ""}`} className="font-semibold hover:underline underline-offset-4">
                        {n.actor?.fullName || n.actor?.username}
                      </Link>{" "}
                      <span className="text-[var(--cz-text-secondary)]">{n.type === "follow" ? "followed you" : n.type === "like" ? "liked your post" : n.type === "reply" ? "replied to your post" : "reposted your post"}</span>
                    </p>
                    {n.post?.text ? (
                      <Link href={`/app/p/${n.post._id || n.post}`} className="mt-1 block rounded-[10px] border border-[var(--cz-border)] bg-[rgba(255,255,255,0.03)] px-2.5 py-1.5 text-[12px] leading-[16px] text-[var(--cz-text-secondary)] hover:text-[var(--cz-text-primary)] hover:border-[var(--cz-border-strong)] transition-colors line-clamp-2">
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
                      <span className="text-[var(--cz-text-secondary)]/60">· {new Date(n.createdAt).toLocaleString("en-IN", { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" })}</span>
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
                    <span className="shrink-0 inline-flex items-center gap-1 rounded-full bg-[var(--cz-surface-strong)] border border-[var(--cz-border)] px-2.5 h-[28px] text-[11px] font-medium text-[var(--cz-text-secondary)]/60">
                      <Check className="h-3.5 w-3.5" /> Read
                    </span>
                  )}
                </div>
              </div>
            </div>
          ))}

          {hasMore ? (
            <button onClick={() => fetchPage(page + 1, filter, true)} disabled={loadingMore} className="w-full rounded-[12px] border border-[var(--cz-border)] bg-transparent h-[40px] text-[13px] font-medium hover:bg-[var(--cz-surface)] transition-colors disabled:opacity-50">
              {loadingMore ? <span className="inline-flex items-center gap-2"><Loader2 className="h-4 w-4 animate-spin" /> Loading…</span> : "Load more"}
            </button>
          ) : (
            <p className="text-center text-[11px] text-[var(--cz-text-secondary)]/60 py-2">End • {notifications.length} notifications • keep only read (no delete)</p>
          )}
        </div>
      )}
    </div>
  );
}
