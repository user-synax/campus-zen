"use client";

import { X } from "lucide-react";
import { useEffect } from "react";
import { InterestTagPicker } from "@/components/app/InterestTagChips";
import { useAnimatedMount } from "@/components/app/useAnimatedMount";
import { Button } from "@/components/ui/button";
import { MAX_INTEREST_TAGS } from "@/lib/interestTags";

/**
 * Tag-selection modal for the composer — a bottom sheet on phones, centered
 * dialog on larger screens (same skeleton as ReportDialog). Topic chips stay
 * in the composer's state, so drafts and submit validation don't care where
 * the picker lives.
 */
export function InterestTagPickerModal({
  open,
  tags,
  onToggle,
  hint,
  onClose,
}) {
  const { show, mountClass } = useAnimatedMount(open);

  useEffect(() => {
    if (!open) return;
    const onKey = (e) => {
      if (e.key === "Escape") onClose?.();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  if (!show) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center sm:items-center sm:p-4"
      role="dialog"
      aria-modal="true"
      aria-label="Post topics"
    >
      <button
        type="button"
        aria-label="Close"
        onClick={onClose}
        className={`t-backdrop ${mountClass} absolute inset-0 cursor-default border-0 bg-[var(--cz-overlay)] backdrop-blur-[2px]`}
        tabIndex={-1}
      />
      <div
        className={`t-modal ${mountClass} relative flex max-h-[80dvh] w-full max-w-[440px] flex-col overflow-hidden rounded-t-[16px] border border-[var(--cz-border)] bg-[var(--cz-elevated)] sm:rounded-[16px] shadow-[var(--shadow-sm)]`}
      >
        <div className="flex items-start justify-between gap-3 border-b border-[var(--cz-border)] px-4 py-3">
          <h3 className="text-[20px] font-extrabold leading-6 text-[var(--cz-text-primary)]">
            Post topics
            <span className="mt-0.5 block text-[14px] font-normal leading-[18px] text-[var(--cz-text-secondary)]">
              Optional, up to 3 — tagged posts show up in the Interest Hub.
            </span>
          </h3>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="-mr-1 grid h-[34px] w-[34px] shrink-0 place-items-center rounded-full text-[var(--cz-text-secondary)] transition-colors hover:bg-[var(--cz-surface-strong)] hover:text-[var(--cz-text-primary)]"
          >
            <X className="h-[18px] w-[18px]" aria-hidden />
          </button>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto px-4 py-4">
          <InterestTagPicker
            selected={tags}
            max={MAX_INTEREST_TAGS}
            onToggle={onToggle}
          />
          {hint ? (
            <p
              aria-live="polite"
              className="mt-2 text-[12.5px]  font-semibold text-[var(--cz-error)]"
            >
              {hint}
            </p>
          ) : null}
        </div>

        <div className="flex items-center justify-between gap-3 border-t border-[var(--cz-border)] px-4 py-3 sm:justify-end">
          <span className="text-[13px] font-semibold tabular-nums text-[var(--cz-text-secondary)] sm:mr-2">
            {tags.length}/{MAX_INTEREST_TAGS} selected
          </span>
          <Button type="button" size="sm" onClick={onClose}>
            Done
          </Button>
        </div>
      </div>
    </div>
  );
}
