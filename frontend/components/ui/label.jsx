import { cn } from "@/lib/utils";

export function Label({ className, ...props }) {
  return (
    <label
      className={cn(
        "text-[12px] font-medium tracking-[0.04em] uppercase text-[var(--cz-text-secondary)] leading-none",
        className
      )}
      {...props}
    />
  );
}
