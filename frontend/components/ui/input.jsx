"use client";

import { forwardRef } from "react";
import { cn } from "@/lib/utils";

/**
 * DESIGN.md — Search Input: "Rounded input with 4px radius, #eff3f4
 * background, padding 8px 12px, placeholder text 15px #536471. No visible
 * border. On focus, adds inset shadow rgba(0,0,0,0.03)."
 */
export const Input = forwardRef(
  ({ className, type = "text", error, ...props }, ref) => (
    <input
      ref={ref}
      type={type}
      data-error={error ? "true" : "false"}
      className={cn(
        "flex h-[44px] w-full rounded-[4px] bg-[var(--cz-surface-strong)] px-3 py-2 text-[15px] leading-[20px] text-[var(--cz-text-primary)] outline-none transition-colors duration-150",
        "placeholder:text-[var(--cz-text-secondary)]",
        "hover:bg-[var(--cz-mist-hover)] focus:bg-[var(--cz-surface-strong)] focus:ring-1 focus:ring-[var(--cz-accent)]",
        "disabled:opacity-45 disabled:cursor-not-allowed",
        error &&
          "border border-[var(--cz-error)]! ring-[3px]! ring-[color-mix(in_srgb,var(--cz-error)_18%,transparent)]! focus:ring-[color-mix(in_srgb,var(--cz-error)_25%,transparent)]!",
        className,
      )}
      {...props}
    />
  ),
);
Input.displayName = "Input";

export function InputWrap({ children, className, error }) {
  return (
    <div
      className={cn(
        "t-input-wrap flex flex-col gap-0",
        error && "is-error",
        className,
      )}
    >
      {children}
    </div>
  );
}

export function InputShell({ children, className, error, shaking }) {
  return (
    <div
      className={cn(
        "t-input flex items-center gap-2 rounded-[4px] bg-[var(--cz-surface-strong)] px-3 h-[44px] transition-colors hover:bg-[var(--cz-mist-hover)] focus-within:ring-1 focus-within:ring-[var(--cz-accent)]",
        error &&
          "is-error border border-[var(--cz-error)]! ring-[3px]! ring-[color-mix(in_srgb,var(--cz-error)_18%,transparent)]!",
        shaking && "is-shaking",
        className,
      )}
    >
      {children}
    </div>
  );
}

/**
 * Floating-label auth field — premium outlined style.
 *
 * Label rests inside the input at rest; on focus or when filled it docks
 * to the top border (with a bg cutout), tinting accent-blue on focus and
 * error-red on error. Pure CSS `:placeholder-shown` drives the float, with
 * an `is-filled` fallback for controlled values + autofill.
 *
 * Usage:
 *   <FloatingInput id="name" label="Name" value={v} onChange={...} />
 *   <FloatingInput id="u" label="Username" prefix="@" suffix={<Eye/>} />
 */
export const FloatingInput = forwardRef(
  (
    {
      id,
      label,
      error,
      shaking,
      prefix,
      suffix,
      className,
      inputClassName,
      value,
      defaultValue,
      placeholder: _placeholder,
      ...props
    },
    ref,
  ) => {
    const filled = String(value ?? defaultValue ?? "").length > 0;

    return (
      <div className={cn("t-input-wrap", error && "is-error", className)}>
        <div
          className={cn(
            "cz-float-box t-input",
            error && "is-error",
            shaking && "is-shaking",
            filled && "is-filled",
            prefix && "has-prefix",
          )}
        >
          {prefix ? (
            <span aria-hidden className="cz-float-prefix">
              {prefix}
            </span>
          ) : null}
          <input
            ref={ref}
            id={id}
            placeholder=" "
            data-filled={filled ? "true" : undefined}
            {...props}
            value={value}
            defaultValue={defaultValue}
            className={cn("cz-float-input", inputClassName)}
          />
          <label htmlFor={id} className="cz-float-label">
            {label}
          </label>
          {suffix ? <span className="cz-float-suffix">{suffix}</span> : null}
        </div>
        <ErrorMsg>{error}</ErrorMsg>
      </div>
    );
  },
);
FloatingInput.displayName = "FloatingInput";

export function ErrorMsg({ children }) {
  if (!children) return <p className="t-error-msg" aria-live="polite" />;
  return (
    <p
      className="t-error-msg text-[13px] leading-[17px] text-[var(--cz-error)]"
      aria-live="polite"
    >
      {children}
    </p>
  );
}
