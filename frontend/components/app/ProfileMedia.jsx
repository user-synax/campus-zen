"use client";

import {
  ChevronLeft,
  ChevronRight,
  Heart,
  Image as ImageIcon,
  Loader2,
  MessageCircle,
  X,
} from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { EmptyState } from "@/components/app/EmptyState";
import { PostCard } from "@/components/app/PostCard";
import { api } from "@/lib/api";

function MediaTile({ item, onOpen }) {
  return (
    <button
      type="button"
      onClick={onOpen}
      aria-label={
        item.text ? `Open photo: ${item.text.slice(0, 60)}` : "Open photo"
      }
      className="group relative block w-full overflow-hidden rounded-[12px] border border-[var(--cz-border)] bg-[var(--cz-surface)] text-left transition-colors hover:border-[var(--cz-border-strong)]"
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={item.imageUrl}
        alt={item.text || "Post photo"}
        loading="lazy"
        className="w-full object-cover transition-transform duration-300 group-hover:scale-[1.03]"
      />
      <span
        aria-hidden
        className="pointer-events-none absolute inset-0 flex flex-col justify-end bg-gradient-to-t from-black/70 via-black/0 to-transparent p-2.5 opacity-0 transition-opacity group-hover:opacity-100 group-focus-visible:opacity-100"
      >
        <span className="flex items-center gap-3 text-[12px] font-medium text-white">
          <span className="inline-flex items-center gap-1">
            <Heart className="h-3.5 w-3.5" /> {item.likeCount ?? 0}
          </span>
          <span className="inline-flex items-center gap-1">
            <MessageCircle className="h-3.5 w-3.5" /> {item.replyCount ?? 0}
          </span>
        </span>
        {item.text ? (
          <span className="mt-1 line-clamp-2 text-[12px] leading-[16px] text-white/90">
            {item.text}
          </span>
        ) : null}
      </span>
    </button>
  );
}

function MediaLightbox({
  item,
  items,
  index,
  currentUser,
  onClose,
  onNav,
  onDeleted,
  onUpdated,
}) {
  const [post, setPost] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setPost(null);
    api
      .getPost(item._id)
      .then((r) => {
        if (!cancelled) setPost(r.data?.post || null);
      })
      .catch(() => {
        if (!cancelled) setPost(null);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [item._id]);

  useEffect(() => {
    const onKey = (e) => {
      if (e.key === "Escape") onClose();
      if (e.key === "ArrowRight") onNav(1);
      if (e.key === "ArrowLeft") onNav(-1);
    };
    window.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [onClose, onNav]);

  const content = (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6">
      <button
        type="button"
        aria-label="Close"
        onClick={onClose}
        className="absolute inset-0 bg-black/75 backdrop-blur-[2px] border-0 p-0 m-0"
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Photo viewer"
        className="relative w-full max-w-[560px] max-h-[92dvh] overflow-y-auto rounded-[16px] border border-[var(--cz-border)] bg-[var(--cz-surface)] shadow-[0_16px_48px_rgba(0,0,0,0.5)]"
      >
        <div className="sticky top-0 z-10 flex items-center justify-between gap-2 border-b border-[var(--cz-border)] bg-[var(--cz-surface)]/95 backdrop-blur px-3 h-[48px]">
          <span className="text-[12px] text-[var(--cz-text-secondary)]">
            {index + 1} / {items.length}
          </span>
          <span className="flex items-center gap-1">
            <button
              type="button"
              onClick={() => onNav(-1)}
              disabled={items.length < 2}
              aria-label="Previous photo"
              className="grid place-items-center h-8 w-8 rounded-[10px] hover:bg-[rgba(255,206,173,0.08)] text-[var(--cz-text-secondary)] hover:text-[var(--cz-text-primary)] transition-colors disabled:opacity-30"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>
            <button
              type="button"
              onClick={() => onNav(1)}
              disabled={items.length < 2}
              aria-label="Next photo"
              className="grid place-items-center h-8 w-8 rounded-[10px] hover:bg-[rgba(255,206,173,0.08)] text-[var(--cz-text-secondary)] hover:text-[var(--cz-text-primary)] transition-colors disabled:opacity-30"
            >
              <ChevronRight className="h-4 w-4" />
            </button>
            <button
              type="button"
              onClick={onClose}
              aria-label="Close viewer"
              className="grid place-items-center h-8 w-8 rounded-[10px] hover:bg-[rgba(255,206,173,0.08)] text-[var(--cz-text-secondary)] hover:text-[var(--cz-text-primary)] transition-colors"
            >
              <X className="h-4 w-4" />
            </button>
          </span>
        </div>
        <div className="p-3 sm:p-4 space-y-3">
          {loading ? (
            <div className="grid place-items-center py-16">
              <Loader2 className="h-6 w-6 animate-spin text-[var(--cz-text-secondary)]" />
            </div>
          ) : post ? (
            <PostCard
              post={post}
              currentUser={currentUser}
              isDetail
              onDelete={(id) => {
                onDeleted?.(id);
                onClose();
              }}
              onUpdate={onUpdated}
            />
          ) : (
            <p className="py-10 text-center text-[13px] text-[var(--cz-text-secondary)]">
              Couldn&apos;t load this photo.
            </p>
          )}
        </div>
      </div>
    </div>
  );

  if (typeof document === "undefined") return null;
  return createPortal(content, document.body);
}

export function ProfileMediaGrid({ username, currentUser }) {
  const [items, setItems] = useState([]);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(false);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [sel, setSel] = useState(null);

  const fetchPage = useCallback(
    async (p, append = false) => {
      if (append) setLoadingMore(true);
      else setLoading(true);
      try {
        const res = await api.getUserMedia(username, { page: p, limit: 21 });
        const d = res.data;
        setItems((prev) =>
          append ? [...prev, ...(d.posts || [])] : d.posts || [],
        );
        setHasMore(Boolean(d.hasMore));
        setPage(p);
      } catch {
        if (!append) setItems([]);
        setHasMore(false);
      } finally {
        setLoading(false);
        setLoadingMore(false);
      }
    },
    [username],
  );

  useEffect(() => {
    setItems([]);
    setSel(null);
    fetchPage(1, false);
  }, [fetchPage]);

  const handleNav = useCallback(
    (dir) => {
      setSel((s) => {
        if (s == null || items.length < 2) return s;
        return (s + dir + items.length) % items.length;
      });
    },
    [items.length],
  );

  const handleDeleted = useCallback((id) => {
    setItems((prev) => prev.filter((x) => String(x._id) !== String(id)));
  }, []);

  if (loading) {
    return (
      <div className="columns-2 sm:columns-3 gap-3">
        {Array.from({ length: 6 }).map((_, i) => (
          <div
            key={i}
            className="mb-3 break-inside-avoid rounded-[12px] border border-[var(--cz-border)] bg-[var(--cz-surface)] animate-pulse"
            style={{ height: `${140 + ((i * 67) % 120)}px` }}
          />
        ))}
      </div>
    );
  }

  if (items.length === 0) {
    return (
      <EmptyState
        icon={ImageIcon}
        title="No media yet"
        description={`@${username} hasn’t posted any photos yet. Image posts will appear here in a gallery.`}
      />
    );
  }

  return (
    <div>
      <div className="columns-2 sm:columns-3 gap-3">
        {items.map((it, i) => (
          <div key={it._id} className="mb-3 break-inside-avoid">
            <MediaTile item={it} onOpen={() => setSel(i)} />
          </div>
        ))}
      </div>
      {hasMore ? (
        <button
          type="button"
          onClick={() => fetchPage(page + 1, true)}
          disabled={loadingMore}
          className="mt-1 w-full rounded-[12px] border border-[var(--cz-border)] bg-transparent h-[40px] text-[13px] font-medium hover:bg-[var(--cz-surface)] transition-colors disabled:opacity-50"
        >
          {loadingMore ? (
            <span className="inline-flex items-center gap-2">
              <Loader2 className="h-4 w-4 animate-spin" /> Loading…
            </span>
          ) : (
            "Load more"
          )}
        </button>
      ) : (
        <p className="text-center text-[11px] text-[var(--cz-text-secondary)]/60 py-2">
          End • {items.length} photos
        </p>
      )}
      {sel != null && items[sel] ? (
        <MediaLightbox
          item={items[sel]}
          items={items}
          index={sel}
          currentUser={currentUser}
          onClose={() => setSel(null)}
          onNav={handleNav}
          onDeleted={handleDeleted}
        />
      ) : null}
    </div>
  );
}
