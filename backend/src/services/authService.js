import bcrypt from "bcryptjs";
import { User } from "../models/User.js";
import { Otp } from "../models/Otp.js";
import { AppError } from "../utils/AppError.js";
import { generateOtp, hashOtp, compareOtp, otpExpiresAt, logOtp } from "../utils/otp.js";
import { signAccessToken, signRefreshToken, hashToken, verifyRefreshToken } from "../utils/jwt.js";

const ALLOWED_DOMAINS = ["gmail.com", "proton.me"];
const USERNAME_RE = /^[a-z0-9_]{3,20}$/;

function assertAllowedEmail(email) {
  const domain = email.split("@")[1];
  if (!ALLOWED_DOMAINS.includes(domain)) throw new AppError("Email domain not allowed. Use gmail.com or proton.me", 400, "EMAIL_DOMAIN_NOT_ALLOWED");
}

async function createAndSendOtp({ email, type }) {
  // delete previous OTPs of same type to keep 1 active
  await Otp.deleteMany({ email, type });

  const plain = generateOtp();
  const otpHash = await hashOtp(plain);
  const expiresAt = otpExpiresAt(10);

  await Otp.create({ email, otpHash, type, expiresAt, attempts: 0 });
  logOtp({ email, type, otp: plain, expiresAt });

  return plain; // only for dev logging; not returned to client in prod
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
    if (userByUsername) throw new AppError("Username is already taken", 409, "USERNAME_TAKEN");
    if (userByEmail) throw new AppError("Email is already registered", 409, "EMAIL_TAKEN");

    const passwordHash = await bcrypt.hash(password, 12);
    const user = await User.create({
      fullName: fullName.trim(),
      username: cleanUsername,
      email: cleanEmail,
      passwordHash,
      isEmailVerified: false,
    });

    // send verify OTP (async, don't block too long)
    await createAndSendOtp({ email: cleanEmail, type: "verify" });

    return user.toSafeObject();
  },

  async verifyEmail({ email, otp }) {
    const cleanEmail = email.toLowerCase().trim();
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

    // success — mark verified and clear OTPs
    await Otp.deleteMany({ email: cleanEmail, type: "verify" });
    const user = await User.findOne({ email: cleanEmail });
    if (!user) throw new AppError("User not found", 404, "USER_NOT_FOUND");
    user.isEmailVerified = true;
    await user.save();

    return user.toSafeObject();
  },

  async resendOtp({ email, type }) {
    const cleanEmail = email.toLowerCase().trim();
    const user = await User.findOne({ email: cleanEmail });
    if (!user) return { message: "If an account exists, a code will be sent." };

    // throttle: already handled by rateLimiter, but also prevent spam if last OTP <30s old
    const last = await Otp.findOne({ email: cleanEmail, type }).sort({ createdAt: -1 });
    if (last && Date.now() - last.createdAt.getTime() < 30 * 1000) {
      throw new AppError("Please wait 30 seconds before requesting another code.", 429, "RESEND_THROTTLE");
    }

    await createAndSendOtp({ email: cleanEmail, type });
    return { message: "Code sent. Check your email (or console in dev)." };
  },

  async login({ username, password, remember = true }) {
    const cleanUsername = username.toLowerCase().trim();
    const user = await User.findOne({ username: cleanUsername }).select("+passwordHash +refreshTokenHash");
    if (!user) throw new AppError("Invalid username or password", 401, "INVALID_CREDENTIALS");

    const ok = await bcrypt.compare(password, user.passwordHash);
    if (!ok) throw new AppError("Invalid username or password", 401, "INVALID_CREDENTIALS");

    const accessToken = signAccessToken({ id: user._id, username: user.username, role: user.role });
    const refreshToken = signRefreshToken({ id: user._id }, remember);

    user.refreshTokenHash = hashToken(refreshToken);
    user.lastLoginAt = new Date();
    await user.save();

    const safe = user.toSafeObject();
    return { user: safe, accessToken, refreshToken, remember };
  },

  async refresh({ refreshToken: raw }) {
    if (!raw) throw new AppError("Missing refresh token", 401, "NO_REFRESH_TOKEN");
    let decoded;
    try {
      decoded = verifyRefreshToken(raw);
    } catch (e) {
      throw new AppError(e.name === "TokenExpiredError" ? "Refresh token expired. Log in again." : "Invalid refresh token", 401, "INVALID_REFRESH");
    }

    const user = await User.findById(decoded.id).select("+refreshTokenHash");
    if (!user || !user.refreshTokenHash) throw new AppError("Session not found. Log in again.", 401, "SESSION_NOT_FOUND");

    const incomingHash = hashToken(raw);
    if (incomingHash !== user.refreshTokenHash) throw new AppError("Session revoked. Log in again.", 401, "SESSION_REVOKED");

    // rotate
    const remember = true; // could decode exp to decide, but keep 7d for rotated
    const newAccess = signAccessToken({ id: user._id, username: user.username, role: user.role });
    const newRefresh = signRefreshToken({ id: user._id }, remember);
    user.refreshTokenHash = hashToken(newRefresh);
    await user.save();

    return { accessToken: newAccess, refreshToken: newRefresh, remember, user: user.toSafeObject() };
  },

  async logout(userId, refreshTokenRaw) {
    if (userId) {
      await User.findByIdAndUpdate(userId, { $set: { refreshTokenHash: null } });
    } else if (refreshTokenRaw) {
      try {
        const decoded = verifyRefreshToken(refreshTokenRaw);
        await User.findByIdAndUpdate(decoded.id, { $set: { refreshTokenHash: null } });
      } catch {}
    }
  },

  async forgotPassword({ email }) {
    const cleanEmail = email.toLowerCase().trim();
    assertAllowedEmail(cleanEmail);
    const user = await User.findOne({ email: cleanEmail });
    // generic response to avoid enumeration
    if (!user) return { message: "If an account exists, a reset code has been sent. Check email or console in dev." };

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

    user.passwordHash = await bcrypt.hash(newPassword, 12);
    // revoke existing sessions for security
    user.refreshTokenHash = null;
    await user.save();

    return { message: "Password updated. Please log in with your new password." };
  },

  async getMe(userId) {
    const user = await User.findById(userId);
    if (!user) throw new AppError("User not found", 404, "USER_NOT_FOUND");
    return user.toSafeObject();
  },
};
