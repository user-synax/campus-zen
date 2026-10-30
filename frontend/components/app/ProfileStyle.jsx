"use client";

import { useQueryClient } from "@tanstack/react-query";
import { Check, Lock } from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { CzImage } from "@/components/app/CzImage";
import { api } from "@/lib/api";
import {
  accentIdFor,
  HANDLE_STYLES,
  handleClass,
  handleIdFor,
  isProUser,
  PROFILE_ACCENTS,
  PROFILE_THEMES,
  profileAccentFor,
  profileRingClass,
  themeIdFor,
} from "@/lib/perks";
import { cn } from "@/lib/utils";

const sectionRow = "border-t border-[var(--cz-border)] px-4 py-4";
const labelClass =
  "text-[11px] font-extrabold uppercase tracking-[0.06em] text-[var(--cz-text-secondary)]";

function payloadFor(kind, id) {
  if (kind === "accent") return { accent: id === "blue" ? null : id };
  if (kind === "theme") return { profileTheme: id === "flat" ? null : id };
  return { handleStyle: id === "classic" ? null : id };
}

export function ProfileStyle({ user }) {
  const queryClient = useQueryClient();
  const [accent, setAccent] = useState(accentIdFor(user));
  const [theme, setTheme] = useState(themeIdFor(user));
  const [handle, setHandle] = useState(handleIdFor(user));
  const [saving, setSaving] = useState(null);

  useEffect(() => {
    setAccent(accentIdFor(user));
    setTheme(themeIdFor(user));
    setHandle(handleIdFor(user));
  }, [user]);

  if (!user) return null;

  const pro = isProUser(user);

  const save = async (kind, id, message) => {
    if (saving) return;
    setSaving(kind);
    try {
      const res = await api.updateMe(payloadFor(kind, id));
      const next = res.data?.user;
      if (next) {
        queryClient.setQueryData(["me"], (old) =>
          old
            ? {
                ...old,
                data: { ...old.data, user: { ...old.data?.user, ...next } },
              }
            : old,
        );
        // The public profile page reads its own cache key; keep it in sync so
        // switching over after a save never shows the previous style.
        queryClient.invalidateQueries({
          queryKey: ["user", user.username],
        });
      }
      toast.success(message);
    } catch (err) {
      // Revert the local preview to what the server still has.
      setAccent(accentIdFor(user));
      setTheme(themeIdFor(user));
      setHandle(handleIdFor(user));
      toast.error(
        err?.data?.message || err?.message || "Could not save that style",
      );
    } finally {
      setSaving(null);
    }
  };

  const choose = (kind, item, setter, current, message) => {
    if (saving) return;
    if (item.pro && !pro) {
      toast("Pro perk — currently invite-only");
      return;
    }
    if (current === item.id) return;
    setter(item.id);
    save(kind, item.id, message);
  };

  const accentItem = profileAccentFor(accent);

  return (
    <section className="overflow-hidden rounded-[16px] border border-[var(--cz-border)]">
      <div className="flex items-start justify-between gap-3 px-4 py-3.5">
        <div className="min-w-0">
          <h3 className="text-[15px] leading-[20px] font-bold text-[var(--cz-text-primary)]">
            Profile style
          </h3>
          <p className="mt-0.5 text-[13px] leading-[18px] text-[var(--cz-text-secondary)]">
            A little identity, kept off the timeline.
          </p>
        </div>
        <span
          className={cn(
            "inline-flex shrink-0 items-center rounded-full border px-2 py-0.5 text-[11px] font-extrabold tracking-[0.06em] uppercase",
            pro
              ? "border-[color-mix(in_srgb,#eab308_45%,var(--cz-border))] bg-[color-mix(in_srgb,#eab308_12%,transparent)] text-[color-mix(in_srgb,#eab308_68%,var(--cz-text-primary))]"
              : "border-[var(--cz-border-strong)] text-[var(--cz-text-secondary)]",
          )}
        >
          {pro ? "Pro" : "Free"}
        </span>
      </div>

      <div className="border-t border-[var(--cz-border)] px-4 py-4">
        <ProfilePreview
          user={user}
          accent={accent}
          theme={theme}
          handle={handle}
        />
      </div>

      <div className={sectionRow}>
        <div className="flex items-center justify-between gap-3">
          <span className={labelClass}>Accent</span>
          <span className="truncate text-[12px] text-[var(--cz-text-secondary)]">
            {accentItem.label}
          </span>
        </div>
        <div className="mt-3 flex flex-wrap items-center gap-2.5">
          {PROFILE_ACCENTS.map((item) => {
            const on = accent === item.id;
            const locked = item.pro && !pro;
            return (
              <button
                key={item.id}
                type="button"
                title={locked ? `${item.label} — Pro` : item.label}
                aria-label={locked ? `${item.label} (Pro)` : item.label}
                aria-pressed={on}
                disabled={Boolean(saving)}
                onClick={() =>
                  choose("accent", item, setAccent, accent, "Accent updated")
                }
                className={cn(
                  "relative grid h-8 w-8 place-items-center rounded-full transition-transform duration-150 hover:scale-105 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--cz-accent)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--cz-bg)] disabled:pointer-events-none",
                  on &&
                    "ring-2 ring-[var(--cz-text-primary)] ring-offset-2 ring-offset-[var(--cz-bg)]",
                  locked && "opacity-45",
                )}
                style={{ backgroundColor: item.swatch }}
              >
                {on ? (
                  <Check
                    className="h-4 w-4"
                    style={{ color: item.check }}
                    aria-hidden
                  />
                ) : locked ? (
                  <Lock
                    className="h-3 w-3"
                    style={{ color: item.check }}
                    aria-hidden
                  />
                ) : null}
              </button>
            );
          })}
        </div>
      </div>

      <div className={sectionRow}>
        <div className="flex items-center justify-between gap-3">
          <span className={labelClass}>Banner</span>
          <span className="truncate text-[12px] text-[var(--cz-text-secondary)]">
            {PROFILE_THEMES.find((item) => item.id === theme)?.label}
          </span>
        </div>
        <div className="mt-3 grid grid-cols-4 gap-2">
          {PROFILE_THEMES.map((item) => {
            const on = theme === item.id;
            const locked = item.pro && !pro;
            return (
              <button
                key={item.id}
                type="button"
                title={locked ? `${item.label} — Pro` : item.label}
                aria-label={locked ? `${item.label} (Pro)` : item.label}
                aria-pressed={on}
                disabled={Boolean(saving)}
                onClick={() =>
                  choose("theme", item, setTheme, theme, "Banner updated")
                }
                className={cn(
                  "relative h-[42px] overflow-hidden rounded-[8px] border-2 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--cz-accent)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--cz-bg)] disabled:pointer-events-none",
                  on
                    ? "border-[var(--cz-text-primary)]"
                    : "border-[var(--cz-border)]",
                  locked && "opacity-45",
                )}
              >
                <span
                  className="cz-profile-scope absolute inset-0 bg-[var(--cz-surface-strong)]"
                  data-profile-accent={accent}
                >
                  <span
                    className={cn(
                      "cz-profile-banner-treat absolute inset-0",
                      `cz-profile-theme-${item.id}`,
                    )}
                  />
                </span>
                {locked ? (
                  <span className="absolute inset-0 grid place-items-center bg-[color-mix(in_srgb,var(--cz-bg)_28%,transparent)]">
                    <Lock
                      className="h-3.5 w-3.5 text-[var(--cz-text-primary)]"
                      aria-hidden
                    />
                  </span>
                ) : null}
              </button>
            );
          })}
        </div>
      </div>

      <div className={sectionRow}>
        <div className="flex items-center justify-between gap-3">
          <span className={labelClass}>Handle</span>
          <span className="truncate text-[12px] text-[var(--cz-text-secondary)]">
            {HANDLE_STYLES.find((item) => item.id === handle)?.label}
          </span>
        </div>
        <div className="mt-3 grid grid-cols-3 gap-2">
          {HANDLE_STYLES.map((item) => {
            const on = handle === item.id;
            const locked = item.pro && !pro;
            return (
              <button
                key={item.id}
                type="button"
                title={locked ? `${item.label} — Pro` : item.label}
                aria-label={locked ? `${item.label} (Pro)` : item.label}
                aria-pressed={on}
                disabled={Boolean(saving)}
                onClick={() =>
                  choose(
                    "handle",
                    item,
                    setHandle,
                    handle,
                    "Handle style updated",
                  )
                }
                className={cn(
                  "relative rounded-[8px] border-2 px-2 py-2 text-left transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--cz-accent)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--cz-bg)] disabled:pointer-events-none",
                  on
                    ? "border-[var(--cz-text-primary)]"
                    : "border-[var(--cz-border)]",
                  locked && "opacity-45",
                )}
              >
                <span className={cn("block truncate", handleClass(item.id))}>
                  @you
                </span>
                {locked ? (
                  <Lock
                    className="absolute top-1.5 right-1.5 h-3 w-3 text-[var(--cz-text-secondary)]"
                    aria-hidden
                  />
                ) : null}
              </button>
            );
          })}
        </div>
      </div>
    </section>
  );
}

function ProfilePreview({ user, accent, theme, handle }) {
  const initials = (user.fullName || user.username || "U")
    .trim()
    .slice(0, 1)
    .toUpperCase();

  return (
    <div
      className="cz-profile-scope overflow-hidden rounded-[12px] border border-[var(--cz-border)]"
      data-profile-accent={accent}
    >
      <div className="relative h-[76px] overflow-hidden bg-[var(--cz-surface-strong)]">
        {user.coverUrl ? (
          <CzImage
            src={user.coverUrl}
            alt=""
            className="absolute inset-0 h-full w-full"
            imgClassName="absolute inset-0 h-full w-full"
          />
        ) : null}
        <div
          aria-hidden
          className={cn(
            "cz-profile-banner-treat absolute inset-0",
            `cz-profile-theme-${theme}`,
          )}
        />
      </div>
      <div className="px-4 pb-4">
        <div className="-mt-6 flex items-end gap-3">
          <span
            className={cn(
              "grid h-12 w-12 shrink-0 place-items-center overflow-hidden rounded-full border-2 border-[var(--cz-bg)] bg-[var(--cz-border-strong)] text-[15px] font-bold text-[var(--cz-text-primary)]",
              profileRingClass(accent),
            )}
          >
            {user.avatarUrl ? (
              <CzImage
                src={user.avatarUrl}
                alt={user.fullName || user.username}
                className="h-full w-full rounded-full"
                imgClassName="h-full w-full"
              />
            ) : (
              initials
            )}
          </span>
          <div className="min-w-0 pb-0.5">
            <p className="truncate text-[15px] leading-[20px] font-bold text-[var(--cz-text-primary)]">
              {user.fullName || user.username}
            </p>
            <p className={cn("truncate", handleClass(handle))}>
              @{user.username}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
