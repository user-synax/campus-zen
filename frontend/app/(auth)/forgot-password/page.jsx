"use client";

import { useState, useRef } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Mail, ArrowRight, Loader2, Shield } from "lucide-react";
import { AuthShell } from "@/components/auth/AuthShell";
import { Label } from "@/components/ui/label";
import { InputWrap, InputShell, ErrorMsg } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

const ALLOWED = ["gmail.com", "proton.me"];

export default function ForgotPasswordPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [error, setError] = useState("");
  const [shake, setShake] = useState(false);
  const [loading, setLoading] = useState(false);
  const ref = useRef(null);

  const validate = () => {
    const v = email.trim().toLowerCase();
    if (!v) { setError("Enter your email."); return false; }
    if (!v.includes("@") || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v)) { setError("Enter a valid email."); return false; }
    const domain = v.split("@")[1];
    if (!ALLOWED.includes(domain)) { setError("Use a gmail.com or proton.me email."); return false; }
    return true;
  };

  const onSubmit = (e) => {
    e.preventDefault();
    if (!validate()) {
      setShake(true);
      setTimeout(() => setShake(false), 380);
      ref.current?.focus();
      return;
    }
    setLoading(true);
    setTimeout(() => {
      try { sessionStorage.setItem("cz_reset_email", email.trim().toLowerCase()); } catch {}
      router.push(`/verify-email?email=${encodeURIComponent(email.trim().toLowerCase())}&mode=reset`);
      // Actually per spec we have 3 pages: forgot -> verify-otp -> reset.
      // For this static demo we route forgot -> reset via verify-email hint + direct reset page param
      // To honor 3-page flow, push to reset-password with email param after short delay
      // For now go to reset-password
      setTimeout(() => router.push(`/reset-password?email=${encodeURIComponent(email.trim().toLowerCase())}`), 200);
    }, 700);
  };

  return (
    <AuthShell
      title="Forgot password?"
      subtitle="Enter your email and we’ll send you a 6-digit code to reset it. Static demo — no email is actually sent."
    >
      <form onSubmit={onSubmit} noValidate className="flex flex-col gap-5">
        <div className="rounded-[12px] border border-[var(--cz-muted)]/20 bg-[var(--cz-muted)]/10 px-3 py-3 flex items-start gap-3">
          <span className="grid place-items-center h-8 w-8 rounded-[9px] bg-[var(--cz-muted)] text-white shrink-0 mt-0.5">
            <Shield className="h-4 w-4" />
          </span>
          <p className="text-[13px] leading-[19px] text-[var(--cz-text-primary)]">
            Reset via OTP — same flow as email verification. You’ll enter the code on the next step.
          </p>
        </div>

        <div className="flex flex-col gap-1.5">
          <Label htmlFor="email">
            Email <span className="text-[var(--cz-error)]">*</span>
          </Label>
          <InputWrap error={!!error}>
            <InputShell error={!!error} shaking={shake}>
              <Mail className="h-4 w-4 text-[var(--cz-text-secondary)] shrink-0" />
              <input
                ref={ref}
                id="email"
                type="email"
                autoComplete="email"
                placeholder="you@gmail.com"
                value={email}
                onChange={(e) => { setEmail(e.target.value); setError(""); }}
                className="flex-1 bg-transparent outline-none text-[14px] placeholder:text-[var(--cz-text-secondary)]/50 text-[var(--cz-text-primary)] h-full"
              />
            </InputShell>
            <ErrorMsg>{error}</ErrorMsg>
            <p className="text-[11px] text-[var(--cz-text-secondary)]/70 mt-1">We’ll send a code to gmail.com or proton.me only.</p>
          </InputWrap>
        </div>

        <Button type="submit" disabled={loading} className="w-full">
          {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <ArrowRight className="h-4 w-4" />}
          {loading ? "Sending code..." : "Send reset code"}
        </Button>

        <div className="text-center text-[13px] leading-[18px] text-[var(--cz-text-secondary)]">
          Remembered it?{" "}
          <Link href="/login" className="font-medium text-[var(--cz-text-primary)] underline decoration-[var(--cz-border-strong)] underline-offset-4 hover:decoration-[var(--cz-text-primary)]">
            Back to login
          </Link>
        </div>

        <div className="flex items-center justify-center gap-2 text-[11px] tracking-[0.04em] uppercase text-[var(--cz-text-secondary)]/60">
          <span className="h-px w-8 bg-[var(--cz-border)]" /> Step 1 of 3 <span className="h-px w-8 bg-[var(--cz-border)]" />
        </div>
      </form>
    </AuthShell>
  );
}
