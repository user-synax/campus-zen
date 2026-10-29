import bcrypt from "bcryptjs";
import { User } from "../models/User.js";
import { Otp } from "../models/Otp.js";
import { ConsentRecord } from "../models/ConsentRecord.js";
import { AppError } from "../utils/AppError.js";
import { compareOtp } from "../utils/otp.js";
import { sendWelcomeEmail } from "../utils/email.js";
import { signAccessToken, verifyRefreshToken } from "../utils/jwt.js";
import { sessionService } from "./sessionService.js";
import { createAndSendOtp } from "./otpService.js";
import { calcAgeYears, parseDobInput } from "../utils/age.js";
import {
  POLICY_VERSION,
  TERMS_VERSION,
  PRIVACY_VERSION,
  MIN_AGE,
  ADULT_AGE,
} from "../config/policy.js";

const ALLOWED_DOMAINS = ["gmail.com", "proton.me"];
const USERNAME_RE = /^[a-z0-9_]{3,20}$/;
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const GUARDIAN_GENERIC = "If a guardian consent is on file, a confirmation code has been sent.";

function assertAllowedEmail(email) {
  const domain = email.split("@")[1];
  if (!ALLOWED_DOMAINS.includes(domain)) {
    throw new AppError("Email domain not allowed. Use gmail.com or proton.me", 400, "EMAIL_DOMAIN_NOT_ALLOWED");
  }
}

function maskEmail(email) {
  return String(email || "").replace(/(^.).+(@.*)/, (m, a, b) => `${a}***${b}`);
}

function consentMeta(meta = {}) {
  return {
    ip: meta.ip || null,
    userAgent: meta.device?.userAgent || null,
  };
}

async function recordConsent(user, { action, method = "self", purposes = ["core"], guardian = null, meta = {} } = {}) {
  return ConsentRecord.create({
    user: user._id,
    policyVersion: POLICY_VERSION,
    termsVersion: TERMS_VERSION,
    privacyVersion: PRIVACY_VERSION,
    purposes,
    action,
    method,
    guardianName: guardian?.name || null,
    guardianEmail: guardian?.email || null,
    ...consentMeta(meta),
  });
}

// Issue an authenticated session. Only called after credentials are proven
// AND the email is verified — signup never issues tokens.
// Each call creates its own device session; signing in on a second device no
// longer invalidates the first. The access token carries `sid` so request
// handlers can tell which device is calling (see GET /api/auth/sessions).
async function issueSession(user, remember = true, meta = {}) {
  const { session, refreshToken } = await sessionService.create(user, { remember, ...meta });
  const accessToken = signAccessToken({
    id: user._id,
    username: user.username,
    role: user.role,
    sid: session._id.toString(),
  });
  user.lastLoginAt = new Date();
  return { accessToken, refreshToken, sessionId: session._id.toString() };
}

function assertCanUseAccount(user) {
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
  if (user.isMinor && user.guardian?.consentStatus !== "granted") {
    throw new AppError(
      "A parent or guardian must approve this account before you can sign in.",
      403,
      "PARENTAL_CONSENT_REQUIRED",
      null,
      { email: user.email, guardianEmail: maskEmail(user.guardian?.email) }
    );
  }
}

export const authService = {
  async checkUsername(username) {
    const u = username.toLowerCase().trim();
    if (!USERNAME_RE.test(u)) return { available: false, reason: "Invalid format. Use 3-20 chars: a-z, 0-9, _" };
    const exists = await User.exists({ username: u });
    return { available: !exists, reason: exists ? "Username is taken" : "Available" };
  },

  async signup(
    { fullName, username, email, password, dob, acceptTerms, guardianName, guardianEmail, analytics },
    meta = {}
  ) {
    if (acceptTerms !== true) {
      throw new AppError(
        "You must accept the Terms and Privacy Notice to create an account.",
        400,
        "CONSENT_REQUIRED"
      );
    }

    const dobDate = parseDobInput(dob);
    const age = calcAgeYears(dobDate);
    if (age < MIN_AGE) {
      throw new AppError("CampusZen is for users aged 13 and over.", 403, "UNDERAGE");
    }
    const isMinor = age < ADULT_AGE;

    const cleanUsername = username.toLowerCase().trim();
    const cleanEmail = email.toLowerCase().trim();
    assertAllowedEmail(cleanEmail);
    if (!USERNAME_RE.test(cleanUsername)) {
      throw new AppError("Invalid username format", 400, "INVALID_USERNAME");
    }

    let cleanGuardianName = null;
    let cleanGuardianEmail = null;
    if (isMinor) {
      cleanGuardianName = String(guardianName || "").trim();
      cleanGuardianEmail = String(guardianEmail || "").toLowerCase().trim();
      if (cleanGuardianName.length < 2 || cleanGuardianName.length > 80) {
        throw new AppError(
          "A parent or guardian's name is required for users under 18.",
          400,
          "GUARDIAN_REQUIRED"
        );
      }
      if (!EMAIL_RE.test(cleanGuardianEmail)) {
        throw new AppError(
          "A valid parent or guardian email is required for users under 18.",
          400,
          "GUARDIAN_REQUIRED"
        );
      }
      if (cleanGuardianEmail === cleanEmail) {
        throw new AppError(
          "The guardian email must be different from your own email.",
          400,
          "GUARDIAN_EMAIL_INVALID"
        );
      }
    }

    const [userByUsername, userByEmail] = await Promise.all([
      User.findOne({ username: cleanUsername }),
      User.findOne({ email: cleanEmail }),
    ]);
    if (userByEmail?.isEmailVerified) throw new AppError("Email is already registered", 409, "EMAIL_TAKEN");
    if (userByEmail) {
      // A previous signup never finished verifying. Never let a second
      // signup overwrite that account's password; send them back to the
      // (unprotected) verification screen where they can resend the code.
      throw new AppError(
        "This email is already waiting for verification. Resend the code from the verification screen.",
        409,
        "EMAIL_PENDING_VERIFICATION",
        null,
        { email: cleanEmail }
      );
    }
    if (userByUsername) throw new AppError("Username is already taken", 409, "USERNAME_TAKEN");

    const passwordHash = await bcrypt.hash(password, 10);
    const user = await User.create({
      fullName: fullName.trim(),
      username: cleanUsername,
      email: cleanEmail,
      passwordHash,
      isEmailVerified: false,
      dob: dobDate,
      dobSetAt: new Date(),
      isMinor,
      consent: {
        // A child's acceptance is not effective consent. These stay empty
        // until the guardian approves in verifyGuardianConsent().
        termsVersion: isMinor ? null : TERMS_VERSION,
        privacyVersion: isMinor ? null : PRIVACY_VERSION,
        acceptedAt: isMinor ? null : new Date(),
        // Children never get optional behavioural analytics.
        analytics: isMinor ? false : Boolean(analytics),
        ...consentMeta(meta),
      },
      guardian: isMinor
        ? { name: cleanGuardianName, email: cleanGuardianEmail, consentStatus: "pending" }
        : { consentStatus: "not_required" },
    });

    try {
      // A minor's consent is recorded only when the guardian approves; the
      // guardian record is written in verifyGuardianConsent().
      if (!isMinor) {
        await recordConsent(user, {
          action: "granted",
          method: "self",
          purposes: analytics ? ["core", "analytics"] : ["core"],
          meta,
        });
      }
      // Minors cannot verify their own email until the guardian approves.
      // Adults get the normal verification code immediately.
      await createAndSendOtp(
        isMinor
          ? { email: cleanGuardianEmail, type: "guardian", childEmail: cleanEmail }
          : { email: cleanEmail, type: "verify" }
      );
    } catch (err) {
      await Promise.allSettled([
        User.deleteOne({ _id: user._id }),
        ConsentRecord.deleteMany({ user: user._id }),
        Otp.deleteMany({ $or: [{ email: cleanEmail }, { email: cleanGuardianEmail }] }),
      ]);
      throw err;
    }

    return {
      user: user.toSafeObject(),
      parentalConsentRequired: isMinor,
      guardianEmail: isMinor ? maskEmail(cleanGuardianEmail) : null,
    };
  },

  async verifyEmail({ email, otp }, meta = {}) {
    const cleanEmail = email.toLowerCase().trim();
    const user = await User.findOne({ email: cleanEmail });
    if (!user) throw new AppError("User not found", 404, "USER_NOT_FOUND");
    if (user.isEmailVerified) {
      throw new AppError("Email is already verified. Please sign in.", 409, "EMAIL_ALREADY_VERIFIED");
    }
    assertCanUseAccount(user);

    const record = await Otp.findOne({ email: cleanEmail, type: "verify" }).sort({ createdAt: -1 });
    if (!record) throw new AppError("No verification code found. Request a new one.", 404, "OTP_NOT_FOUND");
    if (record.expiresAt < new Date()) {
      await Otp.deleteMany({ email: cleanEmail, type: "verify" });
      throw new AppError("Code expired. Request a new one.", 410, "OTP_EXPIRED");
    }
    if (record.attempts >= 5) {
      await Otp.deleteMany({ email: cleanEmail, type: "verify" });
      throw new AppError("Too many attempts. Request a new code.", 429, "OTP_ATTEMPTS_EXCEEDED");
    }

    const ok = await compareOtp(otp, record.otpHash);
    if (!ok) {
      record.attempts += 1;
      await record.save();
      const remaining = 5 - record.attempts;
      throw new AppError(
        `Invalid code. ${remaining > 0 ? `${remaining} attempts left.` : "No attempts left. Request a new code."}`,
        400,
        "OTP_INVALID"
      );
    }

    // Success — mark verified, clear OTPs, and only NOW issue the session.
    user.isEmailVerified = true;
    const { accessToken, refreshToken } = await issueSession(user, true, meta);
    await user.save();
    await Otp.deleteMany({ email: cleanEmail, type: "verify" });

    // welcome email is best-effort: verification already succeeded,
    // so a send failure here only gets logged, never fails the request
    await sendWelcomeEmail({ to: cleanEmail, name: user.fullName });

    return { user: user.toSafeObject(), accessToken, refreshToken, remember: true };
  },

  // A guardian approves a 13-17 account by entering the code we sent to the
  // guardian email. Only then is the child's verification code issued.
  async verifyGuardianConsent({ email, otp }, meta = {}) {
    const cleanEmail = email.toLowerCase().trim();
    const user = await User.findOne({ email: cleanEmail });
    if (!user || !user.isMinor || !user.guardian?.email) {
      throw new AppError("No pending guardian consent was found.", 404, "GUARDIAN_CONSENT_NOT_FOUND");
    }
    if (user.guardian.consentStatus === "granted") {
      throw new AppError("Guardian consent is already recorded. Verify your email.", 409, "GUARDIAN_CONSENT_ALREADY_GRANTED");
    }
    if (user.guardian.consentStatus !== "pending") {
      throw new AppError("Guardian consent is not pending.", 409, "GUARDIAN_CONSENT_NOT_PENDING");
    }

    const guardianEmail = user.guardian.email;
    const record = await Otp.findOne({ email: guardianEmail, type: "guardian" }).sort({ createdAt: -1 });
    if (!record) throw new AppError("No consent code found. Request a new one.", 404, "OTP_NOT_FOUND");
    if (record.expiresAt < new Date()) {
      await Otp.deleteMany({ email: guardianEmail, type: "guardian" });
      throw new AppError("Code expired. Request a new one.", 410, "OTP_EXPIRED");
    }
    if (record.attempts >= 5) {
      await Otp.deleteMany({ email: guardianEmail, type: "guardian" });
      throw new AppError("Too many attempts. Request a new code.", 429, "OTP_ATTEMPTS_EXCEEDED");
    }

    const ok = await compareOtp(otp, record.otpHash);
    if (!ok) {
      record.attempts += 1;
      await record.save();
      const remaining = 5 - record.attempts;
      throw new AppError(
        `Invalid code. ${remaining > 0 ? `${remaining} attempts left.` : "No attempts left. Request a new code."}`,
        400,
        "OTP_INVALID"
      );
    }

    user.guardian.consentStatus = "granted";
    user.guardian.consentAt = new Date();
    user.guardian.consentIp = meta.ip || null;
    user.guardian.consentUserAgent = meta.device?.userAgent || null;
    // Guardian approval is the effective consent for a child account.
    if (!user.consent) user.consent = {};
    user.consent.termsVersion = TERMS_VERSION;
    user.consent.privacyVersion = PRIVACY_VERSION;
    user.consent.acceptedAt = new Date();
    user.consent.withdrawnAt = null;
    user.consent.analytics = false;
    user.consent.ip = meta.ip || null;
    user.consent.userAgent = meta.device?.userAgent || null;
    await user.save();

    try {
      await recordConsent(user, { action: "granted", method: "guardian", guardian: user.guardian, meta });
    } catch (err) {
      // Keep the audit trail and the current state in sync: if the record
      // cannot be written, do not leave the account looking approved.
      user.guardian.consentStatus = "pending";
      await user.save().catch(() => {});
      throw err;
    }

    await Otp.deleteMany({ email: guardianEmail, type: "guardian" });
    try {
      await createAndSendOtp({ email: cleanEmail, type: "verify" });
    } catch (err) {
      // Consent is valid even if the follow-up email fails; the child can
      // request a new verification code from the verification screen.
      console.error("[auth] child verification email after guardian consent failed:", err.message);
    }

    return {
      user: user.toSafeObject(),
      verificationRequired: true,
      guardianEmail: maskEmail(guardianEmail),
    };
  },

  async resendOtp({ email, type }) {
    const cleanEmail = email.toLowerCase().trim();
    const user = await User.findOne({ email: cleanEmail });
    if (!user) return { message: "If an account exists, a code will be sent." };

    // Guardian consent codes go to the guardian's inbox, never the child's.
    if (type === "guardian" || (type === "verify" && user.isMinor && user.guardian?.consentStatus === "pending")) {
      if (!user.isMinor || user.guardian?.consentStatus !== "pending" || !user.guardian?.email) {
        return { message: GUARDIAN_GENERIC };
      }
      const last = await Otp.findOne({ email: user.guardian.email, type: "guardian" }).sort({ createdAt: -1 });
      if (last && Date.now() - last.createdAt.getTime() < 30 * 1000) {
        throw new AppError("Please wait 30 seconds before requesting another code.", 429, "RESEND_THROTTLE");
      }
      await createAndSendOtp({ email: user.guardian.email, type: "guardian", childEmail: cleanEmail });
      return { message: "Consent code sent to your guardian." };
    }

    if (type === "verify" && user.isEmailVerified) {
      throw new AppError("Email is already verified. Please sign in.", 409, "EMAIL_ALREADY_VERIFIED");
    }

    // throttle: already handled by rateLimiter, but also prevent spam if last OTP <30s old
    const last = await Otp.findOne({ email: cleanEmail, type }).sort({ createdAt: -1 });
    if (last && Date.now() - last.createdAt.getTime() < 30 * 1000) {
      throw new AppError("Please wait 30 seconds before requesting another code.", 429, "RESEND_THROTTLE");
    }

    await createAndSendOtp({ email: cleanEmail, type });
    return { message: "Code sent. Check your email." };
  },

  async resendGuardianConsent(user, { guardianName, guardianEmail } = {}) {
    if (!user.isMinor || user.guardian?.consentStatus !== "pending" || !user.guardian?.email) {
      throw new AppError("No pending guardian consent was found.", 400, "GUARDIAN_CONSENT_NOT_PENDING");
    }
    // While consent is pending the guardian details are still correctable —
    // a typo must not permanently strand a 13-17 account.
    if (guardianName !== undefined) {
      const name = String(guardianName).trim();
      if (name.length < 2 || name.length > 80) {
        throw new AppError("A parent or guardian's name is required.", 400, "GUARDIAN_REQUIRED");
      }
      user.guardian.name = name;
    }
    if (guardianEmail !== undefined) {
      const email = String(guardianEmail).toLowerCase().trim();
      if (!EMAIL_RE.test(email)) {
        throw new AppError("A valid parent or guardian email is required.", 400, "GUARDIAN_REQUIRED");
      }
      if (email === user.email) {
        throw new AppError("The guardian email must be different from your own email.", 400, "GUARDIAN_EMAIL_INVALID");
      }
      user.guardian.email = email;
    }
    if (guardianName !== undefined || guardianEmail !== undefined) await user.save();
    const last = await Otp.findOne({ email: user.guardian.email, type: "guardian" }).sort({ createdAt: -1 });
    if (last && Date.now() - last.createdAt.getTime() < 30 * 1000) {
      throw new AppError("Please wait 30 seconds before requesting another code.", 429, "RESEND_THROTTLE");
    }
    await createAndSendOtp({ email: user.guardian.email, type: "guardian", childEmail: user.email });
    return { message: "Consent email sent to your guardian." };
  },

  async requestGuardianConsentWithdrawal({ email }) {
    const cleanEmail = email.toLowerCase().trim();
    const user = await User.findOne({ email: cleanEmail });
    if (!user || !user.isMinor || !user.guardian?.email) {
      return { message: GUARDIAN_GENERIC };
    }
    const last = await Otp.findOne({ email: user.guardian.email, type: "guardian_withdraw" }).sort({ createdAt: -1 });
    if (last && Date.now() - last.createdAt.getTime() < 30 * 1000) {
      throw new AppError("Please wait 30 seconds before requesting another code.", 429, "RESEND_THROTTLE");
    }
    await createAndSendOtp({ email: user.guardian.email, type: "guardian_withdraw", childEmail: cleanEmail });
    return { message: GUARDIAN_GENERIC };
  },

  async verifyGuardianConsentWithdrawal({ email, otp }, meta = {}) {
    const cleanEmail = email.toLowerCase().trim();
    const user = await User.findOne({ email: cleanEmail });
    if (!user || !user.isMinor || !user.guardian?.email) {
      throw new AppError("No guardian consent was found.", 404, "GUARDIAN_CONSENT_NOT_FOUND");
    }

    const guardianEmail = user.guardian.email;
    const record = await Otp.findOne({ email: guardianEmail, type: "guardian_withdraw" }).sort({ createdAt: -1 });
    if (!record) throw new AppError("No withdrawal code found. Request a new one.", 404, "OTP_NOT_FOUND");
    if (record.expiresAt < new Date()) {
      await Otp.deleteMany({ email: guardianEmail, type: "guardian_withdraw" });
      throw new AppError("Code expired. Request a new one.", 410, "OTP_EXPIRED");
    }
    if (record.attempts >= 5) {
      await Otp.deleteMany({ email: guardianEmail, type: "guardian_withdraw" });
      throw new AppError("Too many attempts. Request a new code.", 429, "OTP_ATTEMPTS_EXCEEDED");
    }

    const ok = await compareOtp(otp, record.otpHash);
    if (!ok) {
      record.attempts += 1;
      await record.save();
      const remaining = 5 - record.attempts;
      throw new AppError(
        `Invalid code. ${remaining > 0 ? `${remaining} attempts left.` : "No attempts left. Request a new code."}`,
        400,
        "OTP_INVALID"
      );
    }

    user.guardian.consentStatus = "withdrawn";
    user.consent.withdrawnAt = new Date();
    user.consent.acceptedAt = null;
    user.consent.termsVersion = null;
    user.consent.privacyVersion = null;
    user.isDeactivated = true;
    user.deactivatedAt = new Date();
    // Withdrawal of consent is an erasure request. The account is hidden now
    // and the purge sweep removes it on its next run.
    user.scheduledDeletionAt = new Date();
    user.refreshTokenHash = null;
    await user.save();

    try {
      await recordConsent(user, { action: "withdrawn", method: "guardian", guardian: user.guardian, meta });
    } catch (err) {
      console.error("[auth] consent withdrawal audit write failed:", err.message);
    }

    await sessionService.revokeAll(user._id);
    await import("../models/PushSubscription.js").then(({ PushSubscription }) =>
      PushSubscription.deleteMany({ user: user._id })
    );
    await Otp.deleteMany({ email: guardianEmail, type: "guardian_withdraw" });

    return {
      message: "Parental consent withdrawn. The account has been scheduled for deletion.",
    };
  },

  async login({ username, password, remember = true }, meta = {}) {
    const cleanUsername = username.toLowerCase().trim();
    const user = await User.findOne({ username: cleanUsername }).select("+passwordHash +refreshTokenHash");
    if (!user) throw new AppError("Invalid username or password", 401, "INVALID_CREDENTIALS");
    if (user.isBanned) {
      throw new AppError("This account has been permanently banned.", 403, "ACCOUNT_BANNED", null, {
        reason: user.banReason || null,
        bannedAt: user.bannedAt || null,
      });
    }
    if (user.isSuspended) throw new AppError("Account suspended. Contact support.", 403, "ACCOUNT_SUSPENDED");

    const ok = await bcrypt.compare(password, user.passwordHash);
    if (!ok) throw new AppError("Invalid username or password", 401, "INVALID_CREDENTIALS");
    if (!user.isEmailVerified) {
      throw new AppError(
        "Verify your email before signing in. Enter the 6-digit code we sent you.",
        403,
        "EMAIL_NOT_VERIFIED",
        null,
        { email: user.email }
      );
    }
    assertCanUseAccount(user);

    // Verification passed — only now issue the session. This adds a device
    // session; any token still in `refreshTokenHash` from before per-device
    // sessions is left alone so that device can migrate on its next refresh.
    const { accessToken, refreshToken } = await issueSession(user, remember, meta);
    // backfill: accounts created before isOwner existed get flagged here
    // (pre-save hook covers all future saves)
    try {
      const { env } = await import("../config/env.js");
      const clean = String(user.email || "").toLowerCase().trim();
      user.isOwner = clean === env.OWNER_EMAIL;
    } catch {}
    await user.save();

    const safe = user.toSafeObject();
    return { user: safe, accessToken, refreshToken, remember };
  },

  async refresh({ refreshToken: raw }, meta = {}) {
    if (!raw) throw new AppError("Missing refresh token", 401, "NO_REFRESH_TOKEN");
    let decoded;
    try {
      decoded = verifyRefreshToken(raw);
    } catch (e) {
      throw new AppError(
        e.name === "TokenExpiredError" ? "Refresh token expired. Log in again." : "Invalid refresh token",
        401,
        "INVALID_REFRESH"
      );
    }

    const user = await User.findById(decoded.id).select("+refreshTokenHash");
    if (!user) throw new AppError("Session not found. Log in again.", 401, "SESSION_NOT_FOUND");
    // A permanent ban is final: reject the refresh and drop any device row
    // that somehow survived the ban action.
    if (user.isBanned) {
      await sessionService.revokeAll(user._id);
      throw new AppError("This account has been permanently banned.", 403, "ACCOUNT_BANNED");
    }
    // A suspended account keeps a refreshable (read-only) session so it can
    // open /menu, read its standing and sign out. protect() still rejects
    // every write, and login() still refuses to mint a fresh session.
    if (!user.isEmailVerified) {
      throw new AppError(
        "Verify your email before continuing.",
        403,
        "EMAIL_NOT_VERIFIED",
        null,
        { email: user.email }
      );
    }
    assertCanUseAccount(user);

    // Validation, rotation and legacy migration all live in sessionService:
    // a token with no `sid` is a pre-sessions token and is upgraded in place.
    const { session, refreshToken } = await sessionService.rotate(user, raw, decoded, meta);
    const accessToken = signAccessToken({
      id: user._id,
      username: user.username,
      role: user.role,
      sid: session._id.toString(),
    });

    return {
      accessToken,
      refreshToken,
      remember: session.remember,
      user: user.toSafeObject(),
    };
  },

  // Signs out THIS device only — other devices keep their sessions. Use
  // DELETE /api/auth/sessions to sign out everywhere else.
  async logout(userId, refreshTokenRaw) {
    if (!refreshTokenRaw) return;
    let decoded;
    try {
      decoded = verifyRefreshToken(refreshTokenRaw);
    } catch {
      return; // expired/invalid token: the session row expires on its own TTL
    }
    if (decoded?.sid) {
      await sessionService.revokeById(decoded.id || userId, decoded.sid);
      return;
    }
    // Token from before per-device sessions: clear the single legacy hash.
    if (decoded?.id) await User.findByIdAndUpdate(decoded.id, { $set: { refreshTokenHash: null } });
  },

  async forgotPassword({ email }) {
    const cleanEmail = email.toLowerCase().trim();
    const user = await User.findOne({ email: cleanEmail });
    // generic response to avoid enumeration
    if (!user) return { message: "If an account exists, a reset code has been sent." };

    await createAndSendOtp({ email: cleanEmail, type: "reset" });
    return { message: "Reset code sent. Expires in 10 minutes." };
  },

  async resetPassword({ email, otp, newPassword }) {
    const cleanEmail = email.toLowerCase().trim();
    const record = await Otp.findOne({ email: cleanEmail, type: "reset" }).sort({ createdAt: -1 });
    if (!record) throw new AppError("No reset code found. Request a new one.", 404, "OTP_NOT_FOUND");
    if (record.expiresAt < new Date()) {
      await Otp.deleteMany({ email: cleanEmail, type: "reset" });
      throw new AppError("Code expired. Request a new one.", 410, "OTP_EXPIRED");
    }
    if (record.attempts >= 5) {
      await Otp.deleteMany({ email: cleanEmail, type: "reset" });
      throw new AppError("Too many attempts. Request a new code.", 429, "OTP_ATTEMPTS_EXCEEDED");
    }

    const ok = await compareOtp(otp, record.otpHash);
    if (!ok) {
      record.attempts += 1;
      await record.save();
      const remaining = 5 - record.attempts;
      throw new AppError(`Invalid code. ${remaining > 0 ? `${remaining} attempts left.` : "No attempts left."}`, 400, "OTP_INVALID");
    }

    await Otp.deleteMany({ email: cleanEmail, type: "reset" });
    const user = await User.findOne({ email: cleanEmail }).select("+passwordHash +refreshTokenHash");
    if (!user) throw new AppError("User not found", 404, "USER_NOT_FOUND");

    user.passwordHash = await bcrypt.hash(newPassword, 10);
    // A reset signs every device out: whoever holds the old refresh tokens
    // loses them, including a stolen phone.
    user.refreshTokenHash = null;
    await user.save();
    await sessionService.revokeAll(user._id);

    return { message: "Password updated. Please log in with your new password." };
  },

  async listSessions(userId, currentSessionId = null) {
    const sessions = await sessionService.list(userId, currentSessionId);
    return { sessions, count: sessions.length };
  },

  async revokeSession(userId, sessionId) {
    const removed = await sessionService.revokeById(userId, sessionId);
    if (!removed) throw new AppError("Session not found", 404, "SESSION_NOT_FOUND");
  },

  // "Sign out everywhere else". When the caller's session can't be identified
  // (an access token minted before per-device sessions) every session goes.
  async revokeOtherSessions(userId, currentSessionId = null) {
    return sessionService.revokeAll(userId, { exceptSessionId: currentSessionId });
  },

  async getMe(userId) {
    const user = await User.findById(userId).populate({
      path: "pinnedPost",
      populate: { path: "author", select: "fullName username avatarUrl isEmailVerified isVerified isPro isOwner achievementTier streakCount" },
    });
    if (!user) throw new AppError("User not found", 404, "USER_NOT_FOUND");
    const obj = user.toSafeObject();
    // The client uses these three flags to route to the consent/age gate.
    obj.consentRequired =
      !user.consent?.acceptedAt || user.consent.privacyVersion !== PRIVACY_VERSION;
    obj.dobRequired = !user.dob;
    obj.guardianConsentPending = Boolean(
      user.isMinor && user.guardian?.consentStatus === "pending"
    );
    obj.guardianConsentStatus = user.guardian?.consentStatus || "not_required";
    obj.policyVersion = PRIVACY_VERSION;
    return obj;
  },
};
