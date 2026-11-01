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

// Optional analytics consent is mirrored in a first-party, non-httpOnly
// cookie. The root layout no longer reads cookies at all (that made every
// route dynamic and disabled link prefetching); instead the client-side
// ConsentAwareAnalytics component reads this cookie after hydration. It is
// not an auth secret — same trust level as `cz-theme` — so excluding it from
// httpOnly keeps it readable while document.cookie stays safe for real
// credentials.
export function setAnalyticsCookie(res, allowed) {
  res.cookie("cz_analytics", allowed ? "1" : "0", {
    httpOnly: false,
    secure: isProd ? true : env.COOKIE_SECURE,
    sameSite: env.COOKIE_SAMESITE,
    path: "/",
    maxAge: 365 * 24 * 60 * 60 * 1000,
  });
}

export function clearAnalyticsCookie(res) {
  res.clearCookie("cz_analytics", {
    httpOnly: false,
    secure: isProd ? true : env.COOKIE_SECURE,
    sameSite: env.COOKIE_SAMESITE,
    path: "/",
  });
}
