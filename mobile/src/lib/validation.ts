// Validation mirrors web signup/login rules (backend zod schemas in
// backend/src/routes/authRoutes.js) so errors surface before a round-trip.

export const EMAIL_ALLOW = ["gmail.com", "proton.me"] as const;

export function isValidEmail(v: string): boolean {
  const m = v.trim().toLowerCase();
  if (!m.includes("@")) return false;
  const domain = m.split("@")[1];
  return (
    (EMAIL_ALLOW as readonly string[]).includes(domain) &&
    /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(m)
  );
}

export function sanitizeUsername(v: string): string {
  return v.toLowerCase().replace(/[^a-z0-9_]/g, "");
}

export type FormatState =
  | { state: "idle"; msg: "" }
  | { state: "error"; msg: string }
  | { state: "available"; msg: string }
  | { state: "taken"; msg: string };

export function usernameFormatStatus(v: string): FormatState | null {
  if (!v) return { state: "idle", msg: "" };
  if (v.length < 3) return { state: "error", msg: "Minimum 3 characters." };
  if (!/^[a-z0-9_]+$/.test(v))
    return { state: "error", msg: "Only lowercase letters, numbers and _" };
  if (v.length > 20) return { state: "error", msg: "Maximum 20 characters." };
  return null; // needs backend check
}

// Same scoring as web PasswordStrength: achromatic until long enough,
// then X Blue. No colour ramp.
export function scorePassword(pw: string): number {
  let s = 0;
  if (!pw) return 0;
  if (pw.length >= 8) s++;
  if (pw.length >= 12) s++;
  if (/[A-Z]/.test(pw) && /[a-z]/.test(pw)) s++;
  if (/\d/.test(pw)) s++;
  if (/[^A-Za-z0-9]/.test(pw)) s++;
  return Math.min(s, 4);
}

const strengthLabels = ["Too weak", "Weak", "Good", "Strong", "Very strong"];

export function strengthLabel(password: string): { level: number; label: string } {
  if (!password) return { level: 0, label: "8+ characters" };
  if (password.length < 8) return { level: 0, label: strengthLabels[0] };
  const raw = scorePassword(password);
  const level = Math.max(0, raw - 1);
  return { level, label: strengthLabels[level] };
}
