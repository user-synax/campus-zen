"use client";

import { useState, useRef } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Eye, EyeOff, LogIn, Loader2 } from "lucide-react";
import { AuthShell } from "@/components/auth/AuthShell";
import { Label } from "@/components/ui/label";
import { InputWrap, InputShell, ErrorMsg } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";

export default function LoginPage() {
  const router = useRouter();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [showPw, setShowPw] = useState(false);
  const [remember, setRemember] = useState(true);
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState({});
  const [shake, setShake] = useState({});

  const userRef = useRef(null);
  const pwRef = useRef(null);

  const triggerShake = (key) => {
    setShake((s) => ({ ...s, [key]: true }));
    setTimeout(() => setShake((s) => ({ ...s, [key]: false })), 360);
  };

  const validate = () => {
    const e = {};
    if (!username.trim()) e.username = "Enter your username.";
    else if (username.trim().length < 3) e.username = "Username must be at least 3 characters.";
    if (!password) e.password = "Enter your password.";
    else if (password.length < 8) e.password = "Password must be at least 8 characters.";
    setErrors(e);
    Object.keys(e).forEach(triggerShake);
    if (e.username) userRef.current?.focus();
    else if (e.password) pwRef.current?.focus();
    return Object.keys(e).length === 0;
  };

  const onSubmit = (e) => {
    e.preventDefault();
    if (!validate()) return;
    setLoading(true);
    setTimeout(() => {
      setLoading(false);
      // static demo - show success then redirect to fictional feed
      router.push("/login?success=1");
      // keep on page for demo but indicate success via toast-like inline
      setErrors({ _success: "Logged in — welcome back! (static demo)" });
    }, 700);
  };

  return (
    <AuthShell title="Welcome back" subtitle="Log in with your username and password.">
      <form onSubmit={onSubmit} noValidate className="flex flex-col gap-4">
        {/* username */}
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="username">
            Username <span className="text-[var(--cz-error)]">*</span>
          </Label>
          <InputWrap error={!!errors.username}>
            <InputShell error={!!errors.username} shaking={!!shake.username}>
              <span className="text-[14px] text-[var(--cz-text-secondary)] select-none">@</span>
              <input
                ref={userRef}
                id="username"
                autoComplete="username"
                placeholder="user_synax"
                value={username}
                onChange={(e) => {
                  setUsername(e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, ""));
                  if (errors.username) setErrors((p) => ({ ...p, username: undefined, _success: undefined }));
                }}
                className="flex-1 bg-transparent outline-none text-[14px] placeholder:text-[var(--cz-text-secondary)]/50 text-[var(--cz-text-primary)] h-full"
              />
            </InputShell>
            <ErrorMsg>{errors.username}</ErrorMsg>
          </InputWrap>
        </div>

        {/* password */}
        <div className="flex flex-col gap-1.5">
          <div className="flex items-center justify-between">
            <Label htmlFor="password">
              Password <span className="text-[var(--cz-error)]">*</span>
            </Label>
            <Link
              href="/forgot-password"
              className="text-[12px] font-medium text-[var(--cz-muted)] hover:text-[#9aa0ff] underline-offset-4 hover:underline"
            >
              Forgot password?
            </Link>
          </div>
          <InputWrap error={!!errors.password}>
            <InputShell error={!!errors.password} shaking={!!shake.password}>
              <input
                ref={pwRef}
                id="password"
                type={showPw ? "text" : "password"}
                autoComplete="current-password"
                placeholder="••••••••"
                value={password}
                onChange={(e) => {
                  setPassword(e.target.value);
                  if (errors.password) setErrors((p) => ({ ...p, password: undefined, _success: undefined }));
                }}
                className="flex-1 bg-transparent outline-none text-[14px] placeholder:text-[var(--cz-text-secondary)]/50 text-[var(--cz-text-primary)] h-full"
              />
              <button
                type="button"
                aria-label={showPw ? "Hide password" : "Show password"}
                onClick={() => setShowPw((v) => !v)}
                className="grid place-items-center h-7 w-7 rounded-[8px] hover:bg-[rgba(255,206,173,0.08)] text-[var(--cz-text-secondary)] hover:text-[var(--cz-text-primary)] transition-colors"
              >
                <span className="t-icon-swap" data-state={showPw ? "b" : "a"}>
                  <span className="t-icon" data-icon="a"><Eye className="h-4 w-4" /></span>
                  <span className="t-icon" data-icon="b"><EyeOff className="h-4 w-4" /></span>
                </span>
              </button>
            </InputShell>
            <ErrorMsg>{errors.password}</ErrorMsg>
          </InputWrap>
        </div>

        <div className="flex items-center justify-between pt-1">
          <Checkbox id="remember" checked={remember} onChange={setRemember} label="Remember me" />
          <span className="hidden sm:inline text-[11px] tracking-[0.04em] uppercase text-[var(--cz-text-secondary)]/60">Secure • HTTP-only</span>
        </div>

        {errors._success ? (
          <div className="rounded-[10px] border border-emerald-500/20 bg-emerald-500/10 px-3 py-2.5 text-[13px] leading-[18px] text-emerald-300">
            {errors._success}
          </div>
        ) : null}

        <Button type="submit" disabled={loading} className="mt-1 w-full">
          {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <LogIn className="h-4 w-4" />}
          {loading ? "Logging in..." : "Log in"}
        </Button>

        <p className="text-center text-[13px] leading-[18px] text-[var(--cz-text-secondary)]">
          Don&apos;t have an account?{" "}
          <Link href="/signup" className="font-medium text-[var(--cz-text-primary)] underline decoration-[var(--cz-border-strong)] underline-offset-4 hover:decoration-[var(--cz-text-primary)]">
            Create one
          </Link>
        </p>
      </form>
    </AuthShell>
  );
}
