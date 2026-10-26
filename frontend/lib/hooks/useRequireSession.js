"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { redirectToVerify } from "../authRedirect";
import { useMe } from "./queries";

/**
 * The signed-in user, from the shared query cache.
 *
 * Every component that needs the current user reads it through here (or
 * through useMe directly) rather than calling api.me() itself, so mounting
 * the shell plus a page costs one request instead of two.
 */
export function useCurrentUser() {
  const { data, isPending, isError, error } = useMe();
  // A 403 EMAIL_NOT_VERIFIED is an answer too: the user is authenticated but
  // has not finished verification, so the app shell must send them to
  // /verify-email instead of treating it as a generic failure.
  const verifyRequired =
    isError &&
    error?.status === 403 &&
    error?.data?.code === "EMAIL_NOT_VERIFIED";
  const needsVerification =
    verifyRequired ||
    Boolean(data?.data?.user && data.data.user.isEmailVerified === false);
  // A suspended account is a state, not a failure: it keeps a read-only
  // session so the shell can show the standing notice (and /menu) instead of
  // bouncing the user back to sign-in, where they could not sign in again.
  const suspended =
    (isError &&
      error?.status === 403 &&
      error?.data?.code === "ACCOUNT_SUSPENDED") ||
    Boolean(data?.data?.user?.isSuspended);
  return {
    user: data?.data?.user || null,
    loading: isPending,
    suspended,
    // A 401 is the expected "signed out" signal, not a failure worth
    // surfacing; anything else is a real error the query layer already logs.
    signedOut: isError && error?.status === 401,
    failed:
      isError &&
      error?.status !== 401 &&
      !needsVerification &&
      !suspended,
    needsVerification,
    pendingEmail: error?.data?.meta?.email || null,
  };
}

/**
 * Gate a page behind a verified session, redirecting to /login when signed
 * out and /verify-email when the account still needs an OTP.
 *
 * Used by the tabs under /u and /c: they render inside the app shell (so
 * they get both sidebars) but have no meaningful guest view. The public
 * profile at /u/[username] deliberately does not use this — guests can read
 * it, it just cannot follow or post.
 */
export function useRequireSession() {
  const router = useRouter();
  const { user, loading, signedOut, failed, needsVerification, pendingEmail } =
    useCurrentUser();

  useEffect(() => {
    if (loading) return;
    if (needsVerification) {
      redirectToVerify(router, pendingEmail);
      return;
    }
    if (signedOut || failed) router.replace("/login");
  }, [loading, signedOut, failed, needsVerification, pendingEmail, router]);

  return { user, checking: loading };
}
