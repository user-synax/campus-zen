import { CollegeAdmin } from "../models/CollegeAdmin.js";
import { AppError } from "../utils/AppError.js";

/**
 * College moderation guards — the owner has universal access, delegated
 * college admins get exactly the switch state they were granted. All of it
 * is re-checked per request from the database, so a cap the owner turns off
 * ends the power on the very next call.
 */

// The platform owner (usersynax). /admin stays untouched; this guard is for
// the in-app college management surfaces.
export function requireOwner(req, res, next) {
  if (!req.user) {
    return next(new AppError("Sign in required.", 401, "UNAUTHENTICATED"));
  }
  if (!req.user.isOwner) {
    return next(
      new AppError(
        "Only the owner can manage college admins.",
        403,
        "OWNER_ONLY",
      ),
    );
  }
  next();
}

// Factory: passes when the viewer is the owner or holds `cap` for the
// college in `req.params.slug`.
export function requireCollegeCap(cap) {
  return async (req, res, next) => {
    try {
      if (!req.user) {
        throw new AppError("Sign in required.", 401, "UNAUTHENTICATED");
      }
      if (req.user.isOwner) return next();
      const slug = String(req.params.slug || "").toLowerCase().trim();
      const doc = await CollegeAdmin.findOne({
        collegeSlug: slug,
        user: req.user._id,
      })
        .select("caps")
        .lean();
      if (doc?.caps?.[cap]) return next();
      throw new AppError(
        "You don't have permission for this on this college.",
        403,
        "COLLEGE_CAP_REQUIRED",
      );
    } catch (err) {
      next(err);
    }
  };
}
