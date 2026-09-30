"use client";

import { useState, useRef } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowRight, Loader2, Shield } from "lucide-react";
import { AuthShell } from "@/components/auth/AuthShell";
import { Label } from "@/components/ui/label";
import { InputWrap, InputShell, ErrorMsg } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { api } from "@/lib/api";

const ALLOWED = ["gmail.com", "proton.me"];

export default function ForgotPasswordPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [error, setError] = useState("");
  const [shake, setShake] = useState(false);
  const [loading, setLoading] = useState(false);
  const [info, setInfo] = useState("");
  const ref = useRef(null);

  const validate = () => {
    const v = email.trim().toLowerCase();
    if (!v) {
      setError("Enter your email.");
      return false;
    }
    if (!v.includes("@") || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v)) {
      setError("Enter a valid email.");
      return false;
    }
    const domain = v.split("@")[1];
    if (!ALLOWED.includes(domain)) {
      setError("Use a gmail.com or proton.me email.");
      return false;
    }
    return true;
  };

  const onSubmit = async (e) => {
    e.preventDefault();
    setInfo("");
    if (!validate()) {
      setShake(true);
      setTimeout(() => setShake(false), 380);
      ref.current?.focus();
      return;
    }
    setLoading(true);
    setError("");
    try {
      const res = await api.forgotPassword({ email: email.trim().toLowerCase() });
      setInfo(res.message || "If an account exists, a reset code has been sent.");
      try {
        sessionStorage.setItem("cz_reset_email", email.trim().toLowerCase());
      } catch {}
      setTimeout(() => router.push(`/reset-password?email=${encodeURIComponent(email.trim().toLowerCase())}`), 400);
    } catch (err) {
      const data = err.data || {};
      setError(data.message || err.message || "Failed to send code");
      setShake(true);
      setTimeout(() => setShake(false), 380);
      if (err.status === 429) setError(data.message || "Too many requests. Try later.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthShell
      title="Reset your password"
      subtitle="Enter your email and we'll send a 6-digit code to reset it."
    >
      <form onSubmit={onSubmit} noValidate className="flex flex-col gap-5">
        <div className="flex items-start gap-3 rounded-[16px] border border-[var(--cz-border)] p-4">
          <span className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-[var(--cz-accent-soft)] text-[var(--cz-accent)]">
            <Shield className="h-4 w-4" aria-hidden />
          </span>
          <p className="text-[15px] leading-[20px] text-[var(--cz-text-secondary)]">
            Reset by OTP — the same flow as email verification. You&apos;ll
            enter the code on the next step.
          </p>
        </div>

        {info ? (
          <div className="rounded-[4px] bg-[var(--cz-success)]/10 px-3 py-2 text-[15px] leading-[20px] text-[var(--cz-success)]">
            {info}
          </div>
        ) : null}

        <div className="flex flex-col gap-1.5">
          <Label htmlFor="email">Email</Label>
          <InputWrap error={!!error}>
            <InputShell error={!!error} shaking={shake}>
              <input
                ref={ref}
                id="email"
                type="email"
                autoComplete="email"
                placeholder="you@gmail.com"
                value={email}
                onChange={(e) => {
                  setEmail(e.target.value);
                  setError("");
                  setInfo("");
                }}
                className="h-full flex-1 bg-transparent text-[15px] text-[var(--cz-text-primary)] outline-none placeholder:text-[var(--cz-text-secondary)]"
              />
            </InputShell>
            <ErrorMsg>{error}</ErrorMsg>
            <p className="mt-1 text-[13px] leading-[17px] text-[var(--cz-text-secondary)]">
              We only send codes to gmail.com or proton.me.
            </p>
          </InputWrap>
        </div>

        <Button type="submit" disabled={loading} size="lg" className="w-full">
          {loading ? (
            <Loader2 className="h-[18px] w-[18px] animate-spin" />
          ) : (
            <ArrowRight className="h-[18px] w-[18px]" aria-hidden />
          )}
          {loading ? "Sending code…" : "Send reset code"}
        </Button>

        <p className="text-center text-[15px] leading-[20px] text-[var(--cz-text-secondary)]">
          Remembered it?{" "}
          <Link
            href="/login"
            className="font-bold text-[var(--cz-accent)] hover:underline"
          >
            Back to sign in
          </Link>
        </p>
      </form>
    </AuthShell>
  );
}
