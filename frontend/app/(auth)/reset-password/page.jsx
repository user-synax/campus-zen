"use client";

import { useState, useEffect, Suspense } from "react";
import Link from "next/link";
import { useSearchParams, useRouter } from "next/navigation";
import { Eye, EyeOff, Lock, CheckCircle2, Loader2, KeyRound, AlertCircle } from "lucide-react";
import { AuthShell } from "@/components/auth/AuthShell";
import { Label } from "@/components/ui/label";
import { InputWrap, InputShell, ErrorMsg } from "@/components/ui/input";
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
      setInfo("New reset code sent. Check console in dev.");
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
      <AuthShell title="Password updated!" subtitle="Your password has been reset successfully.">
        <div className="flex flex-col items-center text-center py-2">
          <span className="t-success-check grid place-items-center h-14 w-14 rounded-full bg-emerald-500/15 border border-emerald-500/20" data-state="in">
            <svg viewBox="0 0 24 24" className="h-7 w-7" fill="none" stroke="rgb(52 211 153)" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M5 13l4 4L19 7" />
            </svg>
          </span>
          <h3 className="mt-4 text-[15px] font-semibold tracking-[-0.02em] text-[var(--cz-text-primary)]">You’re all set</h3>
          <p className="mt-1.5 text-[13px] leading-[19px] text-[var(--cz-text-secondary)]">Use your new password to log in. Redirecting…</p>
          <Button className="mt-5 w-full" onClick={() => router.push("/login")}>
            Go to login
          </Button>
        </div>
      </AuthShell>
    );
  }

  return (
    <AuthShell
      title={step === 1 ? "Enter reset code" : "Set new password"}
      subtitle={
        step === 1
          ? `We sent a 6-digit code to ${email ? email.replace(/(^.).+(@.*)/, (m, a, b) => a + "***" + b) : "your email"}. Check console in dev.`
          : "Choose a strong new password. Minimum 8 characters."
      }
    >
      {step === 1 ? (
        <form onSubmit={onVerifyOtp} className="flex flex-col gap-5">
          <div className="rounded-[12px] border border-[var(--cz-border)] bg-[rgba(255,255,255,0.03)] px-3 py-3 flex items-center gap-3">
            <span className="grid place-items-center h-9 w-9 rounded-[10px] bg-[var(--cz-muted)]/15 border border-[var(--cz-muted)]/20 text-[var(--cz-muted)]">
              <KeyRound className="h-4 w-4" />
            </span>
            <div>
              <div className="text-[13px] font-medium leading-none text-[var(--cz-text-primary)]">{email || "you@gmail.com"}</div>
              <div className="text-[11px] text-[var(--cz-text-secondary)] mt-1">Code valid for 10 minutes • 5 attempts max</div>
            </div>
          </div>

          {info ? <div className="rounded-[10px] border border-emerald-500/20 bg-emerald-500/10 px-3 py-2 text-[13px] text-emerald-300">{info}</div> : null}

          <div>
            <Label>6-digit code</Label>
            <div className={`mt-1.5 ${shakeOtp ? "t-input is-shaking" : ""}`}>
              <OtpInput value={otp} onChange={(v) => { setOtp(v); setOtpError(""); setInfo(""); }} error={!!otpError} />
            </div>
            {otpError ? (
              <p className="mt-2 flex items-center gap-1.5 text-[12px] text-[var(--cz-error)]">
                <AlertCircle className="h-3.5 w-3.5" /> {otpError}
              </p>
            ) : (
              <p className="mt-2 text-[12px] text-[var(--cz-text-secondary)]/70">Check spam folder or console in dev if you don’t see it.</p>
            )}
          </div>

          <Button type="submit" disabled={loading || otp.length !== 6} className="w-full">
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle2 className="h-4 w-4" />}
            {loading ? "Verifying..." : "Continue"}
          </Button>

          <div className="flex items-center justify-between text-[13px]">
            <button
              type="button"
              onClick={onResend}
              disabled={!canResend}
              className={`font-medium ${canResend ? "text-[var(--cz-text-primary)] hover:text-[var(--cz-muted)]" : "text-[var(--cz-text-secondary)]/60 cursor-not-allowed"}`}
            >
              {canResend ? "Resend code" : `Resend in ${resendIn}s`}
            </button>
            <Link href="/forgot-password" className="text-[var(--cz-text-secondary)] hover:text-[var(--cz-text-primary)] underline-offset-4 hover:underline">
              Change email
            </Link>
          </div>

          <div className="flex items-center justify-center gap-2 text-[11px] tracking-[0.04em] uppercase text-[var(--cz-text-secondary)]/60">
            <span className="h-px w-8 bg-[var(--cz-border)]" /> Step 2 of 3 <span className="h-px w-8 bg-[var(--cz-border)]" />
          </div>
        </form>
      ) : (
        <form onSubmit={onReset} noValidate className="flex flex-col gap-4">
          <div className="rounded-[10px] border border-[var(--cz-border)] bg-[rgba(255,255,255,0.03)] px-3 py-2.5 text-[12px] leading-[17px] text-[var(--cz-text-secondary)]">
            Resetting for <span className="text-[var(--cz-text-primary)] font-medium">{email || "your email"}</span> • Code <span className="font-mono text-[var(--cz-text-primary)]">{otp || "______"}</span>
          </div>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="newpw">
              New password <span className="text-[var(--cz-error)]">*</span>
            </Label>
            <InputWrap error={!!pwError}>
              <InputShell error={!!pwError} shaking={shakePw}>
                <Lock className="h-4 w-4 text-[var(--cz-text-secondary)] shrink-0" />
                <input
                  id="newpw"
                  type={showPw ? "text" : "password"}
                  autoComplete="new-password"
                  placeholder="Minimum 8 characters"
                  value={pw}
                  onChange={(e) => {
                    setPw(e.target.value);
                    setPwError("");
                  }}
                  className="flex-1 bg-transparent outline-none text-[14px] placeholder:text-[var(--cz-text-secondary)]/50 text-[var(--cz-text-primary)] h-full"
                />
                <button
                  type="button"
                  aria-label={showPw ? "Hide" : "Show"}
                  onClick={() => setShowPw((v) => !v)}
                  className="grid place-items-center h-7 w-7 rounded-[8px] hover:bg-[rgba(255,206,173,0.08)] text-[var(--cz-text-secondary)] hover:text-[var(--cz-text-primary)]"
                >
                  <span className="t-icon-swap" data-state={showPw ? "b" : "a"}>
                    <span className="t-icon" data-icon="a"><Eye className="h-4 w-4" /></span>
                    <span className="t-icon" data-icon="b"><EyeOff className="h-4 w-4" /></span>
                  </span>
                </button>
              </InputShell>
              <ErrorMsg>{pwError}</ErrorMsg>
              <PasswordStrength password={pw} />
            </InputWrap>
          </div>

          <div className="rounded-[10px] border border-[var(--cz-border)] bg-[rgba(255,255,255,0.03)] px-3 py-2.5 text-[12px] leading-[17px] text-[var(--cz-text-secondary)]">
            After reset, you’ll be redirected to login. Existing sessions will be revoked.
          </div>

          <Button type="submit" disabled={loading} className="w-full">
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Lock className="h-4 w-4" />}
            {loading ? "Updating..." : "Update password"}
          </Button>

          <button type="button" onClick={() => setStep(1)} className="text-center text-[13px] text-[var(--cz-text-secondary)] hover:text-[var(--cz-text-primary)] underline-offset-4 hover:underline">
            Back to code entry
          </button>

          <div className="flex items-center justify-center gap-2 text-[11px] tracking-[0.04em] uppercase text-[var(--cz-text-secondary)]/60">
            <span className="h-px w-8 bg-[var(--cz-border)]" /> Step 3 of 3 <span className="h-px w-8 bg-[var(--cz-border)]" />
          </div>
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
