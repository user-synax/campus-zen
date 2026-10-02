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
import { CzImage } from "@/components/app/CzImage";
import { EmptyState } from "@/components/app/EmptyState";
import { PostCard } from "@/components/app/PostCard";
import { Button } from "@/components/ui/button";
import { api } from "@/lib/api";

import { normalizePostMedia, formatDuration } from "@/lib/media";

function firstVisual(item) {
  const list = normalizePostMedia(item);
  return list[0] || null;
}

function MediaTile({ item, onOpen }) {
  const first = firstVisual(item);
  const count = normalizePostMedia(item).length;
  const src = first?.posterUrl || first?.url || item.imageUrl;
  const isVideo = first?.kind === "video";
  return (
    <button
      type="button"
      onClick={onOpen}
      aria-label={
        item.text
          ? `Open ${isVideo ? "video" : "photo"}: ${item.text.slice(0, 60)}`
          : `Open ${isVideo ? "video" : "photo"}`
      }
      className="group relative block w-full overflow-hidden bg-[var(--cz-surface-strong)] text-left"
    >
      <CzImage
        src={src}
        alt={item.text || (isVideo ? "Post video" : "Post photo")}
        className="aspect-square w-full"
        imgClassName="aspect-square w-full transition-opacity duration-200 group-hover:opacity-90"
      />
      {isVideo ? (
        <span className="absolute top-2 right-2 flex items-center gap-1 rounded-full bg-black/70 px-2 py-0.5 text-[11px] font-bold text-white">
          <span aria-hidden>▶</span>
          {first?.duration ? formatDuration(first.duration) : "Video"}
        </span>
      ) : null}
      {first?.kind === "gif" ? (
        <span className="absolute bottom-2 left-2 rounded-full bg-black/70 px-2 py-0.5 text-[11px] font-bold text-white">
          GIF
        </span>
      ) : null}
      {count > 1 ? (
        <span className="absolute top-2 left-2 rounded-full bg-black/70 px-2 py-0.5 text-[11px] font-bold text-white">
          {count}
        </span>
      ) : null}
      <span
        aria-hidden
        className="pointer-events-none absolute inset-0 flex flex-col justify-end bg-gradient-to-t from-black/70 via-black/0 to-transparent p-2.5 opacity-0 transition-opacity group-hover:opacity-100 group-focus-visible:opacity-100"
      >
        <span className="flex items-center gap-3 text-[13px] font-bold text-white">
          <span className="inline-flex items-center gap-1">
            <Heart className="h-4 w-4" /> {item.likeCount ?? 0}
          </span>
          <span className="inline-flex items-center gap-1">
            <MessageCircle className="h-4 w-4" /> {item.replyCount ?? 0}
          </span>
        </span>
        {item.text ? (
          <span className="mt-1 line-clamp-2 text-[13px] leading-[16px] text-white/90">
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
    <div className="fixed inset-0 z-50 flex items-center justify-center sm:p-6">
      <button
        type="button"
        aria-label="Close"
        onClick={onClose}
        className="absolute inset-0 cursor-default border-0 bg-[var(--cz-overlay)] p-0 backdrop-blur-[2px] m-0"
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Photo viewer"
        className="relative flex max-h-[92dvh] w-full max-w-[600px] flex-col overflow-hidden rounded-[16px] border border-[var(--cz-border)] bg-[var(--cz-elevated)] shadow-[var(--shadow-sm)]"
      >
        <div className="sticky top-0 z-10 flex h-[53px] items-center justify-between gap-2 border-b border-[var(--cz-border)] bg-[var(--cz-elevated)] px-4">
          <span className="text-[15px] font-bold text-[var(--cz-text-primary)]">
            {index + 1} of {items.length}
          </span>
          <span className="flex items-center gap-1">
            <button
              type="button"
              onClick={() => onNav(-1)}
              disabled={items.length < 2}
              aria-label="Previous photo"
              className="grid h-[34px] w-[34px] place-items-center rounded-full text-[var(--cz-text-primary)] transition-colors hover:bg-[var(--cz-surface-strong)] disabled:opacity-30"
            >
              <ChevronLeft className="h-[18px] w-[18px]" />
            </button>
            <button
              type="button"
              onClick={() => onNav(1)}
              disabled={items.length < 2}
              aria-label="Next photo"
              className="grid h-[34px] w-[34px] place-items-center rounded-full text-[var(--cz-text-primary)] transition-colors hover:bg-[var(--cz-surface-strong)] disabled:opacity-30"
            >
              <ChevronRight className="h-[18px] w-[18px]" />
            </button>
            <button
              type="button"
              onClick={onClose}
              aria-label="Close viewer"
              className="grid h-[34px] w-[34px] place-items-center rounded-full text-[var(--cz-text-primary)] transition-colors hover:bg-[var(--cz-surface-strong)]"
            >
              <X className="h-[18px] w-[18px]" />
            </button>
          </span>
        </div>
        <div className="flex-1 space-y-3 overflow-y-auto p-4">
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
            <p className="py-10 text-center text-[15px] text-[var(--cz-text-secondary)]">
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
      <div className="grid grid-cols-2 gap-0.5 p-0.5 sm:grid-cols-3">
        {Array.from({ length: 9 }).map((_, i) => (
          <div
            key={i}
            style={{ "--skel-idx": i % 3 }}
            className="t-skel-item aspect-square"
          >
            <div className="t-shimmer h-full w-full" />
          </div>
        ))}
      </div>
    );
  }

  if (items.length === 0) {
    return (
      <EmptyState
        icon={ImageIcon}
        title="No media yet"
        description={`@${username} hasn't posted any photos, GIFs or videos yet.`}
      />
    );
  }

  return (
    <div>
      {/* Profile media grid — square tiles, 2px gaps, no radius (DESIGN.md) */}
      <div className="grid grid-cols-2 gap-0.5 p-0.5 sm:grid-cols-3">
        {items.map((it, i) => (
          <MediaTile key={it._id} item={it} onOpen={() => setSel(i)} />
        ))}
      </div>
      {hasMore ? (
        <div className="p-4">
          <Button
            onClick={() => fetchPage(page + 1, true)}
            disabled={loadingMore}
            variant="secondary"
            className="w-full"
          >
            {loadingMore ? (
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
          {items.length} {items.length === 1 ? "post" : "posts"}
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
