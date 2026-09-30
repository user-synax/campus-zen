"use client";

import { cva } from "class-variance-authority";
import { cn } from "@/lib/utils";

/**
 * DESIGN.md — "Use 9999px radius on all interactive buttons, tags, and
 * avatars." Every variant is a pill. X Blue is reserved for the one action
 * a screen is asking you to take; everything else stays achromatic.
 */
const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-full font-bold transition-colors duration-150 ease-[cubic-bezier(0.22,1,0.36,1)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--cz-accent)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--cz-bg)] disabled:pointer-events-none disabled:opacity-50 select-none cursor-pointer active:opacity-90",
  {
    variants: {
      variant: {
        // Follow / Post / primary CTA — the only filled-blue control.
        primary:
          "bg-[var(--cz-accent)] text-[var(--cz-text-inverse)] hover:bg-[var(--cz-accent-hover)]",
        // Followed state, secondary actions — hairline outline only.
        secondary:
          "bg-transparent text-[var(--cz-text-primary)] border border-[var(--cz-border-strong)] hover:bg-[var(--cz-surface-strong)]",
        // "Following ✓" affirmative action.
        accept:
          "bg-[var(--cz-text-primary)] text-[var(--cz-bg)] hover:opacity-90",
        // Ghost Nav Button — circular, transparent, mist hover.
        ghost:
          "bg-transparent text-[var(--cz-text-secondary)] hover:bg-[var(--cz-surface-strong)] hover:text-[var(--cz-text-primary)]",
        // Mist fill, for low-emphasis surfaces.
        muted:
          "bg-[var(--cz-surface-strong)] text-[var(--cz-text-primary)] hover:bg-[var(--cz-border)]",
        danger:
          "bg-transparent text-[var(--cz-error)] hover:bg-[color-mix(in_srgb,var(--cz-error)_10%,transparent)]",
        dangerSolid:
          "bg-[var(--cz-error)] text-white hover:opacity-90",
        link: "bg-transparent text-[var(--cz-accent)] hover:underline underline-offset-4 rounded-sm px-0",
      },
      size: {
        sm: "h-[32px] px-4 text-[14px]",
        default: "h-[36px] px-4 text-[15px]",
        lg: "h-[44px] px-5 text-[15px]",
        icon: "h-[36px] w-[36px] p-0",
        iconSm: "h-[32px] w-[32px] p-0",
        iconLg: "h-[44px] w-[44px] p-0",
      },
    },
    defaultVariants: {
      variant: "primary",
      size: "default",
    },
  },
);

export function Button({ className, variant, size, ...props }) {
  return (
    <button className={cn(buttonVariants({ variant, size, className }))} {...props} />
  );
}

export { buttonVariants };
