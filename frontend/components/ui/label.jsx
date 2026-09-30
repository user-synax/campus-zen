import { cn } from "@/lib/utils";

/**
 * DESIGN.md: X never uppercases form labels. Sentence case, 15px, bold,
 * Ink Black — the same type as everything else in the interface.
 */
export function Label({ className, ...props }) {
  return (
    <label
      className={cn(
        "text-[15px] font-bold leading-tight text-[var(--cz-text-primary)]",
        className,
      )}
      {...props}
    />
  );
}
