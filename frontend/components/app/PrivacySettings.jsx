"use client";

import { useState } from "react";
import { Loader2, Lock } from "lucide-react";
import { api } from "@/lib/api";
import { useQueryClient } from "@tanstack/react-query";
import { cn } from "@/lib/utils";

const REPLY_OPTIONS = [
  { id: "everyone", label: "Everyone", sub: "Anyone can reply" },
  { id: "followers", label: "Followers", sub: "Only people who follow you" },
  { id: "none", label: "No one", sub: "Only you (replies off)" },
];

const MENTION_OPTIONS = [
  { id: "everyone", label: "Everyone", sub: "Anyone can mention you" },
  { id: "followers", label: "Followers", sub: "Only followers can mention you" },
  { id: "none", label: "No one", sub: "Mentions off" },
];

const FIELD_OPTIONS = [
  { id: "public", label: "Everyone" },
  { id: "followers", label: "Followers" },
  { id: "hidden", label: "Only me" },
];

function Segmented({ value, options, onChange, disabled, ariaLabel }) {
  return (
    <div role="radiogroup" aria-label={ariaLabel} className="flex flex-col gap-1.5">
      {options.map((o) => {
        const on = value === o.id;
        return (
          <button
            key={o.id}
            type="button"
            role="radio"
            aria-checked={on}
            disabled={disabled}
            onClick={() => onChange(o.id)}
            className={cn(
              "flex w-full items-center justify-between gap-3 rounded-[12px] border px-3 py-2.5 text-left transition-colors",
              on
                ? "border-[var(--cz-accent)] bg-[var(--cz-accent-soft)]"
                : "border-[var(--cz-border)] hover:bg-[var(--cz-surface-strong)]",
              disabled && "opacity-50",
            )}
          >
            <span>
              <span className="block text-[14px] font-bold leading-[18px]">{o.label}</span>
              {o.sub ? (
                <span className="block text-[13px] text-[var(--cz-text-secondary)]">{o.sub}</span>
              ) : null}
            </span>
            <span
              aria-hidden
              className={cn(
                "grid h-5 w-5 shrink-0 place-items-center rounded-full border",
                on ? "border-[var(--cz-accent)] bg-[var(--cz-accent)] text-white" : "border-[var(--cz-border-strong)]",
              )}
            >
              {on ? <span className="text-[12px] leading-none">✓</span> : null}
            </span>
          </button>
        );
      })}
    </div>
  );
}

export function PrivacySettings({ user }) {
  const qc = useQueryClient();
  const [saving, setSaving] = useState(null);
  const [error, setError] = useState(null);

  const visibility = user?.profileVisibility || {};
  const save = async (key, payload) => {
    setSaving(key);
    setError(null);
    try {
      const res = await api.updatePrivacy(payload);
      qc.setQueryData(["me"], (old) => {
        if (!old?.data?.user) return old;
        return { ...old, data: { ...old.data, user: { ...old.data.user, ...res.data.user } } };
      });
      qc.invalidateQueries({ queryKey: ["me"] });
      qc.invalidateQueries({ queryKey: ["user"] });
    } catch (e) {
      setError(e?.data?.message || e.message || "Failed to save");
    } finally {
      setSaving(null);
    }
  };

  return (
    <section aria-label="Privacy controls" className="mt-4 overflow-hidden rounded-[16px] border border-[var(--cz-border)]">
      <p className="flex items-center gap-2 border-b border-[var(--cz-border)] px-4 py-3 text-[15px] font-bold leading-[20px]">
        <Lock className="h-4 w-4" aria-hidden /> Privacy
      </p>
      <div className="flex flex-col gap-4 p-4">
        {error ? <p className="text-[14px] text-[var(--cz-error)]">{error}</p> : null}

        <div className="flex items-center justify-between gap-3">
          <div>
            <p className="text-[15px] font-bold">Private account</p>
            <p className="text-[13px] text-[var(--cz-text-secondary)]">
              Approval queue + followers-only posts. Hidden from discovery and search.
            </p>
          </div>
          <button
            type="button"
            role="switch"
            aria-checked={Boolean(user?.isPrivate)}
            disabled={saving === "private"}
            onClick={() => save("private", { isPrivate: !user?.isPrivate })}
            className={cn(
              "relative h-[28px] w-[48px] shrink-0 rounded-full transition-colors",
              user?.isPrivate ? "bg-[var(--cz-accent)]" : "bg-[var(--cz-border-strong)]",
            )}
          >
            {saving === "private" ? (
              <Loader2 className="absolute inset-0 m-auto h-4 w-4 animate-spin text-white" />
            ) : (
              <span
                className={cn(
                  "absolute top-[3px] h-[22px] w-[22px] rounded-full bg-white transition-all",
                  user?.isPrivate ? "left-[23px]" : "left-[3px]",
                )}
              />
            )}
          </button>
        </div>

        <div>
          <p className="mb-2 text-[14px] font-bold">Who can reply to your posts</p>
          <Segmented
            ariaLabel="Who can reply"
            value={user?.replyPolicy || "everyone"}
            options={REPLY_OPTIONS}
            disabled={saving === "reply"}
            onChange={(v) => save("reply", { replyPolicy: v })}
          />
        </div>

        <div>
          <p className="mb-2 text-[14px] font-bold">Who can mention you</p>
          <Segmented
            ariaLabel="Who can mention"
            value={user?.mentionPolicy || "everyone"}
            options={MENTION_OPTIONS}
            disabled={saving === "mention"}
            onChange={(v) => save("mention", { mentionPolicy: v })}
          />
        </div>

        <div>
          <p className="mb-2 text-[14px] font-bold">Profile details visibility</p>
          <div className="flex flex-col gap-3">
            {[
              { field: "college", label: "College" },
              { field: "course", label: "Course" },
              { field: "academicYear", label: "Academic year" },
            ].map(({ field, label }) => (
              <div key={field}>
                <p className="mb-1.5 text-[13px] text-[var(--cz-text-secondary)]">{label}</p>
                <div className="grid grid-cols-3 gap-1.5">
                  {FIELD_OPTIONS.map((o) => {
                    const on = (visibility[field] || "public") === o.id;
                    return (
                      <button
                        key={o.id}
                        type="button"
                        aria-pressed={on}
                        disabled={saving === field}
                        onClick={() => save(field, { profileVisibility: { [field]: o.id } })}
                        className={cn(
                          "h-[32px] rounded-full border px-2 text-[13px] font-bold transition-colors",
                          on
                            ? "border-[var(--cz-accent)] bg-[var(--cz-accent)] text-white"
                            : "border-[var(--cz-border-strong)] hover:bg-[var(--cz-surface-strong)]",
                        )}
                      >
                        {o.label}
                      </button>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
