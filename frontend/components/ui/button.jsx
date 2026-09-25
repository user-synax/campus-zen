"use client";

import { cva } from "class-variance-authority";
import { cn } from "@/lib/utils";

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-[10px] text-[13px] font-medium tracking-[-0.01em] transition-all duration-[150ms] ease-[cubic-bezier(0.22,1,0.36,1)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--cz-muted)] focus-visible:ring-offset-0 disabled:pointer-events-none disabled:opacity-45 select-none cursor-pointer active:scale-[0.98] will-change-transform",
  {
    variants: {
      variant: {
        primary:
          "bg-[var(--cz-text-primary)] text-[var(--cz-text-inverse)] hover:bg-[#ffd9c0] shadow-[0_1px_0_0_rgba(0,0,0,0.12)] hover:shadow-[0_4px_16px_rgba(255,206,173,0.18)]",
        secondary:
          "bg-[var(--cz-surface)] text-[var(--cz-text-primary)] border border-[var(--cz-border)] hover:border-[var(--cz-border-strong)] hover:bg-[var(--cz-surface-strong)]",
        ghost:
          "bg-transparent text-[var(--cz-text-secondary)] hover:text-[var(--cz-text-primary)] hover:bg-[rgba(255,206,173,0.06)]",
        muted:
          "bg-[var(--cz-muted)] text-white hover:bg-[#6b70d6] shadow-[0_4px_16px_rgba(125,130,217,0.24)]",
      },
      size: {
        default: "h-[42px] px-[18px] py-2",
        sm: "h-[34px] px-3 text-[12px]",
        lg: "h-[46px] px-6 text-[14px]",
        icon: "h-[42px] w-[42px] p-0",
      },
    },
    defaultVariants: {
      variant: "primary",
      size: "default",
    },
  }
);

export function Button({ className, variant, size, ...props }) {
  return (
    <button className={cn(buttonVariants({ variant, size, className }))} {...props} />
  );
}

export { buttonVariants };
