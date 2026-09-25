import jwt from "jsonwebtoken";
import crypto from "crypto";
import { env } from "../config/env.js";

export function signAccessToken(payload) {
  return jwt.sign(payload, env.JWT_ACCESS_SECRET, { expiresIn: env.JWT_ACCESS_EXPIRES });
}

export function signRefreshToken(payload, remember = true) {
  const exp = remember ? env.JWT_REFRESH_REMEMBER_EXPIRES : env.JWT_REFRESH_DEFAULT_EXPIRES;
  return jwt.sign(payload, env.JWT_REFRESH_SECRET, { expiresIn: exp });
}

export function verifyAccessToken(token) {
  return jwt.verify(token, env.JWT_ACCESS_SECRET);
}

export function verifyRefreshToken(token) {
  return jwt.verify(token, env.JWT_REFRESH_SECRET);
}

export function hashToken(token) {
  return crypto.createHash("sha256").update(token).digest("hex");
}
