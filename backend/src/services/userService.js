import { User } from "../models/User.js";
import { AppError } from "../utils/AppError.js";

export const userService = {
  async listUsers({ q, college, course, academicYear, page = 1, limit = 20 }) {
    const filter = {};
    // search across username, fullName, college (text index)
    if (q) {
      const esc = q.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
      const re = new RegExp(esc, "i");
      filter.$or = [{ username: re }, { fullName: re }, { bio: re }];
    }
    if (college) filter.college = new RegExp(`^${college.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}$`, "i");
    if (course) filter.course = new RegExp(`^${course.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}$`, "i");
    if (academicYear) filter.academicYear = academicYear;

    const skip = (Math.max(1, Number(page)) - 1) * Math.max(1, Math.min(50, Number(limit)));
    const lim = Math.max(1, Math.min(50, Number(limit)));

    const [users, total] = await Promise.all([
      User.find(filter).sort({ createdAt: -1 }).skip(skip).limit(lim).lean(),
      User.countDocuments(filter),
    ]);

    // lean returns plain objects, strip sensitive fields
    const safe = users.map((u) => {
      const { passwordHash, refreshTokenHash, __v, ...rest } = u;
      return rest;
    });

    return {
      users: safe,
      total,
      page: Number(page),
      limit: lim,
      hasMore: skip + lim < total,
    };
  },

  async getByUsername(username) {
    const clean = username.toLowerCase().trim();
    const user = await User.findOne({ username: clean });
    if (!user) throw new AppError("User not found", 404, "USER_NOT_FOUND");
    return user.toSafeObject();
  },

  async updateAvatar(userId, file) {
    if (!file) throw new AppError("No file uploaded", 400, "NO_FILE");
    const { isAppwriteConfigured, uploadToAppwrite } = await import("../config/appwrite.js");
    if (!isAppwriteConfigured()) {
      throw new AppError("Avatar upload not configured. Add APPWRITE_* env on backend.", 503, "APPWRITE_NOT_CONFIGURED");
    }
    const { viewUrl } = await uploadToAppwrite(file.buffer, file.originalname, file.mimetype);
    const user = await User.findByIdAndUpdate(userId, { $set: { avatarUrl: viewUrl } }, { new: true, runValidators: true });
    if (!user) throw new AppError("User not found", 404, "USER_NOT_FOUND");
    return user.toSafeObject();
  },

  async updateMe(userId, data) {
    const allowed = ["fullName", "bio", "college", "course", "academicYear", "avatarUrl"];
    const update = {};
    for (const k of allowed) if (data[k] !== undefined) update[k] = data[k];

    // normalize empty string -> null for optional fields
    for (const k of ["bio", "college", "course", "academicYear", "avatarUrl"]) {
      if (update[k] === "") update[k] = null;
    }
    // socialLinks — accept object {github, twitter, linkedin, instagram} as username/handle only
    if (data.socialLinks && typeof data.socialLinks === "object") {
      const sl = {};
      for (const k of ["github", "twitter", "linkedin", "instagram"]) {
        if (data.socialLinks[k] !== undefined) {
          let v = String(data.socialLinks[k]).trim();
          if (v === "") v = null;
          // strip leading @ for twitter/instagram, strip url prefix for linkedin/github if pasted
          if (v && (k === "twitter" || k === "instagram")) v = v.replace(/^@/, "");
          if (v && k === "github") v = v.replace(/^https?:\/\/(www\.)?github\.com\//i, "").replace(/\/$/, "").split("/")[0];
          if (v && k === "linkedin") {
            // allow full URL or handle
            v = v.replace(/^https?:\/\/(www\.)?linkedin\.com\/in\//i, "").replace(/\/$/, "");
          }
          sl[k] = v;
        }
      }
      // merge with existing to avoid wiping unspecified fields — fetch current then merge
      const current = await User.findById(userId).select("socialLinks");
      const merged = { ...(current?.socialLinks?.toObject?.() || current?.socialLinks || {}), ...sl };
      // handle nulls explicitly
      for (const k of Object.keys(sl)) merged[k] = sl[k];
      update.socialLinks = merged;
    }

    if (update.fullName !== undefined) {
      const v = String(update.fullName).trim();
      if (v.length < 2) throw new AppError("Full name must be at least 2 characters", 400, "VALIDATION_ERROR");
      if (v.length > 50) throw new AppError("Full name too long", 400, "VALIDATION_ERROR");
      update.fullName = v;
    }

    const user = await User.findByIdAndUpdate(userId, { $set: update }, { new: true, runValidators: true });
    if (!user) throw new AppError("User not found", 404, "USER_NOT_FOUND");
    return user.toSafeObject();
  },
};
