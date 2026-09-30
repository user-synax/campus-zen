"use client";

import { forwardRef } from "react";
import { cn } from "@/lib/utils";

/**
 * DESIGN.md — Verified Badge: "Small inline icon (~16px) in #1d9bf0,
 * placed immediately after display name. Filled badge with check mark.
 * No text label in standard variant."
 *
 * The scalloped silhouette is the shape; the only colour is X Blue.
 */
const SCALLOP_PATH =
  "M20.396 11c-.018-.646-.215-1.275-.57-1.816-.354-.54-.852-.972-1.438-1.246.223-.607.27-1.264.14-1.897-.131-.634-.437-1.218-.882-1.687-.47-.445-1.053-.75-1.687-.882-.633-.13-1.29-.083-1.897.14-.273-.587-.704-1.086-1.245-1.44S11.647 1.62 11 1.604c-.646.017-1.273.213-1.813.568s-.969.854-1.24 1.44c-.608-.223-1.267-.272-1.902-.14-.635.13-1.22.436-1.69.882-.445.47-.749 1.055-.878 1.688-.13.633-.08 1.29.144 1.896-.587.274-1.087.705-1.443 1.245-.356.54-.555 1.17-.574 1.817.02.647.218 1.276.574 1.817.356.54.856.972 1.443 1.245-.224.606-.274 1.263-.144 1.896.13.634.433 1.218.877 1.688.47.443 1.054.747 1.687.878.633.132 1.29.084 1.897-.136.274.586.705 1.084 1.246 1.439.54.354 1.17.551 1.816.569.647-.016 1.276-.213 1.817-.567s.972-.854 1.245-1.44c.604.239 1.266.296 1.903.164.636-.132 1.22-.447 1.68-.907.46-.46.776-1.044.908-1.681s.075-1.299-.165-1.903c.586-.274 1.084-.705 1.439-1.246.354-.54.551-1.17.569-1.816z";

const verifiedBadgeSizePixels = {
  sm: 15,
  md: 18,
  lg: 22,
};

const verifiedBadgeToneClassNames = {
  brand: "text-[var(--cz-accent)]",
  neutral: "text-[var(--cz-text-secondary)]",
};

export function resolveVerifiedBadgePixelSize(size = "md") {
  if (typeof size === "number") {
    return Number.isFinite(size) && size > 0
      ? size
      : verifiedBadgeSizePixels.md;
  }
  return verifiedBadgeSizePixels[size] ?? verifiedBadgeSizePixels.md;
}

export function resolveVerifiedBadgeStrokeWidth(pixelSize) {
  return Math.max(2, Math.min(4, pixelSize * 0.16));
}

export function resolveVerifiedBadgeA11yProps({
  ariaLabel = "Verified",
  decorative = false,
}) {
  if (decorative) return { "aria-hidden": true };
  return { "aria-label": ariaLabel, role: "img" };
}

const VerifiedBadge = forwardRef(function VerifiedBadge(
  {
    size = "md",
    tone = "brand",
    decorative = false,
    className,
    "aria-label": ariaLabel = "Verified",
    style,
    ...props
  },
  ref,
) {
  const pixelSize = resolveVerifiedBadgePixelSize(size);
  const checkSize = pixelSize * 0.5;
  const strokeWidth = resolveVerifiedBadgeStrokeWidth(pixelSize);
  const a11yProps = resolveVerifiedBadgeA11yProps({
    ariaLabel,
    decorative,
  });

  return (
    <span
      ref={ref}
      className={cn(
        "relative inline-block shrink-0 align-middle",
        verifiedBadgeToneClassNames[tone] ?? verifiedBadgeToneClassNames.brand,
        className,
      )}
      style={{ width: pixelSize, height: pixelSize, ...style }}
      {...props}
      {...a11yProps}
    >
      <svg
        aria-hidden="true"
        className="absolute inset-0 h-full w-full"
        viewBox="0 0 22 22"
      >
        <path d={SCALLOP_PATH} fill="currentColor" />
      </svg>
      <svg
        aria-hidden="true"
        className="absolute inset-0 z-10 m-auto"
        fill="none"
        stroke="var(--cz-bg)"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={strokeWidth}
        style={{ width: checkSize, height: checkSize }}
        viewBox="0 0 24 24"
      >
        <polyline points="5 12.5 10 17.5 19 7.5" />
      </svg>
    </span>
  );
});

VerifiedBadge.displayName = "VerifiedBadge";

export { VerifiedBadge };
export default VerifiedBadge;
