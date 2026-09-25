"use client";

import { useState, useEffect, Suspense } from "react";
import Link from "next/link";
import { useSearchParams, useRouter } from "next/navigation";
import { Mail, ShieldCheck, RefreshCw, Loader2, ArrowRight, AlertCircle } from "lucide-react";
import { AuthShell } from "@/components/auth/AuthShell";
import { OtpInput } from "@/components/auth/OtpInput";
import { Button } from "@/components/ui/button";
import { api } from "@/lib/api";

function VerifyEmailInner() {
  const search = useSearchParams();
  const router = useRouter();
  const email = search.get("email") || (typeof window !== "undefined" ? sessionStorage.getItem("cz_pending_email") || "" : "");
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
      setTimeout(() => router.push("/login"), 1400);
    } catch (err) {
      const data = err.data || {};
      setError(data.message || err.message || "Verification failed");
      triggerShake();
      if (err.status === 429) setError(data.message || "Too many attempts. Try later.");
    } finally {
      setLoading(false);
    }
  };

  const onResend = async () => {
    if (!canResend || !email) return;
    setError("");
    setInfo("");
    try {
      await api.resendOtp({ email: email.toLowerCase().trim(), type: "verify" });
      setCanResend(false);
      setResendIn(30);
      setOtp("");
      setInfo("New code sent. Check your email or console in dev.");
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

  const masked = email ? email.replace(/(^.).+(@.*)/, (m, a, b) => a + "***" + b) : "your email";

  return (
    <AuthShell title="Verify your email" subtitle={`We sent a 6-digit code to ${masked}. Expires in 10 minutes. Check console in dev.`}>
      <div className="flex flex-col gap-5">
        {!success ? (
          <>
            <div className="flex items-center gap-3 rounded-[12px] border border-[var(--cz-border)] bg-[rgba(255,255,255,0.03)] px-3 py-3">
              <span className="grid place-items-center h-9 w-9 rounded-[10px] bg-[var(--cz-muted)]/15 border border-[var(--cz-muted)]/20 text-[var(--cz-muted)]">
                <Mail className="h-4 w-4" />
              </span>
              <div className="min-w-0">
                <div className="text-[13px] font-medium leading-none text-[var(--cz-text-primary)] truncate">{email || "you@gmail.com"}</div>
                <div className="text-[11px] tracking-wide text-[var(--cz-text-secondary)] mt-1">Code expires in 10 minutes • 5 attempts max</div>
              </div>
              <span className="ml-auto hidden sm:inline-flex items-center gap-1.5 rounded-full bg-emerald-500/10 border border-emerald-500/20 px-2.5 py-1 text-[11px] font-medium text-emerald-300">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" /> Sent
              </span>
            </div>

            {info ? (
              <div className="rounded-[10px] border border-emerald-500/20 bg-emerald-500/10 px-3 py-2 text-[13px] text-emerald-300">{info}</div>
            ) : null}

            <form onSubmit={onVerify} className="flex flex-col gap-4">
              <div className={shake ? "is-shaking" : ""} style={{ willChange: "transform" }}>
                <div className={`${shake ? "t-input is-shaking" : ""} rounded-[10px]`}>
                  <OtpInput value={otp} onChange={(v) => { setOtp(v.replace(/\D/g, "").slice(0, 6)); setError(""); setInfo(""); }} error={!!error} />
                </div>
                {error ? (
                  <p className="mt-2 flex items-center gap-1.5 text-[12px] leading-[16px] text-[var(--cz-error)]">
                    <AlertCircle className="h-3.5 w-3.5" /> {error}
                  </p>
                ) : (
                  <p className="mt-2 text-[12px] leading-[16px] text-[var(--cz-text-secondary)]/70">Didn&apos;t get a code? Check spam or resend. Backend logs OTP in dev.</p>
                )}
              </div>

              <Button type="submit" disabled={loading || otp.length !== 6} className="w-full">
                {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <ShieldCheck className="h-4 w-4" />}
                {loading ? "Verifying..." : "Verify email"}
              </Button>

              <div className="flex items-center justify-between text-[13px]">
                <button
                  type="button"
                  onClick={onResend}
                  disabled={!canResend}
                  className={`inline-flex items-center gap-1.5 font-medium transition-colors ${canResend ? "text-[var(--cz-text-primary)] hover:text-[var(--cz-muted)]" : "text-[var(--cz-text-secondary)]/60 cursor-not-allowed"}`}
                >
                  <RefreshCw className={`h-3.5 w-3.5 ${canResend ? "" : "opacity-60"}`} />
                  {canResend ? "Resend code" : `Resend in ${resendIn}s`}
                </button>
                <Link href="/signup" className="text-[var(--cz-text-secondary)] hover:text-[var(--cz-text-primary)] underline-offset-4 hover:underline">
                  Change email
                </Link>
              </div>
            </form>
          </>
        ) : (
          <div className="flex flex-col items-center text-center py-2">
            <span className="t-success-check grid place-items-center h-14 w-14 rounded-full bg-emerald-500/15 border border-emerald-500/20" data-state="in" aria-hidden>
              <svg viewBox="0 0 24 24" className="h-7 w-7" fill="none" stroke="rgb(52 211 153)" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M5 13l4 4L19 7" />
              </svg>
            </span>
            <h3 className="mt-4 text-[16px] font-semibold tracking-[-0.02em] text-[var(--cz-text-primary)]">Email verified!</h3>
            <p className="mt-1.5 text-[13px] leading-[19px] text-[var(--cz-text-secondary)]">Your account is ready. Redirecting you to log in...</p>
            <div className="mt-5 inline-flex items-center gap-2 rounded-full border border-[var(--cz-border)] bg-[rgba(255,255,255,0.04)] px-3 py-1.5 text-[12px] text-[var(--cz-text-secondary)]">
              <Loader2 className="h-3.5 w-3.5 animate-spin" /> Taking you to login
              <ArrowRight className="h-3.5 w-3.5" />
            </div>
          </div>
        )}

        <div className="border-t border-[var(--cz-border)] pt-4 flex items-center justify-center gap-4 text-[12px]">
          <Link href="/login" className="text-[var(--cz-text-secondary)] hover:text-[var(--cz-text-primary)] underline-offset-4 hover:underline">
            Back to login
          </Link>
          <span className="h-3 w-px bg-[var(--cz-border)]" />
          <Link href="/signup" className="text-[var(--cz-text-secondary)] hover:text-[var(--cz-text-primary)] underline-offset-4 hover:underline">
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
          <div className="h-32 grid place-items-center text-[13px] text-[var(--cz-text-secondary)]">Loading…</div>
        </AuthShell>
      }
    >
      <VerifyEmailInner />
    </Suspense>
  );
}
