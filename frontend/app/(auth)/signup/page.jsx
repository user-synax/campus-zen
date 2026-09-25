"use client";

import { useState, useRef } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Eye, EyeOff, Check, Loader2, Sparkles } from "lucide-react";
import { AuthShell } from "@/components/auth/AuthShell";
import { PasswordStrength } from "@/components/auth/PasswordStrength";
import { Label } from "@/components/ui/label";
import { InputWrap, InputShell, ErrorMsg } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";

const TAKEN = new Set(["admin", "campuszen", "test", "ayush", "root"]);
const EMAIL_ALLOW = ["gmail.com", "proton.me"];

function isValidEmail(v) {
  const m = v.trim().toLowerCase();
  if (!m.includes("@")) return false;
  const domain = m.split("@")[1];
  return EMAIL_ALLOW.includes(domain) && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(m);
}

function usernameStatus(v) {
  if (!v) return { state: "idle", msg: "" };
  if (v.length < 3) return { state: "error", msg: "Minimum 3 characters." };
  if (!/^[a-z0-9_]+$/.test(v)) return { state: "error", msg: "Only lowercase letters, numbers and _" };
  if (v.length > 20) return { state: "error", msg: "Maximum 20 characters." };
  if (TAKEN.has(v.toLowerCase())) return { state: "taken", msg: "Username is taken." };
  return { state: "available", msg: "Username is available." };
}

export default function SignupPage() {
  const router = useRouter();
  const [fullName, setFullName] = useState("");
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPw, setShowPw] = useState(false);
  const [agree, setAgree] = useState(false);
  const [loading, setLoading] = useState(false);

  const [errors, setErrors] = useState({});
  const [shake, setShake] = useState({});

  const nameRef = useRef(null);
  const userRef = useRef(null);
  const emailRef = useRef(null);
  const pwRef = useRef(null);

  const userStat = usernameStatus(username);

  const triggerShake = (key) => {
    setShake((s) => ({ ...s, [key]: true }));
    setTimeout(() => setShake((s) => ({ ...s, [key]: false })), 360);
  };

  const validate = () => {
    const e = {};
    if (!fullName.trim() || fullName.trim().length < 2) e.fullName = "Enter your full name (at least 2 characters).";
    if (!username.trim()) e.username = "Choose a username.";
    else if (userStat.state === "error" || userStat.state === "taken") e.username = userStat.msg;
    if (!email.trim()) e.email = "Enter your email.";
    else if (!isValidEmail(email)) e.email = `Use a gmail.com or proton.me email.`;
    if (!password) e.password = "Create a password.";
    else if (password.length < 8) e.password = "Minimum 8 characters.";
    if (!agree) e.agree = "You must agree to Terms and Privacy.";

    setErrors(e);
    // shake fields
    Object.keys(e).forEach((k) => triggerShake(k));
    // focus first error
    if (e.fullName) nameRef.current?.focus();
    else if (e.username) userRef.current?.focus();
    else if (e.email) emailRef.current?.focus();
    else if (e.password) pwRef.current?.focus();
    return Object.keys(e).length === 0;
  };

  const onSubmit = (ev) => {
    ev.preventDefault();
    if (!validate()) return;
    setLoading(true);
    setTimeout(() => {
      // static demo: store email for verify step then push
      try {
        sessionStorage.setItem("cz_pending_email", email.trim().toLowerCase());
      } catch {}
      router.push(`/verify-email?email=${encodeURIComponent(email.trim().toLowerCase())}`);
    }, 700);
  };

  return (
    <AuthShell
      title="Create your account"
      subtitle="Join CampusZen — minimal signup, no college details needed yet."
    >
      <form onSubmit={onSubmit} noValidate className="flex flex-col gap-4">
        {/* full name */}
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="fullName">
            Full name <span className="text-[var(--cz-error)]">*</span>
          </Label>
          <InputWrap error={!!errors.fullName}>
            <InputShell error={!!errors.fullName} shaking={!!shake.fullName}>
              <input
                ref={nameRef}
                id="fullName"
                autoComplete="name"
                placeholder="Ayush Sharma"
                value={fullName}
                onChange={(e) => {
                  setFullName(e.target.value);
                  if (errors.fullName) setErrors((p) => ({ ...p, fullName: undefined }));
                }}
                onInput={() => errors.fullName && setErrors((p) => ({ ...p, fullName: undefined }))}
                className="flex-1 bg-transparent outline-none text-[14px] placeholder:text-[var(--cz-text-secondary)]/50 text-[var(--cz-text-primary)] h-full"
              />
            </InputShell>
            <ErrorMsg>{errors.fullName}</ErrorMsg>
          </InputWrap>
        </div>

        {/* username */}
        <div className="flex flex-col gap-1.5">
          <div className="flex items-center justify-between">
            <Label htmlFor="username">
              Username <span className="text-[var(--cz-error)]">*</span>
            </Label>
            <span className="text-[11px] tracking-wide text-[var(--cz-text-secondary)]/70">campuszen.app/@username</span>
          </div>
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
                  const v = e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, "");
                  setUsername(v);
                  if (errors.username) setErrors((p) => ({ ...p, username: undefined }));
                }}
                className="flex-1 bg-transparent outline-none text-[14px] placeholder:text-[var(--cz-text-secondary)]/50 text-[var(--cz-text-primary)] h-full"
                maxLength={20}
              />
              {username ? (
                <span
                  className={`inline-flex items-center gap-1 text-[11px] font-medium shrink-0 ${
                    userStat.state === "available" ? "text-emerald-400" : userStat.state === "taken" || userStat.state === "error" ? "text-[var(--cz-error)]" : "text-[var(--cz-text-secondary)]"
                  }`}
                >
                  {userStat.state === "available" ? <Check className="h-3 w-3" /> : null}
                  {userStat.state === "available" ? "Available" : userStat.state === "taken" ? "Taken" : userStat.state === "error" ? "Invalid" : ""}
                </span>
              ) : null}
            </InputShell>
            <ErrorMsg>{errors.username || (userStat.state !== "available" && userStat.state !== "idle" ? userStat.msg : "")}</ErrorMsg>
            {!errors.username && userStat.state === "available" ? (
              <p className="text-[11px] leading-[14px] text-emerald-400/90 mt-1">Nice — this username is free.</p>
            ) : null}
          </InputWrap>
        </div>

        {/* email */}
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="email">
            Email <span className="text-[var(--cz-error)]">*</span>
          </Label>
          <InputWrap error={!!errors.email}>
            <InputShell error={!!errors.email} shaking={!!shake.email}>
              <input
                ref={emailRef}
                id="email"
                type="email"
                autoComplete="email"
                placeholder="you@gmail.com"
                value={email}
                onChange={(e) => {
                  setEmail(e.target.value);
                  if (errors.email) setErrors((p) => ({ ...p, email: undefined }));
                }}
                className="flex-1 bg-transparent outline-none text-[14px] placeholder:text-[var(--cz-text-secondary)]/50 text-[var(--cz-text-primary)] h-full"
              />
            </InputShell>
            <ErrorMsg>{errors.email}</ErrorMsg>
            <p className="text-[11px] leading-[14px] text-[var(--cz-text-secondary)]/70 mt-1">Allowed: gmail.com, proton.me</p>
          </InputWrap>
        </div>

        {/* password */}
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="password">
            Password <span className="text-[var(--cz-error)]">*</span>
          </Label>
          <InputWrap error={!!errors.password}>
            <InputShell error={!!errors.password} shaking={!!shake.password}>
              <input
                ref={pwRef}
                id="password"
                type={showPw ? "text" : "password"}
                autoComplete="new-password"
                placeholder="Minimum 8 characters"
                value={password}
                onChange={(e) => {
                  setPassword(e.target.value);
                  if (errors.password) setErrors((p) => ({ ...p, password: undefined }));
                }}
                className="flex-1 bg-transparent outline-none text-[14px] placeholder:text-[var(--cz-text-secondary)]/50 text-[var(--cz-text-primary)] h-full"
              />
              <button
                type="button"
                aria-label={showPw ? "Hide password" : "Show password"}
                onClick={() => setShowPw((v) => !v)}
                className="grid place-items-center h-7 w-7 rounded-[8px] hover:bg-[rgba(255,206,173,0.08)] text-[var(--cz-text-secondary)] hover:text-[var(--cz-text-primary)] transition-colors shrink-0"
              >
                <span className="t-icon-swap" data-state={showPw ? "b" : "a"}>
                  <span className="t-icon" data-icon="a">
                    <Eye className="h-4 w-4" />
                  </span>
                  <span className="t-icon" data-icon="b">
                    <EyeOff className="h-4 w-4" />
                  </span>
                </span>
              </button>
            </InputShell>
            <ErrorMsg>{errors.password}</ErrorMsg>
            <PasswordStrength password={password} />
          </InputWrap>
        </div>

        {/* terms */}
        <div className="pt-1">
          <Checkbox
            id="agree"
            checked={agree}
            onChange={setAgree}
            label=""
            className="items-start"
          />
          <div className="ml-[28px] -mt-[2px]">
            <p className="text-[12.5px] leading-[18px] text-[var(--cz-text-secondary)]">
              I agree to the{" "}
              <Link href="/terms" className="text-[var(--cz-text-primary)] underline decoration-[var(--cz-border-strong)] underline-offset-4 hover:decoration-[var(--cz-text-primary)]">
                Terms
              </Link>{" "}
              and{" "}
              <Link href="/privacy" className="text-[var(--cz-text-primary)] underline decoration-[var(--cz-border-strong)] underline-offset-4 hover:decoration-[var(--cz-text-primary)]">
                Privacy Policy
              </Link>
              .
            </p>
            {errors.agree ? <p className="t-error-msg !opacity-100 !visible !max-h-[20px] !mt-1" style={{ visibility: "visible", opacity: 1 }}>{errors.agree}</p> : null}
          </div>
        </div>

        <Button type="submit" disabled={loading} className="mt-2 w-full">
          {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
          {loading ? "Creating account..." : "Create account"}
        </Button>

        <p className="text-center text-[13px] leading-[18px] text-[var(--cz-text-secondary)]">
          Already have an account?{" "}
          <Link href="/login" className="font-medium text-[var(--cz-text-primary)] underline decoration-[var(--cz-border-strong)] underline-offset-4 hover:decoration-[var(--cz-text-primary)] transition-colors">
            Log in
          </Link>
        </p>
      </form>
    </AuthShell>
  );
}
