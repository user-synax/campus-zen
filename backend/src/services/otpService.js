import { Otp } from "../models/Otp.js";
import { generateOtp, hashOtp, otpExpiresAt } from "../utils/otp.js";
import { sendOtpEmail } from "../utils/email.js";

async function persistOtp({ email, type }) {
  const plain = generateOtp();

  // One active code per email + purpose.
  await Otp.deleteMany({ email, type });

  const otpHash = await hashOtp(plain);
  const expiresAt = otpExpiresAt(10);

  await Otp.create({ email, otpHash, type, expiresAt, attempts: 0 });
  return plain;
}

export async function createAndSendOtp({ email, type, childEmail = null }) {
  const plain = await persistOtp({ email, type });
  try {
    await sendOtpEmail({ to: email, type, otp: plain, childEmail });
  } catch (err) {
    // No ghost OTP: if delivery fails, discard the code so a later resend
    // creates a fresh one and the old hash can never be replayed.
    await Otp.deleteMany({ email, type });
    throw err;
  }
}
