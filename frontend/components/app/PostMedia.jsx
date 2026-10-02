"use client";

import { useState } from "react";
import { CzImage } from "@/components/app/CzImage";
import { ImageLightbox } from "@/components/app/ImageLightbox";
import { VideoPlayer } from "@/components/app/VideoPlayer";
import { normalizePostMedia } from "@/lib/media";
import { cn } from "@/lib/utils";

function GifBadge() {
  return (
    <span className="pointer-events-none absolute bottom-2 left-2 rounded-full bg-black/70 px-2 py-0.5 text-[11px] font-bold tracking-wide text-white">
      GIF
    </span>
  );
}

// Feed/detail renderer for post.media[] with legacy imageUrl fallback.
// - images + GIFs: same lazy blur-up CzImage path as before (GIFs ARE images)
// - video: poster-first VideoPlayer (preload="none", src only near-view + on play)
// - 2-4 attachments: compact 2-col grid, click opens the lightbox at index
export function PostMedia({ post, eager = false }) {
  const items = normalizePostMedia(post);
  const [lightbox, setLightbox] = useState(null);
  if (!items.length) return null;

  if (items.length === 1) {
    const m = items[0];
    if (m.kind === "video") {
      return (
        <div className="mt-3 overflow-hidden rounded-[16px] border border-[var(--cz-border)]">
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
          onClick={() => setLightbox(0)}
          aria-label="Open image viewer"
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
        {lightbox === 0 ? (
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
      >
        {items.slice(0, 4).map((m, i) => (
          <button
            key={`${m.url}-${i}`}
            type="button"
            onClick={() => setLightbox(i)}
            aria-label={`Open attachment ${i + 1}`}
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
      {lightbox != null && items[lightbox] ? (
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
