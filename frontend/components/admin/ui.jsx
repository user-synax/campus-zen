"use client";

import { AlertCircle, CheckCircle2, Loader2, X } from "lucide-react";
import { useEffect, useRef } from "react";
import { CzImage } from "@/components/app/CzImage";
import { cn } from "@/lib/utils";

/* ── Formatting ─────────────────────────────────────────────── */

export function timeAgo(value) {
  if (!value) return "—";
  const ms = Date.now() - new Date(value).getTime();
  if (!Number.isFinite(ms)) return "—";
  if (ms < 0) return `on ${formatDateTime(value)}`;
  const min = Math.floor(ms / 60_000);
  if (min < 1) return "just now";
  if (min < 60) return `${min}m ago`;
  const hours = Math.floor(min / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}d ago`;
  return `on ${formatDate(value)}`;
}

export function formatDate(value) {
  if (!value) return "—";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleDateString("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

export function formatDateTime(value) {
  if (!value) return "—";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleString("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function formatUntil(value) {
  if (!value) return null;
  const target = new Date(value).getTime();
  if (!Number.isFinite(target)) return null;
  const ms = target - Date.now();
  if (ms <= 0) return "expired";
  const min = Math.ceil(ms / 60_000);
  if (min < 60) return `in ${min}m`;
  const hours = Math.floor(min / 60);
  const restMin = min % 60;
  if (hours < 24) return restMin ? `in ${hours}h ${restMin}m` : `in ${hours}h`;
  const days = Math.floor(hours / 24);
  const restHours = hours % 24;
  return restHours ? `in ${days}d ${restHours}h` : `in ${days}d`;
}

export function formatNumber(value) {
  const n = Number(value);
  if (!Number.isFinite(n)) return "0";
  return n.toLocaleString("en-IN");
}

/* ── Status ─────────────────────────────────────────────────── */

export const STATUS_META = {
  good: { label: "Good standing", short: "Good", tone: "neutral" },
  limited: { label: "Limited", short: "Limited", tone: "warn" },
  restricted: {
    label: "Temporarily restricted",
    short: "Restricted",
    tone: "warn",
  },
  suspended: { label: "Suspended", short: "Suspended", tone: "danger" },
  banned: { label: "Permanently banned", short: "Banned", tone: "danger" },
  deactivated: { label: "Deactivated", short: "Deactivated", tone: "neutral" },
  unknown: { label: "Unknown", short: "Unknown", tone: "neutral" },
};

export function statusMeta(status) {
  return STATUS_META[status] || STATUS_META.unknown;
}

const PILL_TONE = {
  neutral:
    "border-[var(--cz-border-strong)] bg-transparent text-[var(--cz-text-secondary)]",
  accent:
    "border-transparent bg-[var(--cz-accent-soft)] text-[var(--cz-accent)]",
  warn: "border-transparent bg-[color-mix(in_srgb,var(--cz-warn)_16%,transparent)] text-[color-mix(in_srgb,var(--cz-warn)_72%,var(--cz-text-primary))]",
  danger:
    "border-transparent bg-[color-mix(in_srgb,var(--cz-error)_12%,transparent)] text-[var(--cz-error)]",
};

export function StatusPill({ status, className }) {
  const meta = statusMeta(status);
  return (
    <span
      className={cn(
        "inline-flex h-[24px] shrink-0 items-center rounded-full border px-2 text-[12px] leading-none font-bold whitespace-nowrap",
        PILL_TONE[meta.tone],
        className,
      )}
    >
      {meta.short}
    </span>
  );
}

export function Chip({ children, tone = "neutral", className }) {
  return (
    <span
      className={cn(
        "inline-flex h-[24px] shrink-0 items-center gap-1 rounded-full border px-2 text-[12px] leading-none font-bold whitespace-nowrap",
        PILL_TONE[tone],
        className,
      )}
    >
      {children}
    </span>
  );
}

/* ── Avatars / identity ─────────────────────────────────────── */

export function AdminAvatar({ user, size = 40, className }) {
  const initial = String(user?.fullName || user?.username || "?")
    .trim()
    .slice(0, 1)
    .toUpperCase();
  return (
    <span
      className={cn(
        "grid shrink-0 place-items-center overflow-hidden rounded-full bg-[var(--cz-surface-strong)] font-extrabold text-[var(--cz-text-secondary)]",
        className,
      )}
      style={{ height: size, width: size, fontSize: Math.round(size * 0.36) }}
    >
      {user?.avatarUrl ? (
        <CzImage
          src={user.avatarUrl}
          alt=""
          className="h-full w-full"
          imgClassName="h-full w-full"
        />
      ) : (
        initial
      )}
    </span>
  );
}

/* ── Layout pieces ──────────────────────────────────────────── */

export function SectionIntro({ eyebrow, title, subtitle, actions, className }) {
  return (
    <div
      className={cn(
        "mb-6 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between",
        className,
      )}
    >
      <div className="min-w-0">
        {eyebrow ? (
          <p className="text-[12px] font-bold tracking-[0.08em] text-[var(--cz-text-secondary)] uppercase">
            {eyebrow}
          </p>
        ) : null}
        <h1 className="mt-1 text-[26px] leading-[1.1] font-extrabold tracking-[-0.02em] text-[var(--cz-text-primary)]">
          {title}
        </h1>
        {subtitle ? (
          <p className="mt-2 max-w-[70ch] text-[14px] leading-[20px] text-[var(--cz-text-secondary)]">
            {subtitle}
          </p>
        ) : null}
      </div>
      {actions ? (
        <div className="flex shrink-0 flex-wrap items-center gap-2">
          {actions}
        </div>
      ) : null}
    </div>
  );
}

export function Panel({ children, className, as: Tag = "section" }) {
  return (
    <Tag
      className={cn(
        "rounded-2xl border border-[var(--cz-border)] bg-[var(--cz-surface)]",
        className,
      )}
    >
      {children}
    </Tag>
  );
}

export function PanelHeader({
  title,
  subtitle,
  icon: Icon,
  action,
  className,
}) {
  return (
    <div
      className={cn(
        "flex items-start justify-between gap-3 border-b border-[var(--cz-border)] px-4 py-3.5",
        className,
      )}
    >
      <div className="flex min-w-0 items-start gap-2.5">
        {Icon ? (
          <span className="mt-0.5 grid h-[28px] w-[28px] shrink-0 place-items-center rounded-full bg-[var(--cz-surface-strong)] text-[var(--cz-text-secondary)]">
            <Icon className="h-[15px] w-[15px]" aria-hidden />
          </span>
        ) : null}
        <div className="min-w-0">
          <h2 className="text-[15px] leading-5 font-extrabold text-[var(--cz-text-primary)]">
            {title}
          </h2>
          {subtitle ? (
            <p className="mt-0.5 text-[13px] leading-[17px] text-[var(--cz-text-secondary)]">
              {subtitle}
            </p>
          ) : null}
        </div>
      </div>
      {action ? <div className="shrink-0">{action}</div> : null}
    </div>
  );
}

export function EmptyRows({ icon: Icon, title, description, action }) {
  return (
    <div className="flex flex-col items-center justify-center px-5 py-12 text-center">
      {Icon ? (
        <span className="grid h-[42px] w-[42px] place-items-center rounded-full bg-[var(--cz-surface-strong)] text-[var(--cz-text-secondary)]">
          <Icon className="h-[20px] w-[20px]" aria-hidden />
        </span>
      ) : null}
      <p className="mt-3 text-[15px] font-bold text-[var(--cz-text-primary)]">
        {title}
      </p>
      {description ? (
        <p className="mt-1 max-w-[46ch] text-[13px] leading-[18px] text-[var(--cz-text-secondary)]">
          {description}
        </p>
      ) : null}
      {action ? <div className="mt-4">{action}</div> : null}
    </div>
  );
}

export function Spinner({ className }) {
  return (
    <Loader2
      className={cn("h-[16px] w-[16px] animate-spin", className)}
      aria-hidden
    />
  );
}

export function LoadingRows({ label = "Loading…" }) {
  return (
    <div className="flex items-center justify-center gap-2 px-4 py-10 text-[13px] text-[var(--cz-text-secondary)]">
      <Spinner /> {label}
    </div>
  );
}

export function ErrorBanner({ children, onRetry, className }) {
  if (!children) return null;
  return (
    <div
      role="alert"
      className={cn(
        "flex items-start gap-2 rounded-xl bg-[color-mix(in_srgb,var(--cz-error)_9%,transparent)] px-3 py-2.5 text-[13px] leading-[18px] text-[var(--cz-error)]",
        className,
      )}
    >
      <AlertCircle className="mt-0.5 h-[16px] w-[16px] shrink-0" aria-hidden />
      <span className="min-w-0 flex-1">{children}</span>
      {onRetry ? (
        <button
          type="button"
          onClick={onRetry}
          className="shrink-0 font-bold underline underline-offset-2"
        >
          Retry
        </button>
      ) : null}
    </div>
  );
}

export function Field({ label, hint, counter, children, htmlFor, className }) {
  return (
    <div className={cn("flex flex-col gap-1.5", className)}>
      <div className="flex items-baseline justify-between gap-3">
        <label
          htmlFor={htmlFor}
          className="text-[13px] leading-[17px] font-bold text-[var(--cz-text-primary)]"
        >
          {label}
        </label>
        {counter ? (
          <span className="text-[12px] tabular-nums text-[var(--cz-text-secondary)]">
            {counter}
          </span>
        ) : null}
      </div>
      {children}
      {hint ? (
        <p className="text-[12px] leading-[16px] text-[var(--cz-text-secondary)]">
          {hint}
        </p>
      ) : null}
    </div>
  );
}

export const inputClass =
  "h-[40px] w-full rounded-xl border border-[var(--cz-border-strong)] bg-transparent px-3 text-[14px] text-[var(--cz-text-primary)] outline-none transition-colors placeholder:text-[var(--cz-text-secondary)] focus:border-[var(--cz-accent)]";

export const textareaClass =
  "w-full resize-y rounded-xl border border-[var(--cz-border-strong)] bg-transparent px-3 py-2.5 text-[14px] leading-[20px] text-[var(--cz-text-primary)] outline-none transition-colors placeholder:text-[var(--cz-text-secondary)] focus:border-[var(--cz-accent)]";

/* ── Overlays ───────────────────────────────────────────────── */

function useOverlay(open, onClose) {
  const closeRef = useRef(onClose);
  closeRef.current = onClose;
  useEffect(() => {
    if (!open) return;
    const onKey = (e) => {
      if (e.key === "Escape") closeRef.current?.();
    };
    document.addEventListener("keydown", onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = prev;
    };
  }, [open]);
}

export function AdminDialog({
  open,
  onClose,
  title,
  description,
  icon: Icon,
  tone = "default",
  children,
  footer,
  className,
}) {
  useOverlay(open, onClose);
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center sm:items-center sm:p-4">
      <button
        type="button"
        aria-label="Close dialog"
        onClick={onClose}
        className="absolute inset-0 cursor-default bg-[var(--cz-overlay)]"
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-label={title}
        className={cn(
          "relative z-10 flex max-h-[92dvh] w-full max-w-[540px] flex-col overflow-hidden rounded-t-2xl border border-[var(--cz-border)] bg-[var(--cz-elevated)] shadow-[var(--shadow-pop)] sm:rounded-2xl",
          className,
        )}
      >
        <div className="flex items-start gap-3 border-b border-[var(--cz-border)] px-5 py-4">
          {Icon ? (
            <span
              className={cn(
                "grid h-[36px] w-[36px] shrink-0 place-items-center rounded-full",
                tone === "danger"
                  ? "bg-[color-mix(in_srgb,var(--cz-error)_12%,transparent)] text-[var(--cz-error)]"
                  : "bg-[var(--cz-accent-soft)] text-[var(--cz-accent)]",
              )}
            >
              <Icon className="h-[18px] w-[18px]" aria-hidden />
            </span>
          ) : null}
          <div className="min-w-0 flex-1">
            <h2 className="text-[17px] leading-[22px] font-extrabold text-[var(--cz-text-primary)]">
              {title}
            </h2>
            {description ? (
              <p className="mt-1 text-[13px] leading-[18px] text-[var(--cz-text-secondary)]">
                {description}
              </p>
            ) : null}
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="-mr-1 grid h-[32px] w-[32px] shrink-0 place-items-center rounded-full text-[var(--cz-text-secondary)] transition-colors hover:bg-[var(--cz-surface-strong)] hover:text-[var(--cz-text-primary)]"
          >
            <X className="h-[18px] w-[18px]" aria-hidden />
          </button>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto px-5 py-4">
          {children}
        </div>

        {footer ? (
          <div className="flex flex-wrap items-center justify-end gap-2 border-t border-[var(--cz-border)] px-5 py-3.5">
            {footer}
          </div>
        ) : null}
      </div>
    </div>
  );
}

export function AdminDrawer({
  open,
  onClose,
  title,
  subtitle,
  children,
  footer,
}) {
  useOverlay(open, onClose);
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-40">
      <button
        type="button"
        aria-label="Close panel"
        onClick={onClose}
        className="absolute inset-0 cursor-default bg-[var(--cz-overlay)]"
      />
      <aside
        role="dialog"
        aria-modal="true"
        aria-label={title}
        className="absolute inset-y-0 right-0 flex w-full max-w-[560px] flex-col border-l border-[var(--cz-border)] bg-[var(--cz-bg)] shadow-[var(--shadow-pop)]"
      >
        <div className="flex items-start gap-3 border-b border-[var(--cz-border)] px-5 py-4">
          <div className="min-w-0 flex-1">
            <h2 className="text-[18px] leading-[23px] font-extrabold text-[var(--cz-text-primary)]">
              {title}
            </h2>
            {subtitle ? (
              <p className="mt-0.5 truncate text-[13px] leading-[17px] text-[var(--cz-text-secondary)]">
                {subtitle}
              </p>
            ) : null}
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="-mr-1 grid h-[34px] w-[34px] shrink-0 place-items-center rounded-full text-[var(--cz-text-primary)] transition-colors hover:bg-[var(--cz-surface-strong)]"
          >
            <X className="h-[19px] w-[19px]" aria-hidden />
          </button>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto">{children}</div>

        {footer ? (
          <div className="flex flex-wrap items-center gap-2 border-t border-[var(--cz-border)] px-5 py-3.5">
            {footer}
          </div>
        ) : null}
      </aside>
    </div>
  );
}

export function SuccessNote({ children }) {
  return (
    <div className="flex items-start gap-2 rounded-xl bg-[color-mix(in_srgb,var(--cz-success)_10%,transparent)] px-3 py-2.5 text-[13px] leading-[18px] text-[color-mix(in_srgb,var(--cz-success)_82%,var(--cz-text-primary))]">
      <CheckCircle2 className="mt-0.5 h-[16px] w-[16px] shrink-0" aria-hidden />
      <span>{children}</span>
    </div>
  );
}
