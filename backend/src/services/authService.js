import bcrypt from "bcryptjs";
import { User } from "../models/User.js";
import { Otp } from "../models/Otp.js";
import { AppError } from "../utils/AppError.js";
import { generateOtp, hashOtp, compareOtp, otpExpiresAt } from "../utils/otp.js";
import { sendOtpEmail, sendWelcomeEmail } from "../utils/email.js";
import { signAccessToken, verifyRefreshToken } from "../utils/jwt.js";
import { sessionService } from "./sessionService.js";

const ALLOWED_DOMAINS = ["gmail.com", "proton.me"];
const USERNAME_RE = /^[a-z0-9_]{3,20}$/;

function assertAllowedEmail(email) {
  const domain = email.split("@")[1];
  if (!ALLOWED_DOMAINS.includes(domain)) throw new AppError("Email domain not allowed. Use gmail.com or proton.me", 400, "EMAIL_DOMAIN_NOT_ALLOWED");
}

async function persistOtp({ email, type }) {
  const plain = generateOtp();

  // delete previous OTPs of same type to keep 1 active
  await Otp.deleteMany({ email, type });

  const otpHash = await hashOtp(plain);
  const expiresAt = otpExpiresAt(10);

  await Otp.create({ email, otpHash, type, expiresAt, attempts: 0 });
  return plain;
}

async function createAndSendOtp({ email, type }) {
  const plain = await persistOtp({ email, type });
  try {
    await sendOtpEmail({ to: email, type, otp: plain });
  } catch (err) {
    // No ghost OTP: if delivery fails, discard the code so a later resend
    // creates a fresh one and the old hash can never be replayed.
    await Otp.deleteMany({ email, type });
    throw err;
  }
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

export const authService = {
  async checkUsername(username) {
    const u = username.toLowerCase().trim();
    if (!USERNAME_RE.test(u)) return { available: false, reason: "Invalid format. Use 3-20 chars: a-z, 0-9, _" };
    const exists = await User.exists({ username: u });
    return { available: !exists, reason: exists ? "Username is taken" : "Available" };
  },

  async signup({ fullName, username, email, password }) {
    const cleanUsername = username.toLowerCase().trim();
    const cleanEmail = email.toLowerCase().trim();

    assertAllowedEmail(cleanEmail);
    if (!USERNAME_RE.test(cleanUsername)) throw new AppError("Invalid username format", 400, "INVALID_USERNAME");

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
    });

    // Mandatory verification: no cookies/tokens here. If delivery fails the
    // signup is rolled back so the user can simply try again.
    try {
      await createAndSendOtp({ email: cleanEmail, type: "verify" });
    } catch (err) {
      await User.deleteOne({ _id: user._id });
      throw err;
    }

    return { user: user.toSafeObject() };
  },

  async verifyEmail({ email, otp }, meta = {}) {
    const cleanEmail = email.toLowerCase().trim();
    const user = await User.findOne({ email: cleanEmail });
    if (!user) throw new AppError("User not found", 404, "USER_NOT_FOUND");
    if (user.isEmailVerified) {
      throw new AppError("Email is already verified. Please sign in.", 409, "EMAIL_ALREADY_VERIFIED");
    }

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
      throw new AppError(`Invalid code. ${remaining > 0 ? `${remaining} attempts left.` : "No attempts left. Request a new code."}`, 400, "OTP_INVALID");
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

  async resendOtp({ email, type }) {
    const cleanEmail = email.toLowerCase().trim();
    const user = await User.findOne({ email: cleanEmail });
    if (!user) return { message: "If an account exists, a code will be sent." };
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

  async login({ username, password, remember = true }, meta = {}) {
    const cleanUsername = username.toLowerCase().trim();
    const user = await User.findOne({ username: cleanUsername }).select("+passwordHash +refreshTokenHash");
    if (!user) throw new AppError("Invalid username or password", 401, "INVALID_CREDENTIALS");
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

    // Verification passed — only now issue the session. This adds a device
    // session; any token still in `refreshTokenHash` from before per-device
    // sessions is left alone so that device can migrate on its next refresh.
    const { accessToken, refreshToken } = await issueSession(user, remember, meta);
    // backfill: accounts created before isOwner/isCofounder existed get flagged here
    // (pre-save hook covers all future saves)
    try {
      const { env } = await import("../config/env.js");
      const clean = String(user.email || "").toLowerCase().trim();
      user.isOwner = clean === env.OWNER_EMAIL;
      user.isCofounder = clean === env.COFOUNDER_EMAIL;
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
      throw new AppError(e.name === "TokenExpiredError" ? "Refresh token expired. Log in again." : "Invalid refresh token", 401, "INVALID_REFRESH");
    }

    const user = await User.findById(decoded.id).select("+refreshTokenHash");
    if (!user) throw new AppError("Session not found. Log in again.", 401, "SESSION_NOT_FOUND");
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
      populate: { path: "author", select: "fullName username avatarUrl isEmailVerified isVerified isPro isOwner isCofounder" },
    });
    if (!user) throw new AppError("User not found", 404, "USER_NOT_FOUND");
    return user.toSafeObject();
  },
};
