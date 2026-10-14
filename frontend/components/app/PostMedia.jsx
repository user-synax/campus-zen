"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { EyeOff } from "lucide-react";
import { CzImage } from "@/components/app/CzImage";
import { ImageLightbox } from "@/components/app/ImageLightbox";
import { VideoPlayer } from "@/components/app/VideoPlayer";
import { normalizePostMedia } from "@/lib/media";
import { useMe } from "@/lib/hooks/queries";
import {
  hideSensitiveAgain,
  isRevealedSensitive,
  markRevealedSensitive,
} from "@/lib/sensitive";
import { cn } from "@/lib/utils";

function GifBadge() {
  return (
    <span className="pointer-events-none absolute bottom-2 left-2 rounded-full bg-black/70 px-2 py-0.5 text-[11px] font-bold tracking-wide text-white">
      GIF
    </span>
  );
}

function SensitiveBadge({ className }) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-full bg-[var(--cz-error)] px-2 py-0.5 text-[11px] font-extrabold tracking-wide text-white",
        className,
      )}
    >
      18+
    </span>
  );
}

// Feed/detail renderer for post.media[] with legacy imageUrl fallback.
// - images + GIFs: same lazy blur-up CzImage path as before (GIFs ARE images)
// - video: poster-first VideoPlayer (preload="none", src only near-view + on play)
// - 2-4 attachments: compact 2-col grid, click opens the lightbox at index
// - 18+ posts (post.isSensitive): media stays blurred behind a moving overlay.
//   Tap reveals with a click-origin radial wipe when viewer enabled
//   "Show 18+ posts", otherwise a popover + red flash prompts settings.
export function PostMedia({ post, eager = false, viewerShowSensitive }) {
  const items = normalizePostMedia(post);
  const [lightbox, setLightbox] = useState(null);
  const isSensitive = Boolean(post?.isSensitive);

  if (!items.length) return null;
  if (!isSensitive) {
    return <ClearMedia items={items} eager={eager} lightbox={lightbox} setLightbox={setLightbox} />;
  }
  return (
    <SensitiveGate post={post} viewerShowSensitive={viewerShowSensitive}>
      <ClearMedia items={items} eager={eager} lightbox={lightbox} setLightbox={setLightbox} gated />
    </SensitiveGate>
  );
}

function ClearMedia({ items, eager, lightbox, setLightbox, gated = false }) {
  const inertProps = gated ? { "aria-hidden": true, style: { pointerEvents: "none" } } : {};
  if (items.length === 1) {
    const m = items[0];
    if (m.kind === "video") {
      return (
        <div className="mt-3 overflow-hidden rounded-[16px] border border-[var(--cz-border)]" {...(gated ? inertProps : {})}>
          <VideoPlayer
            src={m.url}
            poster={m.posterUrl}
            duration={m.duration}
            eager={eager}
          />
        </div>
      );
    }
    return (
      <>
        <button
          type="button"
          onClick={() => !gated && setLightbox(0)}
          aria-label="Open image viewer"
          tabIndex={gated ? -1 : 0}
          className="relative mt-3 block min-h-[200px] w-full cursor-zoom-in overflow-hidden rounded-[16px] border border-[var(--cz-border)]"
        >
          <CzImage
            src={m.url}
            alt="Post attachment"
            fit="contain"
            className="w-full"
            imgClassName="max-h-[510px]"
            eager={eager}
          />
          {m.kind === "gif" ? <GifBadge /> : null}
        </button>
        {lightbox === 0 && !gated ? (
          <ImageLightbox
            src={m.url}
            alt="Post attachment"
            onClose={() => setLightbox(null)}
          />
        ) : null}
      </>
    );
  }

  return (
    <>
      <div
        className={cn(
          "mt-3 grid gap-1 overflow-hidden rounded-[16px] border border-[var(--cz-border)]",
          "grid-cols-2",
        )}
        {...(gated ? inertProps : {})}
      >
        {items.slice(0, 4).map((m, i) => (
          <button
            key={`${m.url}-${i}`}
            type="button"
            onClick={() => !gated && setLightbox(i)}
            aria-label={`Open attachment ${i + 1}`}
            tabIndex={gated ? -1 : 0}
            className="relative block min-h-[140px] cursor-zoom-in overflow-hidden"
          >
            {m.kind === "video" ? (
              <span className="relative block">
                <CzImage
                  src={m.posterUrl || m.url}
                  alt="Video poster"
                  className="aspect-square w-full sm:aspect-[4/3]"
                />
                <span className="absolute inset-0 grid place-items-center bg-black/25">
                  <span className="grid h-10 w-10 place-items-center rounded-full bg-black/65 text-[11px] font-bold text-white">
                    ▶
                  </span>
                </span>
              </span>
            ) : (
              <span className="relative block">
                <CzImage
                  src={m.url}
                  alt="Post attachment"
                  className="aspect-square w-full sm:aspect-[4/3]"
                />
                {m.kind === "gif" ? <GifBadge /> : null}
              </span>
            )}
          </button>
        ))}
      </div>
      {lightbox != null && items[lightbox] && !gated ? (
        items[lightbox].kind === "video" ? (
          <VideoLightbox
            item={items[lightbox]}
            onClose={() => setLightbox(null)}
          />
        ) : (
          <ImageLightbox
            src={items[lightbox].url}
            alt={`Attachment ${(lightbox ?? 0) + 1} of ${items.length}`}
            onClose={() => setLightbox(null)}
          />
        )
      ) : null}
    </>
  );
}

function SensitiveGate({ post, viewerShowSensitive, children }) {
  const { data: meData } = useMe();
  const meShow = Boolean(meData?.data?.user?.showSensitive);
  const canShow = viewerShowSensitive !== undefined ? Boolean(viewerShowSensitive) : meShow;

  const postId = post?._id ? String(post._id) : null;
  const [revealed, setRevealed] = useState(() => (postId ? isRevealedSensitive(postId) : false));
  const [origin, setOrigin] = useState(null);
  const [closing, setClosing] = useState(false);
  const [closed, setClosed] = useState(false);
  const [popover, setPopover] = useState(false);
  const [flashKey, setFlashKey] = useState(0);
  const wrapRef = useRef(null);
  const timerRef = useRef(null);

  useEffect(() => {
    setRevealed(postId ? isRevealedSensitive(postId) : false);
    setClosing(false);
    setClosed(false);
    setPopover(false);
  }, [postId]);

  useEffect(() => {
    const sync = () => setRevealed(postId ? isRevealedSensitive(postId) : false);
    window.addEventListener("cz:sensitive-revealed", sync);
    return () => window.removeEventListener("cz:sensitive-revealed", sync);
  }, [postId]);

  useEffect(() => () => {
    if (timerRef.current) clearTimeout(timerRef.current);
  }, []);

  const handleOverlayClick = useCallback(
    (e) => {
      if (revealed || closing) return;
      const rect = wrapRef.current?.getBoundingClientRect();
      const x = rect ? e.clientX - rect.left : rect?.width / 2 || 160;
      const y = rect ? e.clientY - rect.top : 160;
      if (!canShow) {
        setPopover(true);
        setFlashKey((k) => k + 1);
        return;
      }
      setOrigin({ x: Math.max(0, x), y: Math.max(0, y) });
      setClosing(true);
      setClosed(false);
      requestAnimationFrame(() => {
        requestAnimationFrame(() => setClosed(true));
      });
      timerRef.current = setTimeout(() => {
        if (postId) markRevealedSensitive(postId);
        setRevealed(true);
      }, 620);
    },
    [revealed, closing, canShow, postId],
  );

  const handleHideAgain = useCallback(
    (e) => {
      e.stopPropagation();
      if (postId) hideSensitiveAgain(postId);
      setRevealed(false);
      setClosing(false);
      setClosed(false);
      setOrigin(null);
    },
    [postId],
  );

  if (revealed) {
    return (
      <div className="relative">
        {children}
        <div className="mt-2 flex items-center gap-2">
          <SensitiveBadge />
          <button
            type="button"
            onClick={handleHideAgain}
            className="text-[13px] font-bold text-[var(--cz-text-secondary)] hover:underline"
          >
            Hide 18+
          </button>
        </div>
      </div>
    );
  }

  return (
    <div ref={wrapRef} className="cz-sensitive-wrap relative mt-3">
      <div className="cz-sensitive-blurred overflow-hidden rounded-[16px] border border-[var(--cz-border)]">
        {children}
      </div>

      {/* Moving blur overlay — animated sweep + dark tint. Click origin drives the reveal wipe. */}
      <button
        type="button"
        onClick={handleOverlayClick}
        aria-label={
          canShow
            ? "Sensitive 18+ content — tap to reveal"
            : "Sensitive 18+ content — enable Show 18+ in settings to reveal"
        }
        className="cz-sensitive-overlay absolute inset-0 w-full cursor-pointer overflow-hidden rounded-[16px] border border-[var(--cz-border)]"
        style={
          closing && origin
            ? {
                clipPath: closed
                  ? `circle(0px at ${origin.x}px ${origin.y}px)`
                  : `circle(150% at ${origin.x}px ${origin.y}px)`,
              }
            : undefined
        }
      >
        <span aria-hidden className="cz-sensitive-sweep absolute inset-0" />
        <span aria-hidden className="absolute inset-0 bg-black/45" />
        <span className="absolute inset-0 grid place-items-center p-4">
          <span className="flex flex-col items-center gap-2 text-center">
            <span className="grid h-11 w-11 place-items-center rounded-full bg-black/65 text-white backdrop-blur-sm">
              <EyeOff className="h-5 w-5" aria-hidden />
            </span>
            <SensitiveBadge />
            <span className="text-[15px] font-extrabold leading-[20px] text-white">
              18+ content
            </span>
            <span className="max-w-[240px] text-[13px] leading-[17px] text-white/85">
              {canShow ? "Tap to reveal" : "Turn on Show 18+ in settings to view"}
            </span>
          </span>
        </span>
      </button>

      {popover ? (
        <div
          role="dialog"
          aria-live="assertive"
          aria-label="Enable Show 18+ posts"
          className="t-menu is-open absolute left-1/2 top-1/2 z-20 w-[260px] -translate-x-1/2 -translate-y-1/2 overflow-hidden rounded-[16px] border border-[var(--cz-border)] bg-[var(--cz-elevated)] p-4 text-center shadow-[var(--shadow-sm)]"
        >
          <p className="flex items-center justify-center gap-1.5 text-[15px] font-extrabold text-[var(--cz-text-primary)]">
            <EyeOff className="h-4 w-4" aria-hidden /> 18+ content hidden
          </p>
          <p className="mt-1 text-[14px] leading-[19px] text-[var(--cz-text-secondary)]">
            Turn on Show 18+ posts in settings to view this media.
          </p>
          <div className="mt-3 flex items-center justify-center gap-2">
            <Link
              href="/app/menu"
              className="inline-flex h-[36px] items-center justify-center rounded-full bg-[var(--cz-error)] px-4 text-[14px] font-bold text-white transition-opacity hover:opacity-90"
            >
              Open settings
            </Link>
            <button
              type="button"
              onClick={() => setPopover(false)}
              className="inline-flex h-[36px] items-center justify-center rounded-full border border-[var(--cz-border-strong)] px-4 text-[14px] font-bold text-[var(--cz-text-primary)] hover:bg-[var(--cz-surface-strong)]"
            >
              Close
            </button>
          </div>
        </div>
      ) : null}

      {flashKey > 0 ? (
        <RedFlash key={flashKey} flashKey={flashKey} />
      ) : null}
    </div>
  );
}

function RedFlash({ flashKey }) {
  const [visible, setVisible] = useState(true);
  useEffect(() => {
    setVisible(true);
    const t = setTimeout(() => setVisible(false), 500);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  if (!visible) return null;
  return (
    <div
      key={flashKey}
      aria-hidden
      className="cz-red-flash pointer-events-none fixed inset-0 z-[80]"
    />
  );
}

function VideoLightbox({ item, onClose }) {
  if (typeof document === "undefined") return null;
  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center p-4 sm:p-6">
      <button
        type="button"
        aria-label="Close viewer"
        onClick={onClose}
        className="absolute inset-0 cursor-default border-0 bg-black/70 p-0 backdrop-blur-md"
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Video viewer"
        className="relative w-full max-w-[720px] overflow-hidden rounded-[16px] bg-black shadow-[var(--shadow-sm)]"
      >
        {/* user-uploaded video: no caption track exists */}
        {/* biome-ignore lint/a11y/useMediaCaption: user uploads have no captions */}
        {/* eslint-disable-next-line jsx-a11y/media-has-caption */}
        <video
          src={item.url}
          poster={item.posterUrl || undefined}
          controls
          autoPlay
          playsInline
          preload="metadata"
          className="max-h-[80dvh] w-full"
        />
      </div>
    </div>
  );
}
