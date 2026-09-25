import { verifyAccessToken } from "../utils/jwt.js";
import { AppError } from "../utils/AppError.js";
import { User } from "../models/User.js";

export async function protect(req, res, next) {
  try {
    const token = req.cookies?.accessToken;
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

    req.user = user;
    req.userId = user._id;
    next();
  } catch (err) {
    next(err);
  }
}

export function authorize(...roles) {
  return (req, res, next) => {
    if (!req.user || !roles.includes(req.user.role)) return next(new AppError("Forbidden.", 403, "FORBIDDEN"));
    next();
  };
}
