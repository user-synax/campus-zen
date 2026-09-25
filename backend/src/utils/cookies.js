import { env, isProd } from "../config/env.js";

function baseCookieOpts(maxAge) {
  return {
    httpOnly: true,
    secure: isProd ? true : env.COOKIE_SECURE, // true in prod
    sameSite: "lax",
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
  res.clearCookie("accessToken", { httpOnly: true, secure: isProd ? true : env.COOKIE_SECURE, sameSite: "lax", path: "/" });
  res.clearCookie("refreshToken", { httpOnly: true, secure: isProd ? true : env.COOKIE_SECURE, sameSite: "lax", path: "/" });
}
