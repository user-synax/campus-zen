import Link from "next/link";
import { Button } from "@/components/ui/button";

export function EmptyState({ icon: Icon, title, description, actionLabel, actionHref, onAction }) {
  return (
    <div className="flex flex-col items-center justify-center text-center py-14 px-6 rounded-[16px] border border-dashed border-[var(--cz-border)] bg-[rgba(255,255,255,0.02)]">
      {Icon ? (
        <span className="grid place-items-center h-12 w-12 rounded-[14px] bg-[var(--cz-surface)] border border-[var(--cz-border)] text-[var(--cz-text-secondary)] mb-4">
          <Icon className="h-6 w-6" />
        </span>
      ) : null}
      <h3 className="text-[15px] font-semibold tracking-[-0.02em] text-[var(--cz-text-primary)]">{title}</h3>
      {description ? <p className="mt-1.5 text-[13px] leading-[19px] text-[var(--cz-text-secondary)] max-w-[36ch]">{description}</p> : null}
      {actionLabel && (actionHref || onAction) ? (
        actionHref ? (
          <Link href={actionHref} className="mt-5 inline-flex">
            <span className="inline-flex items-center justify-center rounded-[10px] bg-[var(--cz-text-primary)] text-[var(--cz-text-inverse)] px-4 h-[36px] text-[13px] font-medium hover:bg-[#ffd9c0] transition-colors">
              {actionLabel}
            </span>
          </Link>
        ) : (
          <Button onClick={onAction} size="sm" className="mt-5">
            {actionLabel}
          </Button>
        )
      ) : null}
    </div>
  );
}
