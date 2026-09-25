import crypto from "crypto";
import bcrypt from "bcryptjs";

export function generateOtp() {
  // 6-digit, crypto secure, no leading zero bias in range 100000-999999
  const otp = String(crypto.randomInt(100000, 1000000));
  return otp;
}

export async function hashOtp(otp) {
  // 10 rounds — fast enough for OTP (<40ms) but secure
  return bcrypt.hash(otp, 10);
}

export async function compareOtp(otp, hash) {
  return bcrypt.compare(otp, hash);
}

export function otpExpiresAt(minutes = 10) {
  return new Date(Date.now() + minutes * 60 * 1000);
}

// dev helper — logs to console, replace with nodemailer per TODO.md
export function logOtp({ email, type, otp, expiresAt }) {
  const masked = email.replace(/(^.).+(@.*)/, (m, a, b) => a + "***" + b);
  console.log(`[OTP][${type}] ${masked} -> ${otp}  expires ${expiresAt.toISOString()}  (dev only, email skipped)`);
}
