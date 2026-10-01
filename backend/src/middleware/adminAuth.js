import crypto from "crypto";
import jwt from "jsonwebtoken";
import { env } from "../config/env.js";
import { AppError } from "../utils/AppError.js";

export function isAdminConfigured() {
  return Boolean(env.ADMIN_EMAIL && env.ADMIN_PASSKEY);
}

// timing-safe compare — never early-return on length/content
function safeEqual(a, b) {
  const ab = Buffer.from(String(a || ""));
  const bb = Buffer.from(String(b || ""));
  if (ab.length !== bb.length) return false;
  return crypto.timingSafeEqual(ab, bb);
}

export function verifyAdminCredentials(email, passkey) {
  if (!isAdminConfigured()) return false;
  const cleanEmail = String(email || "").toLowerCase().trim();
  return safeEqual(cleanEmail, env.ADMIN_EMAIL) && safeEqual(String(passkey || ""), env.ADMIN_PASSKEY);
}

export function signAdminToken() {
  return jwt.sign({ role: "admin", email: env.ADMIN_EMAIL }, env.JWT_ACCESS_SECRET, {
    expiresIn: env.ADMIN_TOKEN_EXPIRES,
  });
}

export function verifyAdminToken(token) {
  return jwt.verify(token, env.JWT_ACCESS_SECRET);
}

// Cookie-based admin guard for /api/admin/* (except login).
// Separate from user `protect` — admin has no DB user, session lives
// only in the signed adminToken cookie (2h default).
export function requireAdmin(req, res, next) {
  try {
    if (!isAdminConfigured()) {
      throw new AppError("Admin dashboard is not configured.", 503, "ADMIN_NOT_CONFIGURED");
    }
    const token = req.cookies?.adminToken;
    if (!token) throw new AppError("Admin login required.", 401, "ADMIN_UNAUTHENTICATED");
    let decoded;
    try {
      decoded = verifyAdminToken(token);
    } catch (err) {
      if (err.name === "TokenExpiredError") throw new AppError("Admin session expired. Log in again.", 401, "ADMIN_TOKEN_EXPIRED");
      throw new AppError("Invalid admin session.", 401, "ADMIN_INVALID_TOKEN");
    }
    if (decoded.role !== "admin" || String(decoded.email || "").toLowerCase() !== env.ADMIN_EMAIL) {
      throw new AppError("Forbidden.", 403, "FORBIDDEN");
    }
    req.admin = { email: env.ADMIN_EMAIL };
    next();
  } catch (err) {
    next(err);
  }
}
