// Shared client-side helpers for the email-verification gate.
//
// The backend only issues a session after /verify-email succeeds, so any
// "email not verified" response means the browser has no usable session yet.
// Keep the address around so /verify-email can render even when the query
// string is lost (refresh, direct navigation, redirect from the app shell).

export const PENDING_EMAIL_KEY = "cz_pending_email";

function safeSession() {
  try {
    return typeof window !== "undefined" ? window.sessionStorage : null;
  } catch {
    // Storage can throw in private mode / sandboxed iframes.
    return null;
  }
}

export function rememberPendingEmail(email) {
  const clean = String(email || "")
    .trim()
    .toLowerCase();
  if (!clean) return;
  safeSession()?.setItem(PENDING_EMAIL_KEY, clean);
}

export function pendingEmail() {
  return safeSession()?.getItem(PENDING_EMAIL_KEY) || "";
}

export function clearPendingEmail() {
  safeSession()?.removeItem(PENDING_EMAIL_KEY);
}

export function verifyEmailPath(email) {
  const clean =
    String(email || "")
      .trim()
      .toLowerCase() || pendingEmail();
  return clean
    ? `/verify-email?email=${encodeURIComponent(clean)}`
    : "/verify-email";
}

export function redirectToVerify(router, email) {
  router.replace(verifyEmailPath(email));
}
