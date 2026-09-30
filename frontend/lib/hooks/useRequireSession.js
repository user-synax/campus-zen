"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
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
  return {
    user: data?.data?.user || null,
    loading: isPending,
    // A 401 is the expected "signed out" signal, not a failure worth
    // surfacing; anything else is a real error the query layer already logs.
    signedOut: isError && error?.status === 401,
    failed: isError && error?.status !== 401,
  };
}

/**
 * Gate a page behind a session, redirecting to /login when signed out.
 *
 * Used by the tabs under /u and /c: they render inside the app shell (so
 * they get both sidebars) but have no meaningful guest view. The public
 * profile at /u/[username] deliberately does not use this — guests can read
 * it, it just cannot follow or post.
 */
export function useRequireSession() {
  const router = useRouter();
  const { user, loading, signedOut, failed } = useCurrentUser();

  useEffect(() => {
    if (!loading && (signedOut || failed)) router.replace("/login");
  }, [loading, signedOut, failed, router]);

  return { user, checking: loading };
}
