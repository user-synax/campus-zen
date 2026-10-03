"use client";

import { useState } from "react";
import { Flag, Loader2, Scale } from "lucide-react";
import { api } from "@/lib/api";
import { useMyAppeals, useMyReports } from "@/lib/hooks/queries";

const STATUS_LABEL = {
  open: "Under review",
  dismissed: "Reviewed — no violation",
  actioned: "Reviewed — action taken",
};

const APPEAL_STATUS_LABEL = {
  open: "Appeal under review",
  upheld: "Appeal upheld",
  rejected: "Appeal rejected",
};

export function SafetyReports() {
  const { data: reportsData, isPending: loadingReports, refetch } = useMyReports(true);
  const { data: appealsData, refetch: refetchAppeals } = useMyAppeals(true);
  const reports = reportsData?.data?.reports || [];
  const appeals = appealsData?.data?.appeals || [];
  const [appealFor, setAppealFor] = useState(null);
  const [message, setMessage] = useState("");
  const [sending, setSending] = useState(false);
  const [error, setError] = useState(null);

  const onAppeal = async (report) => {
    if (!message.trim()) return;
    setSending(true);
    setError(null);
    try {
      await api.appealReport(report._id, { type: "report", message: message.trim() });
      setAppealFor(null);
      setMessage("");
      refetch();
      refetchAppeals();
    } catch (e) {
      setError(e?.data?.message || e.message || "Failed to submit appeal");
    } finally {
      setSending(false);
    }
  };

  return (
    <section aria-label="Reports and appeals" className="mt-4 overflow-hidden rounded-[16px] border border-[var(--cz-border)]">
      <p className="flex items-center gap-2 border-b border-[var(--cz-border)] px-4 py-3 text-[15px] font-bold leading-[20px]">
        <Flag className="h-4 w-4" aria-hidden /> My reports
      </p>
      <div className="p-4">
        {loadingReports ? (
          <p className="flex items-center gap-2 text-[14px] text-[var(--cz-text-secondary)]">
            <Loader2 className="h-4 w-4 animate-spin" /> Loading…
          </p>
        ) : reports.length === 0 ? (
          <p className="text-[14px] text-[var(--cz-text-secondary)]">No reports filed. Reports you file appear here with their review status.</p>
        ) : (
          <ul className="flex flex-col gap-2.5">
            {reports.map((r) => (
              <li key={r._id} className="rounded-[12px] border border-[var(--cz-border)] p-3">
                <p className="text-[13px] text-[var(--cz-text-secondary)]">
                  {r.targetType} · {r.reason} · {new Date(r.createdAt).toLocaleDateString("en-IN", { month: "short", day: "numeric" })}
                </p>
                <p className="mt-1 text-[14px] font-bold">{STATUS_LABEL[r.status] || r.status}</p>
                {r.target ? (
                  <p className="mt-1 truncate text-[13px] text-[var(--cz-text-secondary)]">
                    {r.targetType === "post" ? r.target.text || "(media post)" : `@${r.target.username}`}
                  </p>
                ) : null}
                {r.appeal ? (
                  <p className="mt-1 text-[13px] text-[var(--cz-text-secondary)]">
                    Appeal: {APPEAL_STATUS_LABEL[r.appeal.status] || r.appeal.status}
                    {r.appeal.reviewNote ? ` — ${r.appeal.reviewNote}` : ""}
                  </p>
                ) : r.status !== "open" ? (
                  appealFor === r._id ? (
                    <div className="mt-2">
                      <textarea
                        value={message}
                        onChange={(e) => setMessage(e.target.value)}
                        maxLength={1000}
                        rows={3}
                        placeholder="Why should we take another look?"
                        className="w-full rounded-[12px] border border-[var(--cz-border-strong)] bg-transparent p-2.5 text-[14px] outline-none focus:border-[var(--cz-accent)]"
                      />
                      {error ? <p className="mt-1 text-[13px] text-[var(--cz-error)]">{error}</p> : null}
                      <div className="mt-2 flex gap-2">
                        <button
                          type="button"
                          disabled={sending || !message.trim()}
                          onClick={() => onAppeal(r)}
                          className="h-[32px] rounded-full bg-[var(--cz-accent)] px-4 text-[13px] font-bold text-white disabled:opacity-50"
                        >
                          {sending ? "Sending…" : "Submit appeal"}
                        </button>
                        <button
                          type="button"
                          onClick={() => { setAppealFor(null); setMessage(""); }}
                          className="h-[32px] rounded-full border border-[var(--cz-border-strong)] px-4 text-[13px] font-bold"
                        >
                          Cancel
                        </button>
                      </div>
                    </div>
                  ) : (
                    <button
                      type="button"
                      onClick={() => setAppealFor(r._id)}
                      className="mt-2 inline-flex items-center gap-1.5 h-[32px] rounded-full border border-[var(--cz-border-strong)] px-3 text-[13px] font-bold"
                    >
                      <Scale className="h-3.5 w-3.5" /> Appeal decision
                    </button>
                  )
                ) : null}
              </li>
            ))}
          </ul>
        )}

        {appeals.length > 0 ? (
          <div className="mt-4">
            <p className="mb-2 text-[13px] font-bold uppercase text-[var(--cz-text-secondary)]">Appeals</p>
            <ul className="flex flex-col gap-2">
              {appeals.map((a) => (
                <li key={a._id} className="rounded-[12px] bg-[var(--cz-surface-strong)]/60 p-3 text-[13px]">
                  <span className="font-bold">{a.type}</span>
                  <span className="text-[var(--cz-text-secondary)]"> · {APPEAL_STATUS_LABEL[a.status] || a.status}</span>
                  {a.reviewNote ? <span className="block mt-1">Review: {a.reviewNote}</span> : null}
                </li>
              ))}
            </ul>
          </div>
        ) : null}
      </div>
    </section>
  );
}
