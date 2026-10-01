"use client";

import { useState, useEffect, Suspense } from "react";
import Link from "next/link";
import { useSearchParams, useRouter } from "next/navigation";
import { Eye, EyeOff, Lock, CheckCircle2, Loader2, KeyRound, AlertCircle } from "lucide-react";
import { AuthShell } from "@/components/auth/AuthShell";
import { FloatingInput } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { PasswordStrength } from "@/components/auth/PasswordStrength";
import { OtpInput } from "@/components/auth/OtpInput";
import { api } from "@/lib/api";

function ResetPasswordInner() {
  const search = useSearchParams();
  const router = useRouter();
  const email = search.get("email") || (typeof window !== "undefined" ? sessionStorage.getItem("cz_reset_email") || "" : "");

  const [step, setStep] = useState(1); // 1 = otp, 2 = new password
  const [otp, setOtp] = useState("");
  const [otpError, setOtpError] = useState("");
  const [shakeOtp, setShakeOtp] = useState(false);
  const [info, setInfo] = useState("");

  const [pw, setPw] = useState("");
  const [showPw, setShowPw] = useState(false);
  const [pwError, setPwError] = useState("");
  const [shakePw, setShakePw] = useState(false);
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);

  const [resendIn, setResendIn] = useState(30);
  const [canResend, setCanResend] = useState(false);

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

  const onVerifyOtp = (e) => {
    e?.preventDefault();
    if (otp.length !== 6) {
      setOtpError("Enter the 6-digit code.");
      setShakeOtp(true);
      setTimeout(() => setShakeOtp(false), 380);
      return;
    }
    // local step transition — backend will fully verify when resetting password
    setOtpError("");
    setStep(2);
  };

  useEffect(() => {
    if (step === 1 && otp.length === 6 && !loading) {
      const t = setTimeout(() => onVerifyOtp(), 300);
      return () => clearTimeout(t);
    }
  }, [otp, step, loading]);

  const onResend = async () => {
    if (!canResend || !email) return;
    setOtpError("");
    setInfo("");
    try {
      await api.resendOtp({ email: email.toLowerCase().trim(), type: "reset" });
      setCanResend(false);
      setResendIn(30);
      setOtp("");
      setInfo("New reset code sent. Check your email.");
    } catch (err) {
      const data = err.data || {};
      setOtpError(data.message || err.message || "Resend failed");
      setShakeOtp(true);
      setTimeout(() => setShakeOtp(false), 380);
    }
  };

  const onReset = async (e) => {
    e.preventDefault();
    if (!pw || pw.length < 8) {
      setPwError("Minimum 8 characters.");
      setShakePw(true);
      setTimeout(() => setShakePw(false), 380);
      return;
    }
    if (!email) {
      setPwError("Missing email. Start over from forgot password.");
      return;
    }
    if (otp.length !== 6) {
      setPwError("Missing code. Go back and re-enter it.");
      return;
    }
    setLoading(true);
    setPwError("");
    try {
      await api.resetPassword({ email: email.toLowerCase().trim(), otp, newPassword: pw });
      setDone(true);
      setTimeout(() => router.push("/login"), 1600);
    } catch (err) {
      const data = err.data || {};
      const msg = data.message || err.message || "Reset failed";
      setPwError(msg);
      setShakePw(true);
      setTimeout(() => setShakePw(false), 380);
      // if otp invalid/expired, send user back to step 1
      if (data.code?.includes("OTP") || /code/i.test(msg)) {
        setOtpError(msg);
        setShakeOtp(true);
        setTimeout(() => setShakeOtp(false), 380);
      }
    } finally {
      setLoading(false);
    }
  };

  if (done) {
    return (
      <AuthShell title="Password updated">
        <div className="flex flex-col items-center py-2 text-center">
          <span
            className="t-success-check grid h-14 w-14 place-items-center rounded-full border border-[var(--cz-border-strong)]"
            data-state="in"
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
            You&apos;re all set
          </h3>
          <p className="mt-2 text-[15px] leading-[20px] text-[var(--cz-text-secondary)]">
            Use your new password to sign in.
          </p>
          <Button
            size="lg"
            className="mt-6 w-full"
            onClick={() => router.push("/login")}
          >
            Go to sign in
          </Button>
        </div>
      </AuthShell>
    );
  }

  return (
    <AuthShell
      title={step === 1 ? "Enter reset code" : "Set a new password"}
      subtitle={
        step === 1
          ? `We sent a 6-digit code to ${email ? email.replace(/(^.).+(@.*)/, (m, a, b) => a + "***" + b) : "your email"}. It expires in 10 minutes.`
          : "Minimum 8 characters. Existing sessions will be revoked."
      }
    >
      {step === 1 ? (
        <form onSubmit={onVerifyOtp} className="flex flex-col gap-5">
          <div className="flex items-center gap-3 rounded-[16px] border border-[var(--cz-border)] p-4">
            <span className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-[var(--cz-accent-soft)] text-[var(--cz-accent)]">
              <KeyRound className="h-[18px] w-[18px]" aria-hidden />
            </span>
            <div className="min-w-0">
              <p className="truncate text-[15px] font-bold leading-[20px] text-[var(--cz-text-primary)]">
                {email || "you@gmail.com"}
              </p>
              <p className="text-[13px] leading-[16px] text-[var(--cz-text-secondary)]">
                5 attempts max
              </p>
            </div>
          </div>

          {info ? (
            <div className="rounded-[4px] bg-[var(--cz-success)]/10 px-3 py-2 text-[15px] leading-[20px] text-[var(--cz-success)]">
              {info}
            </div>
          ) : null}

          <div>
            <Label>6-digit code</Label>
            <div className={`mt-1.5 ${shakeOtp ? "t-input is-shaking" : ""}`}>
              <OtpInput value={otp} onChange={(v) => { setOtp(v); setOtpError(""); setInfo(""); }} error={!!otpError} />
            </div>
            {otpError ? (
              <p className="mt-2 flex items-center gap-1.5 text-[15px] text-[var(--cz-error)]">
                <AlertCircle className="h-4 w-4" aria-hidden /> {otpError}
              </p>
            ) : (
              <p className="mt-2 text-[15px] text-[var(--cz-text-secondary)]">
                Check your spam folder if you don&apos;t see it.
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
              <CheckCircle2 className="h-[18px] w-[18px]" aria-hidden />
            )}
            {loading ? "Verifying…" : "Continue"}
          </Button>

          <div className="flex items-center justify-between text-[15px]">
            <button
              type="button"
              onClick={onResend}
              disabled={!canResend}
              className={`font-bold ${
                canResend
                  ? "text-[var(--cz-accent)] hover:underline"
                  : "cursor-not-allowed text-[var(--cz-text-secondary)]"
              }`}
            >
              {canResend ? "Resend code" : `Resend in ${resendIn}s`}
            </button>
            <Link
              href="/forgot-password"
              className="text-[var(--cz-text-secondary)] hover:underline"
            >
              Change email
            </Link>
          </div>
        </form>
      ) : (
        <form onSubmit={onReset} noValidate className="flex flex-col gap-5">
          <div className="flex flex-col gap-1.5">
            <FloatingInput
              id="newpw"
              label="New password"
              type={showPw ? "text" : "password"}
              autoComplete="new-password"
              value={pw}
              error={pwError}
              shaking={shakePw}
              onChange={(e) => {
                setPw(e.target.value);
                setPwError("");
              }}
              suffix={
                <button
                  type="button"
                  aria-label={showPw ? "Hide password" : "Show password"}
                  onClick={() => setShowPw((v) => !v)}
                  className="-mr-1 grid h-[32px] w-[32px] place-items-center rounded-full text-[var(--cz-text-secondary)] transition-colors hover:bg-[var(--cz-border)] hover:text-[var(--cz-text-primary)]"
                >
                  <span className="t-icon-swap" data-state={showPw ? "b" : "a"}>
                    <span className="t-icon" data-icon="a"><Eye className="h-[18px] w-[18px]" aria-hidden /></span>
                    <span className="t-icon" data-icon="b"><EyeOff className="h-[18px] w-[18px]" aria-hidden /></span>
                  </span>
                </button>
              }
            />
            <PasswordStrength password={pw} />
          </div>

          <Button type="submit" disabled={loading} size="lg" className="w-full">
            {loading ? (
              <Loader2 className="h-[18px] w-[18px] animate-spin" />
            ) : (
              <Lock className="h-[18px] w-[18px]" aria-hidden />
            )}
            {loading ? "Updating…" : "Update password"}
          </Button>

          <button
            type="button"
            onClick={() => setStep(1)}
            className="text-center text-[15px] text-[var(--cz-text-secondary)] hover:underline"
          >
            Back to code entry
          </button>
        </form>
      )}
    </AuthShell>
  );
}

export default function ResetPasswordPage() {
  return (
    <Suspense
      fallback={
        <AuthShell title="Reset password" subtitle="Loading...">
          <div className="h-32 grid place-items-center text-[13px] text-[var(--cz-text-secondary)]">Loading…</div>
        </AuthShell>
      }
    >
      <ResetPasswordInner />
    </Suspense>
  );
}
