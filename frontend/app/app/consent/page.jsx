"use client";

import { useQueryClient } from "@tanstack/react-query";
import {
  AlertCircle,
  Check,
  Loader2,
  ShieldCheck,
} from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { FloatingInput } from "@/components/ui/input";
import { api } from "@/lib/api";
import { queryKeys } from "@/lib/hooks/queries";
import { useCurrentUser } from "@/lib/hooks/useRequireSession";

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

export default function ConsentPage() {
  const { user, loading } = useCurrentUser();
  const router = useRouter();
  const queryClient = useQueryClient();

  const [dob, setDob] = useState("");
  const [guardianName, setGuardianName] = useState("");
  const [guardianEmail, setGuardianEmail] = useState("");
  const [acceptTerms, setAcceptTerms] = useState(false);
  const [analytics, setAnalytics] = useState(false);
  const [busy, setBusy] = useState(null);
  const [error, setError] = useState("");
  const [info, setInfo] = useState("");

  const age = ageFromDob(dob);
  const isMinor = Number.isInteger(age) && age >= 13 && age < 18;
  const needsGate = Boolean(
    user && (user.dobRequired || user.consentRequired || user.guardianConsentPending),
  );

  useEffect(() => {
    if (!loading && user && !needsGate) router.replace("/app");
  }, [loading, user, needsGate, router]);

  const refresh = async () => {
    await queryClient.invalidateQueries({ queryKey: queryKeys.me });
    router.refresh();
  };

  const onSetDob = async (e) => {
    e.preventDefault();
    setError("");
    setInfo("");
    if (!dob.trim() || age === null) {
      setError("Enter your date of birth.");
      return;
    }
    if (age < 13) {
      setError("CampusZen is for users aged 13 and over.");
      return;
    }
    if (isMinor) {
      if (guardianName.trim().length < 2 || !guardianEmail.trim()) {
        setError("Enter your parent or guardian's name and email.");
        return;
      }
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(guardianEmail.trim())) {
        setError("Enter a valid guardian email address.");
        return;
      }
      if (guardianEmail.trim().toLowerCase() === user.email) {
        setError("The guardian email must be different from your own.");
        return;
      }
    }
    setBusy("dob");
    try {
      await api.setDobOnce({
        dob: dob.trim(),
        guardianName: isMinor ? guardianName.trim() : undefined,
        guardianEmail: isMinor ? guardianEmail.trim().toLowerCase() : undefined,
      });
      setInfo(
        isMinor
          ? "Saved. Ask your parent or guardian to check their email and approve the account."
          : "Date of birth saved.",
      );
      await refresh();
    } catch (err) {
      setError(err?.data?.message || err.message || "Could not save your date of birth.");
    } finally {
      setBusy(null);
    }
  };

  const onConsent = async () => {
    if (!acceptTerms) {
      setError("Accept the Terms and Privacy Notice to continue.");
      return;
    }
    setBusy("consent");
    setError("");
    try {
      await api.recordConsent({ acceptTerms: true, analytics });
      await refresh();
      router.replace("/app");
      router.refresh();
    } catch (err) {
      setError(err?.data?.message || err.message || "Could not record consent.");
    } finally {
      setBusy(null);
    }
  };

  const onResend = async () => {
    setBusy("resend");
    setError("");
    setInfo("");
    try {
      await api.resendGuardianConsent({
        guardianName: guardianName.trim() || undefined,
        guardianEmail: guardianEmail.trim().toLowerCase() || undefined,
      });
      setInfo("Consent email sent to your guardian.");
      await refresh();
    } catch (err) {
      setError(err?.data?.message || err.message || "Could not resend the email.");
    } finally {
      setBusy(null);
    }
  };

  const onWithdraw = async () => {
    if (
      !confirm(
        "Withdraw consent? This hides your account and schedules it for permanent deletion.",
      )
    )
      return;
    setBusy("withdraw");
    try {
      await api.withdrawConsent({ core: true });
      queryClient.clear();
      router.replace("/");
      router.refresh();
    } catch (err) {
      setError(err?.data?.message || err.message || "Could not withdraw consent.");
      setBusy(null);
    }
  };

  if (loading) {
    return (
      <div className="grid min-h-[40vh] place-items-center">
        <Loader2 className="h-6 w-6 animate-spin text-[var(--cz-text-secondary)]" aria-hidden />
      </div>
    );
  }

  if (!user || !needsGate) return null;

  return (
    <div className="mx-auto max-w-[560px] px-4 py-8">
      <div className="mb-5 flex items-start gap-3">
        <span className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-[var(--cz-accent-soft)] text-[var(--cz-accent)]">
          <ShieldCheck className="h-5 w-5" aria-hidden />
        </span>
        <div>
          <h1 className="text-[24px] font-extrabold leading-[30px]">
            Privacy &amp; consent
          </h1>
          <p className="mt-1 text-[14px] leading-[20px] text-[var(--cz-text-secondary)]">
            We need one more step before you can post or interact. You can still
            read CampusZen while this is incomplete.
          </p>
        </div>
      </div>

      {error ? (
        <div className="mb-4 flex items-start gap-2 rounded-[4px] bg-[color-mix(in_srgb,var(--cz-error)_10%,transparent)] px-3 py-2.5 text-[14px] leading-[20px] text-[var(--cz-error)]">
          <AlertCircle className="mt-0.5 h-[18px] w-[18px] shrink-0" aria-hidden />
          <span>{error}</span>
        </div>
      ) : null}

      {info ? (
        <div className="mb-4 rounded-[4px] bg-[var(--cz-accent-soft)] px-3 py-2 text-[14px] leading-[20px] text-[var(--cz-accent)]">
          {info}
        </div>
      ) : null}

      {user.guardianConsentPending ? (
        <section className="rounded-[16px] border border-[var(--cz-border)] p-4">
          <h2 className="text-[17px] font-bold">Waiting for your guardian</h2>
          <p className="mt-2 text-[14px] leading-[21px] text-[var(--cz-text-secondary)]">
            A consent email was sent to your parent or guardian. The account
            stays read-only until they enter the 6-digit code. If the email is
            wrong, correct it below and resend.
          </p>
          <div className="mt-4 flex flex-col gap-3">
            <FloatingInput
              id="gate-guardian-name"
              label="Parent or guardian name"
              value={guardianName}
              onChange={(e) => setGuardianName(e.target.value)}
            />
            <FloatingInput
              id="gate-guardian-email"
              label="Parent or guardian email"
              type="email"
              value={guardianEmail}
              onChange={(e) => setGuardianEmail(e.target.value)}
            />
            <Button
              type="button"
              onClick={onResend}
              disabled={busy === "resend"}
              className="w-full"
            >
              {busy === "resend" ? (
                <Loader2 className="h-[18px] w-[18px] animate-spin" aria-hidden />
              ) : (
                <Check className="h-[18px] w-[18px]" aria-hidden />
              )}
              {busy === "resend" ? "Sending…" : "Resend consent email"}
            </Button>
          </div>
        </section>
      ) : user.dobRequired ? (
        <form onSubmit={onSetDob} className="rounded-[16px] border border-[var(--cz-border)] p-4">
          <h2 className="text-[17px] font-bold">Confirm your age</h2>
          <p className="mt-2 text-[14px] leading-[21px] text-[var(--cz-text-secondary)]">
            CampusZen is for users 13 and over. Under-18 accounts need a parent
            or guardian to approve. You can only set your date of birth once.
          </p>
          <div className="mt-4 flex flex-col gap-3">
            <FloatingInput
              id="gate-dob"
              label="Date of birth"
              type="date"
              max={new Date().toISOString().slice(0, 10)}
              value={dob}
              onChange={(e) => setDob(e.target.value)}
            />
            {isMinor ? (
              <>
                <FloatingInput
                  id="gate-guardian-name"
                  label="Parent or guardian name"
                  value={guardianName}
                  onChange={(e) => setGuardianName(e.target.value)}
                />
                <FloatingInput
                  id="gate-guardian-email"
                  label="Parent or guardian email"
                  type="email"
                  value={guardianEmail}
                  onChange={(e) => setGuardianEmail(e.target.value)}
                />
              </>
            ) : null}
            <Button type="submit" disabled={busy === "dob"} className="w-full">
              {busy === "dob" ? (
                <Loader2 className="h-[18px] w-[18px] animate-spin" aria-hidden />
              ) : (
                <Check className="h-[18px] w-[18px]" aria-hidden />
              )}
              {busy === "dob" ? "Saving…" : "Save date of birth"}
            </Button>
          </div>
        </form>
      ) : (
        <section className="rounded-[16px] border border-[var(--cz-border)] p-4">
          <h2 className="text-[17px] font-bold">Accept the current notice</h2>
          <p className="mt-2 text-[14px] leading-[21px] text-[var(--cz-text-secondary)]">
            We updated our privacy notice on 29 October 2026. Please review the{" "}
            <Link href="/terms" className="font-bold text-[var(--cz-accent)] hover:underline">
              Terms
            </Link>{" "}
            and{" "}
            <Link href="/privacy" className="font-bold text-[var(--cz-accent)] hover:underline">
              Privacy Notice
            </Link>
            . Consent is the basis for processing your account data.
          </p>
          <div className="mt-4 flex flex-col gap-3">
            <label className="flex items-start gap-2.5 text-[13px] leading-[18px] text-[var(--cz-text-secondary)]">
              <input
                type="checkbox"
                checked={acceptTerms}
                onChange={(e) => setAcceptTerms(e.target.checked)}
                className="mt-0.5 h-4 w-4 shrink-0 accent-[var(--cz-accent)]"
              />
              <span>
                I accept the Terms and Privacy Notice and consent to processing
                as described there.
              </span>
            </label>
            <label className="flex items-start gap-2.5 text-[13px] leading-[18px] text-[var(--cz-text-secondary)]">
              <input
                type="checkbox"
                checked={analytics}
                onChange={(e) => setAnalytics(e.target.checked)}
                className="mt-0.5 h-4 w-4 shrink-0 accent-[var(--cz-accent)]"
              />
              <span>Optional: allow aggregated analytics.</span>
            </label>
            <Button
              type="button"
              onClick={onConsent}
              disabled={busy === "consent" || !acceptTerms}
              className="w-full"
            >
              {busy === "consent" ? (
                <Loader2 className="h-[18px] w-[18px] animate-spin" aria-hidden />
              ) : (
                <Check className="h-[18px] w-[18px]" aria-hidden />
              )}
              {busy === "consent" ? "Saving…" : "Agree and continue"}
            </Button>
          </div>
        </section>
      )}

      <div className="mt-5 flex flex-wrap items-center gap-4 text-[13px]">
        <Link href="/privacy" className="text-[var(--cz-text-secondary)] hover:underline">
          Privacy Notice
        </Link>
        <Link href="/terms" className="text-[var(--cz-text-secondary)] hover:underline">
          Terms
        </Link>
        <button
          type="button"
          onClick={onWithdraw}
          disabled={busy === "withdraw"}
          className="font-bold text-[var(--cz-error)] hover:underline disabled:opacity-50"
        >
          Withdraw consent and delete
        </button>
      </div>
    </div>
  );
}
