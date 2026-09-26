import nodemailer from "nodemailer";
import { env } from "../config/env.js";
import { AppError } from "./AppError.js";

let transporter = null;

function getTransporter() {
  if (!transporter) {
    transporter = nodemailer.createTransport({
      host: env.SMTP_HOST,
      port: env.SMTP_PORT,
      secure: env.SMTP_PORT === 465,
      auth: { user: env.SMTP_USER, pass: env.SMTP_PASS },
    });
  }
  return transporter;
}

function maskEmail(email) {
  return String(email).replace(/(^.).+(@.*)/, (m, a, b) => `${a}***${b}`);
}

// --- Shared shell (table layout + inline styles for Gmail/Outlook compat) ---
function shell({ heading, intro, bodyHtml, footerNote }) {
  return `<!DOCTYPE html>
<html lang="en">
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background-color:#060b1e;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Helvetica,Arial,sans-serif;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:#060b1e;padding:32px 16px;">
    <tr><td align="center">
      <table role="presentation" width="560" cellpadding="0" cellspacing="0" style="max-width:560px;width:100%;background-color:#0c122c;border:1px solid rgba(255,206,173,0.14);border-radius:16px;overflow:hidden;">
        <tr><td style="padding:28px 32px 0;">
          <table role="presentation" cellpadding="0" cellspacing="0"><tr>
            <td style="background-color:#ffcead;color:#0c122c;font-weight:700;font-size:13px;border-radius:8px;width:32px;height:32px;text-align:center;vertical-align:middle;">CZ</td>
            <td style="padding-left:10px;color:#ffcead;font-size:15px;font-weight:600;letter-spacing:-0.02em;">campuszen</td>
          </tr></table>
        </td></tr>
        <tr><td style="padding:24px 32px 0;">
          <h1 style="margin:0;color:#ffcead;font-size:22px;font-weight:600;letter-spacing:-0.02em;">${heading}</h1>
          <p style="margin:12px 0 0;color:#b6a6b2;font-size:14px;line-height:22px;">${intro}</p>
        </td></tr>
        <tr><td style="padding:20px 32px 0;">${bodyHtml}</td></tr>
        <tr><td style="padding:24px 32px 0;">
          <p style="margin:0;color:#b6a6b2;font-size:12px;line-height:18px;opacity:0.8;">${footerNote}</p>
        </td></tr>
        <tr><td style="padding:24px 32px 28px;border-top:1px solid rgba(255,206,173,0.12);margin-top:24px;">
          <p style="margin:0;color:#b6a6b2;font-size:11px;line-height:16px;opacity:0.7;">&copy; 2026 CampusZen &middot; Student Network</p>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`;
}

function otpBody(otp) {
  return `<table role="presentation" width="100%" cellpadding="0" cellspacing="0">
    <tr><td align="center" style="background-color:rgba(255,255,255,0.04);border:1px solid rgba(255,206,173,0.2);border-radius:12px;padding:20px 16px;">
      <div style="color:#ffcead;font-family:'JetBrains Mono',Menlo,Consolas,monospace;font-size:32px;font-weight:700;letter-spacing:10px;text-indent:10px;">${otp}</div>
      <div style="margin-top:10px;color:#b6a6b2;font-size:12px;">Valid for 10 minutes &middot; 5 attempts max</div>
    </td></tr>
  </table>`;
}

function ctaButton({ href, label }) {
  return `<table role="presentation" cellpadding="0" cellspacing="0"><tr><td align="center" style="background-color:#ffcead;border-radius:10px;padding:0;">
    <a href="${href}" style="display:inline-block;padding:12px 28px;color:#0c122c;font-size:14px;font-weight:600;text-decoration:none;">${label}</a>
  </td></tr></table>`;
}

export const TEMPLATES = {
  verify: (otp) => ({
    subject: `Your CampusZen verification code: ${otp}`,
    html: shell({
      heading: "Verify your email",
      intro: "Welcome to CampusZen. Enter this code to confirm your email and activate your account:",
      bodyHtml: otpBody(otp),
      footerNote: "Didn't create a CampusZen account? You can safely ignore this email.",
    }),
    text: `Welcome to CampusZen.\n\nYour verification code: ${otp}\nValid for 10 minutes, 5 attempts max.\n\nDidn't create an account? Ignore this email.\n© 2026 CampusZen`,
  }),
  reset: (otp) => ({
    subject: `Your CampusZen password reset code: ${otp}`,
    html: shell({
      heading: "Reset your password",
      intro: "We received a request to reset your password. Enter this code to continue:",
      bodyHtml: otpBody(otp),
      footerNote: "Didn't request a reset? Your password is safe — just ignore this email.",
    }),
    text: `Reset your CampusZen password.\n\nYour reset code: ${otp}\nValid for 10 minutes, 5 attempts max.\n\nDidn't request this? Ignore this email.\n© 2026 CampusZen`,
  }),
  welcome: (name, appUrl) => ({
    subject: "Welcome to CampusZen",
    html: shell({
      heading: `You're in, ${name}`,
      intro:
        "Your email is verified and your account is ready. Find students from your college, share your first thought, and see what's happening on campus.",
      bodyHtml: ctaButton({ href: `${appUrl}/app`, label: "Open CampusZen" }),
      footerNote: "Tip: complete your profile with your college and course so the right people can find you.",
    }),
    text: `You're in, ${name}.\n\nYour CampusZen account is ready. Open the app: ${appUrl}/app\n\nTip: add your college and course to your profile.\n© 2026 CampusZen`,
  }),
};

export async function sendMail({ to, subject, html, text }) {
  try {
    await getTransporter().sendMail({
      from: `"${env.EMAIL_FROM_NAME}" <${env.EMAIL_FROM}>`,
      to,
      subject,
      html,
      text,
    });
    console.log(`[email] sent "${subject.split(":")[0]}" -> ${maskEmail(to)}`);
  } catch (err) {
    // fail closed: caller decides, but never leak SMTP details to client
    console.error(`[email] send failed -> ${maskEmail(to)}:`, err.message);
    throw new AppError("Couldn't send email right now. Please try again.", 500, "EMAIL_SEND_FAILED");
  }
}

// Fail-closed OTP send: throws EMAIL_SEND_FAILED, nothing is persisted by the caller on failure.
export async function sendOtpEmail({ to, type, otp }) {
  const tpl = TEMPLATES[type === "reset" ? "reset" : "verify"](otp);
  await sendMail({ to, ...tpl });
}

// Welcome email is best-effort: verification already succeeded, so a failure
// here must not fail the request — it only gets logged.
export async function sendWelcomeEmail({ to, name }) {
  const tpl = TEMPLATES.welcome(name || "there", env.FRONTEND_URL);
  try {
    await sendMail({ to, ...tpl });
  } catch (err) {
    console.error(`[email] welcome failed -> ${maskEmail(to)}:`, err.message);
  }
}
