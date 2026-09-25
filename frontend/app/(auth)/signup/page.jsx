"use client";

import { useState, useRef, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Eye, EyeOff, Check, Loader2, Sparkles, AlertCircle } from "lucide-react";
import { AuthShell } from "@/components/auth/AuthShell";
import { PasswordStrength } from "@/components/auth/PasswordStrength";
import { Label } from "@/components/ui/label";
import { InputWrap, InputShell, ErrorMsg } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { api } from "@/lib/api";

const EMAIL_ALLOW = ["gmail.com", "proton.me"];

function isValidEmail(v) {
  const m = v.trim().toLowerCase();
  if (!m.includes("@")) return false;
  const domain = m.split("@")[1];
  return EMAIL_ALLOW.includes(domain) && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(m);
}

function usernameFormatStatus(v) {
  if (!v) return { state: "idle", msg: "" };
  if (v.length < 3) return { state: "error", msg: "Minimum 3 characters." };
  if (!/^[a-z0-9_]+$/.test(v)) return { state: "error", msg: "Only lowercase letters, numbers and _" };
  if (v.length > 20) return { state: "error", msg: "Maximum 20 characters." };
  return null; // needs backend check
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
  const [serverError, setServerError] = useState("");

  const [errors, setErrors] = useState({});
  const [shake, setShake] = useState({});

  // backend username availability
  const [userAvail, setUserAvail] = useState({ state: "idle", msg: "" });
  const [checkingUser, setCheckingUser] = useState(false);

  const nameRef = useRef(null);
  const userRef = useRef(null);
  const emailRef = useRef(null);
  const pwRef = useRef(null);

  // debounce username check
  useEffect(() => {
    const fmt = usernameFormatStatus(username);
    if (fmt) {
      setUserAvail(fmt);
      return;
    }
    if (!username) {
      setUserAvail({ state: "idle", msg: "" });
      return;
    }
    // valid format -> check backend
    const t = setTimeout(async () => {
      setCheckingUser(true);
      try {
        const res = await api.checkUsername(username);
        const d = res.data;
        setUserAvail(d.available ? { state: "available", msg: "Available" } : { state: "taken", msg: d.reason || "Username is taken" });
      } catch {
        setUserAvail({ state: "idle", msg: "" });
      } finally {
        setCheckingUser(false);
      }
    }, 400);
    return () => clearTimeout(t);
  }, [username]);

  const triggerShake = (key) => {
    setShake((s) => ({ ...s, [key]: true }));
    setTimeout(() => setShake((s) => ({ ...s, [key]: false })), 360);
  };

  const validate = () => {
    const e = {};
    if (!fullName.trim() || fullName.trim().length < 2) e.fullName = "Enter your full name (at least 2 characters).";
    if (!username.trim()) e.username = "Choose a username.";
    else if (userAvail.state === "error" || userAvail.state === "taken") e.username = userAvail.msg;
    else if (userAvail.state === "available" && usernameFormatStatus(username) === null) {
      // ok
    } else if (usernameFormatStatus(username)) e.username = usernameFormatStatus(username).msg;
    if (!email.trim()) e.email = "Enter your email.";
    else if (!isValidEmail(email)) e.email = `Use a gmail.com or proton.me email.`;
    if (!password) e.password = "Create a password.";
    else if (password.length < 8) e.password = "Minimum 8 characters.";
    if (!agree) e.agree = "You must agree to Terms and Privacy.";

    setErrors(e);
    Object.keys(e).forEach((k) => triggerShake(k));
    if (e.fullName) nameRef.current?.focus();
    else if (e.username) userRef.current?.focus();
    else if (e.email) emailRef.current?.focus();
    else if (e.password) pwRef.current?.focus();
    return Object.keys(e).length === 0;
  };

  const onSubmit = async (ev) => {
    ev.preventDefault();
    setServerError("");
    if (!validate()) return;
    if (userAvail.state !== "available") {
      setErrors((p) => ({ ...p, username: "Username not available" }));
      triggerShake("username");
      return;
    }
    setLoading(true);
    try {
      await api.signup({
        fullName: fullName.trim(),
        username: username.trim().toLowerCase(),
        email: email.trim().toLowerCase(),
        password,
      });
      try {
        sessionStorage.setItem("cz_pending_email", email.trim().toLowerCase());
      } catch {}
      // OTP skipped for now — go directly to app, show verify banner if needed
      router.push(`/app`);
    } catch (err) {
      const data = err.data || {};
      const code = data.code;
      const details = data.details;
      // map zod details to fields
      if (details && Array.isArray(details)) {
        const ne = {};
        details.forEach((d) => {
          if (d.path?.includes("username")) ne.username = d.message;
          else if (d.path?.includes("email")) ne.email = d.message;
          else if (d.path?.includes("password")) ne.password = d.message;
          else if (d.path?.includes("fullName")) ne.fullName = d.message;
        });
        if (Object.keys(ne).length) {
          setErrors(ne);
          Object.keys(ne).forEach(triggerShake);
        }
      }
      if (code === "USERNAME_TAKEN") {
        setErrors((p) => ({ ...p, username: "Username is already taken" }));
        triggerShake("username");
      } else if (code === "EMAIL_TAKEN") {
        setErrors((p) => ({ ...p, email: "Email already registered" }));
        triggerShake("email");
      } else if (!details || Object.keys(details || {}).length === 0) {
        setServerError(data.message || err.message || "Signup failed");
      }
      if (err.status === 429) setServerError(data.message || "Too many attempts. Try later.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthShell title="Create your account" subtitle="Join CampusZen — minimal signup, no college details needed yet.">
      <form onSubmit={onSubmit} noValidate className="flex flex-col gap-4">
        {serverError ? (
          <div className="flex items-start gap-2 rounded-[10px] border border-[var(--cz-error)]/20 bg-[rgba(255,90,106,0.08)] px-3 py-2.5 text-[13px] leading-[18px] text-[var(--cz-error)]">
            <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" /> <span>{serverError}</span>
          </div>
        ) : null}

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
                  setServerError("");
                }}
                className="flex-1 bg-transparent outline-none text-[14px] placeholder:text-[var(--cz-text-secondary)]/50 text-[var(--cz-text-primary)] h-full"
              />
            </InputShell>
            <ErrorMsg>{errors.fullName}</ErrorMsg>
          </InputWrap>
        </div>

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
                  setServerError("");
                }}
                className="flex-1 bg-transparent outline-none text-[14px] placeholder:text-[var(--cz-text-secondary)]/50 text-[var(--cz-text-primary)] h-full"
                maxLength={20}
              />
              {username ? (
                <span
                  className={`inline-flex items-center gap-1 text-[11px] font-medium shrink-0 ${
                    userAvail.state === "available" ? "text-emerald-400" : userAvail.state === "taken" || userAvail.state === "error" ? "text-[var(--cz-error)]" : "text-[var(--cz-text-secondary)]"
                  }`}
                >
                  {checkingUser ? <Loader2 className="h-3 w-3 animate-spin" /> : userAvail.state === "available" ? <Check className="h-3 w-3" /> : null}
                  {checkingUser ? "Checking…" : userAvail.state === "available" ? "Available" : userAvail.state === "taken" ? "Taken" : userAvail.state === "error" ? "Invalid" : ""}
                </span>
              ) : null}
            </InputShell>
            <ErrorMsg>{errors.username || (userAvail.state !== "available" && userAvail.state !== "idle" && !checkingUser ? userAvail.msg : "")}</ErrorMsg>
            {!errors.username && userAvail.state === "available" ? <p className="text-[11px] leading-[14px] text-emerald-400/90 mt-1">Nice — this username is free.</p> : null}
          </InputWrap>
        </div>

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
                  setServerError("");
                }}
                className="flex-1 bg-transparent outline-none text-[14px] placeholder:text-[var(--cz-text-secondary)]/50 text-[var(--cz-text-primary)] h-full"
              />
            </InputShell>
            <ErrorMsg>{errors.email}</ErrorMsg>
            <p className="text-[11px] leading-[14px] text-[var(--cz-text-secondary)]/70 mt-1">Allowed: gmail.com, proton.me</p>
          </InputWrap>
        </div>

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
                  setServerError("");
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

        <div className="pt-1">
          <Checkbox id="agree" checked={agree} onChange={setAgree} label="" className="items-start" />
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
