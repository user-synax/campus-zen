"use client";

import {
  AlertCircle,
  Loader2,
  Mail,
  RefreshCw,
  ShieldCheck,
} from "lucide-react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useEffect, useState } from "react";
import { AuthShell } from "@/components/auth/AuthShell";
import { OtpInput } from "@/components/auth/OtpInput";
import { Button } from "@/components/ui/button";
import { api } from "@/lib/api";

function VerifyEmailInner() {
  const search = useSearchParams();
  const router = useRouter();
  const email =
    search.get("email") ||
    (typeof window !== "undefined"
      ? sessionStorage.getItem("cz_pending_email") || ""
      : "");
  const [otp, setOtp] = useState("");
  const [error, setError] = useState("");
  const [shake, setShake] = useState(false);
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [resendIn, setResendIn] = useState(30);
  const [canResend, setCanResend] = useState(false);
  const [info, setInfo] = useState("");

  useEffect(() => {
    if (canResend) return;
    const t = setInterval(() => {
      setResendIn((v) => {
        if (v <= 1) {
          setCanResend(true);
          clearInterval(t);
          return 0;
        }
        return v - 1;
      });
    }, 1000);
    return () => clearInterval(t);
  }, [canResend]);

  const triggerShake = () => {
    setShake(true);
    setTimeout(() => setShake(false), 420);
  };

  const onVerify = async (e) => {
    e?.preventDefault();
    if (!email) {
      setError("Missing email. Go back to signup.");
      triggerShake();
      return;
    }
    if (otp.length !== 6) {
      setError("Enter the 6-digit code.");
      triggerShake();
      return;
    }
    setLoading(true);
    setError("");
    setInfo("");
    try {
      await api.verifyEmail({ email: email.toLowerCase().trim(), otp });
      setSuccess(true);
      setTimeout(() => {
        router.push("/app");
        router.refresh();
      }, 1400);
    } catch (err) {
      const data = err.data || {};
      setError(data.message || err.message || "Verification failed");
      triggerShake();
      if (err.status === 429)
        setError(data.message || "Too many attempts. Try later.");
    } finally {
      setLoading(false);
    }
  };

  const onResend = async () => {
    if (!canResend || !email) return;
    setError("");
    setInfo("");
    try {
      await api.resendOtp({
        email: email.toLowerCase().trim(),
        type: "verify",
      });
      setCanResend(false);
      setResendIn(30);
      setOtp("");
      setInfo("New code sent. Check your email.");
    } catch (err) {
      const data = err.data || {};
      setError(data.message || err.message || "Resend failed");
      if (data.code === "RESEND_THROTTLE") {
        setCanResend(false);
        setResendIn(30);
      }
    }
  };

  useEffect(() => {
    if (otp.length === 6 && !success && !loading) {
      const t = setTimeout(() => onVerify(), 280);
      return () => clearTimeout(t);
    }
  }, [otp]);

  const masked = email
    ? email.replace(/(^.).+(@.*)/, (m, a, b) => a + "***" + b)
    : "your email";

  return (
    <AuthShell
      title="Verify your email"
      subtitle={`We sent a 6-digit code to ${masked}. It expires in 10 minutes.`}
    >
      <div className="flex flex-col gap-5">
        {!success ? (
          <>
            <div className="flex items-center gap-3 rounded-[16px] border border-[var(--cz-border)] p-4">
              <span className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-[var(--cz-accent-soft)] text-[var(--cz-accent)]">
                <Mail className="h-[18px] w-[18px]" aria-hidden />
              </span>
              <div className="min-w-0 flex-1">
                <p className="truncate text-[15px] font-bold leading-[20px] text-[var(--cz-text-primary)]">
                  {email || "you@gmail.com"}
                </p>
                <p className="text-[13px] leading-[16px] text-[var(--cz-text-secondary)]">
                  5 attempts max
                </p>
              </div>
              <span className="inline-flex shrink-0 items-center gap-1.5 text-[13px] text-[var(--cz-success)]">
                <span
                  className="h-2 w-2 animate-pulse rounded-full bg-[var(--cz-success)]"
                  aria-hidden
                />
                Sent
              </span>
            </div>

            {info ? (
              <div className="rounded-[4px] bg-[var(--cz-accent-soft)] px-3 py-2 text-[15px] leading-[20px] text-[var(--cz-accent)]">
                {info}
              </div>
            ) : null}

            <form onSubmit={onVerify} className="flex flex-col gap-5">
              <div
                className={shake ? "is-shaking" : ""}
                style={{ willChange: "transform" }}
              >
                <div className={shake ? "t-input is-shaking" : ""}>
                  <OtpInput
                    value={otp}
                    onChange={(v) => {
                      setOtp(v.replace(/\D/g, "").slice(0, 6));
                      setError("");
                      setInfo("");
                    }}
                    error={!!error}
                  />
                </div>
                {error ? (
                  <p className="mt-2 flex items-center gap-1.5 text-[15px] leading-[20px] text-[var(--cz-error)]">
                    <AlertCircle className="h-4 w-4" aria-hidden /> {error}
                  </p>
                ) : (
                  <p className="mt-2 text-[15px] leading-[20px] text-[var(--cz-text-secondary)]">
                    Didn&apos;t get a code? Check spam or resend.
                  </p>
                )}
              </div>

              <Button
                type="submit"
                disabled={loading || otp.length !== 6}
                size="lg"
                className="w-full"
              >
                {loading ? (
                  <Loader2 className="h-[18px] w-[18px] animate-spin" />
                ) : (
                  <ShieldCheck className="h-[18px] w-[18px]" aria-hidden />
                )}
                {loading ? "Verifying…" : "Verify email"}
              </Button>

              <div className="flex items-center justify-between text-[15px]">
                <button
                  type="button"
                  onClick={onResend}
                  disabled={!canResend}
                  className={`inline-flex items-center gap-1.5 font-bold transition-colors ${
                    canResend
                      ? "text-[var(--cz-accent)] hover:underline"
                      : "cursor-not-allowed text-[var(--cz-text-secondary)]"
                  }`}
                >
                  <RefreshCw className="h-4 w-4" aria-hidden />
                  {canResend ? "Resend code" : `Resend in ${resendIn}s`}
                </button>
                <Link
                  href="/signup"
                  className="text-[var(--cz-text-secondary)] hover:underline"
                >
                  Change email
                </Link>
              </div>
            </form>
          </>
        ) : (
          <div className="flex flex-col items-center py-2 text-center">
            <span
              className="t-success-check grid h-14 w-14 place-items-center rounded-full border border-[var(--cz-border-strong)]"
              data-state="in"
              aria-hidden
            >
              <svg
                viewBox="0 0 24 24"
                className="h-7 w-7"
                fill="none"
                stroke="var(--cz-success)"
                strokeWidth="2.2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M5 13l4 4L19 7" />
              </svg>
            </span>
            <h3 className="mt-5 text-[23px] leading-6 font-extrabold text-[var(--cz-text-primary)]">
              Email verified
            </h3>
            <p className="mt-2 max-w-[32ch] text-[15px] leading-[20px] text-[var(--cz-text-secondary)]">
              Your account is ready. Taking you to CampusZen…
            </p>
          </div>
        )}

        <div className="flex items-center justify-center gap-4 border-t border-[var(--cz-border)] pt-5 text-[15px]">
          <Link
            href="/login"
            className="text-[var(--cz-text-secondary)] hover:underline"
          >
            Back to sign in
          </Link>
          <Link
            href="/signup"
            className="text-[var(--cz-text-secondary)] hover:underline"
          >
            Create account
          </Link>
        </div>
      </div>
    </AuthShell>
  );
}

export default function VerifyEmailPage() {
  return (
    <Suspense
      fallback={
        <AuthShell title="Verify your email" subtitle="Loading...">
          <div className="h-32 grid place-items-center text-[13px] text-[var(--cz-text-secondary)]">
            Loading…
          </div>
        </AuthShell>
      }
    >
      <VerifyEmailInner />
    </Suspense>
  );
}
