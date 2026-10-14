"use client";

import { useState } from "react";
import { EyeOff, Loader2 } from "lucide-react";
import { api } from "@/lib/api";
import { useQueryClient } from "@tanstack/react-query";
import { cn } from "@/lib/utils";

function formatDob(dob) {
  if (!dob) return null;
  const d = new Date(dob);
  if (Number.isNaN(d.getTime())) return null;
  return d.toISOString().slice(0, 10);
}

function ageYears(dob) {
  if (!dob) return null;
  const d = new Date(dob);
  if (Number.isNaN(d.getTime())) return null;
  const now = new Date();
  let age = now.getFullYear() - d.getFullYear();
  const m = now.getMonth() - d.getMonth();
  if (m < 0 || (m === 0 && now.getDate() < d.getDate())) age -= 1;
  return age;
}

function todayIso() {
  return new Date().toISOString().slice(0, 10);
}

// 18+ content opt-in with one-shot DOB gate. Lives under
// Preferences → Content, separate from Privacy interactions.
export function ContentSettings({ user }) {
  const qc = useQueryClient();
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);
  const [dobOpen, setDobOpen] = useState(false);
  const [dobValue, setDobValue] = useState("");
  const [dobSaving, setDobSaving] = useState(false);
  const [dobError, setDobError] = useState(null);

  const dobText = formatDob(user?.dob);
  const age = ageYears(user?.dob);

  const patchMe = (savedUser) => {
    qc.setQueryData(["me"], (old) => {
      if (!old?.data?.user || !savedUser) return old;
      return { ...old, data: { ...old.data, user: { ...old.data.user, ...savedUser } } };
    });
    qc.invalidateQueries({ queryKey: ["me"] });
    qc.invalidateQueries({ queryKey: ["user"] });
  };

  const save = async (payload) => {
    setSaving(true);
    setError(null);
    try {
      const res = await api.updatePrivacy(payload);
      patchMe(res.data?.user);
    } catch (e) {
      setError(e?.data?.message || e.message || "Failed to save");
    } finally {
      setSaving(false);
    }
  };

  const handleToggle = () => {
    setError(null);
    if (user?.showSensitive) {
      save({ showSensitive: false });
      return;
    }
    if (!user?.dob) {
      setDobError(null);
      setDobValue("");
      setDobOpen(true);
      return;
    }
    save({ showSensitive: true });
  };

  const handleDobSubmit = async (e) => {
    e?.preventDefault?.();
    if (!dobValue) {
      setDobError("Enter your date of birth (YYYY-MM-DD)");
      return;
    }
    setDobSaving(true);
    setDobError(null);
    try {
      const res = await api.setDobOnce(dobValue);
      const savedUser = res.data?.user || null;
      const isAdult = res.data?.isAdult ?? ageYears(savedUser?.dob ?? dobValue) >= 18;
      patchMe(savedUser);
      setDobOpen(false);
      if (isAdult) {
        await save({ showSensitive: true });
      } else {
        setError("Date of birth saved. You must be 18 or older to enable 18+ posts.");
      }
    } catch (err) {
      setDobError(err?.data?.message || err.message || "Failed to save date of birth");
    } finally {
      setDobSaving(false);
    }
  };

  return (
    <section aria-label="Content preferences" className="overflow-hidden rounded-[16px] border border-[var(--cz-border)]">
      <p className="flex items-center gap-2 border-b border-[var(--cz-border)] px-4 py-3 text-[15px] font-bold leading-[20px]">
        <EyeOff className="h-4 w-4" aria-hidden /> Content
      </p>
      <div className="flex flex-col gap-3 p-4">
        {error ? <p className="text-[14px] text-[var(--cz-error)]">{error}</p> : null}
        <div className="flex items-center justify-between gap-3">
          <div>
            <p className="text-[15px] font-bold">Show 18+ posts</p>
            <p className="text-[13px] text-[var(--cz-text-secondary)]">
              When off, 18+ media stays blurred. Turn on to tap-to-reveal sensitive posts.
            </p>
            {dobText ? (
              <p className="mt-1 text-[13px] text-[var(--cz-text-secondary)]">
                Date of birth: <span className="font-bold text-[var(--cz-text-primary)]">{dobText}</span>{" "}
                <span className="font-bold">(locked)</span>
              </p>
            ) : (
              <p className="mt-1 text-[13px] text-[var(--cz-text-secondary)]">
                You&apos;ll confirm your date of birth (one time, locked) before turning this on.
              </p>
            )}
            {dobText && age != null && age < 18 ? (
              <p className="mt-1 text-[13px] font-bold text-[var(--cz-error)]">
                You must be 18 or older to enable 18+ posts.
              </p>
            ) : null}
          </div>
          <button
            type="button"
            role="switch"
            aria-checked={Boolean(user?.showSensitive)}
            disabled={saving}
            onClick={handleToggle}
            className={cn(
              "relative h-[28px] w-[48px] shrink-0 rounded-full transition-colors",
              user?.showSensitive ? "bg-[var(--cz-error)]" : "bg-[var(--cz-border-strong)]",
            )}
          >
            {saving ? (
              <Loader2 className="absolute inset-0 m-auto h-4 w-4 animate-spin text-white" />
            ) : (
              <span
                className={cn(
                  "absolute top-[3px] h-[22px] w-[22px] rounded-full bg-white transition-all",
                  user?.showSensitive ? "left-[23px]" : "left-[3px]",
                )}
              />
            )}
          </button>
        </div>

        {dobOpen ? (
          <div className="fixed inset-0 z-[70] flex items-center justify-center p-4">
            <button
              type="button"
              aria-label="Close date of birth dialog"
              onClick={() => (dobSaving ? null : setDobOpen(false))}
              className="t-backdrop is-open absolute inset-0 cursor-default border-0 bg-black/60 p-0"
            />
            <form
              onSubmit={handleDobSubmit}
              role="dialog"
              aria-modal="true"
              aria-label="Confirm your date of birth"
              className="t-modal is-open relative w-full max-w-[360px] rounded-[16px] border border-[var(--cz-border)] bg-[var(--cz-elevated)] p-4 shadow-[var(--shadow-sm)]"
            >
              <p className="text-[16px] font-extrabold text-[var(--cz-text-primary)]">
                Confirm you&apos;re 18+
              </p>
              <p className="mt-1 text-[14px] leading-[19px] text-[var(--cz-text-secondary)]">
                Enter your date of birth. You can enter it only once — it will be locked and can&apos;t be
                changed later.
              </p>
              <label className="mt-3 block">
                <span className="mb-1 block text-[13px] font-bold text-[var(--cz-text-primary)]">
                  Date of birth
                </span>
                <input
                  type="date"
                  required
                  value={dobValue}
                  max={todayIso()}
                  min="1900-01-01"
                  onChange={(e) => setDobValue(e.target.value)}
                  aria-label="Date of birth (YYYY-MM-DD)"
                  className="cz-input h-[44px] w-full rounded-[12px] px-3 text-[15px] text-[var(--cz-text-primary)] outline-none"
                />
              </label>
              {dobError ? (
                <p role="alert" className="mt-2 text-[13px] text-[var(--cz-error)]">
                  {dobError}
                </p>
              ) : null}
              <div className="mt-4 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setDobOpen(false)}
                  disabled={dobSaving}
                  className="inline-flex h-[40px] items-center justify-center rounded-full border border-[var(--cz-border-strong)] px-4 text-[14px] font-bold text-[var(--cz-text-primary)] hover:bg-[var(--cz-surface-strong)] disabled:opacity-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={dobSaving || !dobValue}
                  className="inline-flex h-[40px] min-w-[120px] items-center justify-center gap-2 rounded-full bg-[var(--cz-error)] px-4 text-[14px] font-bold text-white hover:opacity-90 disabled:opacity-50"
                >
                  {dobSaving ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden /> : null}
                  {dobSaving ? "Saving…" : "Save & enable"}
                </button>
              </div>
            </form>
          </div>
        ) : null}
      </div>
    </section>
  );
}
