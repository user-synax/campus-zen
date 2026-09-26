"use client";

import { CheckCircle2, Flag, Loader2 } from "lucide-react";
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
      className="fixed inset-0 z-50 flex items-end justify-center p-3 sm:items-center"
      role="dialog"
      aria-modal="true"
      aria-label="Report"
    >
      <button
        aria-label="Close"
        onClick={onClose}
        className="absolute inset-0 border-0 bg-black/60 backdrop-blur-[1px]"
      />
      <div className="relative w-full max-w-[420px] rounded-[16px] border border-[var(--cz-border)] bg-[var(--cz-surface)] p-5 shadow-[0_16px_40px_rgba(0,0,0,0.5)]">
        {done ? (
          <div className="flex flex-col items-center py-4 text-center">
            <span className="grid h-12 w-12 place-items-center rounded-full border border-emerald-500/20 bg-emerald-500/15">
              <CheckCircle2 className="h-6 w-6 text-emerald-400" />
            </span>
            <h3 className="mt-3 text-[15px] font-semibold tracking-[-0.02em]">
              Report submitted
            </h3>
            <p className="mt-1 text-[13px] leading-[19px] text-[var(--cz-text-secondary)]">
              Thanks for keeping CampusZen safe. You won&apos;t see this{" "}
              {targetType} anymore.
            </p>
          </div>
        ) : (
          <form onSubmit={submit}>
            <h3 className="flex items-center gap-2 text-[15px] font-semibold tracking-[-0.02em]">
              <Flag className="h-4 w-4 text-[var(--cz-text-secondary)]" />{" "}
              Report {targetType}
            </h3>
            {targetLabel ? (
              <p className="mt-1 truncate text-[12px] text-[var(--cz-text-secondary)]">
                {targetLabel}
              </p>
            ) : null}

            <div
              className="mt-4 flex flex-col gap-1"
              role="radiogroup"
              aria-label="Reason"
            >
              {REASONS.map(([value, label]) => (
                <label
                  key={value}
                  className={`flex cursor-pointer items-center gap-2.5 rounded-[10px] border px-3 py-2 text-[13px] transition-colors ${
                    reason === value
                      ? "border-[var(--cz-muted)]/60 bg-[rgba(125,130,217,0.1)] text-[var(--cz-text-primary)]"
                      : "border-[var(--cz-border)] text-[var(--cz-text-secondary)] hover:text-[var(--cz-text-primary)] hover:bg-[rgba(255,206,173,0.04)]"
                  }`}
                >
                  <input
                    type="radio"
                    name="reason"
                    value={value}
                    checked={reason === value}
                    onChange={() => setReason(value)}
                    className="h-3.5 w-3.5 accent-[#7d82d9]"
                  />
                  {label}
                </label>
              ))}
            </div>

            <textarea
              value={details}
              onChange={(e) => setDetails(e.target.value)}
              maxLength={500}
              rows={2}
              placeholder="Anything we should know? (optional)"
              className="mt-3 w-full rounded-[10px] border border-[var(--cz-border)] bg-[rgba(255,255,255,0.03)] px-3 py-2 text-[13px] leading-[18px] outline-none placeholder:text-[var(--cz-text-secondary)]/50"
            />

            {error ? (
              <p className="mt-2 text-[12px] text-[var(--cz-error)]">{error}</p>
            ) : null}

            <div className="mt-4 flex items-center gap-2">
              <Button
                type="button"
                variant="secondary"
                onClick={onClose}
                className="h-[38px] flex-1"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={!reason || loading}
                className="h-[38px] flex-1"
              >
                {loading ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  "Submit report"
                )}
              </Button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
