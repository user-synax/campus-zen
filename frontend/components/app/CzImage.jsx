"use client";

import { useState } from "react";
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
 */
export function CzImage({
  src,
  alt = "",
  className,
  imgClassName,
  eager = false,
  fit = "cover",
  ...rest
}) {
  const [loaded, setLoaded] = useState(false);
  const [failed, setFailed] = useState(false);
  if (!src || failed) return null;
  const contain = fit === "contain";
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
        src={src}
        alt={alt}
        loading={eager ? "eager" : "lazy"}
        decoding="async"
        draggable={false}
        onLoad={() => setLoaded(true)}
        onError={() => setFailed(true)}
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
