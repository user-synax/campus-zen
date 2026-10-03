"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Download, Loader2, Trash2 } from "lucide-react";
import { api } from "@/lib/api";

export function AccountData({ user }) {
  const router = useRouter();
  const [busy, setBusy] = useState(null);
  const [error, setError] = useState(null);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const scheduled = user?.scheduledDeletionAt ? new Date(user.scheduledDeletionAt) : null;
  const isDeactivated = Boolean(user?.isDeactivated);

  const onExport = async () => {
    setBusy("export");
    setError(null);
    try {
      const res = await api.exportData();
      const blob = new Blob([JSON.stringify(res.data, null, 2)], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `campuszen-export-${user?.username || "data"}.json`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
    } catch (e) {
      setError(e?.data?.message || e.message || "Export failed");
    } finally {
      setBusy(null);
    }
  };

  const onDeactivate = async () => {
    if (!confirm("Deactivate your account? Your profile and posts are hidden until you restore (30 days).")) return;
    setBusy("deactivate");
    try {
      await api.deactivateAccount();
      router.refresh();
    } catch (e) {
      setError(e?.data?.message || e.message || "Failed");
    } finally {
      setBusy(null);
    }
  };

  const onReactivate = async () => {
    setBusy("reactivate");
    try {
      await api.reactivateAccount();
      router.refresh();
    } catch (e) {
      setError(e?.data?.message || e.message || "Failed");
    } finally {
      setBusy(null);
    }
  };

  const onDelete = async () => {
    setBusy("delete");
    try {
      await api.deleteAccount();
      setConfirmDelete(false);
      router.refresh();
    } catch (e) {
      setError(e?.data?.message || e.message || "Failed");
    } finally {
      setBusy(null);
    }
  };

  return (
    <section aria-label="Your data" className="mt-4 overflow-hidden rounded-[16px] border border-[var(--cz-border)]">
      <p className="flex items-center gap-2 border-b border-[var(--cz-border)] px-4 py-3 text-[15px] font-bold leading-[20px]">
        <Download className="h-4 w-4" aria-hidden /> Your data
      </p>
      <div className="flex flex-col gap-3 p-4">
        {isDeactivated ? (
          <div className="rounded-[12px] border border-amber-500/40 bg-amber-500/10 p-3 text-[14px]">
            <p className="font-bold">Account deactivated</p>
            <p className="text-[var(--cz-text-secondary)]">
              Hidden from discovery, search and feeds.
              {scheduled ? ` Scheduled for permanent deletion on ${scheduled.toLocaleDateString("en-IN", { month: "long", day: "numeric", year: "numeric" })}.` : ""}
              {" "}Restore anytime before then.
            </p>
            <button
              type="button"
              onClick={onReactivate}
              disabled={busy === "reactivate"}
              className="mt-2 h-[36px] rounded-full bg-[var(--cz-accent)] px-4 text-[14px] font-bold text-white disabled:opacity-50"
            >
              {busy === "reactivate" ? "Restoring…" : "Restore account"}
            </button>
          </div>
        ) : null}
        {error ? <p className="text-[14px] text-[var(--cz-error)]">{error}</p> : null}
        <button
          type="button"
          onClick={onExport}
          disabled={busy === "export"}
          className="flex h-[40px] items-center justify-center gap-2 rounded-full border border-[var(--cz-border-strong)] text-[14px] font-bold hover:bg-[var(--cz-surface-strong)] disabled:opacity-50"
        >
          {busy === "export" ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />}
          Download my data (JSON)
        </button>
        <p className="text-[13px] text-[var(--cz-text-secondary)]">Profile, posts, replies, follows, blocks and reports you filed.</p>
        {!isDeactivated ? (
          <button
            type="button"
            onClick={onDeactivate}
            disabled={busy === "deactivate"}
            className="h-[40px] rounded-full border border-[var(--cz-border-strong)] text-[14px] font-bold hover:bg-[var(--cz-surface-strong)] disabled:opacity-50"
          >
            {busy === "deactivate" ? "Deactivating…" : "Deactivate account (30-day grace)"}
          </button>
        ) : null}
        {!confirmDelete ? (
          <button
            type="button"
            onClick={() => setConfirmDelete(true)}
            className="flex h-[40px] items-center justify-center gap-2 rounded-full text-[14px] font-bold text-[var(--cz-error)] hover:bg-[color-mix(in_srgb,var(--cz-error)_10%,transparent)]"
          >
            <Trash2 className="h-4 w-4" /> Delete account and data
          </button>
        ) : (
          <div className="rounded-[12px] border border-[var(--cz-error)]/40 p-3">
            <p className="text-[14px]">Delete schedules removal in 30 days. You can restore before then. Continue?</p>
            <div className="mt-2 flex gap-2">
              <button
                type="button"
                onClick={onDelete}
                disabled={busy === "delete"}
                className="h-[34px] rounded-full bg-[var(--cz-error)] px-4 text-[13px] font-bold text-white disabled:opacity-50"
              >
                {busy === "delete" ? "Scheduling…" : "Yes, schedule deletion"}
              </button>
              <button
                type="button"
                onClick={() => setConfirmDelete(false)}
                className="h-[34px] rounded-full border border-[var(--cz-border-strong)] px-4 text-[13px] font-bold"
              >
                Keep account
              </button>
            </div>
          </div>
        )}
      </div>
    </section>
  );
}
