import { env, isProd } from "../config/env.js";

function baseCookieOpts(maxAge) {
  return {
    httpOnly: true,
    secure: isProd ? true : env.COOKIE_SECURE, // true in prod
    sameSite: env.COOKIE_SAMESITE,
    path: "/",
    maxAge,
  };
}

export function setAuthCookies(res, { accessToken, refreshToken, remember = true }) {
  // access 15m
  res.cookie("accessToken", accessToken, baseCookieOpts(15 * 60 * 1000));

  // refresh 7d if remember, else 1d
  const refreshMs = remember ? 7 * 24 * 60 * 60 * 1000 : 24 * 60 * 60 * 1000;
  res.cookie("refreshToken", refreshToken, baseCookieOpts(refreshMs));
}

export function clearAuthCookies(res) {
  const opts = { httpOnly: true, secure: isProd ? true : env.COOKIE_SECURE, sameSite: env.COOKIE_SAMESITE, path: "/" };
  res.clearCookie("accessToken", opts);
  res.clearCookie("refreshToken", opts);
}

export function setAdminCookie(res, adminToken) {
  // short-lived (2h default) — separate from user auth cookies
  res.cookie("adminToken", adminToken, baseCookieOpts(2 * 60 * 60 * 1000));
}

export function clearAdminCookie(res) {
  const opts = { httpOnly: true, secure: isProd ? true : env.COOKIE_SECURE, sameSite: env.COOKIE_SAMESITE, path: "/" };
  res.clearCookie("adminToken", opts);
}
