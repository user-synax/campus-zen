"use client";

import { CheckCircle2, Flag, Loader2, X } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { api } from "@/lib/api";

const REASONS = [
  ["spam", "Spam or scam"],
  ["harassment", "Harassment or bullying"],
  ["hate", "Hate speech"],
  ["sexual", "Sexual content"],
  ["misinformation", "Misinformation"],
  ["other", "Something else"],
];

export function ReportDialog({
  targetType,
  targetId,
  targetLabel,
  onClose,
  onSubmitted,
}) {
  const [reason, setReason] = useState("");
  const [details, setDetails] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [done, setDone] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    if (!reason || loading) return;
    setLoading(true);
    setError("");
    try {
      await api.fileReport({
        targetType,
        targetId,
        reason,
        details: details.trim() || undefined,
      });
      setDone(true);
      setTimeout(() => onSubmitted?.(), 900);
    } catch (err) {
      setError(err.data?.message || err.message || "Couldn't submit report");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center sm:items-center sm:p-4"
      role="dialog"
      aria-modal="true"
      aria-label="Report"
    >
      <button
        aria-label="Close"
        onClick={onClose}
        className="absolute inset-0 cursor-default border-0 bg-[var(--cz-overlay)] backdrop-blur-[2px]"
        tabIndex={-1}
      />
      <div className="t-modal is-open relative w-full max-w-[440px] overflow-hidden rounded-t-[16px] border border-[var(--cz-border)] bg-[var(--cz-elevated)] sm:rounded-[16px] shadow-[var(--shadow-sm)]">
        {done ? (
          <div className="flex flex-col items-center px-6 py-10 text-center">
            <span className="grid h-12 w-12 place-items-center rounded-full border border-[var(--cz-border-strong)]">
              <CheckCircle2
                className="h-6 w-6 text-[var(--cz-success)]"
                strokeWidth={1.8}
                aria-hidden
              />
            </span>
            <h3 className="mt-4 text-[20px] font-extrabold leading-6 text-[var(--cz-text-primary)]">
              Report submitted
            </h3>
            <p className="mt-2 text-[15px] leading-[20px] text-[var(--cz-text-secondary)]">
              Thanks for keeping CampusZen safe. You won&apos;t see this{" "}
              {targetType} anymore.
            </p>
          </div>
        ) : (
          <form onSubmit={submit}>
            <div className="flex items-start justify-between gap-3 border-b border-[var(--cz-border)] px-4 py-3">
              <h3 className="text-[20px] leading-6 font-extrabold text-[var(--cz-text-primary)]">
                Report {targetType}
                {targetLabel ? (
                  <span className="mt-0.5 block truncate text-[15px] font-normal leading-[20px] text-[var(--cz-text-secondary)]">
                    {targetLabel}
                  </span>
                ) : null}
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

            <div
              className="flex flex-col gap-1 px-4 py-3"
              role="radiogroup"
              aria-label="Reason"
            >
              {REASONS.map(([value, label]) => (
                <label
                  key={value}
                  className={`flex cursor-pointer items-center gap-2.5 rounded-[4px] px-2 py-2 text-[15px] leading-[20px] transition-colors ${
                    reason === value
                      ? "bg-[var(--cz-accent-soft)] text-[var(--cz-text-primary)]"
                      : "text-[var(--cz-text-secondary)] hover:bg-[var(--cz-surface-strong)] hover:text-[var(--cz-text-primary)]"
                  }`}
                >
                  <input
                    type="radio"
                    name="reason"
                    value={value}
                    checked={reason === value}
                    onChange={() => setReason(value)}
                    className="h-4 w-4 accent-[var(--cz-accent)]"
                  />
                  {label}
                </label>
              ))}
            </div>

            <div className="px-4">
              <textarea
                value={details}
                onChange={(e) => setDetails(e.target.value)}
                maxLength={500}
                rows={2}
                placeholder="Anything else we should know? (optional)"
                className="w-full resize-none rounded-[4px] bg-[var(--cz-surface-strong)] px-3 py-2 text-[15px] leading-[20px] text-[var(--cz-text-primary)] outline-none placeholder:text-[var(--cz-text-secondary)] focus:ring-1 focus:ring-[var(--cz-accent)]"
              />
              {error ? (
                <p className="mt-2 text-[13px] text-[var(--cz-error)]">{error}</p>
              ) : null}
            </div>

            <div className="flex items-center gap-3 px-4 py-4">
              <Button
                type="button"
                variant="secondary"
                onClick={onClose}
                className="flex-1"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={!reason || loading}
                className="flex-1"
              >
                {loading ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <>
                    <Flag className="h-4 w-4" aria-hidden />
                    Submit
                  </>
                )}
              </Button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
