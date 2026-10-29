"use client";

import {
  AlertCircle,
  Check,
  Eye,
  EyeOff,
  Loader2,
  UserPlus,
} from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { AuthShell } from "@/components/auth/AuthShell";
import { GuestGuard } from "@/components/auth/GuestGuard";
import { PasswordStrength } from "@/components/auth/PasswordStrength";
import { Button } from "@/components/ui/button";
import { FloatingInput } from "@/components/ui/input";
import { api } from "@/lib/api";
import { rememberPendingEmail, verifyEmailPath } from "@/lib/authRedirect";

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
  if (!/^[a-z0-9_]+$/.test(v))
    return { state: "error", msg: "Only lowercase letters, numbers and _" };
  if (v.length > 20) return { state: "error", msg: "Maximum 20 characters." };
  return null; // needs backend check
}

function ageFromDob(value) {
  if (!value) return null;
  const d = new Date(`${value}T00:00:00Z`);
  if (Number.isNaN(d.getTime())) return null;
  const now = new Date();
  let age = now.getUTCFullYear() - d.getUTCFullYear();
  const m = now.getUTCMonth() - d.getUTCMonth();
  if (m < 0 || (m === 0 && now.getUTCDate() < d.getUTCDate())) age -= 1;
  return age;
}

export default function SignupPage() {
  const router = useRouter();
  const [fullName, setFullName] = useState("");
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPw, setShowPw] = useState(false);
  const [loading, setLoading] = useState(false);
  const [serverError, setServerError] = useState("");

  const [errors, setErrors] = useState({});
  const [shake, setShake] = useState({});

  // backend username availability
  const [userAvail, setUserAvail] = useState({ state: "idle", msg: "" });
  const [checkingUser, setCheckingUser] = useState(false);

  // DPDP age/consent capture. Under-18 accounts need a guardian approval.
  const [dob, setDob] = useState("");
  const [guardianName, setGuardianName] = useState("");
  const [guardianEmail, setGuardianEmail] = useState("");
  const [acceptTerms, setAcceptTerms] = useState(false);
  const [analytics, setAnalytics] = useState(false);

  const age = ageFromDob(dob);
  const isMinor = Number.isInteger(age) && age >= 13 && age < 18;
  const today = new Date().toISOString().slice(0, 10);

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
        setUserAvail(
          d.available
            ? { state: "available", msg: "Available" }
            : { state: "taken", msg: d.reason || "Username is taken" },
        );
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
    if (!fullName.trim() || fullName.trim().length < 2)
      e.fullName = "Enter your full name (at least 2 characters).";
    if (!username.trim()) e.username = "Choose a username.";
    else if (userAvail.state === "error" || userAvail.state === "taken")
      e.username = userAvail.msg;
    else if (
      userAvail.state === "available" &&
      usernameFormatStatus(username) === null
    ) {
      // ok
    } else if (usernameFormatStatus(username))
      e.username = usernameFormatStatus(username).msg;
    if (!email.trim()) e.email = "Enter your email.";
    else if (!isValidEmail(email))
      e.email = `Use a gmail.com or proton.me email.`;
    if (!password) e.password = "Create a password.";
    else if (password.length < 8) e.password = "Minimum 8 characters.";

    if (!dob.trim()) e.dob = "Enter your date of birth.";
    else if (age === null) e.dob = "Enter a valid date of birth.";
    else if (age < 13) e.dob = "You must be at least 13 to use CampusZen.";
    else if (age > 120) e.dob = "Enter a valid date of birth.";

    if (isMinor) {
      if (guardianName.trim().length < 2)
        e.guardianName = "Enter your parent or guardian's name.";
      if (!guardianEmail.trim())
        e.guardianEmail = "Enter your parent or guardian's email.";
      else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(guardianEmail.trim()))
        e.guardianEmail = "Enter a valid email address.";
      else if (
        guardianEmail.trim().toLowerCase() === email.trim().toLowerCase()
      )
        e.guardianEmail = "Use a different email from your own.";
    }

    if (!acceptTerms)
      e.terms = "Accept the Terms and Privacy Notice to create an account.";

    setErrors(e);
    Object.keys(e).forEach((k) => {
      triggerShake(k);
    });
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
      const cleanEmail = email.trim().toLowerCase();
      const res = await api.signup({
        fullName: fullName.trim(),
        username: username.trim().toLowerCase(),
        email: cleanEmail,
        password,
        dob: dob.trim(),
        acceptTerms,
        guardianName: isMinor ? guardianName.trim() : undefined,
        guardianEmail: isMinor ? guardianEmail.trim().toLowerCase() : undefined,
        analytics,
      });
      // Signup creates an unverified account and emails a 6-digit code.
      // No session exists until /verify-email succeeds.
      rememberPendingEmail(cleanEmail);
      if (res.data?.parentalConsentRequired) {
        router.push(
          `/parental-consent?email=${encodeURIComponent(cleanEmail)}`,
        );
      } else {
        router.push(verifyEmailPath(cleanEmail));
      }
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
      } else if (code === "EMAIL_PENDING_VERIFICATION") {
        // The account exists but was never verified. Let the user resend the
        // code instead of dead-ending on "email already registered".
        const pending = data.meta?.email || email.trim().toLowerCase();
        rememberPendingEmail(pending);
        router.push(verifyEmailPath(pending));
        return;
      } else if (
        [
          "CONSENT_REQUIRED",
          "UNDERAGE",
          "GUARDIAN_REQUIRED",
          "GUARDIAN_EMAIL_INVALID",
        ].includes(code)
      ) {
        setServerError(data.message || "Could not create your account.");
      } else if (!details || Object.keys(details || {}).length === 0) {
        setServerError(data.message || err.message || "Signup failed");
      }
      if (err.status === 429)
        setServerError(data.message || "Too many attempts. Try later.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <GuestGuard>
      <AuthShell title="Sign up for CampusZen">
        <form onSubmit={onSubmit} noValidate className="flex flex-col gap-5">
          {serverError ? (
            <div className="flex items-start gap-2 rounded-[4px] bg-[color-mix(in_srgb,var(--cz-error)_10%,transparent)] px-3 py-2.5 text-[15px] leading-[20px] text-[var(--cz-error)]">
              <AlertCircle className="mt-0.5 h-[18px] w-[18px] shrink-0" aria-hidden />{" "}
              <span>{serverError}</span>
            </div>
          ) : null}

          <FloatingInput
            ref={nameRef}
            id="fullName"
            label="Full name"
            autoComplete="name"
            value={fullName}
            error={errors.fullName}
            shaking={!!shake.fullName}
            onChange={(e) => {
              setFullName(e.target.value);
              if (errors.fullName)
                setErrors((p) => ({ ...p, fullName: undefined }));
              setServerError("");
            }}
          />

          <div className="flex flex-col gap-1.5">
            <div className="flex items-center justify-end">
              <span className="text-[13px] text-[var(--cz-text-secondary)]">
                @username
              </span>
            </div>
            <FloatingInput
              ref={userRef}
              id="username"
              label="Username"
              prefix="@"
              autoComplete="username"
              value={username}
              maxLength={20}
              error={
                errors.username ||
                (userAvail.state !== "available" &&
                userAvail.state !== "idle" &&
                !checkingUser
                  ? userAvail.msg
                  : "")
              }
              shaking={!!shake.username}
              onChange={(e) => {
                const v = e.target.value
                  .toLowerCase()
                  .replace(/[^a-z0-9_]/g, "");
                setUsername(v);
                if (errors.username)
                  setErrors((p) => ({ ...p, username: undefined }));
                setServerError("");
              }}
              suffix={
                username ? (
                  <span
                    className={`inline-flex shrink-0 items-center gap-1 text-[13px] ${
                      userAvail.state === "available"
                        ? "text-[var(--cz-success)]"
                        : userAvail.state === "taken" ||
                            userAvail.state === "error"
                          ? "text-[var(--cz-error)]"
                          : "text-[var(--cz-text-secondary)]"
                    }`}
                  >
                    {checkingUser ? (
                      <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
                    ) : userAvail.state === "available" ? (
                      <Check className="h-4 w-4" aria-hidden />
                    ) : null}
                    {checkingUser
                      ? "Checking…"
                      : userAvail.state === "available"
                        ? "Available"
                        : userAvail.state === "taken"
                          ? "Taken"
                          : userAvail.state === "error"
                            ? "Invalid"
                            : ""}
                  </span>
                ) : null
              }
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <FloatingInput
              ref={emailRef}
              id="email"
              label="Email"
              type="email"
              autoComplete="email"
              value={email}
              error={errors.email}
              shaking={!!shake.email}
              onChange={(e) => {
                setEmail(e.target.value);
                if (errors.email)
                  setErrors((p) => ({ ...p, email: undefined }));
                setServerError("");
              }}
            />
            <p className="mt-1 text-[13px] leading-[17px] text-[var(--cz-text-secondary)]">
              Allowed: gmail.com, proton.me
            </p>
          </div>

          <div className="flex flex-col gap-1.5">
            <FloatingInput
              id="dob"
              label="Date of birth"
              type="date"
              max={today}
              value={dob}
              error={errors.dob}
              shaking={!!shake.dob}
              onChange={(e) => {
                setDob(e.target.value);
                if (errors.dob)
                  setErrors((p) => ({ ...p, dob: undefined }));
                setServerError("");
              }}
            />
            <p className="mt-1 text-[13px] leading-[17px] text-[var(--cz-text-secondary)]">
              You must be 13 or older. Accounts for 13–17 year olds need a
              parent or guardian to approve before they can be used.
            </p>
          </div>

          {isMinor ? (
            <div className="flex flex-col gap-4 rounded-[12px] border border-[var(--cz-border)] p-3">
              <p className="text-[13px] leading-[18px] text-[var(--cz-text-secondary)]">
                Because you are under 18, we need a parent or guardian to
                consent. We&apos;ll email them a 6-digit code.
              </p>
              <FloatingInput
                id="guardianName"
                label="Parent or guardian name"
                autoComplete="name"
                value={guardianName}
                error={errors.guardianName}
                shaking={!!shake.guardianName}
                onChange={(e) => {
                  setGuardianName(e.target.value);
                  if (errors.guardianName)
                    setErrors((p) => ({ ...p, guardianName: undefined }));
                  setServerError("");
                }}
              />
              <FloatingInput
                id="guardianEmail"
                label="Parent or guardian email"
                type="email"
                autoComplete="email"
                value={guardianEmail}
                error={errors.guardianEmail}
                shaking={!!shake.guardianEmail}
                onChange={(e) => {
                  setGuardianEmail(e.target.value);
                  if (errors.guardianEmail)
                    setErrors((p) => ({ ...p, guardianEmail: undefined }));
                  setServerError("");
                }}
              />
            </div>
          ) : null}

          <div className="flex flex-col gap-1.5">
            <FloatingInput
              ref={pwRef}
              id="password"
              label="Password"
              type={showPw ? "text" : "password"}
              autoComplete="new-password"
              value={password}
              error={errors.password}
              shaking={!!shake.password}
              onChange={(e) => {
                setPassword(e.target.value);
                if (errors.password)
                  setErrors((p) => ({ ...p, password: undefined }));
                setServerError("");
              }}
              suffix={
                <button
                  type="button"
                  aria-label={showPw ? "Hide password" : "Show password"}
                  onClick={() => setShowPw((v) => !v)}
                  className="-mr-1 grid h-[32px] w-[32px] shrink-0 place-items-center rounded-full text-[var(--cz-text-secondary)] transition-colors hover:bg-[var(--cz-border)] hover:text-[var(--cz-text-primary)]"
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
              }
            />
            <PasswordStrength password={password} />
          </div>

          <div className="flex flex-col gap-3 rounded-[12px] border border-[var(--cz-border)] p-3">
            <label className="flex items-start gap-2.5 text-[13px] leading-[18px] text-[var(--cz-text-secondary)]">
              <input
                type="checkbox"
                checked={acceptTerms}
                onChange={(e) => {
                  setAcceptTerms(e.target.checked);
                  if (errors.terms)
                    setErrors((p) => ({ ...p, terms: undefined }));
                }}
                className="mt-0.5 h-4 w-4 shrink-0 accent-[var(--cz-accent)]"
              />
              <span>
                I agree to the{" "}
                <Link href="/terms" className="font-bold text-[var(--cz-accent)] hover:underline">
                  Terms
                </Link>{" "}
                and{" "}
                <Link href="/privacy" className="font-bold text-[var(--cz-accent)] hover:underline">
                  Privacy Notice
                </Link>
                , and I consent to CampusZen processing my data as described
                there.
              </span>
            </label>
            {errors.terms ? (
              <p className="text-[13px] leading-[17px] text-[var(--cz-error)]">
                {errors.terms}
              </p>
            ) : null}
            <label className="flex items-start gap-2.5 text-[13px] leading-[18px] text-[var(--cz-text-secondary)]">
              <input
                type="checkbox"
                checked={analytics}
                onChange={(e) => setAnalytics(e.target.checked)}
                className="mt-0.5 h-4 w-4 shrink-0 accent-[var(--cz-accent)]"
              />
              <span>
                Optional: allow aggregated analytics to improve CampusZen. You
                can withdraw this later.
              </span>
            </label>
          </div>

          <Button type="submit" disabled={loading} size="lg" className="w-full">
            {loading ? (
              <Loader2 className="h-[18px] w-[18px] animate-spin" />
            ) : (
              <UserPlus className="h-[18px] w-[18px]" aria-hidden />
            )}
            {loading ? "Creating account…" : "Create account"}
          </Button>

          <p className="text-center text-[15px] leading-[20px] text-[var(--cz-text-secondary)]">
            Already have an account?{" "}
            <Link
              href="/login"
              className="font-bold text-[var(--cz-accent)] hover:underline"
            >
              Sign in
            </Link>
          </p>
        </form>
      </AuthShell>
    </GuestGuard>
  );
}
