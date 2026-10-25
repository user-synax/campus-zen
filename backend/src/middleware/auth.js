import { verifyAccessToken } from "../utils/jwt.js";
import { AppError } from "../utils/AppError.js";
import { User } from "../models/User.js";

function bearerToken(req) {
  const h = req.headers?.authorization || "";
  const [scheme, token] = h.split(" ");
  if (/^Bearer$/i.test(scheme) && token) return token;
  return null;
}

function accessTokenFrom(req) {
  return bearerToken(req) || req.cookies?.accessToken || null;
}

export async function protect(req, res, next) {
  try {
    const token = accessTokenFrom(req);
    if (!token) throw new AppError("Not authenticated. Please log in.", 401, "UNAUTHENTICATED");

    let decoded;
    try {
      decoded = verifyAccessToken(token);
    } catch (err) {
      if (err.name === "TokenExpiredError") throw new AppError("Session expired. Please refresh or log in again.", 401, "TOKEN_EXPIRED");
      throw new AppError("Invalid session.", 401, "INVALID_TOKEN");
    }

    const user = await User.findById(decoded.id).select("+refreshTokenHash");
    if (!user) throw new AppError("User no longer exists.", 401, "USER_NOT_FOUND");
    if (user.isSuspended) throw new AppError("Account suspended. Contact support.", 403, "ACCOUNT_SUSPENDED");
    // Hard gate: a session is not valid for app access until the email is
    // verified. Only /api/auth/verify-email + /resend-otp (unprotected) work.
    if (!user.isEmailVerified) {
      throw new AppError(
        "Verify your email to continue. Enter the 6-digit code we sent you.",
        403,
        "EMAIL_NOT_VERIFIED",
        null,
        { email: user.email }
      );
    }

    req.user = user;
    req.userId = user._id;
    next();
  } catch (err) {
    next(err);
  }
}

// Optional auth — sets req.user if valid token, else null, never throws
export async function optionalAuth(req, res, next) {
  try {
    const token = accessTokenFrom(req);
    if (!token) {
      req.user = null;
      return next();
    }
    let decoded;
    try {
      decoded = verifyAccessToken(token);
    } catch {
      req.user = null;
      return next();
    }
    const user = await User.findById(decoded.id).select("+refreshTokenHash");
    // Unverified (or suspended) accounts get the guest view on optional-auth
    // routes; every write path uses protect() and is rejected outright.
    const usable = user && user.isEmailVerified && !user.isSuspended ? user : null;
    req.user = usable;
    if (usable) req.userId = usable._id;
    next();
  } catch {
    req.user = null;
    next();
  }
}

export function authorize(...roles) {
  return (req, res, next) => {
    if (!req.user || !roles.includes(req.user.role)) return next(new AppError("Forbidden.", 403, "FORBIDDEN"));
    next();
  };
}
