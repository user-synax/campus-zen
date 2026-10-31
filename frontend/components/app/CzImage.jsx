"use client";

import { useState } from "react";
import { optimizedImageUrl } from "@/lib/imageUrl";
import { cn } from "@/lib/utils";

/**
 * Remote image with blur-up reveal over a shimmer slot.
 *
 * The wrapper reserves the slot (bg + shimmer sweep) so there is no layout
 * shift; the img fades in from blur(8px) via `.t-img.is-loaded`. Parents keep
 * their own rounding/overflow — the wrapper just fills them.
 *
 * `fit="cover"` (default) fills the slot and crops — right for avatars,
 * banners and square grid tiles. `fit="contain"` shows the whole image at
 * its natural aspect ratio (letterboxed by the wrapper bg) — right for feed
 * post attachments of any size. Pair contain with a `max-h-*` imgClassName
 * so very tall photos are capped instead of stretching the feed.
 *
 * `optimize` (default true) swaps Appwrite file-view URLs for resized
 * preview URLs (see lib/imageUrl.js). If that request fails the original URL
 * is retried once, so a storage setting that disallows previews degrades to
 * the previous behaviour instead of a broken image. Callers rendering an
 * animated GIF pass `optimize={false}` — a still preview would lose the
 * animation.
 */
export function CzImage({
  src,
  alt = "",
  className,
  imgClassName,
  eager = false,
  fit = "cover",
  optimize = true,
  width = 800,
  ...rest
}) {
  const [loaded, setLoaded] = useState(false);
  const [failed, setFailed] = useState(false);
  const [fallbackSrc, setFallbackSrc] = useState(null);
  if (!src || failed) return null;
  const contain = fit === "contain";
  const optimized = optimize ? optimizedImageUrl(src, { width }) : src;
  const activeSrc = fallbackSrc || optimized;
  return (
    <span
      className={cn(
        "relative block overflow-hidden",
        contain ? "bg-transparent" : "bg-[var(--cz-skeleton)]",
        className,
      )}
    >
      {!loaded ? (
        <span aria-hidden className="t-shimmer absolute inset-0" />
      ) : null}
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={activeSrc}
        alt={alt}
        loading={eager ? "eager" : "lazy"}
        decoding="async"
        draggable={false}
        onLoad={() => setLoaded(true)}
        onError={() => {
          // One free retry at the original URL before giving up.
          if (!fallbackSrc && activeSrc !== src) setFallbackSrc(src);
          else setFailed(true);
        }}
        className={cn(
          "t-img relative",
          contain
            ? "mx-auto block h-auto max-w-full object-contain"
            : "h-full w-full object-cover",
          loaded && "is-loaded",
          imgClassName,
        )}
        {...rest}
      />
    </span>
  );
}
