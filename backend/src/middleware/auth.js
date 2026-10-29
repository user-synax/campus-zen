import { verifyAccessToken } from "../utils/jwt.js";
import { AppError } from "../utils/AppError.js";
import { User } from "../models/User.js";
import { restrictionIsActive } from "../utils/accountState.js";
import { PRIVACY_VERSION } from "../config/policy.js";

function bearerToken(req) {
  const h = req.headers?.authorization || "";
  const [scheme, token] = h.split(" ");
  if (/^Bearer$/i.test(scheme) && token) return token;
  return null;
}

function accessTokenFrom(req) {
  return bearerToken(req) || req.cookies?.accessToken || null;
}

// A restricted account is read-only: browse, notifications and account
// lifecycle still work, but nothing that creates engagement does. These
// exceptions keep the session usable and let the owner appeal / leave.
const RESTRICTED_WRITE_ALLOW = [
  { method: "POST", re: /^\/api\/auth\/logout\/?$/ },
  { method: "POST", re: /^\/api\/auth\/refresh\/?$/ },
  { method: "DELETE", re: /^\/api\/auth\/sessions(?:\/[a-f\d]{24})?\/?$/i },
  { method: "PATCH", re: /^\/api\/notifications\/(?:read-all|[a-f\d]{24}\/read)\/?$/i },
  { method: "DELETE", re: /^\/api\/notifications\/(?:clear-read|[a-f\d]{24})\/?$/i },
  { method: "POST", re: /^\/api\/push\/subscribe\/?$/ },
  { method: "DELETE", re: /^\/api\/push\/unsubscribe\/?$/ },
  { method: "POST", re: /^\/api\/reports\/(?:appeals|[a-f\d]{24}\/appeal)\/?$/i },
  { method: "POST", re: /^\/api\/users\/me\/(?:deactivate|reactivate)\/?$/ },
  { method: "DELETE", re: /^\/api\/users\/me\/?$/ },
];

// Consent/age gates are enforced centrally on writes. The account lifecycle,
// consent capture itself, and reads stay available so a user can always fix
// the missing step or leave.
const CONSENT_WRITE_ALLOW = [
  { method: "POST", re: /^\/api\/auth\/(?:logout|refresh)\/?$/ },
  { method: "DELETE", re: /^\/api\/auth\/sessions(?:\/[a-f\d]{24})?\/?$/i },
  { method: "POST", re: /^\/api\/users\/me\/consent\/?$/ },
  { method: "POST", re: /^\/api\/users\/me\/consent\/withdraw\/?$/ },
  { method: "POST", re: /^\/api\/users\/me\/dob\/?$/ },
  { method: "POST", re: /^\/api\/users\/me\/guardian-consent\/resend\/?$/ },
  { method: "POST", re: /^\/api\/users\/me\/(?:deactivate|reactivate)\/?$/ },
  { method: "DELETE", re: /^\/api\/users\/me\/?$/ },
];

function allowedWhileConsentMissing(req) {
  const method = String(req.method || "GET").toUpperCase();
  if (method === "GET" || method === "HEAD" || method === "OPTIONS") return true;
  const path = String(req.originalUrl || req.url || "").split("?")[0];
  return CONSENT_WRITE_ALLOW.some((rule) => rule.method === method && rule.re.test(path));
}

function allowedWhileRestricted(req) {
  const method = String(req.method || "GET").toUpperCase();
  if (method === "GET" || method === "HEAD" || method === "OPTIONS") return true;
  const path = String(req.originalUrl || req.url || "").split("?")[0];
  return RESTRICTED_WRITE_ALLOW.some((rule) => rule.method === method && rule.re.test(path));
}

async function authenticate(req, res, next, { allowSuspended = false } = {}) {
  try {
    const token = accessTokenFrom(req);
    if (!token) throw new AppError("Not authenticated. Please log in.", 401, "UNAUTHENTICATED");

    let decoded;
    try {
      decoded = verifyAccessToken(token);
    } catch (err) {
      if (err.name === "TokenExpiredError") throw new AppError("Session expired. Please refresh or log in again.", 401, "TOKEN_EXPIRED");
      throw new AppError("Invalid session.", 401, "INVALID_TOKEN");
    }

    const user = await User.findById(decoded.id).select("+refreshTokenHash");
    if (!user) throw new AppError("User no longer exists.", 401, "USER_NOT_FOUND");
    // A permanent ban invalidates every session and is never overridable —
    // even the read-only /me path used by suspended accounts.
    if (user.isBanned) {
      throw new AppError(
        "This account has been permanently banned.",
        403,
        "ACCOUNT_BANNED",
        null,
        { reason: user.banReason || null, bannedAt: user.bannedAt || null }
      );
    }
    // Suspended accounts keep a session so they can see WHY they are blocked
    // (the standing card on /menu) and sign out again — every write path is
    // still protect()-gated, so the session stays read-only.
    if (user.isSuspended && !allowSuspended) {
      throw new AppError("Account suspended. Contact support.", 403, "ACCOUNT_SUSPENDED");
    }
    // A temporary restriction that has elapsed is treated as lifted even if
    // the sweep has not reached the row yet. Persist it in the background.
    if (
      user.accountStatus === "restricted" &&
      user.restrictedUntil &&
      new Date(user.restrictedUntil).getTime() <= Date.now()
    ) {
      user.accountStatus = "good";
      user.restrictedUntil = null;
      user.restrictedAt = null;
      user.restrictionReason = null;
      user.accountStatusReason = null;
      // Await the write before any handler refetches the user (e.g. /me), so
      // the response never exposes an expired restriction as active.
      await User.updateOne(
        { _id: user._id, accountStatus: "restricted" },
        {
          $set: {
            accountStatus: "good",
            restrictedUntil: null,
            restrictedAt: null,
            restrictionReason: null,
            accountStatusReason: null,
            accountStatusAt: new Date(),
          },
        }
      ).catch(() => {});
    }
    // Temporary restriction: read-only, auto-lifts. Unlike suspension the
    // session stays fully usable for browsing and receiving notifications.
    if (restrictionIsActive(user) && !allowSuspended && !allowedWhileRestricted(req)) {
      throw new AppError(
        "Your account is temporarily restricted. You can browse but cannot post or interact yet.",
        403,
        "ACCOUNT_RESTRICTED",
        null,
        {
          until: user.restrictedUntil,
          reason: user.restrictionReason || null,
        }
      );
    }
    // Hard gate: a session is not valid for app access until the email is
    // verified. Only /api/auth/verify-email + /resend-otp (unprotected) work.
    if (!user.isEmailVerified) {
      throw new AppError(
        "Verify your email to continue. Enter the 6-digit code we sent you.",
        403,
        "EMAIL_NOT_VERIFIED",
        null,
        { email: user.email }
      );
    }

    // DPDP gates. Reads remain open so the app can explain the missing step;
    // every write (post, follow, like, report, upload) is blocked until the
    // user has an age on file, guardian approval where required, and consent
    // to the current privacy notice.
    if (user.consent?.withdrawnAt) {
      throw new AppError(
        "Consent has been withdrawn. This account is scheduled for deletion.",
        403,
        "CONSENT_WITHDRAWN"
      );
    }
    if (user.guardian?.consentStatus === "withdrawn") {
      throw new AppError(
        "Parental consent was withdrawn. This account is scheduled for deletion.",
        403,
        "PARENTAL_CONSENT_WITHDRAWN"
      );
    }
    if (!allowedWhileConsentMissing(req)) {
      if (!user.dob) {
        throw new AppError("Add your date of birth to continue.", 403, "DOB_REQUIRED");
      }
      if (user.isMinor && user.guardian?.consentStatus !== "granted") {
        throw new AppError(
          "A parent or guardian must approve this account before you can post or interact.",
          403,
          "PARENTAL_CONSENT_REQUIRED",
          null,
          { guardianEmail: user.guardian?.email || null }
        );
      }
      if (!user.consent?.acceptedAt || user.consent.privacyVersion !== PRIVACY_VERSION) {
        throw new AppError(
          "Accept the updated Privacy Notice to continue.",
          403,
          "CONSENT_REQUIRED",
          null,
          { policyVersion: PRIVACY_VERSION }
        );
      }
    }

    req.user = user;
    req.userId = user._id;
    // Which device session this request belongs to. Absent on tokens minted
    // before per-device sessions — callers must treat null as "unknown".
    req.sessionId = decoded.sid || null;
    next();
  } catch (err) {
    next(err);
  }
}

export async function protect(req, res, next) {
  return authenticate(req, res, next);
}

// Same as protect, but a suspended session stays usable for read-only calls
// (GET /me). Only routes that must work FOR a suspended account use this.
export async function protectAllowSuspended(req, res, next) {
  return authenticate(req, res, next, { allowSuspended: true });
}

// Optional auth — sets req.user if valid token, else null, never throws
export async function optionalAuth(req, res, next) {
  try {
    const token = accessTokenFrom(req);
    if (!token) {
      req.user = null;
      return next();
    }
    let decoded;
    try {
      decoded = verifyAccessToken(token);
    } catch {
      req.user = null;
      return next();
    }
    const user = await User.findById(decoded.id).select("+refreshTokenHash");
    // Unverified, banned (or suspended) accounts get the guest view on
    // optional-auth routes; every write path uses protect() and is rejected.
    const usable =
      user &&
      user.isEmailVerified &&
      !user.isSuspended &&
      !user.isBanned &&
      !user.consent?.withdrawnAt
        ? user
        : null;
    req.user = usable;
    if (usable) req.userId = usable._id;
    next();
  } catch {
    req.user = null;
    next();
  }
}

export function authorize(...roles) {
  return (req, res, next) => {
    if (!req.user || !roles.includes(req.user.role)) return next(new AppError("Forbidden.", 403, "FORBIDDEN"));
    next();
  };
}
