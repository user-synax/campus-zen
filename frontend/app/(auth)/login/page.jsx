"use client";

import {
  AlertCircle,
  Eye,
  EyeOff,
  Loader2,
  LogIn,
  ShieldAlert,
} from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useRef, useState } from "react";
import { AuthShell } from "@/components/auth/AuthShell";
import { GuestGuard } from "@/components/auth/GuestGuard";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { ErrorMsg, InputShell, InputWrap } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { api } from "@/lib/api";

export default function LoginPage() {
  const router = useRouter();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [showPw, setShowPw] = useState(false);
  const [remember, setRemember] = useState(true);
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState({});
  const [shake, setShake] = useState({});
  const [serverMsg, setServerMsg] = useState(null);

  const userRef = useRef(null);
  const pwRef = useRef(null);

  const triggerShake = (key) => {
    setShake((s) => ({ ...s, [key]: true }));
    setTimeout(() => setShake((s) => ({ ...s, [key]: false })), 360);
  };

  const validate = () => {
    const e = {};
    if (!username.trim()) e.username = "Enter your username.";
    else if (username.trim().length < 3)
      e.username = "Username must be at least 3 characters.";
    if (!password) e.password = "Enter your password.";
    else if (password.length < 8)
      e.password = "Password must be at least 8 characters.";
    setErrors(e);
    Object.keys(e).forEach(triggerShake);
    if (e.username) userRef.current?.focus();
    else if (e.password) pwRef.current?.focus();
    return Object.keys(e).length === 0;
  };

  const onSubmit = async (e) => {
    e.preventDefault();
    setServerMsg(null);
    if (!validate()) return;
    setLoading(true);
    try {
      const res = await api.login({
        username: username.trim().toLowerCase(),
        password,
        remember,
      });
      const user = res.data?.user;
      // allow login but show verify banner if not verified per spec §10
      if (user && !user.isEmailVerified) {
        setServerMsg({
          type: "warn",
          text: "Logged in — please verify your email. Redirecting to app…",
          email: user.email,
        });
        setTimeout(() => {
          router.push(`/app`);
          router.refresh();
        }, 700);
        return;
      }
      router.push("/app");
      router.refresh();
    } catch (err) {
      const data = err.data || {};
      if (err.status === 401) {
        setErrors({ password: "Invalid username or password" });
        triggerShake("password");
        triggerShake("username");
      } else if (data.code === "VALIDATION_ERROR" && data.details) {
        const ne = {};
        data.details.forEach((d) => {
          if (d.path?.includes("username")) ne.username = d.message;
          else if (d.path?.includes("password")) ne.password = d.message;
        });
        if (Object.keys(ne).length) {
          setErrors(ne);
          Object.keys(ne).forEach(triggerShake);
        }
      } else {
        setServerMsg({
          type: "error",
          text: data.message || err.message || "Login failed",
        });
      }
      if (err.status === 429)
        setServerMsg({
          type: "error",
          text: data.message || "Too many attempts. Try later.",
        });
    } finally {
      setLoading(false);
    }
  };

  return (
    <GuestGuard>
      <AuthShell title="Sign in to CampusZen">
        <form onSubmit={onSubmit} noValidate className="flex flex-col gap-5">
          {serverMsg ? (
            <div
              className={`flex items-start gap-2 rounded-[4px] px-3 py-2.5 text-[15px] leading-[20px] ${
                serverMsg.type === "warn"
                  ? "bg-[var(--cz-accent-soft)] text-[var(--cz-accent)]"
                  : "bg-[color-mix(in_srgb,var(--cz-error)_10%,transparent)] text-[var(--cz-error)]"
              }`}
            >
              {serverMsg.type === "warn" ? (
                <ShieldAlert className="mt-0.5 h-[18px] w-[18px] shrink-0" aria-hidden />
              ) : (
                <AlertCircle className="mt-0.5 h-[18px] w-[18px] shrink-0" aria-hidden />
              )}
              <span>
                {serverMsg.text}{" "}
                {serverMsg.type === "warn" && serverMsg.email ? (
                  <Link
                    href={`/verify-email?email=${encodeURIComponent(serverMsg.email)}`}
                    className="font-bold underline underline-offset-2"
                  >
                    Verify now
                  </Link>
                ) : null}
              </span>
            </div>
          ) : null}

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="username">Username</Label>
            <InputWrap error={!!errors.username}>
              <InputShell error={!!errors.username} shaking={!!shake.username}>
                <span className="select-none text-[15px] text-[var(--cz-text-secondary)]">
                  @
                </span>
                <input
                  ref={userRef}
                  id="username"
                  autoComplete="username"
                  placeholder="username"
                  value={username}
                  onChange={(e) => {
                    setUsername(
                      e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, ""),
                    );
                    if (errors.username)
                      setErrors((p) => ({ ...p, username: undefined }));
                    setServerMsg(null);
                  }}
                  className="h-full flex-1 bg-transparent text-[15px] text-[var(--cz-text-primary)] outline-none placeholder:text-[var(--cz-text-secondary)]"
                />
              </InputShell>
              <ErrorMsg>{errors.username}</ErrorMsg>
            </InputWrap>
          </div>

          <div className="flex flex-col gap-1.5">
            <div className="flex items-center justify-between">
              <Label htmlFor="password">Password</Label>
              <Link
                href="/forgot-password"
                className="text-[15px] font-bold text-[var(--cz-accent)] hover:underline"
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
                  placeholder="Password"
                  value={password}
                  onChange={(e) => {
                    setPassword(e.target.value);
                    if (errors.password)
                      setErrors((p) => ({ ...p, password: undefined }));
                    setServerMsg(null);
                  }}
                  className="h-full flex-1 bg-transparent text-[15px] text-[var(--cz-text-primary)] outline-none placeholder:text-[var(--cz-text-secondary)]"
                />
                <button
                  type="button"
                  aria-label={showPw ? "Hide password" : "Show password"}
                  onClick={() => setShowPw((v) => !v)}
                  className="-mr-1 grid h-[32px] w-[32px] place-items-center rounded-full text-[var(--cz-text-secondary)] transition-colors hover:bg-[var(--cz-border)] hover:text-[var(--cz-text-primary)]"
                >
                  <span className="t-icon-swap" data-state={showPw ? "b" : "a"}>
                    <span className="t-icon" data-icon="a">
                      <Eye className="h-[18px] w-[18px]" aria-hidden />
                    </span>
                    <span className="t-icon" data-icon="b">
                      <EyeOff className="h-[18px] w-[18px]" aria-hidden />
                    </span>
                  </span>
                </button>
              </InputShell>
              <ErrorMsg>{errors.password}</ErrorMsg>
            </InputWrap>
          </div>

          <Checkbox
            id="remember"
            checked={remember}
            onChange={setRemember}
            label="Remember me"
          />

          <Button type="submit" disabled={loading} size="lg" className="w-full">
            {loading ? (
              <Loader2 className="h-[18px] w-[18px] animate-spin" />
            ) : (
              <LogIn className="h-[18px] w-[18px]" aria-hidden />
            )}
            {loading ? "Signing in…" : "Sign in"}
          </Button>

          <p className="text-center text-[15px] leading-[20px] text-[var(--cz-text-secondary)]">
            Don&apos;t have an account?{" "}
            <Link
              href="/signup"
              className="font-bold text-[var(--cz-accent)] hover:underline"
            >
              Sign up
            </Link>
          </p>
        </form>
      </AuthShell>
    </GuestGuard>
  );
}
