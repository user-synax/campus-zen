import dotenv from "dotenv";
dotenv.config();

function requireEnv(name, fallback) {
  const v = process.env[name] ?? fallback;
  if (!v) throw new Error(`Missing env: ${name}`);
  return v;
}

// Email can be delivered by Resend (HTTPS, preferred) or SMTP.
// Resend only needs RESEND_API_KEY; SMTP needs SMTP_USER + SMTP_PASS.
const resendApiKey = process.env.RESEND_API_KEY || "";
const smtpUser = process.env.SMTP_USER || "";
const smtpPass = process.env.SMTP_PASS || "";

export const env = {
  NODE_ENV: process.env.NODE_ENV || "development",
  PORT: Number(process.env.PORT || 4000),
  MONGO_URI: requireEnv("MONGO_URI", "mongodb://localhost:27017/campuszen"),
  JWT_ACCESS_SECRET: requireEnv("JWT_ACCESS_SECRET", "dev_access_secret_please_change_32chars!!"),
  JWT_REFRESH_SECRET: requireEnv("JWT_REFRESH_SECRET", "dev_refresh_secret_please_change_32chars!!"),
  JWT_ACCESS_EXPIRES: process.env.JWT_ACCESS_EXPIRES || "15m",
  JWT_REFRESH_REMEMBER_EXPIRES: process.env.JWT_REFRESH_REMEMBER_EXPIRES || "7d",
  JWT_REFRESH_DEFAULT_EXPIRES: process.env.JWT_REFRESH_DEFAULT_EXPIRES || "1d",
  FRONTEND_URL: process.env.FRONTEND_URL || "http://localhost:3000",
  // Owner badge (red) — exactly one account. Compared case-insensitively
  // against the user's email; synced on signup (pre-save) and login.
  OWNER_EMAIL: (process.env.OWNER_EMAIL || "usersynax@gmail.com").toLowerCase().trim(),
  COOKIE_SECURE: process.env.COOKIE_SECURE === "true",
  // lax for same-origin prod, "none" when frontend and API live on different hosts
  COOKIE_SAMESITE: ["lax", "strict", "none"].includes(process.env.COOKIE_SAMESITE)
    ? process.env.COOKIE_SAMESITE
    : "lax",
  // Email (Gmail SMTP — needs an App Password, not the login password)
  SMTP_HOST: process.env.SMTP_HOST || "smtp.gmail.com",
  SMTP_PORT: Number(process.env.SMTP_PORT || 587),
  SMTP_USER: smtpUser,
  SMTP_PASS: smtpPass,
  // Sender address. With Resend this MUST be on a domain verified in the
  // Resend dashboard. onboarding@resend.dev is Resend's test sender and only
  // delivers to the account owner, so set EMAIL_FROM in production.
  EMAIL_FROM: process.env.EMAIL_FROM || (resendApiKey ? "onboarding@resend.dev" : smtpUser),
  // SMTP fallback sender. Gmail only accepts an address it owns, so when
  // Resend is the primary transport this defaults to SMTP_USER instead of
  // the Resend-domain EMAIL_FROM. SMTP_FROM overrides both.
  SMTP_FROM: process.env.SMTP_FROM || (resendApiKey ? smtpUser : process.env.EMAIL_FROM || smtpUser),
  EMAIL_FROM_NAME: process.env.EMAIL_FROM_NAME || "CampusZen",
  // Transactional email over HTTPS (preferred on Render — SMTP to Gmail
  // often fails from datacenter IPs). When set, sendMail uses Resend
  // instead of SMTP. No new dependency: plain fetch, no SDK needed.
  RESEND_API_KEY: resendApiKey,
  // Push (Web Push / VAPID) — OS-level notifications when app is closed.
  // Public key is safe to expose; private key never leaves the server.
  VAPID_PUBLIC_KEY: process.env.VAPID_PUBLIC_KEY || "",
  VAPID_PRIVATE_KEY: process.env.VAPID_PRIVATE_KEY || "",
  VAPID_SUBJECT: process.env.VAPID_SUBJECT || "mailto:admin@campuszen.tech",
  // Set both in backend .env to enable /admin:
  //   ADMIN_EMAIL=you@example.com
  //   ADMIN_PASSKEY=<long random string 32+ chars>
  ADMIN_EMAIL: (process.env.ADMIN_EMAIL || "").toLowerCase().trim(),
  ADMIN_PASSKEY: process.env.ADMIN_PASSKEY || "",
  ADMIN_TOKEN_EXPIRES: process.env.ADMIN_TOKEN_EXPIRES || "2h",
};

export const isProd = env.NODE_ENV === "production";

// Fail fast: an app that cannot deliver OTPs cannot let anyone in.
if (!env.RESEND_API_KEY && (!env.SMTP_USER || !env.SMTP_PASS)) {
  throw new Error("Missing email config: set RESEND_API_KEY or SMTP_USER + SMTP_PASS");
}
if (env.RESEND_API_KEY && !process.env.EMAIL_FROM) {
  console.warn(
    `[email] RESEND_API_KEY set but EMAIL_FROM is not. Using ${env.EMAIL_FROM}. ` +
      "Set EMAIL_FROM to an address on a domain verified in Resend."
  );
}

// Fail fast: never boot prod with missing or placeholder signing keys,
// and never combine SameSite=None with non-secure cookies (browsers reject it).
if (isProd) {
  for (const k of ["JWT_ACCESS_SECRET", "JWT_REFRESH_SECRET"]) {
    const v = process.env[k];
    if (!v || v.length < 32 || v.includes("please_change") || v.startsWith("dev_")) {
      throw new Error(`Refusing to boot: set a strong ${k} (32+ random chars) in production`);
    }
  }
  if (env.COOKIE_SAMESITE === "none" && !env.COOKIE_SECURE) {
    throw new Error("Refusing to boot: COOKIE_SAMESITE=none requires COOKIE_SECURE=true");
  }
}
