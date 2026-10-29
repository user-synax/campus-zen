"use client";

import { AlertCircle, Check, Loader2, ShieldCheck } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { AuthShell } from "@/components/auth/AuthShell";
import { OtpInput } from "@/components/auth/OtpInput";
import { Button } from "@/components/ui/button";
import { FloatingInput } from "@/components/ui/input";
import { api } from "@/lib/api";

export function ParentalConsentForm({ initialEmail }) {
  const [email, setEmail] = useState(initialEmail || "");
  const [otp, setOtp] = useState("");
  const [mode, setMode] = useState("consent");
  const [withdrawStep, setWithdrawStep] = useState("request");
  const [confirmed, setConfirmed] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [info, setInfo] = useState("");
  const [done, setDone] = useState(null);

  const cleanEmail = email.trim().toLowerCase();

  const onSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setInfo("");

    if (!cleanEmail) {
      setError("Enter the email used for the CampusZen account.");
      return;
    }

    setLoading(true);
    try {
      if (mode === "consent") {
        if (!confirmed) {
          setError("Please confirm that you are the parent or lawful guardian.");
          return;
        }
        if (otp.length !== 6) {
          setError("Enter the 6-digit consent code.");
          return;
        }
        await api.verifyParentalConsent({ email: cleanEmail, otp });
        setDone({ type: "consent" });
        return;
      }

      if (withdrawStep === "request") {
        await api.requestParentalWithdrawal({ email: cleanEmail });
        setWithdrawStep("verify");
        setInfo(
          "If a guardian consent is on file, a confirmation code has been sent to the guardian email.",
        );
        return;
      }

      if (otp.length !== 6) {
        setError("Enter the 6-digit confirmation code.");
        return;
      }
      await api.verifyParentalWithdrawal({ email: cleanEmail, otp });
      setDone({ type: "withdraw" });
    } catch (err) {
      setError(
        err?.data?.message || err.message || "We could not complete that request.",
      );
    } finally {
      setLoading(false);
    }
  };

  const onResend = async () => {
    setError("");
    setInfo("");
    if (!cleanEmail) {
      setError("Enter the email used for the CampusZen account.");
      return;
    }
    try {
      if (mode === "consent") {
        await api.resendOtp({ email: cleanEmail, type: "guardian" });
        setInfo("A new consent code has been sent to the guardian email.");
      } else {
        await api.requestParentalWithdrawal({ email: cleanEmail });
        setWithdrawStep("verify");
        setInfo("A new confirmation code has been sent to the guardian email.");
      }
    } catch (err) {
      setError(err?.data?.message || err.message || "Could not resend the code.");
    }
  };

  if (done) {
    return (
      <AuthShell
        title={done.type === "consent" ? "Consent recorded" : "Consent withdrawn"}
        subtitle={
          done.type === "consent"
            ? "The account can now verify its email address."
            : "The account has been deactivated and scheduled for deletion."
        }
      >
        <div className="flex flex-col items-center gap-5 py-2 text-center">
          <span className="grid h-14 w-14 place-items-center rounded-full border border-[var(--cz-border-strong)]">
            {done.type === "consent" ? (
              <Check className="h-7 w-7 text-[var(--cz-success)]" aria-hidden />
            ) : (
              <ShieldCheck
                className="h-7 w-7 text-[var(--cz-text-secondary)]"
                aria-hidden
              />
            )}
          </span>
          <p className="max-w-[38ch] text-[15px] leading-[21px] text-[var(--cz-text-secondary)]">
            {done.type === "consent"
              ? "We have emailed the account holder a verification code. They can finish signing up now."
              : "The account is hidden and will be permanently removed by the deletion sweep. Consent records have been updated."}
          </p>
          <Link
            href={
              done.type === "consent"
                ? `/verify-email?email=${encodeURIComponent(cleanEmail)}`
                : "/"
            }
            className="inline-flex h-[42px] items-center justify-center rounded-full bg-[var(--cz-accent)] px-5 text-[15px] font-bold text-[var(--cz-text-inverse)]"
          >
            {done.type === "consent" ? "Verify email" : "Back to CampusZen"}
          </Link>
        </div>
      </AuthShell>
    );
  }

  return (
    <AuthShell
      title="Guardian consent"
      subtitle="This page is for a parent or lawful guardian. The account holder must be 13–17 for this step."
    >
      <form onSubmit={onSubmit} className="flex flex-col gap-5" noValidate>
        <div className="flex rounded-full border border-[var(--cz-border)] p-1 text-[13px] font-bold">
          <button
            type="button"
            onClick={() => {
              setMode("consent");
              setWithdrawStep("request");
              setOtp("");
              setError("");
              setInfo("");
            }}
            className={`flex-1 rounded-full px-3 py-2 transition-colors ${
              mode === "consent"
                ? "bg-[var(--cz-accent)] text-[var(--cz-text-inverse)]"
                : "text-[var(--cz-text-secondary)] hover:bg-[var(--cz-surface-strong)]"
            }`}
          >
            Approve account
          </button>
          <button
            type="button"
            onClick={() => {
              setMode("withdraw");
              setOtp("");
              setError("");
              setInfo("");
            }}
            className={`flex-1 rounded-full px-3 py-2 transition-colors ${
              mode === "withdraw"
                ? "bg-[var(--cz-accent)] text-[var(--cz-text-inverse)]"
                : "text-[var(--cz-text-secondary)] hover:bg-[var(--cz-surface-strong)]"
            }`}
          >
            Withdraw consent
          </button>
        </div>

        {error ? (
          <div className="flex items-start gap-2 rounded-[4px] bg-[color-mix(in_srgb,var(--cz-error)_10%,transparent)] px-3 py-2.5 text-[14px] leading-[20px] text-[var(--cz-error)]">
            <AlertCircle className="mt-0.5 h-[18px] w-[18px] shrink-0" aria-hidden />
            <span>{error}</span>
          </div>
        ) : null}

        {info ? (
          <div className="rounded-[4px] bg-[var(--cz-accent-soft)] px-3 py-2 text-[14px] leading-[20px] text-[var(--cz-accent)]">
            {info}
          </div>
        ) : null}

        <FloatingInput
          id="guardian-email"
          label="Account holder's email"
          type="email"
          autoComplete="email"
          value={email}
          onChange={(e) => {
            setEmail(e.target.value);
            setError("");
          }}
        />

        {mode === "consent" || withdrawStep === "verify" ? (
          <div>
            <OtpInput
              value={otp}
              onChange={(v) => {
                setOtp(v.replace(/\D/g, "").slice(0, 6));
                setError("");
              }}
              error={!!error}
            />
            <p className="mt-2 text-[14px] leading-[20px] text-[var(--cz-text-secondary)]">
              Enter the 6-digit code sent to the guardian email.
            </p>
          </div>
        ) : (
          <p className="text-[14px] leading-[20px] text-[var(--cz-text-secondary)]">
            We will send a confirmation code to the guardian email on file.
            Entering it withdraws consent; the account is deactivated and
            scheduled for deletion.
          </p>
        )}

        {mode === "consent" ? (
          <label className="flex items-start gap-2.5 rounded-[12px] border border-[var(--cz-border)] p-3 text-[13px] leading-[18px] text-[var(--cz-text-secondary)]">
            <input
              type="checkbox"
              checked={confirmed}
              onChange={(e) => {
                setConfirmed(e.target.checked);
                setError("");
              }}
              className="mt-0.5 h-4 w-4 shrink-0 accent-[var(--cz-accent)]"
            />
            <span>
              I confirm I am the parent or lawful guardian, I am 18 or older,
              and I consent to CampusZen processing this child&apos;s personal
              data as described in the{" "}
              <Link
                href="/privacy"
                className="font-bold text-[var(--cz-accent)] hover:underline"
              >
                Privacy Notice
              </Link>
              . I understand I can withdraw consent at any time.
            </span>
          </label>
        ) : null}

        <Button
          type="submit"
          size="lg"
          className="w-full"
          disabled={
            loading ||
            (mode === "consent" && (!confirmed || otp.length !== 6)) ||
            (mode === "withdraw" &&
              withdrawStep === "verify" &&
              otp.length !== 6)
          }
        >
          {loading ? (
            <Loader2 className="h-[18px] w-[18px] animate-spin" aria-hidden />
          ) : (
            <ShieldCheck className="h-[18px] w-[18px]" aria-hidden />
          )}
          {loading
            ? "Working…"
            : mode === "consent"
              ? "Approve this account"
              : withdrawStep === "request"
                ? "Send confirmation code"
                : "Withdraw consent"}
        </Button>

        <div className="flex items-center justify-between text-[14px]">
          <button
            type="button"
            onClick={onResend}
            className="font-bold text-[var(--cz-accent)] hover:underline"
          >
            Resend code
          </button>
          <Link href="/login" className="text-[var(--cz-text-secondary)] hover:underline">
            Back to sign in
          </Link>
        </div>

        <p className="border-t border-[var(--cz-border)] pt-4 text-[12px] leading-[18px] text-[var(--cz-text-tertiary)]">
          CampusZen does not knowingly allow accounts for children under 13.
          Questions about a child&apos;s data: privacy@campuszen.tech.
        </p>
      </form>
    </AuthShell>
  );
}
